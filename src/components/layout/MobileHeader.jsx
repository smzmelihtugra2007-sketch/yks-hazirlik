/**
 * ─── HEADER (Mobil) ───
 * Mobil ekranlarda üstte görünen başlık çubuğu.
 * Masaüstünde gizlenir çünkü Sidebar zaten mevcut.
 *
 * Adım 16: 🔥 Streak Badge eklendi — günlük 3 saat hedefine ne kadar yaklaşıldığını gösterir.
 */
import { GraduationCap, Settings } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import { TRACKS } from '../../data/mockData';
import { useStreak } from '../../hooks/useStreak';

export default function MobileHeader() {
  const { selectedTrack, activePage, setActivePage } = useAppStore();
  const track = TRACKS[selectedTrack];
  const onSettings = activePage === 'settings';

  // Seri ve bugünün durumu seans geçmişinden türetilir (store'dan okunmaz)
  const { current: studyStreak, todayStatus } = useStreak();
  const goalReached = todayStatus === 'full';

  return (
    <header
      className="lg:hidden sticky top-0 z-30 backdrop-blur-xl border-b transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-sidebar)',
        borderBottomColor: 'var(--border-card)',
      }}
    >
      <div className="flex items-center justify-between px-4 h-14 gap-2">
        {/* Sol: Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-sm">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
            YKS Hazırlık
          </span>
        </div>

        {/* Orta / Sağ: Streak + Alan rozeti */}
        <div className="flex items-center gap-2 ml-auto">
          {/* 🔥 Streak badge */}
          {studyStreak > 0 ? (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-extrabold border"
              style={{
                backgroundColor: goalReached ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                borderColor: goalReached ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)',
                color: goalReached ? '#10b981' : '#f59e0b',
              }}
            >
              <span>{goalReached ? '✅' : '🔥'}</span>
              <span>{studyStreak}g</span>
            </div>
          ) : (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-card)',
                color: 'var(--text-subtle)',
              }}
            >
              <span className="grayscale opacity-50">🔥</span>
              <span>0g</span>
            </div>
          )}

          {/* Alan rozeti */}
          <div
            className="px-2.5 py-1 rounded-full text-xs font-semibold text-white shadow-sm"
            style={{ backgroundColor: track?.color || '#6366f1' }}
          >
            {track?.label || 'Sayısal'}
          </div>

          {/* Ayarlar — alt menüde yer açmak için buraya taşındı */}
          <button
            type="button"
            onClick={() => setActivePage('settings')}
            aria-label="Ayarlar"
            aria-current={onSettings ? 'page' : undefined}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 active:scale-95"
            style={{
              backgroundColor: onSettings ? 'var(--accent-brand-light)' : 'transparent',
              color: onSettings ? 'var(--accent-brand)' : 'var(--text-subtle)',
            }}
          >
            <Settings className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
