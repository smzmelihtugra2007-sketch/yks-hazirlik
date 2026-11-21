/**
 * ─── SIDEBAR ───
 * Masaüstünde sol tarafta görünen navigasyon çubuğu.
 * Daraltılabilir (collapsed) mod destekler.
 * Karanlık tema ve Sepia desteği içerir (CSS değişkenleri ile tam entegre).
 */
import { motion, AnimatePresence } from 'framer-motion';
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
  PanelLeftClose,
  PanelLeftOpen,
  GraduationCap,
} from 'lucide-react';
import { MENU_ITEMS } from '../../data/mockData';
import useAppStore from '../../store/useAppStore';
import { useStreak } from '../../hooks/useStreak';
import { DAILY_GOAL_MINUTES, MONTHLY_RIGHTS } from '../../utils/streak';

// İkon haritası — string → React bileşeni
const ICON_MAP = {
  BarChart3,
  FileText,
  Target,
  Zap,
  Milestone,
  Timer,
  Settings,
};

export default function Sidebar() {
  const { activePage, setActivePage, sidebarCollapsed, toggleSidebar, timer } =
    useAppStore();

  // Sayaç sekmesi seansın durumuna göre ikon ve renk değiştirir
  const sessionState = timer.isRunning
    ? 'running'
    : timer.accumulatedSeconds > 0
    ? 'paused'
    : 'idle';

  // Seri ve bugünün durumu seans geçmişinden türetilir (store'dan okunmaz)
  const {
    current: studyStreak,
    todayMinutes,
    monthlyRightsLeft,
  } = useStreak();
  const todayPct = Math.min(100, Math.round((todayMinutes / DAILY_GOAL_MINUTES) * 100));

  // Masaüstünde dikey alan bol; Ayarlar dahil tüm öğeler burada durur.
  // (TYT/AYT ayrımı artık Denemeler sayfasının içindeki sekmede.)
  const menuItems = MENU_ITEMS;

  return (
    <motion.aside
      className="hidden lg:flex flex-col h-screen sticky top-0 shadow-sidebar z-30 transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-card)',
      }}
      animate={{ width: sidebarCollapsed ? 72 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* ── Logo / Başlık ── */}
      <div
        className="flex items-center gap-3 px-4 h-16 overflow-hidden"
        style={{ borderBottom: '1px solid var(--border-card)' }}
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="font-bold text-lg whitespace-nowrap"
              style={{ color: 'var(--text-main)' }}
            >
              YKS Hazırlık
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Navigasyon Öğeleri ── */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isTimerTab = item.id === 'timer';
          const timerActive = isTimerTab && sessionState !== 'idle';
          const Icon = timerActive
            ? (sessionState === 'running' ? Play : Pause)
            : ICON_MAP[item.icon];
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`nav-item w-full ${isActive ? 'active' : ''} ${
                sidebarCollapsed ? 'justify-center px-0' : ''
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="relative flex-shrink-0 flex">
                <Icon
                  className="w-5 h-5 transition-colors duration-200"
                  style={{
                    color: sessionState === 'running' && isTimerTab
                      ? '#10b981'
                      : sessionState === 'paused' && isTimerTab
                      ? '#f59e0b'
                      : isActive ? 'var(--accent-brand)' : 'var(--text-subtle)',
                  }}
                />
                {/* Çalışan seansın nabzı */}
                {isTimerTab && sessionState === 'running' && (
                  <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                )}
              </span>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden truncate text-xs sm:text-sm font-semibold"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>

      {/* ── Streak / Seri Kutusu ── */}
      <div
        className="mx-3 mb-3 overflow-hidden rounded-xl border transition-all"
        style={{
          borderColor: studyStreak > 0 ? 'rgba(245,158,11,0.4)' : 'var(--border-card)',
          backgroundColor: studyStreak > 0 ? 'rgba(245,158,11,0.06)' : 'var(--bg-input)',
        }}
      >
        {sidebarCollapsed ? (
          /* Daraltılmış: sadece alev ikonu */
          <div className="flex flex-col items-center gap-0.5 py-2.5">
            <span className={`text-xl leading-none ${studyStreak > 0 ? '' : 'grayscale opacity-40'}`}>🔥</span>
            {studyStreak > 0 && (
              <span className="text-[10px] font-extrabold text-amber-500">{studyStreak}</span>
            )}
          </div>
        ) : (
          /* Açık: tam bilgi */
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={studyStreak > 0 ? 'text-base' : 'text-base grayscale opacity-40'}>🔥</span>
                <span className="text-xs font-bold" style={{ color: studyStreak > 0 ? '#f59e0b' : 'var(--text-subtle)' }}>
                  {studyStreak > 0 ? `${studyStreak} Günlük Seri` : 'Seri Başlat'}
                </span>
              </div>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-subtle)' }}>
                {todayMinutes}/{DAILY_GOAL_MINUTES} dk
              </span>
            </div>
            {/* Günlük hedef çubuğu */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-card)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${todayPct}%`,
                  backgroundColor: todayPct >= 100 ? '#10b981' : '#f59e0b',
                }}
              />
            </div>
            <p className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>
              {todayPct >= 100 ? '✅ Günlük hedefe ulaştın!' : `3 saatlik hedefe %${todayPct} ulaştın`}
            </p>

            {/* Aylık koruma hakları — öğrenci kaç hakkı kaldığını bilmeli,
                yoksa hak otomatik kullanıldığında sürpriz olur. */}
            <div
              className="flex items-center justify-between pt-1.5"
              style={{ borderTop: '1px solid var(--border-card)' }}
            >
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-subtle)' }}>
                Bu ay koruma hakkı
              </span>
              {/* Noktalar 1.5px ve kullanılmışları --border-card idi; koyu
                  temada zemine karışıp sayılamıyordu. Artık daha büyük ve
                  kullanılmış olanlar içi boş + kenarlıklı — üç temada da
                  "kaç tane var, kaçı gitti" tek bakışta okunuyor. */}
              <span
                className="flex items-center gap-1.5"
                aria-label={`${MONTHLY_RIGHTS} haktan ${monthlyRightsLeft} tanesi kaldı`}
              >
                {Array.from({ length: MONTHLY_RIGHTS }).map((_, i) => {
                  const available = i < monthlyRightsLeft;
                  return (
                    <span
                      key={i}
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: available ? '#10b981' : 'transparent',
                        border: available
                          ? '1px solid #10b981'
                          : '1.5px solid var(--text-subtle)',
                        opacity: available ? 1 : 0.45,
                      }}
                    />
                  );
                })}
                <span
                  className="text-[11px] font-extrabold ml-0.5 tabular-nums"
                  style={{ color: monthlyRightsLeft > 0 ? '#10b981' : 'var(--text-subtle)' }}
                >
                  {monthlyRightsLeft}/{MONTHLY_RIGHTS}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Daraltma Düğmesi ── */}
      <div
        className="p-3"
        style={{ borderTop: '1px solid var(--border-card)' }}
      >
        <button
          onClick={toggleSidebar}
          className="nav-item w-full justify-center"
          aria-label={sidebarCollapsed ? 'Sidebar aç' : 'Sidebar daralt'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          ) : (
            <PanelLeftClose className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          )}
        </button>
      </div>
    </motion.aside>
  );
}
