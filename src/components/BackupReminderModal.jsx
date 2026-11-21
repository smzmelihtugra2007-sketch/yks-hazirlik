/**
 * ─── YEDEK HATIRLATMA PENCERESİ ───
 *
 * Süre dolduğunda (bkz. utils/backupReminder.js) uygulama açılınca çıkar ve
 * öğrenci iki düğmeden birine basana kadar uygulamayı kilitler. Esc ve arka
 * plana tıklama kapatmaz; #root `inert` olur ki klavyeyle de arkaya
 * geçilemesin.
 *
 * "Şimdi değil" 5 saniye kilitli: refleksle kapatılmasın, öğrenci en azından
 * uyarıyı okusun. İndirmeye kilit yok — doğru davranışı geciktirmenin anlamı
 * yok.
 *
 * Bir kez açıldı mı açık KALIR (latch): pencere açıkken başka bir yoldan
 * durum değişse bile öğrencinin önünden kaybolmaz, cevap bekler.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DatabaseBackup, Download } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { exportDataAsJson } from '../utils/storage';
import { DISMISS_UNLOCK_SECONDS, describeAge, isBackupDue } from '../utils/backupReminder';
import { EASE_OUT_SOFT } from '../utils/motion';

// Uygulama günlerce açık kalabilir (kurulu PWA); saatte bir yeniden bakılır
const RECHECK_MS = 60 * 60 * 1000;

export default function BackupReminderModal({ enabled }) {
  const anchorAt = useAppStore((s) => s.backupReminderAnchorAt);
  const lastBackupAt = useAppStore((s) => s.lastBackupAt);
  const intervalDays = useAppStore((s) => s.backupReminderDays);
  const hasData = useAppStore((s) => s.studySessions.length + s.trials.length > 0);
  const markBackupTaken = useAppStore((s) => s.markBackupTaken);
  const dismissBackupReminder = useAppStore((s) => s.dismissBackupReminder);

  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DISMISS_UNLOCK_SECONDS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'visible') setNow(Date.now());
    };
    const id = setInterval(refresh, RECHECK_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  const due = enabled && isBackupDue({ anchorAt, intervalDays, hasData, now });

  useEffect(() => {
    if (due && !open) {
      setOpen(true);
      setSecondsLeft(DISMISS_UNLOCK_SECONDS);
      setError(null);
    }
  }, [due, open]);

  useEffect(() => {
    if (!open || secondsLeft <= 0) return undefined;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [open, secondsLeft]);

  useEffect(() => {
    const root = document.getElementById('root');
    if (!open || !root) return undefined;
    root.inert = true;
    return () => {
      root.inert = false;
    };
  }, [open]);

  const handleDownload = async () => {
    setBusy(true);
    setError(null);
    const result = await exportDataAsJson(useAppStore.getState(), { mode: 'download' });
    setBusy(false);
    if (result.success) {
      markBackupTaken();
      setOpen(false);
    } else {
      setError('Yedek oluşturulamadı. Tekrar dene ya da Ayarlar → Verileri Dışa Aktar’ı kullan.');
    }
  };

  const handleDismiss = () => {
    if (secondsLeft > 0) return;
    dismissBackupReminder();
    setOpen(false);
  };

  if (typeof document === 'undefined') return null;

  const age = describeAge(lastBackupAt, now);
  const locked = secondsLeft > 0;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[950] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="backup-reminder-title"
            aria-describedby="backup-reminder-body"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.24, ease: EASE_OUT_SOFT }}
            className="relative z-10 w-full max-w-sm rounded-2xl p-5 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-card)' }}
          >
            <div className="flex items-start gap-3">
              <div
                className="shrink-0 p-2.5 rounded-xl"
                style={{ backgroundColor: 'var(--accent-brand-light)', color: 'var(--accent-brand)' }}
              >
                <DatabaseBackup className="w-5 h-5" />
              </div>
              <div className="min-w-0 space-y-1.5">
                <h3 id="backup-reminder-title" className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                  Yedek alma zamanı
                </h3>
                <p id="backup-reminder-body" className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {age ? `Son yedeğin ${age} alındı.` : 'Henüz hiç yedek almadın.'} Verilerin yalnızca bu
                  cihazda duruyor; tarayıcı verisi silinirse ya da cihaz değişirse geri gelmez. Yedek
                  dosyasını telefonuna veya Drive'a sakla.
                </p>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-[11px] font-semibold text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2 mt-5">
              <button
                type="button"
                autoFocus
                onClick={handleDownload}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 shadow-sm transition-colors duration-200 active:scale-[0.98]"
              >
                <Download className="w-4 h-4" />
                {busy ? 'Hazırlanıyor…' : 'Yedeği indir'}
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                disabled={locked}
                aria-disabled={locked}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-card)',
                }}
              >
                {locked ? `Şimdi değil (${secondsLeft})` : 'Şimdi değil'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
