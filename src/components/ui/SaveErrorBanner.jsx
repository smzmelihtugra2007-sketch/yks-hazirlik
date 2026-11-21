import { AlertTriangle } from 'lucide-react';
import useAppStore from '../../store/useAppStore';

/**
 * Kayıt diske yazılamadığında üstte kalıcı uyarı. Eskiden hata yalnızca
 * konsola düşüyordu; öğrenci kaydedildiğini sanıp çalışmaya devam ediyor,
 * sayfa kapanınca o günün kaydı kayboluyordu. Bir sonraki başarılı yazmada
 * kendiliğinden kaybolur.
 */
export default function SaveErrorBanner() {
  const setActivePage = useAppStore((s) => s.setActivePage);

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[900] flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-xs font-bold shadow-lg"
    >
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span className="flex-1 min-w-0">
        Son değişikliklerin cihaza kaydedilemedi. Sayfayı kapatmadan yedek al.
      </span>
      <button
        type="button"
        onClick={() => setActivePage('settings')}
        className="shrink-0 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
      >
        Yedek al
      </button>
    </div>
  );
}
