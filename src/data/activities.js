/**
 * ─── ÇALIŞMA TÜRÜ (ACTIVITY) ───
 *
 * Bir seansın NE tür çalışma olduğunu söyler; hangi KONUYA çalışıldığını değil.
 * İkisi ayrı eksen: "Fonksiyonlar · Konu Anlatımı" ile "Fonksiyonlar · Soru
 * Çözümü" aynı konunun iki farklı çalışması.
 *
 * ─ Neden ayrı bir eksen ─
 *   Eskiden bu bilgi konu listesinin içine iki özel kova olarak gömülüydü
 *   ("🔁 Tekrar/Video", "🎯 Branş Denemesi"). Sonucu veri kaybıydı: Fonksiyonlar
 *   konu anlatımını 3 saat izleyen öğrencinin seansı `topic: 'Tekrar/Video'`
 *   olarak kaydediliyor, Yol Haritası ilerlemeyi konu adına göre topladığı için
 *   (bkz. utils/missions.js) Fonksiyonlar düğümüne **0 dakika** yazılıyordu.
 *   Artık `topic` her zaman gerçek konuyu taşıyor, tür ayrı alanda duruyor.
 *
 *   Alternatif, her konuyu listede ikiye katlamaktı ("Fonksiyonlar — Anlatım",
 *   "Fonksiyonlar — Soru"). 10 konuluk ders 20 satıra çıkardı ve veri modeli
 *   yine metin ayrıştırmaya dayanırdı.
 *
 * ─ keepAlive ─
 *   Sayacın uygulama dışında da işlemeye devam etmesi. Konu anlatımında
 *   öğrenci başka uygulamada video izliyordur ve bu da çalışmanın kendisidir.
 *   Bu ayrıcalık daha önce yalnızca "Tekrar/Video" kovasına aitti; aynı kural
 *   aynen korunarak konu anlatımı türüne taşındı.
 *
 *   DİKKAT: ayrıcalık artık bir istisna değil, her dersin her konusunda
 *   seçilebilen bir tür. Seans kilidi bu yüzden türü de kapsamak ZORUNDA —
 *   yoksa "anlatım"da arka planda süre biriktirip kaydetmeden önce "soru"ya
 *   çevirme açığı doğar (aynı açığı Tekrar/Video için bir kez kapatmıştık).
 *
 * ─ needsTopic ─
 *   Branş denemesi tüm dersi kapsar, tek bir konuya yazılamaz; bu yüzden konu
 *   seçimi istemez ve `topic` alanına BRANCH_EXAM_TOPIC yazılır.
 */
import { REVIEW_TOPIC, BRANCH_EXAM_TOPIC } from './subjects.js';

export const ACTIVITIES = [
  {
    id: 'lecture',
    label: 'Konu Anlatımı',
    short: 'Anlatım',
    icon: '📖',
    keepAlive: true,
    needsTopic: true,
    hint: 'Video, kitap, ders dinleme. Sayaç uygulamadan çıksan da işler.',
  },
  {
    id: 'practice',
    label: 'Soru Çözümü',
    short: 'Soru',
    icon: '✏️',
    keepAlive: false,
    needsTopic: true,
    hint: 'Test, alıştırma, soru bankası. Uygulamadan çıkınca sayaç durur.',
  },
  {
    id: 'branch',
    label: 'Branş Denemesi',
    short: 'Branş',
    icon: '🎯',
    keepAlive: false,
    needsTopic: false,
    hint: 'Dersin tamamını kapsayan deneme. Konu seçimi gerekmez.',
  },
];

/**
 * Varsayılan tür: SORU ÇÖZÜMÜ.
 *
 * Bilinçli seçim. Öğrenci türü seçmeyi unutur ve aslında video izliyorsa,
 * uygulamadan çıkınca sayaç sesli uyarıyla durur ve hatayı hemen fark eder.
 * Varsayılan "Konu Anlatımı" olsaydı sayaç sessizce arka planda saymaya devam
 * eder, kimse fark etmezdi — yani hatanın ucuz tarafını varsayılan yapıyoruz.
 */
export const DEFAULT_ACTIVITY_ID = 'practice';

const BY_ID = new Map(ACTIVITIES.map((a) => [a.id, a]));

/** Kimliğe göre tür kaydı; bilinmeyen kimlikte varsayılana düşer. */
export function getActivity(id) {
  return BY_ID.get(id) || BY_ID.get(DEFAULT_ACTIVITY_ID);
}

/**
 * Bir seansın/sayacın tür kimliğini çözer.
 *
 * `activity` alanı yoksa ESKİ kayıttır ve tür konu adından türetilir — eski
 * seanslar ve dışarıdan içe aktarılan yedekler bozulmasın diye. Geçmişi
 * migrasyonda toplu değiştirmek yerine okuma anında türetiyoruz: kayıt
 * dokunulmamış kalır, yanlış türetme olursa veri kaybolmaz.
 */
export function resolveActivity(sessionLike) {
  const explicit = sessionLike?.activity;
  if (explicit && BY_ID.has(explicit)) return explicit;

  const topic = sessionLike?.topic;
  if (topic === REVIEW_TOPIC) return 'lecture';
  if (topic === BRANCH_EXAM_TOPIC) return 'branch';
  return DEFAULT_ACTIVITY_ID;
}

/** Bu tür, uygulama dışında da saymaya devam etmeli mi? */
export function isKeepAliveActivity(id) {
  return getActivity(id).keepAlive;
}

/** Bu tür konu seçimi gerektiriyor mu? */
export function activityNeedsTopic(id) {
  return getActivity(id).needsTopic;
}

/**
 * Tür değişince konu seçimi ne olmalı?
 *
 * Konu YALNIZCA "konu gerektiren ↔ gerektirmeyen" sınırı geçilince değişir:
 *   anlatım ↔ soru   : seçim KORUNUR. "Videoyu izledim, şimdi aynı konudan
 *                      soru çözeyim" en sık akış; her geçişte konuyu yeniden
 *                      seçtirmek gereksiz sürtünme olurdu.
 *   → branş          : konu yerine BRANCH_EXAM_TOPIC yazılır (dersin tamamı).
 *   branş →          : temizlenir; BRANCH_EXAM_TOPIC gerçek bir konu değil ve
 *                      taşınsaydı sahte bir konuya süre yazılırdı.
 *
 * Saf fonksiyon: kural store'da gömülü kalsaydı test edilemezdi.
 */
export function nextTopicOnActivityChange(prevActivityId, nextActivityId, currentTopic) {
  if (prevActivityId === nextActivityId) return currentTopic;

  const wasTopical = activityNeedsTopic(prevActivityId);
  const isTopical = activityNeedsTopic(nextActivityId);

  if (!isTopical) return BRANCH_EXAM_TOPIC;
  if (!wasTopical) return '';
  return currentTopic;
}
