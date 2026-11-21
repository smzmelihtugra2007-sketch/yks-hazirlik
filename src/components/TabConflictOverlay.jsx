/**
 * ─── İKİNCİ SEKME KORUMASI ───
 *
 * Uygulama başka bir sekmede öne geldiğinde bu sekme yazmayı bırakır (bkz.
 * utils/persistGuard.js). Perde, bayat bellekteki duruma tıklanıp kaydın
 * sessizce yutulmasını engeller.
 *
 * Sekme yeniden öne gelince (odak / görünürlük) kendiliğinden diskten taze
 * okur ve yazmayı geri alır; düğme yalnızca bunun elle tetiklenmesi.
 * Sıra önemli: önce yeniden oku, SONRA sahiplen. Tersi, okuma sürerken
 * bayat durumu diske yazmaya izin verirdi.
 */
import { useCallback, useEffect, useRef } from 'react';
import useAppStore from '../store/useAppStore';
import { claimTab } from '../utils/persistGuard';

export default function TabConflictOverlay({ active }) {
  const busy = useRef(false);

  const reclaim = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      await useAppStore.persist.rehydrate();
      claimTab();
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    if (active) return undefined;
    const onVisible = () => {
      if (document.visibilityState === 'visible' && document.hasFocus()) reclaim();
    };
    window.addEventListener('focus', reclaim);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', reclaim);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [active, reclaim]);

  if (active) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 shadow-2xl space-y-3"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
      >
        <h2 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
          Uygulama başka bir sekmede açık
        </h2>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Kayıtların birbirini ezmemesi için bu sekme şu an hiçbir şey kaydetmiyor. Burada devam
          edersen diğer sekmedeki son durum yüklenir.
        </p>
        <button
          type="button"
          onClick={reclaim}
          className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-colors"
        >
          Burada devam et
        </button>
      </div>
    </div>
  );
}
