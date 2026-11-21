/**
 * ─── KURTARMA EKRANI ───
 *
 * Uygulama veriyi okuyamadığında ya da çizim sırasında çöktüğünde çıkar.
 * Store'a, framer-motion'a ve sayfa bileşenlerine bağlı DEĞİL: çökmenin
 * sebebi onlardan biri olabilir. Tek işi öğrencinin diskteki ham kaydını
 * dışarı almasını sağlamak; o dosya Ayarlar'dan geri yüklenebiliyor.
 */
import { useState } from 'react';
import { downloadRawData } from '../utils/storage';

const COPY = {
  read: {
    title: 'Verilerin şu an okunamadı',
    body:
      'Tarayıcı depoya geçici olarak erişemedi. Verilerin silinmedi; korumak için uygulama hiçbir şey yazmıyor. Önce yeniden dene. Sorun sürerse ham verini indir ve sakla.',
  },
  crash: {
    title: 'Beklenmeyen bir hata oluştu',
    body:
      'Verilerin cihazında duruyor. Yeniden yüklemek çoğu zaman yeter. Sorun sürerse ham verini indir; bu dosya Ayarlar → Verileri İçe Aktar ile geri yüklenebilir.',
  },
};

export default function DataRescueScreen({ reason = 'crash', detail }) {
  const [state, setState] = useState(null); // null | 'ok' | 'empty' | 'error'
  const copy = COPY[reason] || COPY.crash;

  const handleDownload = async () => {
    try {
      setState((await downloadRawData()) ? 'ok' : 'empty');
    } catch {
      setState('error');
    }
  };

  const buttonBase = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: 'var(--bg-app, #f8fafc)',
        color: 'var(--text-main, #0f172a)',
        fontFamily: "'Inter Variable', system-ui, sans-serif",
      }}
    >
      <div
        role="alert"
        style={{
          width: '100%',
          maxWidth: 400,
          padding: 24,
          borderRadius: 20,
          backgroundColor: 'var(--bg-card, #ffffff)',
          border: '1px solid var(--border-card, #e2e8f0)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{copy.title}</h1>
        <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--text-muted, #64748b)' }}>
          {copy.body}
        </p>

        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ ...buttonBase, border: 'none', backgroundColor: '#4f46e5', color: '#ffffff' }}
        >
          Yeniden dene
        </button>
        <button
          type="button"
          onClick={handleDownload}
          style={{
            ...buttonBase,
            backgroundColor: 'var(--bg-input, #f1f5f9)',
            color: 'var(--text-main, #0f172a)',
            border: '1px solid var(--border-card, #e2e8f0)',
          }}
        >
          Ham verimi indir
        </button>

        {state && (
          <p style={{ fontSize: 12, margin: 0, color: state === 'ok' ? '#059669' : '#dc2626' }}>
            {state === 'ok' && 'Dosya indirildi. Güvenli bir yerde sakla.'}
            {state === 'empty' && 'Cihazda kayıtlı veri bulunamadı.'}
            {state === 'error' && 'Depoya erişilemedi. Biraz sonra tekrar dene.'}
          </p>
        )}

        {detail && (
          <p style={{ fontSize: 11, margin: 0, color: 'var(--text-subtle, #94a3b8)', wordBreak: 'break-word' }}>
            Teknik ayrıntı: {detail}
          </p>
        )}
      </div>
    </div>
  );
}
