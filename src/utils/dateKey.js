/**
 * ─── GÜN ANAHTARI (YYYY-MM-DD, YEREL SAAT) ───
 *
 * Seanslar ve denemeler güne bu biçimde damgalanır.
 *
 * Neden yerel saat: eskiden `new Date().toISOString().slice(0, 10)`
 * kullanılıyordu, yani UTC tarihi. Türkiye UTC+3 olduğu için gece 00:00-03:00
 * arasında çalışan öğrencinin süresi ÖNCEKİ güne yazılıyordu. Streak doğrudan
 * günlük toplamlara dayandığı için bu, seriyi yanlış hesaplatıyordu
 * (dün yanlışlıkla tamamlanıyor, bugün boş görünüyordu).
 *
 * Heatmap zaten yerel tarih kullanıyordu; bu modül iki tarafı tek kaynağa
 * bağlar. Not: geçmişte UTC ile damgalanmış gece seansları olduğu gibi kalır,
 * geriye dönük düzeltilemez.
 */

/** Verilen tarihi (varsayılan: şimdi) yerel 'YYYY-MM-DD' anahtarına çevirir. */
export function toDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' anahtarını yerel gece yarısına ayarlı Date'e çevirir. */
export function fromDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Anahtarı gün sayısı kadar kaydırır ('2026-10-03', -1 → '2026-10-02'). */
export function shiftDateKey(key, days) {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Ay anahtarı — aylık bütçenin sıfırlanma sınırı ('2026-10'). */
export function monthKeyOf(dateKey) {
  return dateKey.slice(0, 7);
}

/**
 * Haftanın Pazartesi'sinin anahtarı — haftalık bütçenin sınırı.
 * ISO hafta NUMARASI yerine Pazartesi tarihi kullanılır; yıl sınırındaki
 * (52/53. hafta) kenar durumlarını tamamen ortadan kaldırır.
 */
export function weekKeyOf(dateKey) {
  const d = fromDateKey(dateKey);
  const dow = d.getDay();            // 0: Pazar, 1: Pazartesi ...
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return toDateKey(d);
}
