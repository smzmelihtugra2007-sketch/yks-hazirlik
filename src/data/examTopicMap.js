/**
 * ─── SINAV DERS KODU → KANONİK KONU LİSTESİ KÖPRÜSÜ ───
 *
 * Deneme formu `mockData.js`'teki sınav ders kodlarıyla çalışır (TYT_DIN,
 * AYT_COG1 gibi ÖSYM'nin ayrı ayrı puanladığı 21 ders). Çalışma konuları ise
 * `subjects.js`'teki 19 derste duruyor; orada bazı sınav dersleri tek ders
 * altında katlanmış (TYT Felsefe & Din, AYT Tarih-1 / Coğrafya-1 …), bazıları
 * da tersine iki çalışma dersine bölünmüş (Matematik + Geometri).
 *
 * Bu modül yalnızca DERS düzeyinde köprü kurar — konu adlarını eşlemeye
 * KALKMAZ. Çünkü konu düzeyinde eşleme kurmak (iki havuzdaki adların %42'si
 * tutuyor) yanlış bir vaattir: Haritada "Yazım Kuralları" + "Noktalama
 * İşaretleri" iki ayrı başlık, Önceliklerde tek "Yazım-Noktalama" var. Bunun
 * doğru çözümü iki havuzu birleştirmek; o iş ayrıca planlandı.
 *
 * Katlanmış dersleri ayırmak için `subjects.js`'te hâlihazırda bulunan konu
 * adı önekleri kullanılır ('Din Kültürü: ', 'Coğrafya-1: ' …). Yeni bir
 * katlama eklenirse önek kuralı da buraya yazılmalı; önek yoksa ders bütün
 * konularıyla gelir.
 *
 * ─ Bir deneme satırı → BİRDEN ÇOK kaynak ─
 *   Bazı deneme satırları birden fazla çalışma dersini kapsıyor:
 *     TYT_MAT  → TYT Matematik + TYT Geometri   (40 sorunun ~10'u geometri)
 *     AYT_MAT  → AYT Matematik + AYT Geometri
 *     AYT_TAR2 → Tarih-2'ye özgü + Tarih-1 kapsamı (Tarih-2 testi ikisini de sorar)
 *     AYT_COG2 → Coğrafya-2'ye özgü + Coğrafya-1 kapsamı
 *   Bu yüzden her köprü bir KAYNAK DİZİSİ. Ek kaynaklar `group` taşır; deneme
 *   formu çipleri o başlık altında ayrı gösterir.
 *
 *   SONUÇ: aynı konu anahtarı artık İKİ deneme satırından gelebilir
 *   (ör. 'AYT_TAR1::Tarih-1: Milli Mücadele' hem AYT_TAR1 hem AYT_TAR2
 *   satırında). topicLeaks.js tekrar sayımını bu yüzden SATIR değil DENEME
 *   başına yapar — yoksa tek denemede iki satırdan işaretlenen konu
 *   "iki denemede tekrar" sanılırdı.
 */
// Göreli import açık `.js` uzantısı taşır: bu modül Node ile doğrudan test
// edilen saf mantığı besliyor (bkz. CLAUDE.md "Yığın ve komutlar").
import { STUDY_SUBJECTS, makeTopicKey } from './subjects.js';

/**
 * Her kaynak:
 *   subjectId : çalışma dersi (subjects.js)
 *   include   : yalnızca bu önekle başlayan konular alınır (önek gösterimde atılır)
 *   exclude   : bu öneklerle başlayan konular DIŞARIDA bırakılır
 *   group     : ek kaynağın çiplerde görünen başlığı (birincil kaynakta yok)
 *
 * Bir ders hem kendi adıyla hem katlanmış kardeşiyle listede durursa, kardeşin
 * konuları ana derse sızmasın diye ana derse `exclude` verilir.
 */
const EXAM_SUBJECT_BRIDGE = {
  // ── TYT ──
  TYT_TUR: [{ subjectId: 'TYT_TUR' }],
  TYT_MAT: [
    { subjectId: 'TYT_MAT' },
    { subjectId: 'TYT_GEO', group: 'Geometri' },
  ],
  TYT_FIZ: [{ subjectId: 'TYT_FIZ' }],
  TYT_KIM: [{ subjectId: 'TYT_KIM' }],
  TYT_BIY: [{ subjectId: 'TYT_BIY' }],
  TYT_TAR: [{ subjectId: 'TYT_TAR' }],
  TYT_COG: [{ subjectId: 'TYT_COG' }],

  // Felsefe ile Din Kültürü sınavda ayrı, havuzda tek derste
  TYT_FEL: [{ subjectId: 'TYT_FEL', exclude: ['Din Kültürü: '] }],
  TYT_DIN: [{ subjectId: 'TYT_FEL', include: 'Din Kültürü: ' }],

  // ── AYT ──
  AYT_MAT: [
    { subjectId: 'AYT_MAT' },
    { subjectId: 'AYT_GEO', group: 'Geometri' },
  ],
  AYT_FIZ: [{ subjectId: 'AYT_FIZ' }],
  AYT_KIM: [{ subjectId: 'AYT_KIM' }],
  AYT_BIY: [{ subjectId: 'AYT_BIY' }],
  AYT_EDEB: [{ subjectId: 'AYT_EDEB' }],
  AYT_YDL: [{ subjectId: 'AYT_YDL' }],
  AYT_DIN: [{ subjectId: 'AYT_DIN' }],

  // Tarih/Coğrafya/Felsefe grupları havuzda ikiye katlanmış
  AYT_TAR1: [{ subjectId: 'AYT_TAR1', include: 'Tarih-1: ' }],
  AYT_COG1: [{ subjectId: 'AYT_TAR1', include: 'Coğrafya-1: ' }],
  AYT_TAR2: [
    { subjectId: 'AYT_TAR2', include: 'Tarih-2: ' },
    { subjectId: 'AYT_TAR1', include: 'Tarih-1: ', group: 'Tarih-1 kapsamı' },
  ],
  AYT_COG2: [
    { subjectId: 'AYT_TAR2', include: 'Coğrafya-2: ' },
    { subjectId: 'AYT_TAR1', include: 'Coğrafya-1: ', group: 'Coğrafya-1 kapsamı' },
  ],
  AYT_FEL: [{ subjectId: 'AYT_TAR2', include: 'Felsefe: ' }],
};

const SUBJECT_BY_ID = new Map(STUDY_SUBJECTS.map((s) => [s.id, s]));

/** Tek bir kaynağın konularını çözer. */
function resolveSource(source) {
  const subject = SUBJECT_BY_ID.get(source.subjectId);
  if (!subject) return [];

  return subject.topics
    .filter((topic) => {
      if (source.include) return topic.startsWith(source.include);
      if (source.exclude) return !source.exclude.some((p) => topic.startsWith(p));
      return true;
    })
    .map((topic) => ({
      key: makeTopicKey(subject.id, topic),
      topic,
      label: source.include ? topic.slice(source.include.length) : topic,
      group: source.group || null,
    }));
}

/**
 * Bir sınav dersinin etiketlenebilir konularını döndürür.
 *
 * @param {string} examCode  'TYT_MAT' | 'AYT_COG1' …
 * @returns {Array<{key: string, topic: string, label: string, group: string|null}>}
 *   key   : `DERS::Konu` — kayda yazılan kalıcı kimlik (Görev Ağacı ile aynı)
 *   topic : havuzdaki tam konu adı
 *   label : ekranda görünen ad; katlanmış derslerde önek atılır, çünkü satır
 *           zaten "Coğrafya-1" diyor — çipte tekrar etmesi yer kaybı.
 *   group : null = birincil kaynak; dolu = ek kaynak başlığı ("Geometri" …)
 */
export function getTopicsForExamSubject(examCode) {
  const sources = EXAM_SUBJECT_BRIDGE[examCode];
  if (!sources) return [];

  // Aynı anahtar iki kaynaktan gelirse (bugün gelmiyor, ileride önek
  // çakışması olursa) yalnızca ilki kalır — çipte aynı konu iki kez çıkmasın
  const seen = new Set();
  const out = [];
  for (const source of sources) {
    for (const item of resolveSource(source)) {
      if (seen.has(item.key)) continue;
      seen.add(item.key);
      out.push(item);
    }
  }
  return out;
}

/** Köprüde kayıtlı tüm deneme ders kodları — testler ve kapsama kontrolü için. */
export const BRIDGED_EXAM_CODES = Object.keys(EXAM_SUBJECT_BRIDGE);

/** Bu sınav dersi için konu etiketlemesi yapılabilir mi? */
export function hasTopicsForExamSubject(examCode) {
  return getTopicsForExamSubject(examCode).length > 0;
}

/**
 * Anahtardan gösterim adı üretir. Köprüde kayıtlı olmayan (veri bozulması veya
 * havuzdan kaldırılmış) bir konu için anahtarın konu kısmı döner — ekranda boş
 * bırakmaktansa ham adı göstermek yeğdir.
 */
export function getTopicLabel(key) {
  const at = key.indexOf('::');
  return at > 0 ? key.slice(at + 2) : key;
}
