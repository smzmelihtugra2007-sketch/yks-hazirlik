/**
 * ─── UYGULAMA BİLGİLERİ ───
 * Telif, imza, geri bildirim bağlantısı ve sürüm tek yerde.
 */

export const AUTHOR_NAME = 'Melih Tuğra Sumaz';
export const COPYRIGHT_START_YEAR = 2026;

// Google Form bağlantısı. Boşken "Geri bildirim gönder" düğmesi hiç görünmez.
export const FEEDBACK_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLScMfoBPQvw1BG5c_cZ7OQ_6GRFBh9M8u9tT_yJ-1IvXk46NVg/viewform';

// Derlemede vite.config.js doldurur. Cloudflare commit kimliğini verir;
// yerel derlemede "yerel" yazar. Testçi hata bildirirken hangi sürümde
// olduğunu bilmeden hatayı yeniden üretmek tahmine kalırdı.
export const BUILD_ID = import.meta.env.VITE_BUILD_ID || 'geliştirme';
export const BUILD_DATE = import.meta.env.VITE_BUILD_DATE || '';

export function copyrightYears(now = new Date()) {
  const year = now.getFullYear();
  return year > COPYRIGHT_START_YEAR ? `${COPYRIGHT_START_YEAR}–${year}` : String(COPYRIGHT_START_YEAR);
}
