/**
 * ─── YEDEK HATIRLATICISI (saf, Node ile test edilebilir) ───
 *
 * Verinin tek kopyası cihazda; hatırlatıcı öğrencinin düzenli yedek almasını
 * sağlayan tek mekanizma.
 *
 * Çapa (anchor) SON GİRİŞ DEĞİL, son yedek ya da son "şimdi değil"dir. Her
 * gün giren öğrencinin son giriş zamanı hiç eskimez; ona bağlı bir
 * hatırlatıcı tam da en çok veri biriktiren öğrenciye hiç çıkmazdı.
 * Zaman damgaları diskte durur, yani uygulama kapalıyken geçen günler de
 * sayılır: süre dolduysa ilk açılışta çıkar.
 */

export const BACKUP_INTERVAL_OPTIONS = [5, 7];
export const DEFAULT_BACKUP_INTERVAL_DAYS = 7;
export const DISMISS_UNLOCK_SECONDS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;
// Saat geri alındıysa çapa gelecekte kalır ve hatırlatıcı süresiz susardı
const CLOCK_SKEW_MS = 60 * 60 * 1000;

export function normalizeInterval(days) {
  return BACKUP_INTERVAL_OPTIONS.includes(days) ? days : DEFAULT_BACKUP_INTERVAL_DAYS;
}

/**
 * @param {object} p
 * @param {number|null} p.anchorAt     Son yedek / son erteleme (ms). null = hiç yok.
 * @param {number} p.intervalDays
 * @param {boolean} p.hasData          Yedeklenecek kayıt var mı
 * @param {number} [p.now]
 */
export function isBackupDue({ anchorAt, intervalDays, hasData, now = Date.now() }) {
  if (!hasData) return false;
  if (typeof anchorAt !== 'number' || !Number.isFinite(anchorAt)) return true;
  if (anchorAt - now > CLOCK_SKEW_MS) return true;
  return now - anchorAt >= normalizeInterval(intervalDays) * DAY_MS;
}

/** "bugün" · "dün" · "N gün önce" · null (hiç) */
export function describeAge(at, now = Date.now()) {
  if (typeof at !== 'number' || !Number.isFinite(at)) return null;
  const days = Math.floor(Math.max(0, now - at) / DAY_MS);
  if (days === 0) return 'bugün';
  if (days === 1) return 'dün';
  return `${days} gün önce`;
}
