/**
 * ─── AKTİF ODAK SEANSI: KURALLAR VE HESAP ───
 *
 * Sayacın geçen süresi ARTIK setInterval tick'lerinden sayılmıyor.
 * Kaynak `startedAt` zaman damgası: geçen süre her zaman gerçek saatten
 * hesaplanır. Bunun üç sonucu var:
 *
 *  1. Sayfa değişince seans ölmez (durum store'da yaşar).
 *  2. Uygulama kapanıp açılsa bile seans kurtarılabilir.
 *  3. Tarayıcılar arka plandaki sekmelerde setInterval'i kıstığı için
 *     eski sayaç süreyi EKSİK sayıyordu; zaman damgası bundan etkilenmez.
 *
 * ─ Duraklatma kuralları ─
 *   Sayaç sayfasından ayrılma : seans ANINDA duraklar. Uygulama içinde başka
 *                               bir sekmeye geçmek de odaktan çıkmaktır;
 *                               eskiden 5 dakikalık tolerans vardı ama odak
 *                               ölçümünü gevşettiği için kaldırıldı.
 *   Başka uygulamaya geçiş    : seans anında duraklar.
 *   İstisna — Konu Anlatımı   : çalışma türü "Konu Anlatımı" ise iki kural da
 *                               uygulanmaz. Öğrenci başka uygulamada video
 *                               izliyordur ve bu da çalışmanın kendisidir.
 *                               (Bu ayrıcalık eskiden "Tekrar/Video" konu
 *                               kovasına aitti; kural aynen korunarak çalışma
 *                               türüne taşındı — bkz. data/activities.js.)
 */
// Açık .js uzantısı: bu modül saf olduğu için Node ile doğrudan test
// edilebiliyor; Node ESM uzantısız göreli yolları çözmüyor.
import { resolveActivity, isKeepAliveActivity } from '../data/activities.js';

/**
 * Tek bir seansın üst sınırı (6 saat). Güvenlik ağı: uygulama günlerce
 * kapalı kaldıysa "Tekrar/Video" seansı saçma bir süreye şişmesin.
 */
export const MAX_SESSION_SECONDS = 6 * 60 * 60;

/**
 * `lastAliveAt` bu sıklıkla tazelenir — yalnızca "zorla kapatma" senaryosunun
 * güvenlik ağı. Normal arka plana geçişte zaten visibilitychange yakalıyor,
 * bu yüzden seyrek olması yeterli: sık yazmak her seferinde IndexedDB
 * trafiği ve gereksiz yeniden render demek olurdu.
 */
export const ALIVE_TOUCH_MS = 60 * 1000;

/**
 * Seans, uygulama dışında da saymaya devam etmeli mi?
 *
 * Girdi sayacın kendisi ya da kayıtlı bir seanstır; `activity` alanı yoksa
 * eski kayıttır ve tür konu adından türetilir (bkz. resolveActivity). Bu
 * yüzden fonksiyon konu değil NESNE alıyor — eski sayaç durumu diskten
 * `activity`siz geri yüklendiğinde de doğru karar verebilsin diye.
 */
export function isKeepAliveSession(sessionLike) {
  return isKeepAliveActivity(resolveActivity(sessionLike));
}

/**
 * Seansın o ana kadarki toplam süresi (saniye).
 * Biriken süre + (çalışıyorsa) son başlangıçtan bu yana geçen gerçek süre.
 */
export function getElapsedSeconds(timer, now = Date.now()) {
  if (!timer) return 0;

  const live =
    timer.isRunning && timer.startedAt
      ? Math.max(0, (now - timer.startedAt) / 1000)
      : 0;

  const total = (timer.accumulatedSeconds || 0) + live;
  return Math.min(MAX_SESSION_SECONDS, Math.floor(total));
}

/**
 * Geri sayım modunda ekranda gösterilecek kalan süre.
 * Kronometrede (hedefsiz) geçen sürenin kendisi döner.
 */
export function getDisplaySeconds(timer, targetSeconds, now = Date.now()) {
  const elapsed = getElapsedSeconds(timer, now);
  if (!targetSeconds) return elapsed;
  return Math.max(0, targetSeconds - elapsed);
}

/** Geri sayım hedefine ulaşıldı mı? */
export function hasReachedTarget(timer, targetSeconds, now = Date.now()) {
  if (!targetSeconds) return false;
  return getElapsedSeconds(timer, now) >= targetSeconds;
}

/** Otomatik duraklatma sebeplerinin kullanıcıya gösterilecek karşılıkları. */
export const AUTO_PAUSE_LABELS = {
  away: 'Sayaç sayfasından ayrıldığın için duraklatıldı.',
  background: 'Uygulamadan çıktığın için duraklatıldı.',
  target: 'Hedef süre doldu.',
};
