/**
 * ─── RESET CONFIRM MODAL (Tüm Verileri Sıfırlama Güvenlik Modalı) ───
 *
 * Özellikler:
 *  - 5 saniye kilitli geri sayım butonu
 *  - Eşit boyutta ve h-14 sabit yükseklikte simetrik butonlar
 *  - Çift yedekleme seçeneği (Yerel İndir & Uygulamalara Gönder)
 *  - Masaüstü ve desteksiz tarayıcı fallback'i (alert + otomatik indirme)
 *  - Sıfır gecikme ile anında DOM'dan kaldırılma (zero lag)
 *  - Koyu tema estetiği (#090a0f / #12141c)
 */
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Download, Share2 } from 'lucide-react';

export default function ResetConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  onDownloadBackup,
  onShareBackup,
}) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      return;
    }

    setCountdown(5);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // DONMA / GECİKME ÇÖZÜMÜ: isOpen false olduğunda anında unmount edilir
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] bg-[#090a0f]/80 backdrop-blur-md flex items-center justify-center p-4">
      {/* Arka plan overlay tıklandığında anında kapat */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Gövdesi */}
      <div
        className="relative z-10 bg-[#12141c] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-100 space-y-5 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Başlık ve İkaz */}
        <div className="flex items-start gap-3.5">
          <div className="text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl inline-flex shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white leading-snug">
              Tüm Verileri Sıfırlamak Üzeresiniz
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bu işlem geri alınamaz. Kayıtlı tüm denemeleriniz, kronometre çalışma geçmişiniz ve konu ilerlemeleriniz tamamen silinecektir.
            </p>
          </div>
        </div>

        {/* 2. Yedekleme & Bulut Seçenekleri */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Silmeden Önce Verileri Güvenceye Al:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Seçenek 1: Yerel İndir */}
            <button
              type="button"
              onClick={onDownloadBackup}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 active:scale-[0.98] transition-all text-center"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Yerel Olarak İndir (.json)</span>
            </button>

            {/* Seçenek 2: Uygulamalara Gönder */}
            <button
              type="button"
              onClick={onShareBackup}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-sky-500/10 border border-sky-500/25 text-sky-400 hover:bg-sky-500/20 active:scale-[0.98] transition-all text-center"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span>Uygulamalara Gönder (Drive, WhatsApp, Mail)</span>
            </button>
          </div>
        </div>

        {/* İnce Ayırıcı Çizgi */}
        <div className="h-px bg-slate-800" />

        {/* 3. Buton Boyutları ve Yükseklikleri (Birebir Eşit flex-1 h-14) */}
        <div className="flex items-center gap-3 pt-1 w-full">
          {/* Vazgeç Butonu */}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-14 px-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center text-center transition-all bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
          >
            Vazgeç
          </button>

          {/* Sil Butonu (5s Sayaçlı) */}
          <button
            type="button"
            disabled={countdown > 0}
            onClick={onConfirm}
            className={`flex-1 h-14 px-3 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center text-center transition-all ${
              countdown > 0
                ? 'bg-red-950/40 text-red-400/50 border border-red-900/30 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 cursor-pointer'
            }`}
          >
            {countdown > 0
              ? `Tüm Verileri Kalıcı Olarak Sil (${countdown}s)`
              : 'Tüm Verileri Kalıcı Olarak Sil'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
