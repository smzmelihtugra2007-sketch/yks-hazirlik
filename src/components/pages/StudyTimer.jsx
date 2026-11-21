/**
 * ─── ODAK KRONOMETRESİ V8 (MÜKEMMEL SİLME ANİMASYONLARI & TAM ODAK) ───
 *
 * Özellikler:
 *  - Sıralı 7 Mod: Kronometre | Özel Süre | Pomodoro (25dk) | Ders (40dk) | Derin (50dk) | TYT (165dk) | AYT (180dk)
 *  - Tam Odak Modu: Fullscreen API + Screen Wake Lock API (Ekranın uykuya geçmesini engeller)
 *  - ESC / fullscreenchange senkronizasyonu
 *  - Apple / Vercel Tarzı 3'lü Simetrik ve Merkezlenmiş Kontrol Butonları (Başla/Duraklat, Sıfırla, Bitir & Kaydet)
 *  - Tekil, Hafif ve Güvenilir Soft Chime Alarmı (Süre bitiminde yumuşak bildirim)
 *  - KESİN GUARD CLAUSE: totalSeconds < 60 durumunda 0 animasyon / 0 kayıt garantisi
 *  - React.memo + Framer Motion 'layout' destekli pürüzsüz seans silme animasyonu
 *  - %100 Tema + Mobil / PC Responsive uyumu
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Timer as TimerIcon,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  Flame,
  Clock,
  BookOpen,
  ChevronRight,
  Trash2,
  Sparkles,
  BarChart2,
  Bell,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  Eye,
} from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import {
  TYT_SUBJECTS,
  AYT_SUBJECTS,
  getTopicsForSubject,
  getSubjectId,
} from '../../data/subjects';
import { collapsible, EASE_OUT_SOFT } from '../../utils/motion';
import { MODES, getMode, getTargetSeconds } from '../../data/timerModes';
import {
  ACTIVITIES,
  DEFAULT_ACTIVITY_ID,
  getActivity,
  activityNeedsTopic,
  resolveActivity,
} from '../../data/activities';
import { useTimerElapsed } from '../../hooks/useTimerEngine';
import { AUTO_PAUSE_LABELS, isKeepAliveSession } from '../../utils/session';
import { buildSubjectStats, toSegments } from '../../utils/studyStats';
import ConfirmDialog from '../ui/ConfirmDialog';
import { toDateKey } from '../../utils/dateKey';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// ─── TYT & AYT Ders Listeleri (tek kaynak: src/data/subjects.js) ───
const TYT_TIMER_SUBJECTS = TYT_SUBJECTS.map((s) => s.label);
const AYT_TIMER_SUBJECTS = AYT_SUBJECTS.map((s) => s.label);

// ─── Oyunlaştırma Etiketi ───
function getSessionTag(minutes) {
  if (minutes < 20) return 'Kısa Seans 🔴';
  if (minutes < 35) return 'Pomodoro 🟠';
  if (minutes < 50) return 'Verimli Ders 🟢';
  return 'Derin Odak 💎';
}

// ─── Süre Formatlayıcı (dk → "3s 15dk") ───
function formatDuration(totalMins) {
  if (!totalMins || totalMins === 0) return '0 dk';
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs > 0 && mins > 0) return `${hrs}s ${mins}dk`;
  if (hrs > 0) return `${hrs} saat`;
  return `${mins} dk`;
}

/**
 * ─── Çalışma türü renkleri ───
 * Üç temada da okunur sabit tonlar. CSS değişkeni kullanmıyoruz: bunlar tema
 * rengi değil, birbirinden ayrılması gereken KATEGORİ renkleri.
 */
const ACTIVITY_COLORS = {
  lecture: '#8b5cf6',  // mor — izleme/dinleme
  practice: '#10b981', // yeşil — üretim
  branch: '#f59e0b',   // amber — ölçüm
};

/**
 * Yığılı tür çubuğu.
 *
 * İki bilgiyi aynı anda taşır:
 *   - Çubuğun TOPLAM GENİŞLİĞİ (`fillPct`) → bu satırın üst kümedeki payı.
 *     Eski tek renkli çubuğun anlamıydı ve dersler arası kıyası sağlıyordu;
 *     yalnızca tür dağılımına çevirseydik tüm çubuklar tam genişlik olur ve
 *     o kıyas kaybolurdu.
 *   - İÇİNDEKİ SEGMENTLER → o sürenin türlere dağılımı. Yeni bilgi.
 *
 * `fillPct` verilmezse çubuk tam genişlikte durur (genel özet satırında
 * kıyaslanacak bir üst küme yok).
 */
function ActivityBar({ segments, height = 8, delay = 0, fillPct = 100 }) {
  if (segments.length === 0) return null;

  return (
    <div
      className="rounded-full overflow-hidden w-full"
      style={{ height, backgroundColor: 'var(--bg-input)' }}
    >
      <motion.div
        className="flex h-full rounded-full overflow-hidden"
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, fillPct)}%` }}
        transition={{ duration: 0.5, delay, ease: EASE_OUT_SOFT }}
      >
        {segments.map((seg) => (
          <div
            key={seg.id}
            style={{ width: `${seg.pct}%`, backgroundColor: ACTIVITY_COLORS[seg.id] }}
            title={`${seg.icon} ${seg.label}: ${formatDuration(seg.minutes)}`}
          />
        ))}
      </motion.div>
    </div>
  );
}

/** "📖 4s 20dk · ✏️ 6s" — çubuğun yanındaki sayısal karşılığı. */
function ActivityChips({ segments, className = '' }) {
  if (segments.length === 0) return null;

  return (
    <span className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 ${className}`}>
      {segments.map((seg) => (
        <span
          key={seg.id}
          className="inline-flex items-center gap-1 text-[10px] font-bold tabular-nums"
          style={{ color: ACTIVITY_COLORS[seg.id] }}
          title={seg.label}
        >
          <span aria-hidden="true">{seg.icon}</span>
          {formatDuration(seg.minutes)}
        </span>
      ))}
    </span>
  );
}

/**
 * Seans satırındaki "↳ Konu · 📖 Anlatım" çizgisi.
 * Tür eski kayıtlarda konu adından türetilir, bu yüzden her satırda
 * gösterilebiliyor. Branşta konu zaten "Branş Denemesi" olduğundan rozet
 * tekrar olmasın diye yalnızca konu yazılır.
 */
function SessionTopicLine({ session }) {
  if (!session.topic) return null;

  const activityId = resolveActivity(session);
  const meta = getActivity(activityId);
  const showBadge = activityNeedsTopic(activityId);

  return (
    <p
      className="text-[10px] font-semibold truncate mt-0.5 flex items-center gap-1.5"
      style={{ color: 'var(--accent-brand)' }}
      title={`${session.topic} · ${meta.label}`}
    >
      <span className="truncate">↳ {session.topic}</span>
      {showBadge && (
        <span
          className="shrink-0 font-bold"
          style={{ color: ACTIVITY_COLORS[activityId] }}
        >
          {meta.icon} {meta.short}
        </span>
      )}
    </p>
  );
}

// ─── Seans Geçmişi (Memoized + Pürüzsüz Silme Animasyonu) ───
const SessionHistoryList = React.memo(function SessionHistoryList({
  studySessions,
  deleteStudySession,
}) {
  const sessions = studySessions || [];

  return (
    <div className="card p-5 lg:p-6 space-y-4">
      <div
        className="flex items-center justify-between pb-3"
        style={{ borderBottom: '1px solid var(--border-card)' }}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4.5 h-4.5" style={{ color: 'var(--text-muted)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
            Seans Geçmişi
          </h2>
        </div>
        <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
          {sessions.length} Seans
        </span>
      </div>

      {sessions.length === 0 ? (
        <div className="py-8 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Kaydedilmiş seans bulunmuyor.
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          <AnimatePresence mode="popLayout" initial={false}>
            {sessions.map((session) => (
              <motion.div
                key={session.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: -30, transition: { duration: 0.2 } }}
                className="flex items-center justify-between p-3 rounded-xl border text-xs"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-card)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg font-bold flex items-center justify-center text-[10px] shadow-sm shrink-0"
                    style={{
                      backgroundColor: 'var(--accent-brand-light)',
                      color: 'var(--accent-brand)',
                    }}
                  >
                    {session.durationMinutes}dk
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold truncate" style={{ color: 'var(--text-main)' }}>
                      {session.subject}
                    </p>

                    <SessionTopicLine session={session} />

                    <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {session.date} •{' '}
                      <span className="font-bold" style={{ color: 'var(--accent-brand)' }}>
                        {session.type}
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteStudySession(session.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors shrink-0 ml-2"
                  aria-label="Seansı sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
});

// ─── Ders İstatistikleri — Kırılımlı / Drill-down (Memoized) ───
const SubjectStatsPanel = React.memo(function SubjectStatsPanel({ studySessions }) {
  // Açık olan ders satırları (ders adı → true)
  const [expanded, setExpanded] = useState({});

  const toggleSubject = useCallback((subject) => {
    setExpanded((prev) => ({ ...prev, [subject]: !prev[subject] }));
  }, []);

  // Ders → konu → tür kırılımı; hesap saf modülde (bkz. utils/studyStats.js)
  const { stats, grandTotal, byActivity } = useMemo(
    () => buildSubjectStats(studySessions || []),
    [studySessions]
  );

  const overallSegments = useMemo(
    () => toSegments(byActivity, grandTotal),
    [byActivity, grandTotal]
  );

  return (
    <div className="card p-5 lg:p-6 space-y-4">
      <div
        className="flex items-center justify-between pb-3"
        style={{ borderBottom: '1px solid var(--border-card)' }}
      >
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4.5 h-4.5" style={{ color: 'var(--accent-brand)' }} />
          <h2 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
            Ders İstatistikleri
          </h2>
        </div>
        <span className="text-xs font-extrabold" style={{ color: 'var(--accent-brand)' }}>
          Toplam: {formatDuration(grandTotal)}
        </span>
      </div>

      {/* Genel tür dağılımı — "zamanımın ne kadarı izlemek, ne kadarı üretmek"
          sorusunu tek bakışta cevaplar. Ders kırılımına inmeden önce. */}
      {grandTotal > 0 && (
        <div className="space-y-1.5">
          <ActivityBar segments={overallSegments} height={6} />
          <ActivityChips segments={overallSegments} />
        </div>
      )}

      {stats.length === 0 ? (
        <div className="py-8 text-center text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Henüz çalışma verisi yok.
        </div>
      ) : (
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {stats.map((stat, i) => {
            const isOpen = !!expanded[stat.subject];

            return (
              <div key={stat.subject}>
                {/* ── Ana Satır: Ders (tıklanabilir) ── */}
                <button
                  type="button"
                  onClick={() => toggleSubject(stat.subject)}
                  aria-expanded={isOpen}
                  className="w-full text-left space-y-1 rounded-lg px-2 py-1.5 -mx-2 hover:bg-[var(--bg-input)] transition-colors duration-200"
                >
                  <div className="flex items-center justify-between text-xs font-semibold gap-2">
                    <span className="flex items-center gap-1 min-w-0" style={{ color: 'var(--text-main)' }}>
                      <motion.span
                        animate={{ rotate: isOpen ? 90 : 0 }}
                        transition={{ duration: 0.28, ease: EASE_OUT_SOFT }}
                        className="flex shrink-0"
                        style={{ color: 'var(--text-subtle)' }}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </motion.span>
                      <span className="truncate">{stat.subject}</span>
                    </span>
                    <span className="tabular-nums font-bold shrink-0" style={{ color: 'var(--text-muted)' }}>
                      {formatDuration(stat.totalMinutes)}{' '}
                      <span className="text-[10px] font-normal" style={{ color: 'var(--text-subtle)' }}>
                        (%{stat.percentage})
                      </span>
                    </span>
                  </div>

                  {/* Genişlik = dersin genel toplamdaki payı (eski çubuğun
                      anlamı), renkler = o süredeki tür dağılımı (yeni bilgi) */}
                  <ActivityBar
                    segments={stat.segments}
                    height={8}
                    delay={i * 0.05}
                    fillPct={stat.percentage}
                  />

                  <ActivityChips segments={stat.segments} className="pt-0.5" />
                </button>

                {/* ── Kırılım: O derse ait konular ── */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      variants={collapsible}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="overflow-hidden"
                    >
                      <div
                        className="pl-4 ml-1.5 mt-2 mb-1 space-y-2.5"
                        style={{ borderLeft: '1px solid var(--border-card)' }}
                      >
                        {stat.topics.map((t) => (
                          <div key={t.topic} className="space-y-1">
                            <div className="flex items-center justify-between text-[11px] font-medium gap-2">
                              <span className="truncate" style={{ color: 'var(--text-muted)' }}>
                                {t.topic}
                              </span>
                              <span
                                className="tabular-nums font-bold shrink-0"
                                style={{ color: 'var(--text-subtle)' }}
                              >
                                {formatDuration(t.totalMinutes)}
                              </span>
                            </div>

                            {/* Asıl kazanç burada: "Türev'e 10 saat" değil,
                                "Türev'e 📖 8 saat ✏️ 2 saat". İlki iyi
                                görünüyor, ikincisi sorunu söylüyor.
                                Genişlik = konunun DERS içindeki payı. */}
                            <ActivityBar
                              segments={t.segments}
                              height={5}
                              fillPct={t.percentage}
                            />
                            <ActivityChips segments={t.segments} />
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

// ─── Ana Bileşen ───
export default function StudyTimer() {
  const {
    studySessions, addStudySession, deleteStudySession, showAyt,
    timer, setTimerSelection, setTimerMode, setTimerCustomMinutes,
    startTimer, pauseTimer, resetTimer, clearTimerAutoPause,
  } = useAppStore();

  // ─── Seans durumu artık store'da (bkz. utils/session.js) ───
  // Sayfa değişince bu bileşen unmount oluyor; sayaç yerel state'te kalsaydı
  // her sekme değişiminde seans yok olurdu.
  const selectedSubject = timer.subject || TYT_TIMER_SUBJECTS[0];
  const selectedTopic = timer.topic || '';
  const selectedActivity = timer.activity || DEFAULT_ACTIVITY_ID;
  const activityMeta = getActivity(selectedActivity);
  const needsTopic = activityNeedsTopic(selectedActivity);
  const customMinutes = timer.customMinutes ?? 35;
  const isRunning = timer.isRunning;
  const alarmFired = timer.alarmFired;

  const mode = getMode(timer.modeId);
  const targetSeconds = getTargetSeconds(timer.modeId, customMinutes);

  // Canlı geçen süre — saniyede bir tazelenir, kaynağı zaman damgası
  const elapsedSeconds = useTimerElapsed();
  const displaySeconds = targetSeconds
    ? Math.max(0, targetSeconds - elapsedSeconds)
    : elapsedSeconds;

  // İlk açılışta store'da ders yoksa varsayılanı yaz
  useEffect(() => {
    if (!timer.subject) {
      setTimerSelection({
        subject: TYT_TIMER_SUBJECTS[0],
        subjectId: getSubjectId(TYT_TIMER_SUBJECTS[0]),
      });
    }
  }, [timer.subject, setTimerSelection]);

  // Seçili derse ait konular — ders değişince yeniden hesaplanır.
  const availableTopics = useMemo(
    () => getTopicsForSubject(selectedSubject),
    [selectedSubject]
  );

  // Ders değiştiğinde konu seçimi sıfırlanır (başka dersin konusu taşınmasın).
  // Branş denemesinde konu diye bir şey yok, sabit kalır.
  const handleSubjectChange = useCallback((subjectLabel) => {
    setTimerSelection({
      subject: subjectLabel,
      subjectId: getSubjectId(subjectLabel),
      ...(needsTopic ? { topic: '' } : {}),
    });
  }, [setTimerSelection, needsTopic]);

  /** Çalışma türü — konuyu da uyarlar (bkz. store/setTimerSelection). */
  const handleActivityChange = useCallback((activityId) => {
    setTimerSelection({ activity: activityId });
  }, [setTimerSelection]);

  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  /**
   * ─── Seans kilidi ───
   * Sayaç bir kez başladıysa ders, konu, ÇALIŞMA TÜRÜ ve mod kilitlenir;
   * çıkış yolu yalnızca Kaydet veya Sıfırla'dır.
   *
   * Neden: seçimler eskiden yalnızca `isRunning` iken kilitliydi, yani
   * DURAKLATILMIŞKEN değiştirilebiliyordu. Bu bir açığa yol açıyordu —
   * öğrenci "Tekrar/Video" seçip (arka planda da işleyen tek konu) saatlerce
   * süre biriktirip, sonra konuyu normal bir konuyla değiştirip
   * kaydedebiliyordu. Mod sekmeleri de kilitleniyor: mod değişimi biriken
   * süreyi sessizce sıfırlıyor, yani hem ikinci bir kaçış yolu hem de
   * onaysız veri kaybıydı.
   *
   * Çalışma türü kilide SONRADAN eklendi ve artık kritik: arka planda sayma
   * ayrıcalığı eskiden tek bir konu kovasına aitken şimdi her dersin her
   * konusunda seçilebilen bir tür. Tür kilitli olmasaydı aynı açık birebir
   * geri gelirdi — "Konu Anlatımı"nda biriktir, kaydetmeden "Soru Çözümü"ne
   * çevir.
   */
  const sessionLocked = isRunning || elapsedSeconds > 0;

  // Kaydı engelleyen durumların tek uyarı kanalı (süre < 1dk, konu seçilmedi)
  const [alertMessage, setAlertMessage] = useState('');

  // ─── Tam Odak Modu (Fullscreen & Wake Lock) ───
  const [isFullscreen, setIsFullscreen] = useState(false);
  const wakeLock = useRef(null);

  // Alarm artık Web Audio ile sentezleniyor (utils/sound.js) ve gözcü
  // tarafından çalınıyor; dışarıdan mp3 indirilmediği için çevrimdışı çalışır.
  const alertTimerRef = useRef(null);
  const successTimerRef = useRef(null);

  // ─── Tam Odak Modu Fonksiyonu (Toggle Fullscreen & Wake Lock) ───
  const toggleFocusMode = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        // Tam Ekrana Geç
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }

        // Screen Wake Lock API: Ekranın kararmasını / uyumasını engelle
        if ('wakeLock' in navigator) {
          try {
            wakeLock.current = await navigator.wakeLock.request('screen');
            console.log('[WakeLock] Ekran uyanık tutma aktif.');
          } catch (wakeErr) {
            console.log('[WakeLock] İstek başarısız (cihaz/tarayıcı kısıtlaması):', wakeErr);
          }
        }
      } else {
        // Tam Ekrandan Çık
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }

        // Wake Lock serbest bırak
        if (wakeLock.current) {
          await wakeLock.current.release();
          wakeLock.current = null;
        }
      }
    } catch (err) {
      console.log('Tam odak modu geçiş hatası:', err);
    }
  }, []);

  // ─── Fullscreen Event Listener & Cleanup ───
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);

      if (!isFs && wakeLock.current) {
        wakeLock.current.release().catch(() => {});
        wakeLock.current = null;
      }
    };

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && document.fullscreenElement && 'wakeLock' in navigator && !wakeLock.current) {
        try {
          wakeLock.current = await navigator.wakeLock.request('screen');
        } catch (err) {
          console.log('[WakeLock] Yeniden alma hatası:', err);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLock.current) {
        wakeLock.current.release().catch(() => {});
        wakeLock.current = null;
      }
    };
  }, []);

  // ─── Mod Değiştir ───
  const handleModeChange = useCallback((newMode) => {
    setTimerMode(newMode.id);
  }, [setTimerMode]);

  // ─── AYT gizlenince AYT modunu ve dersini temizle ───
  // Aktif seans varken DOKUNMA: öğrenci AYT Matematik çalışırken Ayarlar'dan
  // AYT'yi kapatırsa, ders sessizce TYT'ye kayar ve süre yanlış derse yazılırdı;
  // mod sıfırlaması ise biriken süreyi tamamen silerdi. Seans bitince
  // (kaydet/sıfırla) seçim zaten serbest kalıyor.
  useEffect(() => {
    if (sessionLocked) return;

    if (!showAyt && AYT_TIMER_SUBJECTS.includes(selectedSubject)) {
      // Ders TYT'ye düşerken konu da sıfırlanır
      handleSubjectChange(TYT_TIMER_SUBJECTS[0]);
    }
    if (!showAyt && mode.id === 'ayt180') {
      handleModeChange(MODES[0]);
    }
  }, [showAyt, sessionLocked, selectedSubject, mode.id, handleSubjectChange, handleModeChange]);

  // ─── Sayaç döngüsü YOK ───
  // Geçen süre artık saniye sayarak değil, startedAt zaman damgasından
  // hesaplanıyor (useTimerElapsed). Hedef süre kontrolü ve otomatik
  // duraklatma kuralları MainLayout'taki gözcüde işliyor; böylece bu sayfa
  // kapalıyken de doğru çalışıyorlar.

  // ─── Sıfırla ───
  // Kayıt sonrası doğrudan çağrılır (onay gerekmez); düğmeden geliyorsa
  // önce ConfirmDialog sorar.
  const handleReset = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const handleResetRequest = useCallback(() => {
    if (elapsedSeconds <= 0) return; // sıfırlanacak bir şey yok
    setConfirmResetOpen(true);
  }, [elapsedSeconds]);

  const handleResetConfirmed = useCallback(() => {
    setConfirmResetOpen(false);
    resetTimer();
  }, [resetTimer]);

  /** Başlat / Duraklat — elle duraklatmada uyarı sebebi yazılmaz. */
  const handleToggleRun = useCallback(() => {
    if (isRunning) pauseTimer(null);
    else startTimer();
  }, [isRunning, pauseTimer, startTimer]);

  // ─── Formatla (SS : DD : SS) ───
  const formatTime = (totalSec) => {
    const safeSec = Math.max(0, totalSec);
    const hrs  = Math.floor(safeSec / 3600);
    const mins = Math.floor((safeSec % 3600) / 60);
    const secs = safeSec % 60;
    return `${String(hrs).padStart(2,'0')} : ${String(mins).padStart(2,'0')} : ${String(secs).padStart(2,'0')}`;
  };

  // ─── Bitir & Kaydet (KIRMIZI ÇİZGİ: <60s Kesin Guard Clause) ───
  // Kaydı engelleyen durumu 3 saniyelik zarif uyarı olarak gösterir
  const raiseAlert = useCallback((message) => {
    clearTimeout(alertTimerRef.current);
    setAlertMessage(message);
    alertTimerRef.current = setTimeout(() => setAlertMessage(''), 3000);
  }, []);

  const handleFinishAndSave = useCallback(() => {
    // Geçen süre her modda aynı anlama geliyor artık: gerçekten çalışılan süre
    const totalSeconds = elapsedSeconds;

    // ⛔ GUARD: 60s altında HİÇBİR animasyon/state/kayıt tetiklenmez
    if (totalSeconds < 60) {
      raiseAlert('En az 1 dakika odaklanmadan seans kaydedilemez!');
      return;
    }

    // ⛔ GUARD: Konu seçilmeden kayıt yok — hiyerarşik istatistik buna dayanıyor.
    // Branş denemesi tüm dersi kapsadığı için konu aranmaz.
    if (needsTopic && !selectedTopic) {
      raiseAlert('Seansı kaydetmek için önce bir konu seçmelisin.');
      return;
    }

    const durationMinutes = Math.floor(totalSeconds / 60);
    addStudySession({
      subject: selectedSubject,               // Ders adı (istatistiklerin üst kırılımı)
      subjectId: getSubjectId(selectedSubject), // Kalıcı ders kodu (ör. TYT_MAT)
      topic: selectedTopic,                     // Konu (istatistiklerin alt kırılımı)
      activity: selectedActivity,               // Anlatım / soru / branş
      durationMinutes,
      type: getSessionTag(durationMinutes),
    });

    handleReset();
    clearTimeout(successTimerRef.current);
    setSaveSuccess(true);
    successTimerRef.current = setTimeout(() => setSaveSuccess(false), 3000);
  }, [elapsedSeconds, selectedSubject, selectedTopic, selectedActivity, needsTopic,
      addStudySession, handleReset, raiseAlert]);

  // ─── İstatistikler (Bugünkü Toplam) ───
  // Streak motoruyla aynı gün anahtarı kullanılmalı; UTC kullanılsaydı gece
  // 00:00-03:00 arası rozet ile seri birbirine zıt sonuç gösterirdi.
  const todayStr = toDateKey();
  const todaySessions = useMemo(
    () => (studySessions || []).filter((s) => s.date === todayStr),
    [studySessions, todayStr]
  );
  const todayTotalMinutes = useMemo(
    () => todaySessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0),
    [todaySessions]
  );

  // Geri sayım ilerleme yüzdesi
  const progressPct = targetSeconds
    ? Math.min(100, Math.max(0, (elapsedSeconds / targetSeconds) * 100))
    : 0;

  // Konu anlatımı seçiliyse sayaç uygulama dışında da işlemeye devam eder
  const keepAlive = isKeepAliveSession({ activity: selectedActivity, topic: selectedTopic });

  // Başlat/Kaydet için seçim tamam mı? Branş denemesinde konu aranmaz.
  const selectionReady = Boolean(selectedSubject) && (!needsTopic || Boolean(selectedTopic));

  // Görünür mod listesi
  const visibleModes = showAyt ? MODES : MODES.filter((m) => m.id !== 'ayt180');

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`space-y-6 max-w-4xl mx-auto w-full transition-all duration-300 ${
        isFullscreen ? 'py-4' : ''
      }`}
    >
      {/* ── Başlık ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: 'var(--accent-brand-light)' }}
          >
            <TimerIcon className="w-5 h-5" style={{ color: 'var(--accent-brand)' }} />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-main)' }}>
              Odak Kronometresi
            </h1>
            <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>
              TYT & AYT ders bazlı derin çalışma seanslarını tut ve odak süreni analiz et.
            </p>
          </div>
        </div>

        {/* Günlük Odak Rozeti & Tam Odak Butonu */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Günlük Odak Rozeti */}
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border bg-amber-500/10 border-amber-500/30 shadow-sm">
            <Flame className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Bugün: {formatDuration(todayTotalMinutes)}
            </span>
          </div>

          {/* Tam Odak (Fullscreen + Wake Lock) Butonu */}
          <button
            type="button"
            onClick={toggleFocusMode}
            title={isFullscreen ? 'Tam Odaktan Çık (ESC)' : 'Tam Odak Modu (Ekran Uyanık Kalır)'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 shadow-sm ${
              isFullscreen
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-500/30'
                : 'hover:opacity-90'
            }`}
            style={{
              backgroundColor: isFullscreen ? undefined : 'var(--bg-input)',
              borderColor: isFullscreen ? undefined : 'var(--border-card)',
              color: isFullscreen ? undefined : 'var(--text-main)',
            }}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Çık</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-indigo-500" />
                <span className="hidden sm:inline">Tam Odak</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ═══════════════════ Ana Kronometre Kartı ═══════════════════ */}
      <div
        className={`card p-5 sm:p-8 flex flex-col items-center justify-center text-center relative overflow-hidden transition-all duration-300 ${
          isFullscreen ? 'shadow-2xl ring-2 ring-indigo-500/40' : 'shadow-card'
        }`}
      >
        {/* Tam Odak Aktif İndikatörü */}
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Eye className="w-3.5 h-3.5 animate-pulse" />
            <span>Tam Odak Modu Aktif (Ekran Kapanmaz)</span>
          </motion.div>
        )}

        {/* ── Mod Seçici Sekmeler ── */}
        <div className="w-full overflow-x-auto no-scrollbar mb-5 flex justify-start sm:justify-center">
          <div
            className="w-fit flex items-center gap-1.5 p-1.5 bg-slate-100/80 dark:bg-slate-800/60 [html.theme-sepia_&]:bg-[#2e221a] rounded-2xl border border-slate-200/60 dark:border-slate-700/50 [html.theme-sepia_&]:border-[#453225] shadow-inner transition-colors"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-card)',
            }}
          >
            {visibleModes.map((m) => {
              const active = mode.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={sessionLocked}
                  title={sessionLocked ? 'Mod değiştirmek için seansı kaydet veya sıfırla' : undefined}
                  onClick={() => handleModeChange(m)}
                  className={`py-2 px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                    sessionLocked && !active ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                  style={{
                    backgroundColor: active ? 'var(--bg-card)' : 'transparent',
                    color: active ? 'var(--accent-brand)' : 'var(--text-muted)',
                    boxShadow: active ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Özel Süre Girişi ── */}
        <AnimatePresence>
          {mode.id === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-xs flex items-center justify-center gap-2 mb-4 p-2.5 rounded-2xl border bg-amber-500/5 border-amber-500/20"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Hedef:</span>
              <input
                type="number"
                min={1}
                max={360}
                value={customMinutes}
                onChange={(e) => {
                  const val = Math.max(1, Math.min(360, parseInt(e.target.value) || 1));
                  setTimerCustomMinutes(val);
                }}
                disabled={sessionLocked}
                className="input-field py-1 text-sm font-extrabold text-center w-20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-60 disabled:cursor-not-allowed"
                placeholder="dk"
              />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>dakika</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Çalışma Türü ──
             Konu anlatımı / soru çözümü / branş denemesi. Eskiden bu ayrım
             konu listesinin içine gömülü iki özel kovaydı ve konu anlatımı
             gerçek bir konuya yazılamıyordu (bkz. data/activities.js).
             Ders ve konu gibi seans başlayınca KİLİTLENİR: yoksa anlatımda
             arka planda süre biriktirip kaydetmeden önce soruya çevirme
             açığı doğardı. */}
        <div className="w-full max-w-lg mb-2.5 text-left">
          <span
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            <Eye className="w-3.5 h-3.5" style={{ color: 'var(--accent-brand)' }} />
            Çalışma Türü
          </span>

          <div
            role="group"
            aria-label="Çalışma türü"
            className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl"
            style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-card)' }}
          >
            {ACTIVITIES.map((a) => {
              const active = a.id === selectedActivity;
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleActivityChange(a.id)}
                  disabled={sessionLocked}
                  title={
                    sessionLocked
                      ? 'Çalışma türünü değiştirmek için seansı kaydet veya sıfırla'
                      : a.hint
                  }
                  className={`relative py-2 px-1 rounded-xl text-[11px] font-bold transition-colors duration-200 ${
                    sessionLocked && !active ? 'opacity-40 cursor-not-allowed' : ''
                  } ${sessionLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  style={{
                    backgroundColor: active ? 'var(--accent-brand-light)' : 'transparent',
                    border: active
                      ? '1px solid var(--accent-brand)'
                      : '1px solid transparent',
                    color: active ? 'var(--accent-brand)' : 'var(--text-muted)',
                  }}
                >
                  <span className="block text-base leading-none mb-0.5">{a.icon}</span>
                  <span className="block leading-tight">{a.label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-[10px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
            {activityMeta.hint}
          </p>
        </div>

        {/* ── Ders & Konu Seçimi (Cascading Select) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 w-full max-w-lg text-left">
          {/* Ders */}
          <label className="flex flex-col gap-1.5">
            <span
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--accent-brand)' }} />
              Ders
            </span>
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              disabled={sessionLocked}
              title={sessionLocked ? 'Ders değiştirmek için seansı kaydet veya sıfırla' : undefined}
              className="input-field py-2.5 text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer hover:border-[var(--accent-brand)] transition-colors duration-200"
            >
              <optgroup label="── TYT Dersleri ──">
                {TYT_TIMER_SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </optgroup>
              {showAyt && (
                <optgroup label="── AYT Dersleri ──">
                  {AYT_TIMER_SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>

          {/* Konu — ders seçilmeden veya konusu tanımsız derste pasif kalır.
               Branş denemesi tüm dersi kapsadığı için konu sorulmaz; seçici
               yerine neden sorulmadığını yazan bir kutu durur. */}
          {needsTopic ? (
            <label className="flex flex-col gap-1.5">
              <span
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--accent-brand)' }} />
                Konu
                {/* Zorunlu alan işareti — sayaç konu seçilmeden başlamaz */}
                <span aria-hidden="true" style={{ color: '#f43f5e' }}>*</span>
              </span>
              <select
                value={selectedTopic}
                onChange={(e) => setTimerSelection({ topic: e.target.value })}
                disabled={sessionLocked || !selectedSubject || availableTopics.length === 0}
                title={sessionLocked ? 'Konu değiştirmek için seansı kaydet veya sıfırla' : undefined}
                className="input-field py-2.5 text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer hover:border-[var(--accent-brand)] transition-colors duration-200"
                style={!selectedTopic ? { color: 'var(--text-subtle)' } : undefined}
              >
                {/* Seçilemez placeholder — konu zorunlu olduğu için boş değer kalıcı seçenek değil */}
                <option value="" disabled>
                  {selectedSubject ? 'Konu Seçiniz' : 'Önce ders seçin'}
                </option>
                {availableTopics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
          ) : (
            <div className="flex flex-col gap-1.5">
              <span
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--text-subtle)' }} />
                Konu
              </span>
              <div
                className="rounded-xl py-2.5 px-3 text-xs font-bold flex items-center"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px dashed var(--border-card)',
                  color: 'var(--text-subtle)',
                }}
              >
                Dersin tamamı
              </div>
            </div>
          )}
        </div>

        {/* Dijital Zaman Ekranı (SS : DD : SS) */}
        <div
          className={`my-2 py-6 sm:py-8 px-4 sm:px-8 rounded-3xl border shadow-inner w-full max-w-lg transition-all duration-300 relative ${
            isFullscreen ? 'scale-[1.03] shadow-lg' : ''
          }`}
          style={{
            backgroundColor: alarmFired ? 'rgba(16,185,129,0.08)' : 'var(--bg-input)',
            borderColor: alarmFired ? 'rgba(16,185,129,0.4)' : isFullscreen ? 'var(--accent-brand)' : 'var(--border-card)',
          }}
        >
          {/* Dairesel İlerleme Halkası */}
          {mode.countdown && (
            <div className="absolute top-3.5 right-3.5">
              <svg width="38" height="38" className="rotate-[-90deg]">
                <circle cx="19" cy="19" r="15" fill="none" stroke="var(--border-card)" strokeWidth="3.5" />
                <circle
                  cx="19" cy="19" r="15" fill="none"
                  stroke={alarmFired ? '#10b981' : 'var(--accent-brand)'}
                  strokeWidth="3.5"
                  strokeDasharray={`${2 * Math.PI * 15}`}
                  strokeDashoffset={`${2 * Math.PI * 15 * (1 - progressPct / 100)}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
            </div>
          )}

          {/* Dijital Sayaç Metni */}
          <motion.div
            key={displaySeconds}
            initial={{ scale: 0.98, opacity: 0.9 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-mono text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight tabular-nums select-none drop-shadow-sm"
            style={{ color: alarmFired ? '#10b981' : 'var(--text-main)' }}
          >
            {formatTime(displaySeconds)}
          </motion.div>

          <p
            className="text-xs font-bold mt-2.5 flex items-center justify-center gap-1.5"
            style={{ color: alarmFired ? '#10b981' : 'var(--accent-brand)' }}
          >
            {alarmFired ? (
              <>
                <Bell className="w-3.5 h-3.5" />
                Süre tamamlandı! Kaydetmeyi unutma 🎉
              </>
            ) : (
              <>
                <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                {isRunning ? 'Çalışma seansı devam ediyor...' : 'Sayaç duraklatıldı'}
              </>
            )}
          </p>

          {/* Konu anlatımı seçiliyse sayacın arka planda da işlediğini belirt */}
          {keepAlive && !alarmFired && (
            <p className="text-[11px] font-semibold mt-1.5" style={{ color: 'var(--text-subtle)' }}>
              Konu anlatımında sayaç uygulamadan çıksan da işlemeye devam eder.
            </p>
          )}
        </div>

        {/* ── Otomatik Duraklatma Bildirimi ──
             Öğrenci geri döndüğünde sayacın neden durduğunu görmeli. */}
        <AnimatePresence>
          {timer.autoPausedReason && timer.autoPausedReason !== 'target' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28, ease: EASE_OUT_SOFT }}
              className="mt-4 p-3 rounded-xl border flex items-center justify-between gap-3 w-full max-w-lg bg-amber-500/10 border-amber-500/30"
            >
              <span className="text-xs font-semibold text-left" style={{ color: 'var(--text-main)' }}>
                {AUTO_PAUSE_LABELS[timer.autoPausedReason]}
              </span>
              <button
                type="button"
                onClick={clearTimerAutoPause}
                className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/15 transition-colors"
              >
                Tamam
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 3'lü Simetrik & Merkezlenmiş Kontrol Butonları ── */}
        <div className="w-full max-w-md grid grid-cols-3 gap-3 mt-6">
          {/* 1. Başlat / Duraklat — konu seçilmeden sayaç hiç başlamaz.
               Zorunluluk kayıt anına bırakılsaydı öğrenci 50 dakika çalışıp
               en sonda "konu seç" uyarısıyla karşılaşırdı. Çalışırken buton
               pasifleşmez, aksi hâlde seansı duraklatamazdı. */}
          <button
            type="button"
            onClick={handleToggleRun}
            disabled={!selectionReady && !isRunning}
            title={!selectionReady && !isRunning ? 'Önce ders ve konu seç' : undefined}
            className={`flex items-center justify-center gap-2 py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${
              isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-indigo-600 hover:bg-indigo-700 disabled:hover:bg-indigo-600'
            }`}
          >
            {isRunning ? (
              <><Pause className="w-4 h-4" /> Duraklat</>
            ) : (
              <><Play className="w-4 h-4" /> Başla</>
            )}
          </button>

          {/* 2. Sıfırla — onay ister, süre silineceği için */}
          <button
            type="button"
            onClick={handleResetRequest}
            disabled={elapsedSeconds <= 0}
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold border transition-all active:scale-95 shadow-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-main)',
            }}
          >
            <RotateCcw className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            Sıfırla
          </button>

          {/* 3. Bitir & Kaydet — konu seçilmeden pasif (branşta konu aranmaz) */}
          <button
            type="button"
            onClick={handleFinishAndSave}
            disabled={!selectionReady}
            title={!selectionReady ? 'Önce bir konu seç' : 'Seansı kaydet'}
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-2xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-600 disabled:active:scale-100"
          >
            <CheckCircle className="w-4 h-4" />
            Kaydet
          </button>
        </div>

        {/* Konu seçilmemişken butonun neden pasif olduğunu açıklayan ipucu */}
        <AnimatePresence>
          {!selectionReady && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28, ease: EASE_OUT_SOFT }}
              className="mt-3 text-[11px] font-semibold"
              style={{ color: 'var(--text-subtle)' }}
            >
              Sayacı başlatmak için yukarıdan bir konu seç.
            </motion.p>
          )}
        </AnimatePresence>

        {/* ── Kaydı Engelleyen Durum Uyarısı (süre / konu) ── */}
        <AnimatePresence>
          {alertMessage && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center gap-2 text-sm font-medium shadow-sm w-full max-w-lg"
              style={{ color: 'var(--text-main)' }}
            >
              <span>⚠️</span>
              <span>{alertMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Başarı Bildirimi ── */}
        <AnimatePresence>
          {saveSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-4 py-2.5 rounded-xl border border-emerald-500/30 w-full max-w-lg"
            >
              <Sparkles className="w-4 h-4" />
              Seans başarıyla kaydedildi ve ders istatistiklerine işlendi!
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════ Alt Paneller ═══════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SubjectStatsPanel studySessions={studySessions} />
        <SessionHistoryList
          studySessions={studySessions}
          deleteStudySession={deleteStudySession}
        />
      </div>

      {/* ── Sıfırlama Onayı ──
           Geçen süre mesajda gösterilir; öğrenci ne kaybedeceğini görsün. */}
      <ConfirmDialog
        isOpen={confirmResetOpen}
        title="Sayacı sıfırlamak istediğine emin misin?"
        message={`${formatTime(elapsedSeconds)} süre silinecek ve kaydedilmeyecek. Bu işlem geri alınamaz.`}
        confirmLabel="Sıfırla"
        cancelLabel="Vazgeç"
        onConfirm={handleResetConfirmed}
        onClose={() => setConfirmResetOpen(false)}
      />
    </motion.div>
  );
}
