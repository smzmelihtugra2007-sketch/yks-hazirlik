/**
 * ─── DENEMELER SAYFASI (TYT + AYT birleşik) ───
 *
 * Eskiden TYT Analiz ve AYT Analiz ayrı sekmelerdi. İkisi de aynı `ExamList`
 * bileşenini kullanıyordu ve tek farkları `examType` prop'uydu; buna karşılık
 * mobil alt menüde iki slot yiyorlardı. 7 sekme 375px genişlikte sıkışık
 * kaldığı için tek sayfada, içinde TYT/AYT segmented control ile birleştiler.
 *
 * Notlar:
 *  - "Sadece TYT" modunda (showAyt === false) AYT sekmesi gizlenmez, soluk ve
 *    tıklanamaz kalır; öğrenci nedenini görsün diye.
 *  - Seçili sekme YEREL state'te tutulur. Bilinçli: sekme tercihinin kalıcı
 *    olması gerekmiyor ve store'a bir alan daha eklemek migrasyon yükü demek.
 *  - Renkler CSS değişkenlerinden, segmented control ise index.css'teki
 *    .segmented / .segmented-pill sınıflarından gelir — üç temada da çalışır.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Plus, FileText } from 'lucide-react';
import ExamList from '../ui/ExamList';
import AddExamModal from '../ui/AddExamModal';
import TopicLeakPanel from '../ui/TopicLeakPanel';
import useAppStore from '../../store/useAppStore';
import { TRACKS } from '../../data/mockData';
import {
  pageContainer,
  pageSection,
  contentReveal,
  pressable,
  SOFT_SPRING,
  EASE_OUT_SOFT,
} from '../../utils/motion';

const TABS = ['TYT', 'AYT'];

export default function ExamsPage() {
  const { selectedTrack, showAyt } = useAppStore();
  const track = TRACKS[selectedTrack];

  const [activeTab, setActiveTab] = useState('TYT');
  const [modalOpen, setModalOpen] = useState(false);

  // AYT kapatılırken o sekmedeysek TYT'ye düş
  useEffect(() => {
    if (!showAyt && activeTab === 'AYT') setActiveTab('TYT');
  }, [showAyt, activeTab]);

  const isAyt = activeTab === 'AYT';

  const description = isAyt
    ? `Alan Yeterlilik Testi — ${track?.label || 'Sayısal'} alanı deneme sonuçları.`
    : 'Temel Yeterlilik Testi deneme sonuçlarını ve gelişimini takip et.';

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        variants={pageContainer}
        initial="initial"
        animate="animate"
        exit="exit"
        className="space-y-6 max-w-6xl mx-auto w-full"
      >
        {/* ── Başlık ── */}
        <motion.div
          variants={pageSection}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm shrink-0"
              style={{ backgroundColor: 'var(--accent-brand-light)' }}
            >
              <FileText className="w-5 h-5" style={{ color: 'var(--accent-brand)' }} />
            </div>
            <div className="min-w-0">
              <h1
                className="text-xl lg:text-2xl font-bold tracking-tight"
                style={{ color: 'var(--text-main)' }}
              >
                Denemeler
              </h1>
              {/* Açıklama sekmeye göre değişir; yumuşak geçsin */}
              <motion.p
                key={activeTab}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: EASE_OUT_SOFT }}
                className="text-xs mt-0.5 font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                {description}
              </motion.p>
            </div>
          </div>

          <motion.button
            {...pressable}
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm self-start sm:self-auto shrink-0 hover:opacity-90"
            style={{ backgroundColor: 'var(--accent-brand)' }}
          >
            <Plus className="w-4 h-4" />
            Yeni Deneme Ekle
          </motion.button>
        </motion.div>

        {/* ── TYT / AYT Seçici + Alan Rozeti ── */}
        <motion.div variants={pageSection} className="flex flex-wrap items-center gap-3">
          <div className="segmented inline-flex items-center gap-1 p-1.5 rounded-2xl">
            {TABS.map((tab) => {
              const isActive = tab === activeTab;
              const isDisabled = tab === 'AYT' && !showAyt;

              return (
                <button
                  key={tab}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setActiveTab(tab)}
                  title={isDisabled ? "AYT kapalı — Ayarlar'dan açabilirsin" : undefined}
                  className={`relative px-6 py-2 rounded-xl text-xs font-bold tracking-wide transition-colors duration-200 ${
                    isDisabled ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                  style={{
                    color: isActive && !isDisabled ? 'var(--text-main)' : 'var(--text-muted)',
                  }}
                >
                  {isActive && !isDisabled && (
                    <motion.span
                      layoutId="examsTabPill"
                      transition={SOFT_SPRING}
                      className="segmented-pill absolute inset-0 rounded-xl"
                    />
                  )}
                  <span className="relative z-10">{tab}</span>
                </button>
              );
            })}
          </div>

          {/* Alan rozeti — yalnızca AYT'de anlamlı */}
          <AnimatePresence>
            {isAyt && track && (
              <motion.span
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.28, ease: EASE_OUT_SOFT }}
                className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm"
                style={{ backgroundColor: track.color || '#6366f1' }}
              >
                {track.label}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Deneme Listesi ── */}
        <motion.div variants={pageSection}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={contentReveal}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <ExamList examType={activeTab} />
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* ── Konu bazlı kayıp dökümü ──
             Listenin ALTINDA duruyor: önce öğrencinin aradığı deneme kayıtları,
             sonra denemeler boyunca biriken çıkarım. */}
        <motion.div variants={pageSection}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`leaks-${activeTab}`}
              variants={contentReveal}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <TopicLeakPanel examType={activeTab} />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* ── Modal — açık sekmenin türüyle gelir ── */}
      <AddExamModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultType={activeTab}
      />
    </MotionConfig>
  );
}
