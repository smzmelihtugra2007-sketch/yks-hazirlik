/**
 * ─── KALICI YAZMA KORUYUCUSU ───
 *
 * Sunucu olmadığı için öğrencinin bir yıllık verisinin TEK kopyası tarayıcı
 * deposunda. Zustand persist her değişiklikte durumun tamamını yazar; bu
 * modül o yazmanın veri ezmesine dönüştüğü üç yolu kapatır:
 *
 *  1. Okuma başarısızsa yazma YOK. Eskiden okuma hatası `null` dönüyordu;
 *     uygulama bunu yeni kullanıcı sanıp karşılamayı açıyor, form
 *     doldurulunca boş durum gerçek verinin üstüne yazılıyordu.
 *  2. Aynı anda tek sekme yazar. İki sekmenin ikisi de durumun tamamını
 *     tutuyor; son yazan kazandığı için arka plandaki bayat sekme yeni
 *     sekmede kaydedilen seansı siliyordu. En son öne gelen sekme yazar,
 *     diğerleri diskten yeniden okuyana kadar susar.
 *  3. Yazma hatası sessiz kalmaz; öğrenci kaydedildiğini sanıp çalışmaya
 *     devam etmesin diye arayüze bildirilir.
 *  4. Hidrasyon bitmeden yazma YOK. Zustand persist okuma sürerken gelen
 *     her `set`'i de diske yazıyor; o an bellekte demo durumu var.
 *
 * iOS'ta kurulu uygulama ile Safari ayrı depo kullanır, orada (2) hiç
 * tetiklenmez. Android ve masaüstünde depo ortaktır.
 */

const CHANNEL_NAME = 'yks-hazirlik-tab';
const tabId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

let status = {
  hydrated: false,
  readFailed: false,
  writeFailed: false,
  tabActive: true,
};

const listeners = new Set();

function setStatus(patch) {
  const next = { ...status, ...patch };
  if (Object.keys(next).every((k) => next[k] === status[k])) return;
  status = next;
  listeners.forEach((fn) => fn());
}

export function subscribePersistStatus(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getPersistStatus() {
  return status;
}

export function canWrite() {
  return status.hydrated && !status.readFailed && status.tabActive;
}

export function markHydrated() {
  setStatus({ hydrated: true });
}

export function markReadFailed() {
  setStatus({ readFailed: true });
}

export function markWriteResult(ok) {
  setStatus({ writeFailed: !ok });
}

const channel =
  typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

if (channel) {
  channel.onmessage = (event) => {
    const msg = event.data;
    if (msg?.type === 'claim' && msg.tabId !== tabId) {
      setStatus({ tabActive: false });
    }
  };
}

/** Bu sekmeyi yazan sekme yapar; diğer açık sekmeler susar. */
export function claimTab() {
  channel?.postMessage({ type: 'claim', tabId });
  setStatus({ tabActive: true });
}

// Açılan her sekme kendini sahiplenir: diskten taze okuyan odur.
claimTab();
