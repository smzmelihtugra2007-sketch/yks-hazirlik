/**
 * ─── KALICI DEPOLAMA İZNİ ───
 *
 * Sunucu olmadığı için öğrencinin tüm verisi tarayıcı deposunda duruyor.
 * İzin alınmazsa tarayıcı yer darlığında bu veriyi haber vermeden silebilir;
 * iOS Safari ana ekrana eklenmemiş sitelerin verisini 7 gün etkileşim
 * olmayınca siliyor. persist() bu riski düşürür, sıfırlamaz: yedek yine şart.
 *
 * Chrome ve Safari izni sessizce verir ya da reddeder. Firefox kullanıcıya
 * soruyor, bu yüzden çağrı ilk açılışa değil karşılama sonrasına bağlı:
 * hiçbir şey görmemiş birine "veri saklayayım mı" diye sormanın anlamı yok.
 */
export async function requestPersistentStorage() {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return false;

  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
