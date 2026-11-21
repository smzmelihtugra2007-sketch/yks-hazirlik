/**
 * ─── ONAY DİYALOĞU (genel amaçlı) ───
 *
 * Geri alınamaz küçük işlemler için hafif onay penceresi.
 * `ResetConfirmModal` yalnızca "tüm verileri sıfırla" akışına özel (5 saniyelik
 * kilit, yedekleme seçenekleri, sabit koyu renkler); sayaç sıfırlama gibi
 * günlük işlemler için hem ağır hem tema uyumsuz kalıyordu.
 *
 * Renkler CSS değişkenlerinden gelir, üç temada da çalışır.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { EASE_OUT_SOFT } from '../../utils/motion';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  onConfirm,
  onClose,
}) {
  // Esc ile kapat — küçük bir diyalog için beklenen davranış
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.24, ease: EASE_OUT_SOFT }}
            className="relative z-10 w-full max-w-sm rounded-2xl p-5 shadow-2xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-1">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                  {title}
                </h3>
                {message && (
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5 mt-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 active:scale-[0.98]"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-card)',
                }}
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                autoFocus
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors duration-200 active:scale-[0.98]"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
