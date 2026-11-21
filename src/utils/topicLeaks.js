/**
 * ─── KONU BAZLI KAYIP (TOPIC LEAK) MOTORU ───
 *
 * Deneme kayıtları yıllardır ders düzeyinde duruyordu: `TYT_MAT: {22D 12Y 6B}`.
 * Bu veriyle "matematikte kaybediyorsun" denebiliyordu ama "matematiğin NESİNDE
 * kaybediyorsun" denemiyordu — oysa öğrencinin ihtiyacı tam olarak bu.
 *
 * Artık her ders satırında opsiyonel `lossTopics` alanı var: kaybın geldiği
 * konuların `DERS::Konu` anahtarları (bkz. data/examTopicMap.js). Anahtar
 * formatı Görev Ağacı'nın düğüm kimliğiyle AYNI; yani "denemede kaybettiğim
 * konu" ile "haritada çalıştığım düğüm" aynı şeyi işaret eder.
 *
 * ─ Neden sayı değil, işaretleme ─
 *   "Hangi konudan kaç yanlış" sormak daha hassas olurdu ama deneme formu
 *   zaten 9-11 ders satırı taşıyor; konu başına sayı girmek veri girişini
 *   öğrencinin yapmayacağı bir ödeve çevirirdi. Tek dokunuşluk işaretleme
 *   toplanınca asıl sinyali zaten veriyor: TEKRAR. "Problemler son 5 denemenin
 *   5'inde de kayıp kaynağı" tavsiyeye çevrilebilir bir tespittir.
 *
 * ─ Eşit bölüşüm bir TAHMİNDİR ve öyle sunulur ─
 *   Öğrenci matematikte 12 yanlış yapıp 3 konu işaretlediyse her birine 4
 *   yanlış yazarız. Gerçekte dağılım farklı olabilir. Bu yüzden arayüzde
 *   sayılar "~" ile gösterilir. Uydurma olmamasının sebebi: bölüştürdüğümüz
 *   miktar ÖLÇÜLMÜŞ (dersin gerçek yanlış/boş sayısı), bölen de ÖĞRENCİNİN
 *   KENDİ beyanı. Tek varsayım eşit dağılım, o da açıkça söyleniyor.
 *
 * ─ Sıralama neye göre ─
 *   Ağırlıklı kayıp (triage.js'teki ağırlıklarla: yanlış 1.25, boş 1.00 —
 *   mükemmel kâğıda göre kaçırılan net). Bu tek sayı hem tekrarı (denemeler
 *   boyunca toplanır) hem ders ağırlığını (40 soruluk derste yanlış daha çok
 *   net götürür) kendiliğinden içerir. Ayrı bir ÖSYM katsayı tablosuna
 *   ihtiyaç duymaz — o tablo kanonik havuz için henüz anahtarlanmadı.
 */
import { getEffectiveResult, BLANK_LOSS_WEIGHT, WRONG_LOSS_WEIGHT } from './triage.js';
import { parseTopicKey } from '../data/subjects.js';
import { getTopicLabel } from '../data/examTopicMap.js';
import { SUBJECT_LABELS } from '../data/mockData.js';

/** Tekrarlayan kayıp sayılmak için gereken en az işaretlenme sayısı. */
export const REPEAT_THRESHOLD = 2;

/** Bir dersin `lossTopics` alanını güvenli biçimde okur. */
function readLossTopics(result) {
  const raw = result?.lossTopics;
  if (!Array.isArray(raw)) return [];
  // Yinelenen anahtarlar bölüşümü bozardı (aynı konu iki kez sayılırdı)
  return [...new Set(raw.filter((k) => typeof k === 'string' && k.length > 0))];
}

/**
 * Tek bir denemenin konu etiketlerini düz listeye açar.
 * Kart detayında "bu denemede neyi kaybettin" satırını besler.
 *
 * @returns {Array<{key, topic, subjectId, examCode, subjectLabel, wrong, blank, netCost}>}
 */
export function getTrialLossTopics(trial) {
  const out = [];

  for (const [examCode, result] of Object.entries(trial?.results || {})) {
    const keys = readLossTopics(result);
    if (keys.length === 0) continue;

    const r = getEffectiveResult(result, examCode);
    // Eşit bölüşüm — modül başlığındaki gerekçeye bakınız
    const share = 1 / keys.length;

    for (const key of keys) {
      const parsed = parseTopicKey(key);
      out.push({
        key,
        topic: parsed?.topic || getTopicLabel(key),
        subjectId: parsed?.subjectId || null,
        examCode,
        subjectLabel: SUBJECT_LABELS[examCode] || examCode,
        wrong: r.wrong * share,
        blank: r.blank * share,
        netCost: r.wrong * 0.25 * share,
        weightedLoss: (r.wrong * WRONG_LOSS_WEIGHT + r.blank * BLANK_LOSS_WEIGHT) * share,
      });
    }
  }

  return out.sort((a, b) => b.weightedLoss - a.weightedLoss);
}

/**
 * Birden çok denemeyi tarayıp konu bazında kayıp dökümü çıkarır.
 *
 * @param {Array}  trials    tüm denemeler
 * @param {object} options
 * @param {'TYT'|'AYT'|'ALL'} options.examType  süzgeç (varsayılan 'ALL')
 * @returns {Array} ağırlıklı kayba göre azalan sıralı konu listesi
 */
export function collectTopicLeaks(trials, { examType = 'ALL' } = {}) {
  const relevant = (trials || []).filter(
    (t) => examType === 'ALL' || t?.type === examType
  );

  // Frekansın paydası: o konuyu taşıyan DERSLERİN girildiği deneme sayısı.
  // Toplam deneme sayısı yanlış payda olurdu — öğrenci her denemede her derse
  // girmiyor (alan değişiyor, bazı dersler boş bırakılıyor).
  //
  // Sayımlar DENEME başına yapılır, satır başına değil: köprü artık aynı
  // konuyu iki satıra bağlayabiliyor (ör. Tarih-1 kapsamı hem AYT_TAR1 hem
  // AYT_TAR2 satırında). Satır başına sayılsaydı tek denemede iki satırdan
  // işaretlenen konu "2 denemede tekrar" görünür, frekans %100'ü aşardı.
  const trialsByExamCode = new Map(); // examCode → Set<trialIndex>
  const byKey = new Map();

  relevant.forEach((trial, trialIndex) => {
    for (const [examCode, result] of Object.entries(trial?.results || {})) {
      if (!trialsByExamCode.has(examCode)) trialsByExamCode.set(examCode, new Set());
      trialsByExamCode.get(examCode).add(trialIndex);

      const keys = readLossTopics(result);
      if (keys.length === 0) continue;

      const r = getEffectiveResult(result, examCode);
      const share = 1 / keys.length;

      for (const key of keys) {
        const parsed = parseTopicKey(key);
        let entry = byKey.get(key);

        if (!entry) {
          entry = {
            key,
            topic: parsed?.topic || getTopicLabel(key),
            label: getTopicLabel(key),
            subjectId: parsed?.subjectId || null,
            examCode,
            subjectLabel: SUBJECT_LABELS[examCode] || examCode,
            examCodes: new Set(),
            flaggedTrials: new Set(),
            wrong: 0,
            blank: 0,
            netCost: 0,
            weightedLoss: 0,
            firstDate: trial.date,
            lastDate: trial.date,
          };
          byKey.set(key, entry);
        }

        entry.examCodes.add(examCode);
        entry.flaggedTrials.add(trialIndex);
        // Kayıp miktarları satır başına TOPLANIR — bu doğru: iki ayrı testte
        // kaybedilen soru gerçekten iki kat kayıptır. Yalnızca "kaç denemede"
        // sayısı tekilleştirilir.
        entry.wrong += r.wrong * share;
        entry.blank += r.blank * share;
        entry.netCost += r.wrong * 0.25 * share;
        entry.weightedLoss +=
          (r.wrong * WRONG_LOSS_WEIGHT + r.blank * BLANK_LOSS_WEIGHT) * share;

        if (!entry.firstDate || trial.date < entry.firstDate) entry.firstDate = trial.date;
        if (!entry.lastDate || trial.date > entry.lastDate) entry.lastDate = trial.date;
      }
    }
  });

  return [...byKey.values()]
    .map(({ examCodes, flaggedTrials, ...e }) => {
      // Payda: konuyu taşıyan satırlardan EN AZ BİRİNİN girildiği denemeler
      const eligible = new Set();
      for (const code of examCodes) {
        for (const idx of trialsByExamCode.get(code) || []) eligible.add(idx);
      }
      const flagCount = flaggedTrials.size;
      const denom = eligible.size || flagCount;

      return {
        ...e,
        flagCount,
        wrong: +e.wrong.toFixed(1),
        blank: +e.blank.toFixed(1),
        netCost: +e.netCost.toFixed(2),
        weightedLoss: +e.weightedLoss.toFixed(2),
        subjectTrials: denom,
        frequency: denom > 0 ? flagCount / denom : 0,
        isRepeat: flagCount >= REPEAT_THRESHOLD,
      };
    })
    .sort((a, b) => {
      if (b.weightedLoss !== a.weightedLoss) return b.weightedLoss - a.weightedLoss;
      return b.flagCount - a.flagCount;
    });
}

/**
 * ─── ÖLÇÜLEN kaybı BEYAN edilen durumla eşleştirir ───
 *
 * Akıllı Öncelikler bugün yalnızca öğrencinin elle işaretlediği duruma
 * (`critical` / `deficit` / `mild`) dayanıyor. Denemelerden gelen konu bazlı
 * kayıp ise ölçüm. İkisi çeliştiğinde ortaya çıkan bilgi, ikisinin ayrı ayrı
 * verdiğinden değerli: "Türev'i hafif pürüz işaretlemişsin ama son 3 denemenin
 * 3'ünde de buradan kaybettin."
 *
 * ─ Eşleşme neden kısmi ─
 *   İki havuz ayrı (bkz. CLAUDE.md "havuz birleşmesi"): Öncelikler
 *   `mockData`'daki 69 konuyu, kayıplar `subjects.js`'teki 294 konuyu
 *   adlandırıyor ve adların yalnızca bir kısmı birebir tutuyor. Bu yüzden
 *   eşleşme ders kodu + TAM ad eşitliği arar; tutmayan konu sessizce geçilir.
 *   Yaklaşık eşleştirme (benzerlik, önek) bilinçli olarak YAPILMIYOR —
 *   yanlış konuyu suçlamak, hiçbir şey söylememekten kötüdür.
 *
 *   Ders kodu iki yerden eşleşebilir: kaybın çalışma dersi (`subjectId`) ya da
 *   geldiği deneme satırı (`examCode`). Katlanmış derslerde ikisi farklı
 *   (ör. Din konusunun çalışma dersi TYT_FEL, deneme satırı TYT_DIN).
 *
 * @param {Array} leaks            collectTopicLeaks çıktısı
 * @param {Array} declaredTopics   triageTopics çıktısı ({subject, name, status, isCompleted})
 * @returns {Array} her kayda `declared` ve `conflict` eklenmiş kopya
 */
export function annotateLeaksWithDeclared(leaks, declaredTopics) {
  const byKey = new Map();
  for (const d of declaredTopics || []) {
    if (!d?.subject || !d?.name) continue;
    byKey.set(`${d.subject}\u0000${d.name}`, d);
  }

  return (leaks || []).map((leak) => {
    const declared =
      byKey.get(`${leak.subjectId}\u0000${leak.topic}`) ||
      byKey.get(`${leak.examCode}\u0000${leak.topic}`) ||
      null;

    let conflict = null;
    if (declared) {
      if (declared.isCompleted) {
        // "Cebe atıldı" denmiş ama hâlâ net götürüyor
        conflict = 'completed';
      } else if (leak.isRepeat && declared.status === 'mild') {
        // En hafif durum işaretlenmiş ama tekrar tekrar kaybettiriyor
        conflict = 'underrated';
      }
    }

    return { ...leak, declared, conflict };
  });
}

/** Hiç konu etiketi girilmiş mi? Boş durum metnini seçmek için. */
export function hasAnyLossTopics(trials) {
  for (const t of trials || []) {
    for (const result of Object.values(t?.results || {})) {
      if (readLossTopics(result).length > 0) return true;
    }
  }
  return false;
}

/**
 * Tespit üretir: bu denemede işaretlenen konulardan hangileri geçmişte de
 * kayıp kaynağı olarak işaretlenmiş.
 *
 * Değeri şu: tek bir denemeye bakarak görülemez. Öğrenci her denemede
 * "Trigonometri"yi işaretlediğini fark etmez; motor fark eder.
 *
 * @param {object} trial
 * @param {Array}  previousTrials  bu denemeden ÖNCEKİ denemeler
 * @returns {object|null} examAnalysis findings listesine uygun kayıt
 */
export function diagnoseRepeatTopics(trial, previousTrials = []) {
  const current = new Set(
    Object.values(trial?.results || {}).flatMap((r) => readLossTopics(r))
  );
  if (current.size === 0) return null;

  // Geçmişteki işaretlenme sayıları — DENEME başına (bkz. collectTopicLeaks:
  // aynı konu bir denemede iki satırdan işaretlenebilir, bir kez sayılır)
  const history = new Map();
  for (const t of previousTrials) {
    if (t?.id === trial?.id) continue;
    const keysInTrial = new Set(
      Object.values(t?.results || {}).flatMap((r) => readLossTopics(r))
    );
    for (const key of keysInTrial) {
      if (current.has(key)) history.set(key, (history.get(key) || 0) + 1);
    }
  }

  const repeats = [...history.entries()]
    .filter(([, n]) => n >= REPEAT_THRESHOLD - 1)
    .sort((a, b) => b[1] - a[1]);

  if (repeats.length === 0) return null;

  const [topKey, topCount] = repeats[0];
  const total = topCount + 1; // bu deneme de dahil
  const name = getTopicLabel(topKey);

  if (repeats.length === 1) {
    return {
      id: 'repeatTopic',
      tone: 'bad',
      title: `${name}: ${total} denemede üst üste kayıp`,
      body: `Bu konuyu ${total} denemede de kayıp kaynağı olarak işaretledin. Tekrarlayan kayıp, çözülmemiş bir konu eksiğinin en net işaretidir — soru çözmeye devam etmek yerine konuyu baştan çalışmak gerekiyor.`,
    };
  }

  const others = repeats
    .slice(1, 3)
    .map(([k]) => getTopicLabel(k))
    .join(', ');

  return {
    id: 'repeatTopic',
    tone: 'bad',
    title: `${repeats.length} konu tekrar tekrar kaybettiriyor`,
    body: `En çok ${name} (${total} deneme), ardından ${others}. Bu konular artık "deneme çözerek düzelecek" aşamayı geçti; sıradaki çalışma blokunu doğrudan bunlara ayır.`,
  };
}
