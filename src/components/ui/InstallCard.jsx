/**
 * ─── ANA EKRANA EKLEME KARTI ───
 *
 * Üç durum (bkz. utils/installPrompt.js → pickInstallCard):
 *  - inApp : LinkedIn/Instagram içi tarayıcı → "tarayıcıda aç". Burada
 *            kurulum imkânsız ve depo geçici; en acil uyarı bu.
 *  - prompt: Android / masaüstü Chromium → tarayıcının kendi yükleme penceresi.
 *  - ios   : iPhone/iPad → Safari'de "Ana Ekrana Ekle" adımları. iOS'ta
 *            programatik yükleme yok, yalnızca talimat verilebilir.
 *
 * "Daha sonra" kartı 3 gün gizler. Tamamen kapatma yok: iOS'ta kurulum
 * verinin silinmemesinin asıl şartı.
 *
 * `compact` karşılama ekranı için: yalnızca uygulama içi uyarısını gösterir,
 * çünkü öğrenci veriyi daha ilk formda orada girmeye başlıyor.
 */
import { useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Share, SquarePlus, ExternalLink, AlertTriangle, Download } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import {
  getInstallSnapshot,
  isStandalone,
  pickInstallCard,
  promptInstall,
  subscribeInstall,
} from '../../utils/installPrompt';
import { EASE_OUT_SOFT } from '../../utils/motion';

const COPY = {
  inApp: {
    Icon: AlertTriangle,
    tone: '#f43f5e',
    title: 'Bu sayfayı tarayıcıda aç',
    body:
      'Şu an bir uygulamanın içindeki tarayıcıdasın (LinkedIn, Instagram gibi). Buraya girdiğin veriler kalıcı olmayabilir ve uygulama ana ekrana eklenemez. Sağ üstteki ••• menüsünden "Tarayıcıda aç" seçeneğine dokun.',
  },
  prompt: {
    Icon: Smartphone,
    tone: '#6366f1',
    title: 'Uygulamayı yükle',
    body:
      'Ana ekrandan tek dokunuşla tam ekran açılır, internetsiz de çalışır. Tarayıcı yer açmak için verilerini silmez.',
  },
  ios: {
    Icon: Smartphone,
    tone: '#6366f1',
    title: 'Ana ekrana ekle — verilerin için önemli',
    body:
      'Safari, ana ekrana eklenmemiş sitelerin verisini bir hafta kullanılmayınca silebiliyor. Eklediğinde bu kural kalkar.',
  },
};

function IosSteps() {
  const step = 'flex items-center gap-2 text-xs font-semibold';
  return (
    <ol className="mt-2.5 space-y-1.5" style={{ color: 'var(--text-main)' }}>
      <li className={step}>
        <span style={{ color: 'var(--text-subtle)' }}>1.</span>
        <Share className="w-4 h-4 inline shrink-0" style={{ color: '#3b82f6' }} aria-hidden="true" />
        <span>
          Paylaş düğmesine dokun
          <span className="font-medium" style={{ color: 'var(--text-subtle)' }}> (görmüyorsan önce ••• menüsünü aç)</span>
        </span>
      </li>
      <li className={step}>
        <span style={{ color: 'var(--text-subtle)' }}>2.</span>
        <SquarePlus className="w-4 h-4 inline shrink-0" aria-hidden="true" /> "Ana Ekrana Ekle"yi seç
      </li>
      <li className={step}>
        <span style={{ color: 'var(--text-subtle)' }}>3.</span>
        Sağ üstte "Ekle"ye dokun, sonra uygulamayı ana ekrandan aç
      </li>
    </ol>
  );
}

export default function InstallCard({ compact = false }) {
  const { canPrompt } = useSyncExternalStore(subscribeInstall, getInstallSnapshot);
  const dismissedAt = useAppStore((s) => s.installCardDismissedAt);
  const dismiss = useAppStore((s) => s.dismissInstallCard);

  const kind = pickInstallCard({
    ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    maxTouchPoints: typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0,
    standalone: isStandalone(),
    canPrompt,
    // Karşılamada "Daha sonra" yok; uygulama içi uyarısı her zaman görünür
    dismissedAt: compact ? null : dismissedAt,
  });
  const visible = compact ? kind === 'inApp' : Boolean(kind);

  const handleInstall = async () => {
    const outcome = await promptInstall();
    // Reddedildiyse olay tükendi; kartı erteleyelim ki boş düğme kalmasın
    if (outcome !== 'accepted') dismiss();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.32, ease: EASE_OUT_SOFT }}
          className={compact ? 'overflow-hidden mb-5' : 'overflow-hidden'}
        >
          {(() => {
            const { Icon, tone, title, body } = COPY[kind];
            return (
              <div className="card p-4 flex items-start gap-3" style={{ borderColor: `${tone}55` }} role={kind === 'inApp' ? 'alert' : undefined}>
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${tone}1f`, color: tone }}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    {title}
                  </h3>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {body}
                  </p>
                  {kind === 'ios' && <IosSteps />}

                  {!compact && (
                    <div className="flex items-center gap-2 mt-3">
                      {kind === 'prompt' && (
                        <button
                          type="button"
                          onClick={handleInstall}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors active:scale-[0.98]"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Yükle
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={dismiss}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        Daha sonra
                      </button>
                    </div>
                  )}
                </div>

                {kind === 'inApp' && (
                  <ExternalLink className="w-4 h-4 shrink-0 mt-0.5" style={{ color: tone }} aria-hidden="true" />
                )}
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
