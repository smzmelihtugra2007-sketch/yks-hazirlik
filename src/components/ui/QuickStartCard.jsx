/**
 * ─── HIZLI BAŞLAT KARTI (Dashboard) ───
 *
 * Öğrencinin en sık yaptığı iş seans başlatmak. Bu kart olmadan yol şuydu:
 * uygulama açılır → Sayaç sekmesine geç → Başla. Kart bunu tek dokunuşa
 * indiriyor ve daha önemlisi, yarım kalmış bir seansı ana ekranda görünür
 * kılıyor — aksi hâlde öğrenci Sayaç sekmesine gidene kadar fark etmiyordu.
 *
 * Başlatınca Sayaç sayfasına da geçilir. Bu kasıtlı: sayaç, sayfasından
 * 5 dakikadan uzun ayrı kalınınca otomatik duraklıyor (bkz. utils/session.js).
 * Dashboard'da kalsaydı seans birkaç dakika sonra kendiliğinden duracaktı.
 *
 * Canlı süre bu bileşenin içinde tik atıyor; Dashboard'ın ağır grafikleri
 * saniyede bir yeniden render olmasın diye kart ayrı bir bileşen.
 */
import { motion } from 'framer-motion';
import { Play, Timer as TimerIcon, ArrowRight } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import { getMode, getTargetSeconds } from '../../data/timerModes';
import { getActivity, resolveActivity, activityNeedsTopic } from '../../data/activities';
import { useTimerElapsed } from '../../hooks/useTimerEngine';
import { EASE_OUT_SOFT } from '../../utils/motion';

/** Saniyeyi "SS:DD" veya "S:DD:SS" biçiminde yazar. */
function formatClock(totalSec) {
  const s = Math.max(0, totalSec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/** Dakikayı "1 sa 20 dk" biçiminde yazar. */
function formatMinutes(totalSec) {
  const mins = Math.floor(totalSec / 60);
  if (mins < 60) return `${mins} dk`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h} sa ${m} dk` : `${h} sa`;
}

export default function QuickStartCard() {
  const timer = useAppStore((s) => s.timer);
  const startTimer = useAppStore((s) => s.startTimer);
  const setActivePage = useAppStore((s) => s.setActivePage);

  const elapsed = useTimerElapsed();

  const mode = getMode(timer.modeId);
  const targetSeconds = getTargetSeconds(timer.modeId, timer.customMinutes);

  // Çalışma türü: branş denemesinde konu aranmaz, "dersin tamamı" demektir
  const activityId = resolveActivity(timer);
  const activity = getActivity(activityId);
  const needsTopic = activityNeedsTopic(activityId);
  const hasSelection = Boolean(timer.subject) && (!needsTopic || Boolean(timer.topic));

  /** "AYT Matematik · Türev · 📖 Anlatım" — tür de görünsün ki seçim netleşsin */
  const selectionLabel = [
    timer.subject,
    needsTopic ? timer.topic : 'Dersin tamamı',
    `${activity.icon} ${activity.short}`,
  ]
    .filter(Boolean)
    .join(' · ');

  const isRunning = timer.isRunning;
  const isPaused = !isRunning && timer.accumulatedSeconds > 0;

  // Geri sayımda kalan, kronometrede geçen süre gösterilir
  const shownSeconds = targetSeconds ? Math.max(0, targetSeconds - elapsed) : elapsed;

  const goToTimer = () => setActivePage('timer');

  const startAndGo = () => {
    startTimer();
    setActivePage('timer');
  };

  // ─── Duruma göre başlık, açıklama ve eylem ───
  let title;
  let subtitle;
  let actionLabel;
  let action;
  let accent;

  if (isRunning) {
    title = selectionLabel;
    subtitle = `${mode.label} · ${formatClock(shownSeconds)}`;
    actionLabel = 'Sayaca git';
    action = goToTimer;
    accent = '#10b981';
  } else if (isPaused) {
    title = selectionLabel;
    subtitle = `Yarım kalmış seans · ${formatMinutes(elapsed)} çalışıldı`;
    actionLabel = 'Devam et';
    action = startAndGo;
    accent = '#f59e0b';
  } else if (hasSelection) {
    title = selectionLabel;
    subtitle = `${mode.label} · kaldığın yerden devam`;
    actionLabel = 'Başlat';
    action = startAndGo;
    accent = 'var(--accent-brand)';
  } else {
    title = 'Çalışmaya başla';
    subtitle = 'Ders ve konu seç, sayaç hazır';
    actionLabel = 'Sayaca git';
    action = goToTimer;
    accent = 'var(--accent-brand)';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT_SOFT }}
      className="card p-4 sm:p-5 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Durum ikonu — çalışırken nabız atar */}
        <div
          className="relative shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--bg-input)' }}
        >
          <TimerIcon className="w-5 h-5" style={{ color: accent }} />
          {isRunning && (
            <span
              className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-ping"
              style={{ backgroundColor: accent }}
            />
          )}
        </div>

        <div className="min-w-0">
          <p
            className="text-[10px] font-bold uppercase tracking-wider"
            style={{ color: 'var(--text-subtle)' }}
          >
            {isRunning ? 'Seans sürüyor' : isPaused ? 'Yarım seans' : 'Odak'}
          </p>
          <h3
            className="text-sm font-bold truncate mt-0.5"
            style={{ color: 'var(--text-main)' }}
            title={title}
          >
            {title}
          </h3>
          <p
            className="text-xs font-medium truncate mt-0.5 tabular-nums"
            style={{ color: 'var(--text-muted)' }}
          >
            {subtitle}
          </p>
        </div>
      </div>

      <motion.button
        type="button"
        onClick={action}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-opacity hover:opacity-90"
        style={{ backgroundColor: accent === 'var(--accent-brand)' ? 'var(--accent-brand)' : accent }}
      >
        {isRunning ? <ArrowRight className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        <span>{actionLabel}</span>
      </motion.button>
    </motion.div>
  );
}
