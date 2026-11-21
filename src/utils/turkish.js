/**
 * ─── TÜRKÇE EK UYUMU ───
 *
 * Sayılara 3. tekil iyelik eki eklemek okunuşa bağlıdır ve sabit bir şablonla
 * üretilemez:
 *
 *   %22 → "yüzde yirmi İKİSİ"   → %22'si
 *   %31 → "yüzde otuz BİRİ"     → %31'i
 *   %87 → "yüzde seksen YEDİSİ" → %87'si
 *
 * Metinlerde ek sabit yazıldığı için ekranda "%22'ini" gibi bozuk ifadeler
 * çıkıyordu. Ek, sayının okunuşundaki SON kelimeye göre seçilir; bu modül o
 * seçimi yapar.
 *
 * Kapsam: 0-999 arası tam sayılar (yüzdeler ve soru sayıları için fazlasıyla
 * yeterli). Dışına çıkan değerlerde en yaygın ek olan 'i' döner — bozuk bir
 * ifade yerine yalnızca ara sıra kulağı tırmalayan bir ek olur.
 */

/** Birler basamağının okunuşuna göre iyelik eki. */
const BY_UNIT = {
  0: 'ı', // sıfır → sıfırı
  1: 'i', // bir   → biri
  2: 'si', // iki   → ikisi
  3: 'ü', // üç    → üçü
  4: 'ü', // dört  → dördü
  5: 'i', // beş   → beşi
  6: 'sı', // altı  → altısı
  7: 'si', // yedi  → yedisi
  8: 'i', // sekiz → sekizi
  9: 'u', // dokuz → dokuzu
};

/** Tam onlukların okunuşuna göre iyelik eki. */
const BY_TEN = {
  10: 'u', // on     → onu
  20: 'si', // yirmi  → yirmisi
  30: 'u', // otuz   → otuzu
  40: 'ı', // kırk   → kırkı
  50: 'si', // elli   → ellisi
  60: 'ı', // altmış → altmışı
  70: 'i', // yetmiş → yetmişi
  80: 'i', // seksen → sekseni
  90: 'ı', // doksan → doksanı
};

/**
 * Bir sayıya eklenecek 3. tekil iyelik ekini döndürür (kesmesiz).
 * Örn. 22 → 'si', 31 → 'i', 100 → 'ü'
 */
export function possessiveSuffix(value) {
  const n = Math.abs(Math.round(Number(value) || 0));

  const unit = n % 10;
  if (unit !== 0) return BY_UNIT[unit];

  const ten = n % 100;
  if (ten !== 0) return BY_TEN[ten];

  // Tam yüzlükler: okunuşun son kelimesi "yüz" → yüzü
  if (n !== 0) return 'ü';

  return BY_UNIT[0];
}

/**
 * Sayıyı iyelik ekiyle yazar: 26 → "26'sı", 31 → "31'i"
 * "120 sorudan 26'sı boş kaldı" gibi cümlelerde kullanılır.
 */
export function countWithPossessive(value) {
  const n = Math.round(Number(value) || 0);
  return `${n}'${possessiveSuffix(n)}`;
}

/**
 * Oranı yüzde olarak, iyelik ekiyle yazar: 0.22 → "%22'si"
 * "işaretlediklerinin %22'si doğru" gibi cümlelerde kullanılır.
 */
export function percentWithPossessive(rate) {
  const v = Math.round((Number(rate) || 0) * 100);
  return `%${v}'${possessiveSuffix(v)}`;
}
