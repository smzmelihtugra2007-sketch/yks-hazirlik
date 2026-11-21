/**
 * ─── DENEME ANALİZİ: YANLIŞ / BOŞ ORANI VE TESPİTLER ───
 *
 * Deneme verisinde `wrong` ve `blank` yıllardır duruyordu ama hiç
 * yorumlanmıyordu. Bu modül onları net kazancı diline çeviriyor.
 *
 * ─ Neden boş ile yanlış aynı şey değil ─
 *   YKS'de 4 yanlış 1 doğruyu götürür; boş bırakmanın net maliyeti SIFIRDIR.
 *   Yani 20 yanlış 5 net kaybı, 20 boş 0 net kaybıdır. (triage.js'teki eski
 *   `calcSubjectLossRate` ikisini aynı kefeye koyuyordu.)
 *
 * ─ Başabaş kuralı ─
 *   Boş bir soruyu işaretlemenin beklenen net değeri:  E = 1.25p - 0.25
 *   Başabaş p = %20. Yani 5 seçenekten rastgele işaretlemek tam sıfır kârlı;
 *   BİR seçenek elenirse (%25) kâra geçer, iki seçenek elenirse (%33) belirgin
 *   kazanç olur. Tavsiyelerimiz bu kurala dayanır.
 *
 * ─ Uydurmadığımız şey ─
 *   "8 boşu işaretlesen +2 net kazanırdın" demiyoruz. Çünkü işaretli doğruluğu
 *   öğrencinin SEÇTİĞİ (bildiği) sorularda ölçülür; boş bıraktıkları zaten en
 *   zorları. Bunun yerine başabaş kuralını söylüyoruz — doğru ve savunulabilir.
 *
 * ─ Mutlak hedef koymuyoruz ─
 *   "Boş oranın %8 olmalı" yanlış olurdu: AYT Matematik'te 15 boş normal,
 *   TYT Türkçe'de 5 boş çoktur. Kıyas öğrencinin KENDİ geçmişine göre yapılır.
 */
import { getEffectiveResult, formatNet } from './triage.js';
import { percentWithPossessive, countWithPossessive } from './turkish.js';
import { diagnoseRepeatTopics } from './topicLeaks.js';
import { SUBJECT_LABELS } from '../data/mockData.js';

/**
 * Boş bırakma sebepleri — her ders satırında opsiyonel olarak sorulur.
 *
 * `advice` metinleri KAPSAMDAN BAĞIMSIZ yazılır: aynı cümle hem deneme geneli
 * ("boşlarının çoğu") hem tek ders ("Kimya'da 3 boş") tespitinde kullanılıyor.
 * Eskiden "bu ders için konu çalışman gerekiyor" diyordu ve deneme genelinde
 * hangi dersten bahsettiği belirsiz kalıyordu. Ders adı artık cümleyi kuran
 * tespit fonksiyonunun işi, tavsiye metninin değil.
 *
 * Ayrıca her tavsiye "ne yapacağım" sorusunu somut bir eylemle cevaplar;
 * "işaretleme taktiği değiştirmez" gibi neyin değişmeyeceğini söyleyen
 * kapalı ifadeler öğrenciye yol göstermiyordu.
 */
export const BLANK_REASONS = {
  unknown: {
    label: 'Bilmiyordum',
    short: 'Bilgi eksiği',
    advice:
      'Bu sorular bilgi eksiğinden boş kaldı, çekingenlikten değil. Daha cesur işaretlemek burada işe yaramaz: bilmediğin bir soruda rastgele şık işaretlemenin uzun vadedeki getirisi sıfırdır. Yapılacak tek şey konuyu çalışmak — ardından aynı sorular zaten boş kalmayacak.',
  },
  time: {
    label: 'Süre yetmedi',
    short: 'Süre',
    advice:
      'Bu bir bilgi sorunu değil, hız sorunu: bildiğin soruları da çözemeden süre bitti. Çözümü şu — bir soruda takıldığını hissettiğin anda işaretleyip geç, kâğıdın sonuna kadar git, artan süreyle geri dön. Sona kalan kolay soruları hiç görememek en pahalı hatadır.',
  },
  unsure: {
    label: 'Emin olamadım',
    short: 'Tereddüt',
    advice:
      'Kısmi bilgin vardı ama riske girmedin. YKS\'de 4 yanlış 1 doğruyu götürür; bu yüzden 5 şıktan en az ikisini eleyebildiğin bir soruyu işaretlemek uzun vadede net KAZANDIRIR, kaybettirmez. Hiçbir şıkkı eleyemiyorsan boş bırakman doğru karar.',
  },
};

export const BLANK_REASON_CODES = Object.keys(BLANK_REASONS);

/** Başabaş olasılığı: bunun altında işaretlemek zarar, üstünde kâr. */
export const BREAK_EVEN_PROBABILITY = 0.2;

/** Doğruluk eşikleri (işaretli sorularda). */
const ACCURACY_HIGH = 0.85;
const ACCURACY_LOW = 0.7;

/** Boş oranı eşikleri. */
const BLANK_HIGH = 0.2;
const BLANK_LOW = 0.1;

/**
 * Bir dersin tek denemedeki sonucunu çözümler.
 * Boş, girilmemişse resmî soru sayısından türetilir (bkz. getEffectiveResult):
 * öğrenciler genelde yalnızca D ve Y giriyor, kalan sorular boştur.
 */
export function analyzeSubject(result, subjectCode) {
  const { correct, wrong, blank, total, officialQ, blankInferred } =
    getEffectiveResult(result, subjectCode);

  const answered = correct + wrong;

  return {
    code: subjectCode,
    label: SUBJECT_LABELS[subjectCode] || subjectCode,
    correct,
    wrong,
    blank,
    blankInferred,
    answered,
    total,
    officialQ,
    net: +(correct - wrong * 0.25).toFixed(2),
    netLostToWrong: +(wrong * 0.25).toFixed(2),
    blankRate: total > 0 ? blank / total : 0,
    wrongRate: total > 0 ? wrong / total : 0,
    // İşaretlediğinin ne kadarı doğru — bilgi kalitesini risk iştahından ayırır.
    // Hiç işaretlememişse tanımsız (null), 0 değil.
    markedAccuracy: answered > 0 ? correct / answered : null,
    blankReason: result?.blankReason || null,
  };
}

/** Tüm denemeyi çözümler: toplam + ders bazında. */
export function analyzeTrial(trial) {
  const entries = Object.entries(trial?.results || {});
  const subjects = entries.map(([code, r]) => analyzeSubject(r, code));

  const correct = subjects.reduce((a, s) => a + s.correct, 0);
  const wrong = subjects.reduce((a, s) => a + s.wrong, 0);
  const blank = subjects.reduce((a, s) => a + s.blank, 0);
  const answered = correct + wrong;
  const total = answered + blank;

  // Boşların sebeplerini dakika değil SORU sayısıyla ağırlıkla
  const blanksByReason = {};
  for (const s of subjects) {
    if (s.blank > 0 && s.blankReason) {
      blanksByReason[s.blankReason] = (blanksByReason[s.blankReason] || 0) + s.blank;
    }
  }
  const reasonEntries = Object.entries(blanksByReason).sort((a, b) => b[1] - a[1]);
  const labeledBlanks = reasonEntries.reduce((a, [, n]) => a + n, 0);
  const dominantReason =
    reasonEntries.length > 0 && labeledBlanks >= blank * 0.5 ? reasonEntries[0][0] : null;

  return {
    id: trial?.id,
    date: trial?.date,
    name: trial?.name,
    type: trial?.type,
    subjects,
    correct,
    wrong,
    blank,
    answered,
    total,
    net: +(correct - wrong * 0.25).toFixed(2),
    netLostToWrong: +(wrong * 0.25).toFixed(2),
    blankRate: total > 0 ? blank / total : 0,
    wrongRate: total > 0 ? wrong / total : 0,
    markedAccuracy: answered > 0 ? correct / answered : null,
    blanksByReason,
    dominantReason,
  };
}

/** Doğruluk / boş oranı bandı — teşhis matrisinin iki ekseni. */
function accuracyBand(acc) {
  if (acc === null) return 'none';
  if (acc >= ACCURACY_HIGH) return 'high';
  if (acc >= ACCURACY_LOW) return 'mid';
  return 'low';
}

function blankBand(rate) {
  // Sınır dahil: 8/40 = tam %20 da "yüksek" sayılır. Kâğıdın beşte birini boş
  // bırakmak, eşiğin bir kıl altında kaldığı için yorumsuz geçilmemeli.
  if (rate >= BLANK_HIGH) return 'high';
  if (rate < BLANK_LOW) return 'low';
  return 'mid';
}

const pct = (x) => `%${Math.round(x * 100)}`;

/** "%22'si" — iyelik eki sayının okunuşuna göre seçilir (bkz. utils/turkish.js) */
const pctOf = percentWithPossessive;
/** "26'sı" */
const nOf = countWithPossessive;

/**
 * Teşhis matrisi: işaretli doğruluğu × boş oranı.
 * Dört köşe dört farklı müdahale gerektirir; en sık yapılan hata yüksek
 * doğruluklu öğrenciye "daha az boş bırak" demek yerine hiç bir şey dememek.
 *
 * ─ Dil notu ─
 *   Yüzdelere Türkçe iyelik eki EKLENMEZ. Ek okunuşa göre değişiyor
 *   ("%22'sini" ama "%31'ini") ve tek şablonla doğru üretilemiyordu; ekranda
 *   "%22'ini" gibi bozuk ifadeler çıkıyordu. Cümleler eke ihtiyaç duymayacak
 *   şekilde kuruluyor ("boş oranın %22" / "120 sorudan 26'sı boş").
 *
 * ─ Yazım ilkesi ─
 *   Her teşhis "ne oldu → neden → ne yapacağım" sırasını izler. Sonuncusu
 *   somut bir eylem olmalı; "taktik değiştirmek net kazandırmaz" gibi neyin
 *   işe YARAMAYACAĞINI söyleyip bırakan cümleler öğrenciyi yolda bırakıyordu.
 */
function diagnoseVerdict(a) {
  const acc = accuracyBand(a.markedAccuracy);
  const bl = blankBand(a.blankRate);

  if (acc === 'none') {
    return {
      id: 'verdict',
      tone: 'info',
      title: 'Yorum için yeterli veri yok',
      body: 'Bu denemede hiç soru işaretlenmemiş görünüyor.',
    };
  }

  if (acc === 'high' && bl === 'high') {
    return {
      id: 'verdict',
      tone: 'warn',
      title: 'Aşırı temkinli davranıyorsun',
      body: `İşaretlediğin ${a.answered} sorunun ${pctOf(a.markedAccuracy)} doğru — bu çok iyi bir oran. Ama ${a.total} sorudan ${a.blank} tanesini hiç işaretlememişsin. Bu tablo bilgi eksiğini değil, çekingenliği gösteriyor: bildiğin soruları da boş bırakıyorsun. Şunu dene — bir soruda 5 şıktan ikisini eleyebiliyorsan kalan üçünden birini işaretle. Bu tür sorularda uzun vadede net KAZANIRSIN, kaybetmezsin.`,
    };
  }

  if (acc === 'low' && bl === 'low') {
    return {
      id: 'verdict',
      tone: 'bad',
      title: 'Fazla tahmin ediyorsun',
      body: `Neredeyse hiç boş bırakmamışsın (${a.total} sorudan ${a.blank}) ama işaretlediklerinin yalnızca ${pctOf(a.markedAccuracy)} doğru. ${a.wrong} yanlış × 0,25 = ${formatNet(a.netLostToWrong)} net, doğrudan cebinden çıktı. Kural şu: 4 yanlış 1 doğruyu siler. Hiçbir şıkkı eleyemediğin bir soruyu işaretlemek ortalama olarak sana hiçbir şey kazandırmaz, ama yanlış yaparsan kaybettirir. Emin olmadığında ve hiçbir şık eleyemediğinde boş bırak.`,
    };
  }

  if (acc === 'low' && bl === 'high') {
    return {
      id: 'verdict',
      tone: 'info',
      title: 'Asıl iş konu çalışmak',
      body: `${a.total} sorudan ${a.blank} tanesi boş ve işaretlediklerinin de ${pctOf(a.markedAccuracy)} doğru. İkisi birden düşükse sorun işaretleme kararların değil, konu bilgisi. Bu yüzden "daha çok işaretle" demiyorum — boş bırakman şu an doğru karar, çünkü bilmediğin soruyu işaretlemek sana net kazandırmaz. Zamanını deneme çözmeye değil konu çalışmaya ayır; netler onun arkasından gelir.`,
    };
  }

  if (acc === 'high' && bl === 'low') {
    return {
      id: 'verdict',
      tone: 'good',
      title: 'Dengeli bir deneme',
      body: `İşaretlediklerinin ${pctOf(a.markedAccuracy)} doğru ve ${a.total} sorudan yalnızca ${a.blank} tanesi boş. Hem çok soru çözmüşsün hem de isabet oranın yüksek — ikisini birden tutturmak zordur. Yapman gereken bir şey yok, bu dengeyi koru.`,
    };
  }

  return {
    id: 'verdict',
    tone: 'info',
    title: 'Orta bandta',
    body: `İşaretlediklerinin ${pctOf(a.markedAccuracy)} doğru, ${a.total} sorudan ${a.blank} tanesi boş. Ne aşırı temkinli ne aşırı cesursun. Buradan en hızlı kazanç isabet oranını yükseltmekten gelir: ${a.wrong} yanlışın ${formatNet(a.netLostToWrong)} net götürdü. Yani daha çok soru işaretlemek yerine, işaretlediklerinde daha az hata yapmaya odaklan — doğruluğu ${pct(ACCURACY_HIGH)} üzerine çıkarmak boş oranını düşürmekten daha çok net kazandırır.`,
  };
}

/**
 * Önceki denemelerle karşılaştırma.
 * En değerli tespit burada: boş oranı düşerken yanlış artıyorsa net kaybı
 * olabilir ama öğrenci "boşum azaldı" diye ilerleme sanır.
 */
function diagnoseTrend(a, previous) {
  if (!previous || previous.length === 0) return null;

  const avg = (fn) => previous.reduce((s, p) => s + fn(p), 0) / previous.length;
  const prevBlank = avg((p) => p.blankRate);
  const prevWrong = avg((p) => p.wrongRate);
  const prevNet = avg((p) => p.net);

  const dBlank = a.blankRate - prevBlank;
  const dWrong = a.wrongRate - prevWrong;
  const dNet = a.net - prevNet;

  // Gizlenmiş gerileme: boş düştü, yanlış arttı, net kazanç yok
  if (dBlank <= -0.05 && dWrong >= 0.03 && dNet <= 0) {
    return {
      id: 'trend',
      tone: 'bad',
      title: 'Boşun azaldı ama net kazancın yok',
      // "66.7 → 79.0" ikilisinde soldaki ORTALAMA, sağdaki tek denemenin
      // neti. İkisi aynı biçimde yazılınca öğrenci ortalamayı da bir net
      // sanıyordu; artık hangisinin ne olduğu cümlede yazıyor.
      body: `Boş oranın ${pct(prevBlank)} → ${pct(a.blankRate)} düştü, fakat yanlış oranın ${pct(prevWrong)} → ${pct(a.wrongRate)} çıktı. Son denemelerinin net ortalaması ${prevNet.toFixed(1)} iken bu deneme ${formatNet(a.net)} net — yani daha çok soru işaretledin ama karşılığını alamadın. Daha çok işaretlemek değil, daha seçici işaretlemek gerekiyor.`,
    };
  }

  // Doğru yönde: boş düştü, net arttı
  if (dBlank <= -0.04 && dNet > 0.5) {
    return {
      id: 'trend',
      tone: 'good',
      title: 'Doğru yönde gidiyorsun',
      body: `Boş oranın ${pct(prevBlank)} → ${pct(a.blankRate)} düştü ve bunu nete çevirdin: son denemelerinin ortalaması ${prevNet.toFixed(1)} netken bu deneme ${formatNet(a.net)} net. Daha fazla soru işaretlemen karşılığını veriyor.`,
    };
  }

  // Doğruluk gerilemesi
  if (a.markedAccuracy !== null && dWrong >= 0.05) {
    return {
      id: 'trend',
      tone: 'warn',
      title: 'Yanlış oranın yükseliyor',
      body: `Yanlış oranın ${pct(prevWrong)} → ${pct(a.wrongRate)} çıktı. Acele etmiş ya da emin olmadığın soruları işaretlemiş olabilirsin.`,
    };
  }

  return null;
}

/**
 * Boş bırakma sebebine göre tavsiye (veri girilmişse).
 *
 * Başlık kaç soruyu, gövde hangi dersleri kapsadığını söyler — eskiden ikisi de
 * yoktu ve tavsiye havada kalıyordu ("bu ders" derken hangi ders?).
 */
function diagnoseBlankReason(a) {
  if (!a.dominantReason || a.blank === 0) return null;
  const reason = BLANK_REASONS[a.dominantReason];
  if (!reason) return null;

  const count = a.blanksByReason?.[a.dominantReason] || 0;

  // Bu sebebi taşıyan dersler, en çok boşu olandan başlayarak (en fazla iki
  // tane: üç ders adı cümleyi okunmaz yapıyor)
  const subjects = a.subjects
    .filter((s) => s.blankReason === a.dominantReason && s.blank > 0)
    .sort((x, y) => y.blank - x.blank)
    .slice(0, 2)
    .map((s) => s.label);

  const where =
    subjects.length > 0 ? `En çok ${subjects.join(' ve ')} dersinde. ` : '';

  return {
    id: 'reason',
    tone: a.dominantReason === 'unknown' ? 'info' : 'warn',
    title: `Boşlarının çoğu: ${reason.label} (${count} soru)`,
    body: `${where}${reason.advice}`,
  };
}

/** En çok net kaybettiren ders (yanlış üzerinden). */
function diagnoseWorstSubject(a) {
  const candidates = a.subjects.filter((s) => s.total >= 5 && s.wrong > 0);
  if (candidates.length === 0) return null;

  const worst = candidates.reduce((w, s) => (s.netLostToWrong > w.netLostToWrong ? s : w));
  if (worst.netLostToWrong < 1) return null;

  // Hesabı açıkça yaz: öğrenci "3 net nereden çıktı" diye sormasın
  const arithmetic = `${worst.wrong} yanlış × 0,25 = ${formatNet(worst.netLostToWrong)} net`;

  return {
    id: 'worstSubject',
    tone: 'warn',
    title: `En pahalı ders ${worst.label}: ${formatNet(worst.netLostToWrong)} net kaybı`,
    body: `${arithmetic}. Üstelik işaretlediklerinde doğruluğun ${
      worst.markedAccuracy !== null ? pct(worst.markedAccuracy) : '—'
    } — yani soruların çoğunu biliyorsun, kaybın birkaç tekrarlayan hatadan geliyor. Bu yanlışları tek tek açıp "neden yanlış yaptım" diye not al: aceleden mi, soruyu yanlış okumaktan mı, yoksa gerçekten bilmediğin bir ayrıntıdan mı. Aynı sebep ikinci kez çıkıyorsa asıl düzeltmen gereken odur.`,
  };
}

/** En yüksek boş oranlı ders. */
function diagnoseBlankSubject(a) {
  const candidates = a.subjects.filter((s) => s.total >= 5 && s.blank > 0);
  if (candidates.length === 0) return null;

  const worst = candidates.reduce((w, s) => (s.blankRate > w.blankRate ? s : w));
  if (worst.blankRate < 0.25) return null;

  const reason = worst.blankReason ? BLANK_REASONS[worst.blankReason] : null;

  return {
    id: 'blankSubject',
    tone: 'info',
    title: `${worst.label}: ${worst.total} sorudan ${nOf(worst.blank)} boş`,
    body: reason
      ? `Sebebini "${reason.label}" olarak işaretlemişsin. ${reason.advice}`
      : `Bu dersin boş oranı ${pct(worst.blankRate)} — denemenin en yükseği. Deneme eklerken bu dersin "boş bırakma sebebi"ni de işaretlersen (bilmiyordum / süre yetmedi / emin olamadım) sana ne yapman gerektiğini tam olarak söyleyebilirim; çünkü bu üçü bambaşka çözüm gerektiriyor.`,
  };
}

/**
 * Bir deneme için en fazla 4 tespit üretir, önem sırasına göre.
 *
 * @param {object} trial            analiz edilecek deneme
 * @param {Array}  previousTrials   AYNI türden (TYT/AYT) daha eski denemeler
 */
export function getTrialFindings(trial, previousTrials = []) {
  const a = analyzeTrial(trial);
  if (a.total === 0) return { analysis: a, findings: [] };

  const prev = previousTrials
    .filter((t) => t?.type === trial?.type && t?.id !== trial?.id)
    .slice(0, 3)
    .map(analyzeTrial)
    .filter((p) => p.total > 0);

  // Tekrar tespiti için ham denemeler gerekir (konu etiketleri analiz
  // nesnesinde değil, kaydın kendisinde duruyor)
  const rawPrev = previousTrials.filter(
    (t) => t?.type === trial?.type && t?.id !== trial?.id
  );

  const findings = [
    // İlk ikisi öğrencinin tek denemeye bakarak GÖREMEYECEĞİ tespitler
    diagnoseTrend(a, prev),
    diagnoseRepeatTopics(trial, rawPrev),
    diagnoseVerdict(a),       // ana teşhis
    diagnoseBlankReason(a),
    diagnoseWorstSubject(a),
    diagnoseBlankSubject(a),
  ].filter(Boolean);

  return { analysis: a, findings: findings.slice(0, 4) };
}
