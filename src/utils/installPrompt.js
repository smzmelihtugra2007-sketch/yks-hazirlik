/**
 * ─── ANA EKRANA EKLEME ───
 *
 * Kurulum veri güvenliği için önemli, süs değil:
 *  - iOS Safari, ana ekrana eklenmemiş sitenin verisini 7 gün etkileşim
 *    olmayınca silebiliyor. Kurulu uygulamada bu kural yok.
 *  - Chrome kurulu uygulamaya kalıcı depolamayı kendiliğinden veriyor;
 *    tarayıcı yer açarken veriyi silmiyor.
 *  - Uygulama içi tarayıcılar (LinkedIn, Instagram…) geçici depo kullanıyor
 *    ve kurulum yapamıyor. LinkedIn'de paylaşılan link tam olarak orada
 *    açılıyor; öğrenci karşılamayı orada doldurup çalışırsa veri kaybolabilir.
 *
 * `beforeinstallprompt` sayfa yüklenir yüklenmez ve yalnızca BİR kez gelir;
 * React bağlanmadan kaçmasın diye dinleyici modül yüklenirken kurulur
 * (main.jsx bu modülü erkenden içe aktarır).
 */

export const INSTALL_SNOOZE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const IN_APP_RE = /FBAN|FBAV|FB_IAB|Instagram|LinkedInApp|Line\/|Twitter|TikTok|musical_ly|Snapchat|; wv\)/i;

export function isInAppBrowser(ua) {
  return IN_APP_RE.test(ua || '');
}

/** iPadOS 13+ kendini Mac olarak tanıtır; dokunmatik nokta sayısıyla ayrılır. */
export function isIOS(ua, maxTouchPoints = 0) {
  return /iPad|iPhone|iPod/.test(ua || '') || (/Macintosh/.test(ua || '') && maxTouchPoints > 1);
}

/**
 * Hangi kart gösterilecek?
 * @returns {'inApp' | 'prompt' | 'ios' | null}
 */
export function pickInstallCard({ ua, maxTouchPoints, standalone, canPrompt, dismissedAt, now = Date.now() }) {
  if (standalone) return null;
  if (typeof dismissedAt === 'number' && now - dismissedAt < INSTALL_SNOOZE_DAYS * DAY_MS && now >= dismissedAt) {
    return null;
  }
  // Uygulama içi tarayıcı önce gelir: oradan kurulum da yapılamıyor
  if (isInAppBrowser(ua)) return 'inApp';
  if (canPrompt) return 'prompt';
  if (isIOS(ua, maxTouchPoints)) return 'ios';
  return null;
}

// ─── Tarayıcı durumu (useSyncExternalStore ile okunur) ───

let deferredPrompt = null;
let snapshot = { canPrompt: false };
const listeners = new Set();

function emit() {
  snapshot = { canPrompt: Boolean(deferredPrompt) };
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Chrome'un kendi alt çubuğunu bastır: kart bizde, ne zaman
    // gösterileceğine erteleme kuralı karar versin.
    e.preventDefault();
    deferredPrompt = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

export function subscribeInstall(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getInstallSnapshot() {
  return snapshot;
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

/** @returns {Promise<'accepted' | 'dismissed' | 'unavailable'>} */
export async function promptInstall() {
  if (!deferredPrompt) return 'unavailable';
  const event = deferredPrompt;
  deferredPrompt = null; // her olay yalnızca bir kez prompt() edilebilir
  emit();
  event.prompt();
  const { outcome } = await event.userChoice;
  return outcome;
}
