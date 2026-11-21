/**
 * ─── BOTTOM NAV (Mobil Alt Menü) ───
 *
 * Mobil cihazlarda ekranın altında sabit duran navigasyon çubuğu.
 * Mobilde sığmama ve kırpılma (truncate) sorununu önlemek için
 * kısa isimler (shortName: Özet, TYT, AYT, Öncelikler, Sayaç, Ayarlar) kullanılır.
 * Karanlık tema ve Sepia desteği içerir.
 */
import { motion } from 'framer-motion';
import {
  BarChart3,
  FileText,
  Target,
  Zap,
  Milestone,
  Timer,
  Settings,
  Play,
  Pause,
} from 'lucide-react';
import { MENU_ITEMS } from '../../data/mockData';
import useAppStore from '../../store/useAppStore';

const ICON_MAP = {
  BarChart3,
  FileText,
  Target,
  Zap,
  Milestone,
  Timer,
  Settings,
};

export default function BottomNav() {
  const { activePage, setActivePage, timer } = useAppStore();

  // Sayaç sekmesi, seansın durumuna göre ikon değiştirir: çalışırken Play,
  // yarım kalmış (duraklatılmış) seansta Pause, boştayken normal Timer.
  const sessionState = timer.isRunning
    ? 'running'
    : timer.accumulatedSeconds > 0
    ? 'paused'
    : 'idle';

  // Mobilde Ayarlar alt menüde değil, MobileHeader'daki dişli ikonunda.
  // Böylece günlük kullanılan beş hedef kalıyor: Özet, Denemeler,
  // Öncelikler, Harita, Sayaç — 375px genişlikte rahat sığıyorlar.
  const menuItems = MENU_ITEMS.filter((item) => item.id !== 'settings');

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bottom-nav-surface shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {menuItems.map((item) => {
          const isTimerTab = item.id === 'timer';
          const Icon = isTimerTab && sessionState !== 'idle'
            ? (sessionState === 'running' ? Play : Pause)
            : ICON_MAP[item.icon];
          const isActive = activePage === item.id;
          const displayName = item.shortName || item.name || item.label;

          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className="relative flex flex-col items-center justify-center flex-1 h-14 rounded-xl transition-colors duration-150 select-none px-0.5"
            >
              {/* Aktif göstergesi — düğmeyi tam ortalayan arka plan.
                  Renk CSS değişkeninden gelir: açık temada indigo-50,
                  koyu temada saydam indigo, Gece Kahvesi'nde saydam amber. */}
              {isActive && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-x-1 inset-y-1 rounded-xl pointer-events-none"
                  style={{ backgroundColor: 'var(--accent-brand-light)' }}
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}

              {/* İkon ve Metin Tam Merkezde (Kısa İsim ve Sıfır Kırpılma) */}
              <div className="relative z-10 flex flex-col items-center justify-center gap-0.5">
                <span className="relative">
                  <Icon
                    className="w-5 h-5 transition-colors duration-200"
                    style={{
                      color: isTimerTab && sessionState === 'running'
                        ? '#10b981'
                        : isTimerTab && sessionState === 'paused'
                        ? '#f59e0b'
                        : isActive
                        ? 'var(--accent-brand)'
                        : 'var(--text-subtle)',
                    }}
                  />
                  {/* Çalışan seansın nabzı — hangi sekmede olursan ol görünür */}
                  {isTimerTab && sessionState === 'running' && (
                    <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  )}
                </span>
                <span
                  className="text-[10px] sm:text-[11px] font-bold tracking-tight transition-colors duration-200 leading-none text-center whitespace-nowrap"
                  style={{ color: isActive ? 'var(--accent-brand)' : 'var(--text-muted)' }}
                >
                  {displayName}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Alt safe-area boşluğu (iPhone Home Bar için) */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
