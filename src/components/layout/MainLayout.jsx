/**
 * ─── MAIN LAYOUT ───
 * Uygulamanın iskelet bileşeni:
 *  • IndexedDB Asenkron Yükleme Ekranı (isLoading kontrolü)
 *  • Masaüstünde: Sol Sidebar + Sağ İçerik Alanı
 *  • Mobilde: Üst Header + İçerik + Alt BottomNav
 *  • Dinamik Tema Motoru (Light / Dark / Sepia)
 *
 * AnimatePresence ile sayfa geçişlerini animasyonlu hale getirir.
 */
import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import MobileHeader from './MobileHeader';
import Dashboard from '../pages/Dashboard';
import ExamsPage from '../pages/ExamsPage';
import Triage from '../pages/Triage';
import MissionTree from '../pages/MissionTree';
import StudyTimer from '../pages/StudyTimer';
import SettingsPage from '../pages/Settings';
import PlaceholderPage from '../pages/PlaceholderPage';
import useAppStore from '../../store/useAppStore';
import { useTimerWatchdog } from '../../hooks/useTimerEngine';

// Tüm sayfa bileşenleri kayıtlı
const PAGE_MAP = {
  dashboard: Dashboard,
  exams: ExamsPage,
  triage: Triage,
  roadmap: MissionTree,
  timer: StudyTimer,
  settings: SettingsPage,
};

export default function MainLayout() {
  const { activePage, theme, isLoading } = useAppStore();

  // Sayaç kurallarını uygulayan gözcü — sayaç sayfası kapalıyken de çalışmalı,
  // bu yüzden her zaman ekranda olan bu bileşene bağlı.
  useTimerWatchdog();

  // ─── Tema Senkronizasyonu (HTML root class'ı yönetimi) ───
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-sepia');

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'sepia') {
      root.classList.add('theme-sepia');
    }
  }, [theme]);

  // IndexedDB İlk Yükleme Ekranı
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center transition-colors duration-200"
        style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4 text-center p-6"
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg animate-pulse">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-main)' }}>
              YKS Hazırlık
            </h2>
            <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
              Verileriniz güvenli depodan yükleniyor...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Sayfayı belirle
  const PageComponent = PAGE_MAP[activePage];

  return (
    <div
      className="flex min-h-screen transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-app)', color: 'var(--text-main)' }}
    >
      {/* ── Masaüstü Sidebar ── */}
      <Sidebar />

      {/* ── Ana İçerik Alanı ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobil Header */}
        <MobileHeader />

        {/* Sayfa İçeriği */}
        <main className="flex-1 flex flex-col p-4 lg:p-8 pb-24 lg:pb-8">
          <AnimatePresence mode="wait">
            {PageComponent ? (
              <PageComponent key={activePage} />
            ) : (
              <PlaceholderPage key={activePage} pageId={activePage} />
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* ── Mobil Alt Menü ── */}
      <BottomNav />
    </div>
  );
}
