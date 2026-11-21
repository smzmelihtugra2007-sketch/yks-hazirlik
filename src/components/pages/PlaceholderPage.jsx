/**
 * ─── PLACEHOLDER SAYFALARI ───
 * Her sekme için geçici "yakında" bileşeni.
 * Adım 2+'da gerçek içerikle değiştirilecek.
 */
import { motion } from 'framer-motion';
import { BarChart3, FileText, Zap, Settings } from 'lucide-react';

const PAGE_META = {
  dashboard: {
    icon: BarChart3,
    title: 'Genel Bakış',
    description: 'TYT & AYT performans özetleri, net trendleri ve hedef takibi burada görünecek.',
  },
  exams: {
    icon: FileText,
    title: 'Denemeler',
    description: 'TYT ve AYT deneme sonuçları, ders bazlı netler ve gelişim takibi.',
  },
  triage: {
    icon: Zap,
    title: 'Akıllı Öncelikler',
    description: 'Aciliyet skoruna göre sıralanmış konu listesi — en zayıf noktalar en üstte.',
  },
  settings: {
    icon: Settings,
    title: 'Ayarlar',
    description: 'Alan seçimi (SAY / EA / SÖZ / DİL), hedef sıralama ve profil ayarları.',
  },
};

// Sayfa geçiş animasyonu varyantları
const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -8 },
};

export default function PlaceholderPage({ pageId }) {
  const meta = PAGE_META[pageId] || PAGE_META.dashboard;
  const Icon = meta.icon;

  return (
    <motion.div
      key={pageId}
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex-1 flex flex-col items-center justify-center text-center px-6"
    >
      <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-5">
        <Icon className="w-8 h-8 text-brand-500" />
      </div>

      <h1 className="text-2xl font-bold text-ink-900 mb-2 tracking-tight">
        {meta.title}
      </h1>

      <p className="text-ink-500 max-w-md text-sm leading-relaxed">
        {meta.description}
      </p>

      <div className="mt-6 px-4 py-2 rounded-full bg-surface-100 border border-surface-200 text-xs font-medium text-ink-500">
        🚧&nbsp; Yapım aşamasında — Adım 2'de gelecek
      </div>
    </motion.div>
  );
}
