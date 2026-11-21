/**
 * ─── ZUSTAND STORE (IndexedDB / LocalForage Kalıcılığı ile) ───
 * Uygulamanın merkezi asenkron durum yönetimi (Faz 1).
 *
 * LocalStorage yerine IndexedDB (localforage) kullanılarak
 * yüksek veri güvenliği, asenkron yükleme ve kesintisiz mobil performans sağlanır.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  trialRecords as initialTrials,
  userProfile,
  tytTopics as initialTytTopics,
  aytTopics as initialAytTopics,
} from '../data/mockData';
import { asyncIndexedDbStorage } from '../utils/storage';
import { markHydrated, markReadFailed } from '../utils/persistGuard';
import { BRANCH_EXAM_TOPIC } from '../data/subjects';
import {
  DEFAULT_ACTIVITY_ID,
  nextTopicOnActivityChange,
  resolveActivity,
} from '../data/activities';
import { DEFAULT_MODE_ID, DEFAULT_CUSTOM_MINUTES } from '../data/timerModes';
import { getElapsedSeconds, isKeepAliveSession } from '../utils/session';
import { computeStreak } from '../utils/streak';
import { toDateKey } from '../utils/dateKey';
import { DEFAULT_BACKUP_INTERVAL_DAYS, normalizeInterval } from '../utils/backupReminder';

/**
 * Sayaç başlangıç durumu. Ders/konu boş başlar; StudyTimer ilk açılışında
 * varsayılan dersi yazar. `isRunning: false` + `accumulatedSeconds: 0` = boşta.
 */
const createIdleTimer = () => ({
  subject: null,
  subjectId: null,
  topic: '',
  activity: DEFAULT_ACTIVITY_ID, // 'lecture' | 'practice' | 'branch'
  modeId: DEFAULT_MODE_ID,
  customMinutes: DEFAULT_CUSTOM_MINUTES,
  startedAt: null,          // çalışırken ms zaman damgası, duraklatınca null
  accumulatedSeconds: 0,    // önceki çalışma parçalarından biriken süre
  isRunning: false,
  lastAliveAt: null,        // uygulamanın en son "hayatta" görüldüğü an
  autoPausedReason: null,   // 'away' | 'background' | 'target'
  alarmFired: false,
});

let nextSessionId = 1;

const useAppStore = create(
  persist(
    (set, get) => ({
      // ─── Asenkron Yükleme (Hydration) Durumu ───
      isLoading: true,
      hasHydrated: false,
      setIsLoading: (loading) => set({ isLoading: loading }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated, isLoading: !hydrated }),

      // ─── İlk Açılış Karşılaması ───
      // false ise uygulama yerine karşılama ekranı gösterilir. Mevcut
      // kullanıcılar bunu görmesin diye persist migrasyonunda true'ya
      // çekiliyor (aşağıdaki `migrate`).
      onboardingCompleted: false,

      /**
       * Karşılamayı tamamlar: profili yazar ve demo veriyi temizler.
       * Yeni öğrenci "Emre Yılmaz"ın sahte denemeleriyle değil, boş bir
       * sayfayla başlamalı.
       */
      completeOnboarding: ({ userName, selectedTrack, targetRank, showAyt, obpScore }) =>
        set({
          onboardingCompleted: true,
          userName: (userName || '').trim() || 'Öğrenci',
          selectedTrack,
          targetRank,
          showAyt,
          // OBP sıralama simülasyonunun girdisi; 50-100 aralığına kıstırılır
          obpScore: Math.min(100, Math.max(50, Number(obpScore) || 75)),
          trials: [],
          studySessions: [],
          completedMissions: [],
          studyStreak: 0,
          lastActiveDate: null,
          timer: createIdleTimer(),
          activePage: 'dashboard',
          // Sayım karşılamadan başlar; yeni öğrenciye ilk gün yedek sorulmaz
          lastBackupAt: null,
          backupReminderAnchorAt: Date.now(),
        }),

      // ─── Navigasyon ───
      activePage: 'dashboard',
      setActivePage: (page) => set({ activePage: page }),

      // ─── Tema (light | dark | sepia) ───
      theme: 'light',
      setTheme: (theme) => set({ theme }),

      // ─── Alan Seçimi (SAY | EA | SOZ | DIL) ───
      selectedTrack: userProfile.selectedTrack,
      setSelectedTrack: (track) => set({ selectedTrack: track }),

      // ─── Sidebar Durumu (masaüstü) ───
      sidebarCollapsed: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      // ─── Kullanıcı Profili ───
      userName: userProfile.name,
      setUserName: (name) => set({ userName: name }),

      targetRank: userProfile.targetRank,
      setTargetRank: (rank) => set({ targetRank: rank }),

      // OBP: Okul Başarı Puanı (50-100 arası)
      obpScore: 75,
      setObpScore: (score) => set({ obpScore: Math.min(100, Math.max(50, Number(score) || 75)) }),

      // ─── YKS Simülasyon Yılı (2026, 2025, 2024, 2023) ───
      simYear: '2026',
      setSimYear: (year) => set({ simYear: String(year) }),

      // ─── AYT Görünürlüğü ───
      // Eskiden AYT kapatılınca 'ayt' sayfasından dashboard'a yönlendirilirdi.
      // Artık ayrı bir AYT sayfası yok: Denemeler sayfası kendi içinde AYT
      // sekmesini pasifleştirip TYT'ye düşüyor, yönlendirmeye gerek kalmadı.
      showAyt: true,
      setShowAyt: (show) => set({ showAyt: show }),

      // ─── Konu Havuzları (Reaktif) ───
      tytTopics: initialTytTopics,
      aytTopics: initialAytTopics,

      // Zorlanma durumu ('mild' | 'deficit' | 'critical' veya 1-10 sayı) güncelleme
      updateTopicDifficulty: (topicId, statusOrLevel) =>
        set((state) => {
          let status = 'deficit';
          let calculatedMastery = 50;
          if (typeof statusOrLevel === 'string') {
            status = statusOrLevel;
            calculatedMastery = status === 'critical' ? 20 : status === 'deficit' ? 45 : 75;
          } else {
            const num = Number(statusOrLevel) || 5;
            calculatedMastery = Math.max(5, Math.min(95, 100 - num * 10));
            status = num >= 8 ? 'critical' : num >= 4 ? 'deficit' : 'mild';
          }

          const updateFn = (t) =>
            t.id === topicId
              ? { ...t, status, mastery: calculatedMastery, isCompleted: false }
              : t;

          return {
            tytTopics: state.tytTopics.map(updateFn),
            aytTopics: state.aytTopics.map(updateFn),
          };
        }),

      updateTopicStatus: (topicId, status) => {
        get().updateTopicDifficulty(topicId, status);
      },

      // Konu Tamamlama / Dopamin Döngüsü (Eksik Kapatıldı ✓)
      toggleTopicCompleted: (topicId) =>
        set((state) => {
          const toggleFn = (t) =>
            t.id === topicId
              ? {
                  ...t,
                  isCompleted: !t.isCompleted,
                  completedAt: !t.isCompleted ? new Date().toISOString() : null,
                }
              : t;

          return {
            tytTopics: state.tytTopics.map(toggleFn),
            aytTopics: state.aytTopics.map(toggleFn),
          };
        }),

      // Konu Silme (Triage listesinden doğrudan kaldırma)
      deleteTopic: (topicId) =>
        set((state) => ({
          tytTopics: state.tytTopics.filter((t) => t.id !== topicId),
          aytTopics: state.aytTopics.filter((t) => t.id !== topicId),
        })),

      // ─── Deneme Kayıtları ───
      trials: initialTrials,

      addTrial: (trial) =>
        set((state) => {
          const newTrial = {
            id: trial.id || `trial_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            ...trial,
            createdAt: trial.createdAt || Date.now(),
          };
          return {
            trials: [newTrial, ...state.trials],
          };
        }),

      deleteTrial: (trialId) =>
        set((state) => ({
          trials: state.trials.filter((t) => t.id !== trialId),
        })),

      // ─── Çalışma / Odak Seansları (Timer) ───
      studySessions: [
        {
          id: 'session_001',
          subject: 'TYT Temel Matematik',
          subjectId: 'TYT_MAT',
          topic: 'Sayı Problemleri',
          activity: 'practice',
          durationMinutes: 45,
          date: toDateKey(),
          type: 'Verimli Ders 🟢',
        },
        {
          id: 'session_002',
          subject: 'TYT Fizik',
          subjectId: 'TYT_FIZ',
          topic: BRANCH_EXAM_TOPIC,
          activity: 'branch',
          durationMinutes: 25,
          date: toDateKey(),
          type: 'Pomodoro 🟠',
        },
      ],

      addStudySession: (session) =>
        set((state) => {
          const today = toDateKey();
          const newSession = {
            id: `session_${Date.now()}_${nextSessionId++}`,
            date: today,
            ...session,
            // Hiyerarşik analitiğin (Ders → Konu) alt kırılımı.
            // Konu seçimi kronometrede zorunludur; buradaki null yalnızca
            // eski kayıtlar ve dışarıdan içe aktarılan veriler için güvenlik ağıdır.
            topic: session.topic || null,
            subjectId: session.subjectId ?? null,
            // Çalışma türü: kronometre her zaman gönderir. Dışarıdan içe
            // aktarılan eski kayıtlarda yoksa konu adından türetilir.
            activity: session.activity || resolveActivity(session),
          };
          const newSessions = [newSession, ...state.studySessions];

          // Seri artık olay anında ARTIRILMIYOR; geçmişten yeniden hesaplanıyor
          // (bkz. utils/streak.js). Buradaki yazma yalnızca dışa aktarmanın
          // güncel kalması için bir önbellek.
          return {
            studySessions: newSessions,
            studyStreak: computeStreak(newSessions).current,
            lastActiveDate: today,
          };
        }),

      deleteStudySession: (sessionId) =>
        set((state) => {
          const newSessions = state.studySessions.filter((s) => s.id !== sessionId);
          // Silme seriyi DÜŞÜREBİLİR; önbelleği de tazele
          return {
            studySessions: newSessions,
            studyStreak: computeStreak(newSessions).current,
          };
        }),

      // ─── Aktif Odak Seansı (Sayaç) ───
      // Sayfa değişince StudyTimer unmount olduğu için sayaç durumu burada
      // yaşar. Geçen süre saniye sayarak değil, startedAt zaman damgasından
      // hesaplanır (bkz. utils/session.js).
      timer: createIdleTimer(),

      /**
       * Ders / konu / çalışma türü seçimi — seans başlamadan da kalıcıdır.
       *
       * Branş denemesi tüm dersi kapsar ve tek bir konuya yazılamaz; bu yüzden
       * tür branş olunca `topic` otomatik olarak BRANCH_EXAM_TOPIC'e sabitlenir,
       * branştan çıkılınca temizlenir. Kural burada duruyor ki arayüzün hangi
       * yoldan değiştirdiğinden bağımsız olarak hep tutsun.
       *
       * Konu YALNIZCA "konu gerektiren ↔ gerektirmeyen" sınırı geçilince
       * değişir. Anlatım ile soru çözümü arasında geçerken seçim korunur:
       * "videoyu izledim, şimdi aynı konudan soru çözeyim" en sık akış ve her
       * geçişte konuyu yeniden seçtirmek gereksiz sürtünme olurdu.
       */
      setTimerSelection: ({ subject, subjectId, topic, activity }) =>
        set((state) => {
          const next = {
            ...state.timer,
            ...(subject !== undefined ? { subject, subjectId: subjectId ?? null } : {}),
            ...(topic !== undefined ? { topic } : {}),
            ...(activity !== undefined ? { activity } : {}),
          };

          if (activity !== undefined) {
            next.topic = nextTopicOnActivityChange(
              state.timer.activity,
              activity,
              next.topic
            );
          }

          return { timer: next };
        }),

      setTimerMode: (modeId) =>
        set((state) => ({
          timer: {
            ...state.timer,
            modeId,
            // Mod değişince biriken süre anlamını yitirir
            startedAt: null,
            accumulatedSeconds: 0,
            isRunning: false,
            alarmFired: false,
            autoPausedReason: null,
          },
        })),

      setTimerCustomMinutes: (minutes) =>
        set((state) => ({ timer: { ...state.timer, customMinutes: minutes } })),

      startTimer: () =>
        set((state) => {
          if (state.timer.isRunning) return {};
          return {
            timer: {
              ...state.timer,
              isRunning: true,
              startedAt: Date.now(),
              lastAliveAt: Date.now(),
              autoPausedReason: null,
              alarmFired: false,
            },
          };
        }),

      /**
       * Duraklat ve o ana kadarki süreyi bankaya yaz.
       * `reason` otomatik duraklatmalarda dolu gelir; kullanıcı elle
       * duraklattığında null kalır ki ekranda gereksiz uyarı çıkmasın.
       */
      pauseTimer: (reason = null, at = Date.now()) =>
        set((state) => {
          const t = state.timer;
          if (!t.isRunning) return {};
          return {
            timer: {
              ...t,
              isRunning: false,
              startedAt: null,
              accumulatedSeconds: getElapsedSeconds(t, at),
              lastAliveAt: at,
              autoPausedReason: reason,
            },
          };
        }),

      /** Süreyi sıfırla, ders/konu/mod seçimini koru. */
      resetTimer: () =>
        set((state) => ({
          timer: {
            ...state.timer,
            startedAt: null,
            accumulatedSeconds: 0,
            isRunning: false,
            alarmFired: false,
            autoPausedReason: null,
          },
        })),

      /** Uygulamanın hâlâ açık olduğunu işaretler — zorla kapatma referansı. */
      touchTimerAlive: () =>
        set((state) => ({ timer: { ...state.timer, lastAliveAt: Date.now() } })),

      setTimerAlarmFired: (fired) =>
        set((state) => ({ timer: { ...state.timer, alarmFired: fired } })),

      clearTimerAutoPause: () =>
        set((state) => ({ timer: { ...state.timer, autoPausedReason: null } })),

      /**
       * Uygulama yeniden açıldığında çalışan bir seans bulunursa devreye girer.
       * Konu anlatımı seansları devam eder; diğerleri uygulama kapalıyken
       * saymamalıdır, bu yüzden "son hayatta görülen an"a kadar banklanıp
       * duraklatılır.
       */
      reconcileTimerOnLoad: () =>
        set((state) => {
          const t = state.timer;
          if (!t || !t.isRunning || !t.startedAt) return {};
          if (isKeepAliveSession(t)) return {};

          const cutoff = Math.max(t.startedAt, t.lastAliveAt || t.startedAt);
          return {
            timer: {
              ...t,
              isRunning: false,
              startedAt: null,
              accumulatedSeconds: getElapsedSeconds(t, cutoff),
              autoPausedReason: 'background',
            },
          };
        }),

      // ─── Görev Ağacı / Yol Haritası ───
      // Tamamlanmış düğümlerin kimlikleri: "DERS_KODU::Konu Adı"
      completedMissions: [],

      completeMission: (missionId) =>
        set((state) => {
          if (!missionId || state.completedMissions.includes(missionId)) return {};
          return { completedMissions: [...state.completedMissions, missionId] };
        }),

      // Yanlışlıkla kapatılan bir düğümü geri açar
      uncompleteMission: (missionId) =>
        set((state) => ({
          completedMissions: state.completedMissions.filter((id) => id !== missionId),
        })),

      // ─── Çalışma Serisi (Streak) ───
      // DİKKAT: bu iki alan artık doğruluk kaynağı DEĞİL. Seri seans
      // geçmişinden hesaplanıyor (utils/streak.js, useStreak kancası); burada
      // yalnızca JSON dışa aktarmanın anlamlı kalması için önbelleklenir.
      // Ekranda gösterilen değeri buradan OKUMA.
      studyStreak: 0,
      lastActiveDate: null,

      /**
       * Öğrenciye gösterilmiş son streak bildiriminin tarihi.
       * Aynı olayın her açılışta tekrar gösterilmesini engeller.
       */
      streakNoticeSeenDate: null,
      markStreakNoticeSeen: (dateKey) => set({ streakNoticeSeenDate: dateKey }),

      // ─── Yedek Hatırlatıcısı (bkz. utils/backupReminder.js) ───
      // Yeni alanlar persist sürümü gerektirmiyor: eski kayıtta yoksalar
      // varsayılanlar devreye giriyor. Çapası null olan mevcut kullanıcı
      // hiç yedek almamış sayılır ve ilk açılışta hatırlatılır — kasıtlı.
      lastBackupAt: null,           // son başarılı yedek (ms)
      backupReminderAnchorAt: null, // son yedek ya da son "şimdi değil" (ms)
      backupReminderDays: DEFAULT_BACKUP_INTERVAL_DAYS,
      setBackupReminderDays: (days) => set({ backupReminderDays: normalizeInterval(days) }),
      markBackupTaken: () => {
        const now = Date.now();
        set({ lastBackupAt: now, backupReminderAnchorAt: now });
      },
      dismissBackupReminder: () => set({ backupReminderAnchorAt: Date.now() }),

      // ─── Ana ekrana ekleme kartı (bkz. utils/installPrompt.js) ───
      installCardDismissedAt: null,
      dismissInstallCard: () => set({ installCardDismissedAt: Date.now() }),

      // ─── JSON Dosyasından Veri İthalatı (Restore) ───
      importFullData: (importedData) =>
        set((state) => ({
          userName: importedData.userName ?? state.userName,
          targetRank: importedData.targetRank ?? state.targetRank,
          obpScore: importedData.obpScore ?? state.obpScore,
          selectedTrack: importedData.selectedTrack ?? state.selectedTrack,
          showAyt: importedData.showAyt ?? state.showAyt,
          theme: importedData.theme ?? state.theme,
          studyStreak: importedData.studyStreak ?? state.studyStreak,
          lastActiveDate: importedData.lastActiveDate ?? state.lastActiveDate,
          trials: importedData.trials || state.trials,
          studySessions: importedData.studySessions || state.studySessions,
          completedMissions: importedData.completedMissions || state.completedMissions,
          tytTopics: importedData.tytTopics || state.tytTopics,
          aytTopics: importedData.aytTopics || state.aytTopics,
        })),

      // ─── Tüm Verileri Başlangıç Haline Sıfırla ───
      resetToDefaults: () => {
        set({
          // Fabrika ayarlarına dönüş karşılamayı da geri açar
          onboardingCompleted: false,
          activePage: 'dashboard',
          theme: 'light',
          selectedTrack: userProfile.selectedTrack,
          sidebarCollapsed: false,
          userName: userProfile.name,
          targetRank: userProfile.targetRank,
          obpScore: 75,
          showAyt: true,
          tytTopics: initialTytTopics,
          aytTopics: initialAytTopics,
          trials: initialTrials,
          studySessions: [],
          completedMissions: [],
          studyStreak: 0,
          lastActiveDate: null,
          timer: createIdleTimer(),
          lastBackupAt: null,
          backupReminderAnchorAt: null,
          backupReminderDays: DEFAULT_BACKUP_INTERVAL_DAYS,
          installCardDismissedAt: null,
        });
      },
    }),
    {
      name: 'yks_hazirlik_storage_v3',
      storage: createJSONStorage(() => asyncIndexedDbStorage),
      version: 3,
      /**
       * v0 → v1: karşılama ekranı eklendi. Sürüm 0'dan gelen kayıt, zaten
       * uygulamayı kullanan bir öğrenciye ait demektir; ona karşılama
       * gösterilmez, yoksa mevcut verisi temizlenme riskiyle karşılaşırdı.
       *
       * v1 → v2: 'tyt' ve 'ayt' sayfaları tek 'exams' sayfasında birleşti.
       * O sayfalarda kapatmış bir kullanıcı açılışta artık var olmayan bir
       * sayfaya düşerdi (PlaceholderPage) — kimliği çeviriyoruz.
       *
       * v2 → v3: çalışma türü (konu anlatımı / soru çözümü / branş denemesi)
       * ayrı bir alana taşındı. Diskteki SAYAÇ durumunda `activity` yok; konu
       * adından türetiyoruz, yoksa yarım kalmış bir "Tekrar/Video" seansı
       * arka planda sayma ayrıcalığını kaybederdi.
       *
       * Geçmiş SEANSLAR bilinçli olarak ellenmiyor: tür onlarda okuma anında
       * türetiliyor (resolveActivity). Yüzlerce kaydı migrasyonda yeniden
       * yazmak, yanlış türetme hâlinde geri dönüşü olmayan bir kayıp olurdu.
       */
      migrate: (persistedState, version) => {
        if (!persistedState) return persistedState;
        let s = persistedState;

        if (version < 1) {
          s = { ...s, onboardingCompleted: true };
        }
        if (version < 2 && (s.activePage === 'tyt' || s.activePage === 'ayt')) {
          s = { ...s, activePage: 'exams' };
        }
        if (version < 3 && s.timer && !s.timer.activity) {
          s = { ...s, timer: { ...s.timer, activity: resolveActivity(s.timer) } };
        }
        return s;
      },
      onRehydrateStorage: () => (state, error) => {
        // Okuma ya da JSON ayrıştırma patladıysa yazma kapalı kalır ve App
        // kurtarma ekranını gösterir; aksi hâlde sonraki ilk `set` diskteki
        // (belki kurtarılabilir) veriyi demo durumuyla ezerdi.
        if (error) {
          markReadFailed();
          return;
        }
        if (state) {
          // Yazma kapısı burada açılır: aşağıdaki set'ler, migrasyonla
          // güncellenmiş durumu da diske yazar.
          markHydrated();
          // Kapalıyken çalışır görünen seansı kurallara göre uzlaştır
          state.reconcileTimerOnLoad();
          state.setIsLoading(false);
          state.setHasHydrated(true);
        }
      },
    }
  )
);

export default useAppStore;
