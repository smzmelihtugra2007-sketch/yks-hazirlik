/**
 * ─── STAT CARD ───
 * Yeniden kullanılabilir istatistik kartı.
 *
 * Props:
 *  - icon       : Lucide-React ikon bileşeni
 *  - iconColor  : İkon arka plan rengi (Tailwind bg- sınıfı)
 *  - iconText   : İkon metin rengi (Tailwind text- sınıfı)
 *  - title      : Kart başlığı (ör. "Hedef Sıralama")
 *  - value      : Ana değer (ör. "70.000")
 *  - subtitle   : Küçük açıklama / trend metni
 *  - trend      : 'up' | 'down' | 'neutral' — trend yönü
 */
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const TREND_CONFIG = {
  up: {
    Icon: TrendingUp,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/70',
  },
  down: {
    Icon: TrendingDown,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/70',
  },
  neutral: {
    Icon: Minus,
    color: 'text-slate-600 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800',
  },
};

export default function StatCard({
  icon: Icon,
  iconColor = 'bg-indigo-50 dark:bg-indigo-950/60',
  iconText = 'text-indigo-600 dark:text-indigo-400',
  title,
  value,
  subtitle,
  trend = 'neutral',
  index = 0,
}) {
  const trendMeta = TREND_CONFIG[trend] || TREND_CONFIG.neutral;
  const TrendIcon = trendMeta.Icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08, ease: 'easeOut' }}
      className="card p-5 flex flex-col justify-between gap-4"
    >
      {/* Üst satır: İkon + Trend rozeti */}
      <div className="flex items-start justify-between">
        <div
          className={`w-10 h-10 rounded-xl ${iconColor} flex items-center justify-center shadow-sm`}
        >
          <Icon className={`w-5 h-5 ${iconText}`} />
        </div>

        {subtitle && (
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${trendMeta.bg} ${trendMeta.color}`}
          >
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{subtitle}</span>
          </div>
        )}
      </div>

      {/* Alt kısım: Başlık + Değer */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
          {title}
        </p>
        <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ color: 'var(--text-main)' }}>
          {value}
        </p>
      </div>
    </motion.div>
  );
}
