/**
 * ─── YOL HARİTASI (GÖREV AĞACI / MISSION TREE) ───
 *
 * Kronometrede biriken konu bazlı çalışma süresini dikey bir zaman
 * çizelgesine dönüştürür. Her konu bir düğümdür ve 2 saatlik baraj
 * dolduğunda kapatılabilir; kapanan düğüm bir sonrakinin kilidini açar.
 *
 * İzolasyon notu: Bu sayfa hiçbir mevcut ekranın verisini veya davranışını
 * değiştirmez. Yalnızca studySessions'ı OKUR, kendi durumunu store'daki
 * ayrı `completedMissions` dizisinde tutar.
 *
 * Görsel dil:
 *  - Cam paneller (.glass-panel) — üç temada da ayrı ayarlanmış transparanlık
 *  - locked: mat, gri, düşük opaklık
 *  - active: nefes alan zümrüt halka (.mission-glow)
 *  - ready:  daha diri mavi nabız (.mission-glow-ready)
 *  - completed: antrasit zemin + içten parlaklık (.mission-completed)
 *
 * Kutlama: canvas-confetti + Web Audio API ile sentezlenmiş yükselen arpej.
 */
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Milestone,
  Lock,
  Check,
  Sparkles,
  Clock,
  Trophy,
  Timer as TimerIcon,
  RotateCcw,
} from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import { TYT_SUBJECTS, getSubjectsForTrack } from '../../data/subjects';
import {
  buildMissionChain,
  getOverallProgress,
  MISSION_THRESHOLD_MINUTES,
} from '../../utils/missions';
import { playLevelUpChime } from '../../utils/sound';
import {
  pageContainer,
  pageSection,
  listCard,
  contentReveal,
  pressable,
  SOFT_SPRING,
  EASE_OUT_SOFT,
} from '../../utils/motion';

/** Dakikayı "3s 15dk" biçiminde yazar. */
function formatDuration(totalMins) {
  if (!totalMins || totalMins <= 0) return '0 dk';
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs > 0 && mins > 0) return `${hrs}s ${mins}dk`;
  if (hrs > 0) return `${hrs} saat`;
  return `${mins} dk`;
}

/** Düğüm durumuna göre görsel eşleştirmeler tek yerde toplanır. */
const STATUS_META = {
  locked: {
    label: 'Kilitli',
    dotClass: 'bg-slate-400/30 border-slate-400/40',
    badgeClass: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  },
  active: {
    label: 'Açık',
    dotClass: 'bg-emerald-500/20 border-emerald-400/60 mission-glow',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  },
  ready: {
    label: 'Kapatmaya Hazır',
    dotClass: 'bg-sky-500/25 border-sky-400/70 mission-glow-ready',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
  },
  completed: {
    label: 'Tamamlandı',
    dotClass: 'bg-emerald-500 border-emerald-400',
    badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
};

/**
 * Kutlama efekti — düğmenin konumundan iki dalga hâlinde patlar.
 * Ekranın ortasından değil, basılan düğmeden çıkması etkiyi somutlaştırır.
 */
function fireConfetti(originEl) {
  let origin = { x: 0.5, y: 0.6 };

  if (originEl) {
    const rect = originEl.getBoundingClientRect();
    origin = {
      x: (rect.left + rect.width / 2) / window.innerWidth,
      y: (rect.top + rect.height / 2) / window.innerHeight,
    };
  }

  const palette = ['#10b981', '#38bdf8', '#6366f1', '#a78bfa', '#fbbf24'];

  confetti({
    particleCount: 70,
    spread: 65,
    startVelocity: 38,
    decay: 0.92,
    scalar: 0.9,
    ticks: 160,
    origin,
    colors: palette,
    disableForReducedMotion: true,
  });

  // İkinci, daha geniş ve gecikmeli dalga
  window.setTimeout(() => {
    confetti({
      particleCount: 45,
      spread: 110,
      startVelocity: 26,
      decay: 0.9,
      scalar: 0.7,
      ticks: 140,
      origin,
      colors: palette,
      disableForReducedMotion: true,
    });
  }, 130);
}

// ─────────────────────────────────────────────────────────────
//  Tek Düğüm (Timeline üzerindeki bir konu)
// ─────────────────────────────────────────────────────────────
function MissionNode({ node, isLast, onComplete, onUndo }) {
  const meta = STATUS_META[node.status];
  const isLocked = node.status === 'locked';
  const isCompleted = node.status === 'completed';
  const buttonRef = useRef(null);

  return (
    <motion.li
      custom={node.index}
      variants={listCard}
      className={`relative flex gap-4 ${isLocked ? 'opacity-50' : ''}`}
    >
      {/* ── Sol sütun: bağlantı çizgisi + düğüm noktası ── */}
      <div className="relative flex flex-col items-center shrink-0 w-9">
        <div
          className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-colors duration-300 ${meta.dotClass}`}
        >
          {isCompleted ? (
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          ) : isLocked ? (
            <Lock className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <span className="text-[11px] font-extrabold tabular-nums" style={{ color: 'var(--text-main)' }}>
              {node.index + 1}
            </span>
          )}
        </div>

        {/* Düğümler arası dikey bağ — tamamlananlarda zümrüt, diğerlerinde soluk */}
        {!isLast && (
          <div
            className="w-0.5 flex-1 min-h-[2rem] mt-1 rounded-full transition-colors duration-500"
            style={{
              backgroundColor: isCompleted ? 'rgba(16,185,129,0.55)' : 'var(--border-card)',
            }}
          />
        )}
      </div>

      {/* ── Sağ sütun: içerik kartı ── */}
      <div
        className={`glass-panel flex-1 mb-4 p-4 ${isCompleted ? 'mission-completed' : ''}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className={`text-sm font-bold truncate ${isCompleted ? 'line-through decoration-1' : ''}`}
              style={{ color: 'var(--text-main)' }}
            >
              {node.topic}
            </h3>
            <span
              className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${meta.badgeClass}`}
            >
              {meta.label}
            </span>
          </div>

          <span
            className="flex items-center gap-1.5 text-[11px] font-bold tabular-nums shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-subtle)' }} />
            {formatDuration(node.minutes)}
          </span>
        </div>

        {/* Baraj ilerlemesi — tamamlanmış düğümde gizlenir */}
        {!isCompleted && (
          <div className="mt-3 space-y-1.5">
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
              <motion.div
                className="h-full rounded-full origin-left"
                style={{
                  width: `${node.progress}%`,
                  backgroundColor: node.canComplete ? '#38bdf8' : '#10b981',
                }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, ease: EASE_OUT_SOFT }}
              />
            </div>
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-subtle)' }}>
              {isLocked
                ? 'Önceki görevi tamamlayınca açılır'
                : node.canComplete
                ? `2 saatlik baraj doldu — kapatmaya hazır`
                : `Kapatmak için ${formatDuration(node.remainingMinutes)} daha çalış`}
            </p>
          </div>
        )}

        {/* ── Eylem alanı ── */}
        <div className="mt-3 flex items-center justify-end gap-2">
          {isCompleted ? (
            <motion.button
              type="button"
              onClick={() => onUndo(node.id)}
              whileHover={{ scale: 1.06, rotate: -18 }}
              whileTap={{ scale: 0.92 }}
              transition={SOFT_SPRING}
              title="Bu görevi geri aç"
              aria-label="Görevi geri aç"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </motion.button>
          ) : (
            <motion.button
              ref={buttonRef}
              // Pasif butonda hover/tap tepkisi verilmez
              {...(node.canComplete ? pressable : {})}
              type="button"
              disabled={!node.canComplete}
              onClick={() => onComplete(node.id, buttonRef.current)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white shadow-sm bg-gradient-to-r from-sky-500 to-emerald-500 transition-opacity duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Tamamla
            </motion.button>
          )}
        </div>
      </div>
    </motion.li>
  );
}

// ─────────────────────────────────────────────────────────────
//  Sayfa
// ─────────────────────────────────────────────────────────────
export default function MissionTree() {
  // ── Alan (Bölüm) — Single Source of Truth ──
  // Bu sayfa alanı DEĞİŞTİRMEZ, yalnızca OKUR. Öğrencinin alanı ve "Sadece
  // TYT" tercihi Ayarlar'dan yönetilen global store alanlarıdır; buradaki
  // ders filtrelemesi doğrudan onlara bakar. Böylece Yol Haritası, AYT Analiz
  // ve Akıllı Öncelikler her zaman aynı alanı gösterir.
  const {
    studySessions,
    completedMissions,
    completeMission,
    uncompleteMission,
    showAyt,
    selectedTrack,
  } = useAppStore();

  // Genel ilerleme kartı, öğrencinin gerçekten sorumlu olduğu dersleri kapsar:
  // TYT'nin tamamı + (AYT açıksa) yalnızca kendi alanının AYT dersleri.
  const allSubjects = useMemo(
    () =>
      showAyt
        ? [...TYT_SUBJECTS, ...getSubjectsForTrack('AYT', selectedTrack)]
        : TYT_SUBJECTS,
    [showAyt, selectedTrack]
  );

  // ── 1. Aşama: Sınav Türü (Segmented Control) ──
  // AYT sekmesi artık gizlenmiyor; "Sadece TYT" modunda soluk ve tıklanamaz
  // duruyor ki öğrenci neden erişemediğini görebilsin.
  const examTabs = ['TYT', 'AYT'];
  const [activeExam, setActiveExam] = useState('TYT');

  // AYT kapatılırken o sekmedeysek TYT'ye düş
  useEffect(() => {
    if (!showAyt && activeExam === 'AYT') setActiveExam('TYT');
  }, [showAyt, activeExam]);

  // ── 2. Aşama: Seçili sınav türünün, seçili alana ait dersleri ──
  const subjectsInExam = useMemo(
    () => getSubjectsForTrack(activeExam, selectedTrack),
    [activeExam, selectedTrack]
  );

  const [activeSubjectId, setActiveSubjectId] = useState(TYT_SUBJECTS[0]?.id);

  // Sınav sekmesi değişince, seçili ders artık bu türde değilse ilk derse geç
  useEffect(() => {
    if (!subjectsInExam.some((s) => s.id === activeSubjectId)) {
      setActiveSubjectId(subjectsInExam[0]?.id);
    }
  }, [subjectsInExam, activeSubjectId]);

  const activeSubject =
    subjectsInExam.find((s) => s.id === activeSubjectId) || subjectsInExam[0];

  // ── PC'de fare tekerleğiyle yatay kaydırma ──
  // React'in sentetik onWheel'i "wheel" olayını passive işaretler; bu
  // yüzden JSX'te preventDefault() çağırmak sessizce yutulur ve sayfa
  // hem dikeyde kayar hem de çip listesi yatayda kayar (çift hareket).
  // Bunu önlemek için native, passive:false bir listener gerekiyor.
  const subjectTrayRef = useRef(null);
  useEffect(() => {
    const el = subjectTrayRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      // Yalnızca dikey bileşen baskınsa devreye gir; trackpad'de kullanıcı
      // zaten yatay kaydırıyorsa (deltaX baskın) doğal davranışa dokunma.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  const { nodes, totals } = useMemo(
    () => buildMissionChain(activeSubject, studySessions, completedMissions),
    [activeSubject, studySessions, completedMissions]
  );

  const overall = useMemo(
    () => getOverallProgress(allSubjects, completedMissions),
    [allSubjects, completedMissions]
  );

  // Kutlama: görsel + işitsel geri bildirim eşzamanlı tetiklenir
  const handleComplete = useCallback(
    (missionId, originEl) => {
      completeMission(missionId);
      fireConfetti(originEl);
      playLevelUpChime();
    },
    [completeMission]
  );

  const handleUndo = useCallback(
    (missionId) => uncompleteMission(missionId),
    [uncompleteMission]
  );

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={pageContainer}
        initial="initial"
        animate="animate"
        exit="exit"
        className="relative space-y-6 max-w-4xl mx-auto w-full"
      >
        {/* Arka plandaki yumuşak ışık huzmeleri */}
        <div className="mission-aurora" aria-hidden="true" />

        {/* ── Başlık ── */}
        <motion.div variants={pageSection} className="relative z-10 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: 'var(--accent-brand-light)' }}
          >
            <Milestone className="w-5 h-5" style={{ color: 'var(--accent-brand)' }} />
          </div>
          <div>
            <h1 className="text-xl lg:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
              Yol Haritası
            </h1>
            <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>
              Her konuya {MISSION_THRESHOLD_MINUTES / 60} saat çalış, düğümü kapat, sıradakinin kilidini aç.
            </p>
          </div>
        </motion.div>

        {/* ── Genel İlerleme Kartı ── */}
        <motion.div variants={pageSection} className="relative z-10 glass-panel p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <Trophy className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                {overall.completed} / {overall.total} görev tamamlandı
              </span>
            </div>
            <motion.span
              key={overall.percentage}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE_OUT_SOFT }}
              className="text-lg font-extrabold tabular-nums"
              style={{ color: 'var(--accent-brand)' }}
            >
              %{overall.percentage}
            </motion.span>
          </div>

          <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-sky-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${overall.percentage}%` }}
              transition={{ duration: 0.6, ease: EASE_OUT_SOFT }}
            />
          </div>
        </motion.div>

        {/* ── 1. Aşama: Sınav Türü (iOS tarzı, mat Segmented Control) ──
             Glow / gradient yok: gri kapsayıcı + beyaz (koyu temada slate-700)
             mat pil + shadow-sm. "Sadece TYT" modunda AYT sekmesi gizlenmez,
             soluk ve tıklanamaz kalır — öğrenci nedenini görebilsin. */}
        <motion.div variants={pageSection} className="relative z-10">
          <div className="inline-flex items-center gap-1 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 [html.theme-sepia_&]:bg-[#2e221a]/80 border border-slate-200/60 dark:border-slate-700/50 [html.theme-sepia_&]:border-[#453225]/60">
            {examTabs.map((exam) => {
              const isActive = exam === activeExam;
              const isDisabled = exam === 'AYT' && !showAyt;

              return (
                <button
                  key={exam}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setActiveExam(exam)}
                  title={isDisabled ? 'AYT kapalı — Ayarlar\'dan açabilirsin' : undefined}
                  className={`relative px-6 py-2 rounded-xl text-xs font-bold tracking-wide transition-colors duration-200 ${
                    isDisabled
                      ? 'opacity-40 cursor-not-allowed text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#a38d7b]'
                      : isActive
                      ? 'text-slate-900 dark:text-white [html.theme-sepia_&]:text-amber-50'
                      : 'text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#a38d7b] hover:text-slate-700 dark:hover:text-slate-200 [html.theme-sepia_&]:hover:text-amber-100'
                  }`}
                >
                  {isActive && !isDisabled && (
                    <motion.span
                      layoutId="missionExamPill"
                      transition={SOFT_SPRING}
                      className="absolute inset-0 rounded-xl shadow-sm bg-white dark:bg-slate-700 [html.theme-sepia_&]:bg-[#201712]"
                    />
                  )}
                  <span className="relative z-10">{exam}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── 2. Aşama: Seçili sınavın dersleri ──
             Aynı mat/kapsayıcılı dil, ama artık tek satır: flex-wrap sağda
             devasa boşluk bırakıyordu (kısa ders sayısında kapsayıcı yarım
             dolup kalıyordu). Bunun yerine App Store tarzı tek satırlık
             yatay kaydırma — kapsayıcı her zaman tek satır yüksekliğinde.
             PC'de fare tekerleği desteği subjectTrayRef ile bağlanır.
             Scrollbar artık gizli değil: ince ve zarif ama görünür, böylece
             kaydırılabilir olduğu fark edilir. */}
        <motion.div variants={pageSection} className="relative z-10">
          <div className="p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 [html.theme-sepia_&]:bg-[#2e221a]/80 border border-slate-200/60 dark:border-slate-700/50 [html.theme-sepia_&]:border-[#453225]/60">
            <div
              ref={subjectTrayRef}
              className="flex overflow-x-auto items-center gap-1 pb-1.5 [scrollbar-width:thin] [scrollbar-color:theme(colors.slate.300)_transparent] dark:[scrollbar-color:theme(colors.slate.600)_transparent] [html.theme-sepia_&]:[scrollbar-color:#5c452f_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [html.theme-sepia_&]:[&::-webkit-scrollbar-thumb]:bg-[#5c452f] hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-500"
            >
              {subjectsInExam.map((s) => {
                const isActive = s.id === activeSubject?.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSubjectId(s.id)}
                    className={`relative shrink-0 whitespace-nowrap px-3 py-1.5 rounded-xl text-xs transition-all duration-200 ${
                      isActive
                        ? 'font-semibold text-indigo-600 dark:text-indigo-400 [html.theme-sepia_&]:text-amber-400'
                        : 'text-slate-600 dark:text-slate-400 [html.theme-sepia_&]:text-[#a38d7b] hover:text-slate-900 dark:hover:text-slate-200 [html.theme-sepia_&]:hover:text-amber-100 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 [html.theme-sepia_&]:hover:bg-[#453225]/40'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="missionSubjectChip"
                        transition={SOFT_SPRING}
                        className="absolute inset-0 rounded-xl shadow-sm bg-white dark:bg-slate-700 [html.theme-sepia_&]:bg-[#201712]"
                      />
                    )}
                    <span className="relative z-10">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* ── Seçili Dersin Zaman Çizelgesi ── */}
        <motion.div variants={pageSection} className="relative z-10">
          <AnimatePresence mode="wait">
            {/* Ders/kategori değişince içerik "küt" diye belirmesin diye
                hafif bir fade + yükseliş (contentReveal) kullanılır. */}
            <motion.div
              key={activeSubject?.id}
              variants={contentReveal}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {/* Ders başlığı özeti */}
              <div className="flex items-center justify-between gap-3 mb-4 px-1">
                <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                  {activeSubject?.label}
                </span>
                <span
                  className="flex items-center gap-1.5 text-[11px] font-bold"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  <TimerIcon className="w-3.5 h-3.5" />
                  Toplam {formatDuration(totals.studiedMinutes)} • {totals.completed}/{totals.total} düğüm
                </span>
              </div>

              {nodes.length === 0 ? (
                <div className="glass-panel p-8 text-center">
                  <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    Bu derse tanımlı konu yok
                  </p>
                  <p className="text-xs mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                    src/data/subjects.js içinden bu derse konu ekleyebilirsin.
                  </p>
                </div>
              ) : (
                <ul className="relative">
                  {nodes.map((node, i) => (
                    <MissionNode
                      key={node.id}
                      node={node}
                      isLast={i === nodes.length - 1}
                      onComplete={handleComplete}
                      onUndo={handleUndo}
                    />
                  ))}
                </ul>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </MotionConfig>
  );
}
