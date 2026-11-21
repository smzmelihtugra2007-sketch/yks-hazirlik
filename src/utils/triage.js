/**
 * ─── TRIAGE (Akıllı Önceliklendirme) MOTORU ───
 *
 * Yüzdelik Kayıp Esaslı Akıllı Önceliklendirme Algoritması.
 *
 * Temel Mantık:
 *  - 40 soruluk testte 4 hata (%10 kayıp) ile, 7 soruluk testte 4 hata (~%57 kayıp) aynı ağırlıkta olamaz!
 *  - Formül:
 *      kayıpOranı  = (Yanlış + Boş) / Dersin Toplam Soru Sayısı
 *      aciliyetSkoru = (100 - Ustalık) × YKS Katsayısı × (1 + kayıpOranı × 1.5)
 *
 * Katsayı Kaynağı: ÖSYM 2024 YKS Standart Sapma / Puan Ağırlık tahminleri baz alınmıştır.
 *  - TYT'de Türkçe (40 soru) ve Matematik (40 soru) toplam 100 puanın ~70'ini belirler → coefficient: 5
 *  - Fen/Sosyal bilimleri (7-6 soruluk) katkısı sınırlıdır → coefficient: 2-3
 *  - AYT'de Matematik (40 soru) alan puanının %37-42'sini taşır → coefficient: 5
 *  - AYT Türk Dili ve Edebiyatı (24 soru) EA ve SÖZ alanında %25+ katkı → coefficient: 5
 *  - AYT Fen dersleri (13-14 soru) → coefficient: 4
 *  - YDT (80 soru) → coefficient: 5 (tek ders, tüm ağırlık burada)
 */

// ─── Ders Bazında YKS Soru Sayıları Standart Tablosu ───
export const SUBJECT_QUESTION_COUNTS = {
  // TYT (Toplam 120 soru)
  TYT_TUR: 40,
  TYT_MAT: 40,
  TYT_FIZ: 7,
  TYT_KIM: 7,
  TYT_BIY: 6,
  TYT_TAR: 5,
  TYT_COG: 5,
  TYT_FEL: 5,
  TYT_DIN: 5,

  // AYT (Toplam 160 soru havuzu)
  AYT_MAT:  40,
  AYT_FIZ:  14,
  AYT_KIM:  13,
  AYT_BIY:  13,
  AYT_EDEB: 24,
  AYT_TAR1: 10,
  AYT_COG1:  6,
  AYT_TAR2: 11,
  AYT_COG2: 11,
  AYT_FEL:  12,
  AYT_DIN:   6,  // Sosyal Bilimler-2: Tarih-2 11 + Coğ-2 11 + Felsefe 12 + Din 6 = 40
  AYT_YDL:  80,
};

/**
 * ÖSYM ağırlık tahminine dayalı YKS Katsayı Tablosu
 */
export const SUBJECT_COEFFICIENTS = {
  // TYT
  TYT_TUR: 5,
  TYT_MAT: 5,
  TYT_FIZ: 3,
  TYT_KIM: 3,
  TYT_BIY: 3,
  TYT_TAR: 2,
  TYT_COG: 2,
  TYT_FEL: 2,
  TYT_DIN: 2,

  // AYT — Sayısal (SAY)
  AYT_MAT:  5,
  AYT_FIZ:  4,
  AYT_KIM:  4,
  AYT_BIY:  4,

  // AYT — Sözel/EA
  AYT_EDEB: 5,
  AYT_TAR1: 3,
  AYT_COG1: 3,
  AYT_TAR2: 3,
  AYT_COG2: 3,
  AYT_FEL:  3,
  AYT_DIN:  3,  // aynı testin diğer dersleriyle aynı ağırlık

  // Dil (DIL)
  AYT_YDL:  5,
};

/**
 * ─── Ders sonucunu normalize et: BOŞ, girilmemişse türetilir ───
 *
 * Öğrenciler pratikte yalnızca doğru ve yanlış giriyor, "kalanı zaten boş"
 * diye boş alanını doldurmuyor. Bu, veriyi sessizce bozuyordu: 9 derse 5'er
 * doğru giren öğrencinin kâğıdı 45 soruluk sanılıyor, boş oranı %0 çıkıyor ve
 * "işaretli doğruluk %100" gibi yanıltıcı bir sonuç üretiliyordu.
 *
 * Gerçekte sınavda her soru ya doğru ya yanlış ya boştur. Bu yüzden resmî soru
 * sayısı doğruluk kaynağıdır:  boş = resmîSoru − doğru − yanlış
 *
 * Net hesabını ETKİLEMEZ (net = D − Y/4); yalnızca oranları doğrular.
 */
export function getEffectiveResult(result, subjectCode) {
  const correct = Number(result?.correct) || 0;
  const wrong = Number(result?.wrong) || 0;
  const enteredBlank = Number(result?.blank) || 0;
  const officialQ = SUBJECT_QUESTION_COUNTS[subjectCode] || 0;

  // Resmî sayı bilinmiyorsa (tanımsız ders kodu) girilen değerlere güven
  const blank = officialQ > 0 ? Math.max(0, officialQ - correct - wrong) : enteredBlank;
  const total = officialQ > 0 ? officialQ : correct + wrong + enteredBlank;

  return {
    correct,
    wrong,
    blank,
    total,
    officialQ,
    // Öğrencinin girdiğinden farklıysa arayüz bunu belirtebilsin
    blankInferred: officialQ > 0 && blank !== enteredBlank,
  };
}

/**
 * ─── Kayıp ağırlıkları ───
 * Boş ile yanlış AYNI şey değildir ve bu fonksiyon eskiden ikisini toplayıp
 * eşit sayıyordu. Mükemmel kâğıda göre kaçırılan net:
 *   Boş    : +1 alabilirdin, 0 aldın          → 1.00 kayıp
 *   Yanlış : +1 alabilirdin, -0.25 aldın      → 1.25 kayıp
 * Yani yanlış, boşun 1.25 katı net kaybettirir. Öncelik sıralaması bunu
 * yansıtmalı: aynı sayıda yanlış, aynı sayıda boştan daha acildir.
 */
export const BLANK_LOSS_WEIGHT = 1;
export const WRONG_LOSS_WEIGHT = 1.25;

/**
 * Belirli bir dersin son denemelerdeki ortalama Yüzdelik Kaybını hesaplar.
 * Yanlış ve boş ayrı ağırlıklanır (bkz. yukarıdaki ağırlıklar).
 */
export function calcSubjectLossRate(trials, subjectCode) {
  const relevant = trials.filter((t) => t.results && t.results[subjectCode]);
  const totalSubjectQ = SUBJECT_QUESTION_COUNTS[subjectCode] || 40;

  if (relevant.length === 0) return 0.35; // varsayılan baz oran

  let totalLossRateSum = 0;
  for (const trial of relevant) {
    // Boş türetilmiş değeriyle alınır; yoksa D+Y girip boşu boş bırakan
    // öğrencide kayıp olduğundan çok daha düşük görünürdü.
    const r = getEffectiveResult(trial.results[subjectCode], subjectCode);
    const weighted = r.wrong * WRONG_LOSS_WEIGHT + r.blank * BLANK_LOSS_WEIGHT;
    totalLossRateSum += Math.min(1, weighted / totalSubjectQ);
  }

  return totalLossRateSum / relevant.length;
}

/**
 * Bir dersteki kaybın ağırlıklı olarak nereden geldiğini söyler.
 *
 * Müdahale türü buna bağlı:
 *   boş ağırlıklı    → "bilmiyorum" → konu çalışmak gerekiyor
 *   yanlış ağırlıklı → "biliyorum sandım" → kavram yanılgısı veya dikkat
 */
export function getSubjectErrorProfile(trials, subjectCode) {
  const relevant = (trials || []).filter((t) => t.results && t.results[subjectCode]);
  if (relevant.length === 0) return null;

  let wrong = 0;
  let blank = 0;
  for (const trial of relevant) {
    const r = getEffectiveResult(trial.results[subjectCode], subjectCode);
    wrong += r.wrong;
    blank += r.blank;
  }

  const total = wrong + blank;
  if (total === 0) return null;

  const wrongShare = wrong / total;
  const dominant =
    wrongShare >= 0.6 ? 'wrong' : wrongShare <= 0.4 ? 'blank' : 'balanced';

  return { wrong, blank, wrongShare, dominant, trialCount: relevant.length };
}

// ─── ÖSYM Yıllık Soru Dağılımı ve Potansiyel Veritabanı ───
export const OSYM_QUESTION_MAP = {
  // TYT Türkçe (40 Soru)
  'Paragraf':                     { range: '~24-26 Soru', avg: 25,   isQuickWin: false },
  'Cümlede Anlam':                { range: '~3-4 Soru',   avg: 3.5,  isQuickWin: false },
  'Sözcükte Anlam':               { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: false },
  'Yazım-Noktalama':              { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: true  },
  'Cümle Türleri':                { range: '~2-3 Soru',   avg: 2,    isQuickWin: false },
  'Ses Bilgisi':                  { range: '~0-1 Soru',   avg: 1,    isQuickWin: true  },
  'Fiilde Çatı':                  { range: '~1 Soru',     avg: 1,    isQuickWin: true  },
  'Anlatım Bozuklukları':         { range: '~0-1 Soru',   avg: 0.5,  isQuickWin: true  },

  // TYT Sosyal (20 Soru)
  'Harita Bilgisi':               { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },
  'İklim ve Bitki Örtüsü':        { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: false },
  'İlk Çağ Uygarlıkları':         { range: '~1 Soru',     avg: 1,    isQuickWin: true  },
  'İslam Tarihi':                 { range: '~1 Soru',     avg: 1,    isQuickWin: true  },
  'Osmanlı Kuruluş':              { range: '~1 Soru',     avg: 1,    isQuickWin: true  },
  'Felsefeye Giriş':              { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },
  'İslam ve Bilim':               { range: '~1 Soru',     avg: 1,    isQuickWin: true  },

  // TYT Matematik (40 Soru)
  'Problemler':                   { range: '~11-13 Soru', avg: 12,   isQuickWin: false },
  'Temel Kavramlar':               { range: '~3-4 Soru',   avg: 3.5,  isQuickWin: false },
  'Fonksiyonlar':                 { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: false },
  'Oran-Orantı':                  { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },
  'Sayı Basamakları':              { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },
  'Bölme-Bölünebilme':            { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },
  'Kümeler':                      { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },
  'Olasılık':                     { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: false },
  'EBOB-EKOK':                    { range: '~1 Soru',     avg: 1,    isQuickWin: true  },
  'Polinomlar':                   { range: '~1 Soru',     avg: 1,    isQuickWin: true  },

  // TYT Fen (20 Soru)
  // TYT Optik (~2 soru) burada yok: düz ad anahtarında AYT Optik'le çakışıyordu
  // ve zaten eziliyordu. Havuz birleşmesinde DERS::Konu anahtarıyla geri gelecek.
  'Kuvvet ve Hareket':            { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: false },
  'Elektrik':                     { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: false },
  'Enerji':                       { range: '~1 Soru',     avg: 1,    isQuickWin: true  },
  'Atom ve Periyodik Sistem':     { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },
  'Kimyasal Bağlar':              { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },
  'Mol Kavramı':                  { range: '~1 Soru',     avg: 1,    isQuickWin: true  },
  'Hücre':                        { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },
  'Canlıların Sınıflandırılması': { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },
  'Ekosistem':                    { range: '~1 Soru',     avg: 1,    isQuickWin: true  },

  // AYT Matematik (40 Soru)
  'Trigonometri':                 { range: '~4-5 Soru',   avg: 4.5,  isQuickWin: false },
  'Türev':                        { range: '~4-5 Soru',   avg: 4.5,  isQuickWin: false },
  'İntegral':                     { range: '~4-5 Soru',   avg: 4.5,  isQuickWin: false },
  'Limit ve Süreklilik':           { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: true  },
  'Logaritma':                    { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: true  },
  'Analitik Geometri':             { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: false },
  'Diziler ve Seriler':            { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },
  'Kombinatorik':                 { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: false },
  'Karmaşık Sayılar':              { range: '~1 Soru',     avg: 1,    isQuickWin: true  },

  // AYT Fizik (14 Soru)
  'Kuvvet ve Hareket (İleri)':    { range: '~3-4 Soru',   avg: 3.5,  isQuickWin: false },
  'Elektrik ve Manyetizma':       { range: '~3-4 Soru',   avg: 3.5,  isQuickWin: false },
  'Dalgalar':                     { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: false },
  'Modern Fizik':                 { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: true  },
  'Optik':                        { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: false },

  // AYT Kimya (13 Soru)
  'Organik Kimya':                { range: '~3-4 Soru',   avg: 3.5,  isQuickWin: false },
  'Kimyasal Tepkimeler':          { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: false },
  'Elektrokimya':                 { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: false },
  'Asitler ve Bazlar':            { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },

  // AYT Biyoloji (13 Soru)
  'İnsan Fizyolojisi':            { range: '~4-5 Soru',   avg: 4.5,  isQuickWin: false },
  'Genetik':                      { range: '~3-4 Soru',   avg: 3.5,  isQuickWin: false },
  'Bitki Biyolojisi':             { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: false },
  'Biyoteknoloji':                { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },

  // AYT Edebiyat - Sosyal (40 Soru)
  'Şiir Bilgisi':                 { range: '~5-6 Soru',   avg: 5.5,  isQuickWin: false },
  'Roman-Hikaye Analizi':         { range: '~4-5 Soru',   avg: 4.5,  isQuickWin: false },
  'Edebi Akımlar':                { range: '~1-2 Soru',   avg: 1.5,  isQuickWin: true  },
  'Kurtuluş Savaşı':              { range: '~3-4 Soru',   avg: 3.5,  isQuickWin: false },
  'Atatürk İlke ve İnkılapları':  { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: true  },
  'Beşeri Coğrafya':              { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: true  },
  'Türkiye Ekonomik Coğrafyası':   { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: false },
  'Osmanlı Duraklama-Gerileme':   { range: '~3-4 Soru',   avg: 3.5,  isQuickWin: false },
  'Bölgeler Coğrafyası':          { range: '~3-4 Soru',   avg: 3.5,  isQuickWin: false },
  'Bilgi Felsefesi':               { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: true  },
  'Ahlak Felsefesi':              { range: '~2-3 Soru',   avg: 2.5,  isQuickWin: true  },
  'Reading Comprehension':        { range: '~40 Soru',    avg: 40,   isQuickWin: false },
  'Grammar & Vocabulary':         { range: '~40 Soru',    avg: 40,   isQuickWin: false },
};

export function getOsymQuestionInfo(topic) {
  if (!topic) return { range: '~1-2 Soru', avg: 1.5, isQuickWin: false };
  const entry = OSYM_QUESTION_MAP[topic.name] || OSYM_QUESTION_MAP[topic.id];
  if (entry) return entry;
  if (topic.osymRange) return { range: topic.osymRange, avg: topic.questionAvg || 2, isQuickWin: Boolean(topic.isQuickWin) };
  return { range: '~1-2 Soru', avg: 1.5, isQuickWin: false };
}

// ─── 3 Seviyeli Durum Modeli ───
export const TRIAGE_STATUSES = {
  critical: {
    key: 'critical',
    label: 'Sıfır Temel / Kritik',
    shortLabel: 'Sıfır Temel',
    badgeClass: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
    weight: 3,
  },
  deficit: {
    key: 'deficit',
    label: 'Konu Eksiği Var',
    shortLabel: 'Konu Eksiği',
    badgeClass: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20',
    weight: 2,
  },
  mild: {
    key: 'mild',
    label: 'Hafif Pürüz (Soru Kaçıyor)',
    shortLabel: 'Hafif Pürüz',
    badgeClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
    weight: 1,
  },
};

export function getTopicStatus(topic) {
  if (topic.status && TRIAGE_STATUSES[topic.status]) {
    return topic.status;
  }
  const mastery = topic.mastery ?? 50;
  if (mastery <= 35) return 'critical';
  if (mastery <= 60) return 'deficit';
  return 'mild';
}

/**
 * Seviye görsel meta bilgilerini döndürür.
 */
export function urgencyMeta(level) {
  const map = {
    critical: { bg: 'bg-red-500/15',    text: 'text-red-600 dark:text-red-400',    label: 'Sıfır Temel' },
    high:     { bg: 'bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', label: 'Konu Eksiği' },
    deficit:  { bg: 'bg-orange-500/15', text: 'text-orange-600 dark:text-orange-400', label: 'Konu Eksiği' },
    medium:   { bg: 'bg-amber-500/15',  text: 'text-amber-600 dark:text-amber-400',  label: 'Hafif Pürüz' },
    mild:     { bg: 'bg-amber-500/15',  text: 'text-amber-600 dark:text-amber-400',  label: 'Hafif Pürüz' },
    low:      { bg: 'bg-emerald-500/15',text: 'text-emerald-600 dark:text-emerald-400', label: 'Tamamlandı' },
  };
  return map[level] || map.medium;
}

/**
 * Konu havuzunu gerçekçi ÖSYM soru potansiyeline ve durumuna göre sıralar.
 */
export function triageTopics(topics, trials, examType) {
  const filteredTrials = (trials || []).filter((t) => t.type === examType);

  return (topics || [])
    .map((topic) => {
      const osymInfo = getOsymQuestionInfo(topic);
      const status = getTopicStatus(topic);
      const statusWeight = TRIAGE_STATUSES[status]?.weight || 2;
      const lossRate = calcSubjectLossRate(filteredTrials, topic.subject);
      
      // Soru potansiyeli ve zorluk ağırlığına dayalı öncelik skoru
      const urgencyScore = statusWeight * 100 + Math.round(osymInfo.avg * 10);

      return {
        ...topic,
        status,
        osymRange: osymInfo.range,
        questionAvg: osymInfo.avg,
        isQuickWin: osymInfo.isQuickWin,
        urgencyScore,
        urgencyLevel: status,
        isCompleted: Boolean(topic.isCompleted),
        lossRate: Math.round(lossRate * 100),
      };
    })
    .sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return b.urgencyScore - a.urgencyScore;
    });
}

/**
 * Bir denemedeki EN ZAYIF dersi akıllı soru ağırlığıyla hesaplar.
 *
 * Algoritma:
 *  1. Başarı Yüzdesi = (net / maksimum_soru_sayisi) * 100
 *  2. Başarı yüzdesi EN DÜŞÜK olan ders seçilir.
 *  3. Eşitlik durumunda (Tie), maksimum soru sayısı DAHA BÜYÜK olan ders seçilir
 *     (Çünkü soru sayısı fazla olan dersteki kayıp toplam nete daha çok zarar verir).
 */
export function getWorstSubjectByPercentage(results) {
  if (!results || Object.keys(results).length === 0) return null;

  let worst = null;

  for (const [code, r] of Object.entries(results)) {
    const maxQ = SUBJECT_QUESTION_COUNTS[code] || 40;
    const net = calcNet(r);
    const successPercentage = (net / maxQ) * 100;

    if (!worst) {
      worst = { code, successPercentage, maxQ, net };
      continue;
    }

    // 1. Başarı yüzdesi daha düşükse yeni en zayıf
    if (successPercentage < worst.successPercentage) {
      worst = { code, successPercentage, maxQ, net };
    }
    // 2. Eşitlik durumunda maksimum soru sayısı daha BÜYÜK olanı seç
    else if (Math.abs(successPercentage - worst.successPercentage) < 0.0001) {
      if (maxQ > worst.maxQ) {
        worst = { code, successPercentage, maxQ, net };
      }
    }
  }

  if (!worst) return null;

  return {
    code: worst.code,
    successRate: Math.round(worst.successPercentage),
    lossRate: Math.round(Math.max(0, 100 - worst.successPercentage)),
  };
}

/**
 * Bir denemedeki EN İYİ dersi akıllı soru ağırlığıyla hesaplar.
 *
 * Algoritma:
 *  1. Başarı Yüzdesi = (net / maksimum_soru_sayisi) * 100
 *  2. Başarı yüzdesi EN YÜKSEK olan ders seçilir.
 *  3. Eşitlik durumunda (Tie), maksimum soru sayısı DAHA BÜYÜK olan ders seçilir
 *     (Örn: 40 soruluk Türkçede %75 başarı, 5 soruluk Dindeki %75 başarıdan daha değerlidir).
 */
export function getBestSubjectByPercentage(results) {
  if (!results || Object.keys(results).length === 0) return null;

  let best = null;

  for (const [code, r] of Object.entries(results)) {
    const maxQ = SUBJECT_QUESTION_COUNTS[code] || 40;
    const net = calcNet(r);
    const successPercentage = (net / maxQ) * 100;

    if (!best) {
      best = { code, successPercentage, maxQ, net };
      continue;
    }

    // 1. Başarı yüzdesi daha yüksekse yeni en iyi
    if (successPercentage > best.successPercentage) {
      best = { code, successPercentage, maxQ, net };
    }
    // 2. Eşitlik durumunda maksimum soru sayısı daha BÜYÜK olanı seç
    else if (Math.abs(successPercentage - best.successPercentage) < 0.0001) {
      if (maxQ > best.maxQ) {
        best = { code, successPercentage, maxQ, net };
      }
    }
  }

  if (!best) return null;

  return {
    code: best.code,
    successRate: Math.round(Math.max(0, best.successPercentage)),
  };
}

/** Net hesaplama (Doğru - Yanlış × 0.25) */
export function calcNet(result) {
  if (!result) return 0;
  return +(result.correct - (result.wrong || 0) * 0.25).toFixed(2);
}

/**
 * ─── Net gösterimi: HER ZAMAN iki ondalık ───
 *
 * YKS'de net daima 0.25'in katıdır (D − Y/4). Tek ondalığa yuvarlamak bu
 * yüzden İMKÂNSIZ değerler üretiyordu: 25D 3Y gerçekte 24.25 netken ekranda
 * "24.3" görünüyor, öğrenci de haklı olarak hesabın bozuk olduğunu sanıyordu.
 * Kayıp yalnızca görseldi (`calcNet` baştan beri doğruydu) ama güveni bozan
 * tam da buydu.
 *
 * Tam sayı netler de ".00" ile yazılır: tablo sütunlarında ondalık noktaları
 * hizalı kalsın diye (`tabular-nums` ile birlikte).
 *
 * ORTALAMALAR bu kuralın dışındadır — birkaç denemenin ortalaması 0.25'in katı
 * olmak zorunda değildir ve öyleymiş gibi göstermek yeni bir yalan olurdu.
 */
export function formatNet(value) {
  return (Number(value) || 0).toFixed(2);
}

/** Bir denemenin tüm ders netlerini hesaplar */
export function calcTrialNets(trialResults) {
  const nets = {};
  if (!trialResults) return nets;
  for (const [subject, result] of Object.entries(trialResults)) {
    nets[subject] = calcNet(result);
  }
  return nets;
}

/** Bir denemenin toplam netini hesaplar */
export function calcTotalNet(trialResults) {
  if (!trialResults) return 0;
  return Object.values(trialResults).reduce((sum, result) => sum + calcNet(result), 0);
}
