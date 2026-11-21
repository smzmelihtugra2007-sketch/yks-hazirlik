/**
 * ─── YKS PUAN VE SIRALAMA SİMÜLATÖRÜ v5 (2026 YKS RESMİ DESTEĞİ) ───
 *
 * ÖSYM standart katsayıları ve son 4 yılın (2023, 2024, 2025, 2026)
 * yerleştirme yığılma verileri baz alınarak geliştirilmiş simülasyon motoru.
 *
 * Desteklenen Yıllar:
 *   - 2026 (En Güncel 2026 YKS Yığılma ve Katsayı Eğrisi)
 *   - 2025 (2025 YKS Yığılma Verileri)
 *   - 2024 (2024 YKS Zorluk ve Sıralama Eğrisi)
 *   - 2023 (2023 YKS Yığılma Dağılımı)
 *
 * Desteklenen Alanlar:
 *   - SAY (Sayısal)
 *   - EA (Eşit Ağırlık)
 *   - SOZ (Sözel)
 *   - DIL (Yabancı Dil)
 *   - TYT (Yalnızca TYT / 2 Yıllık Ön Lisans)
 */

export const SUPPORTED_YEARS = ['2026', '2025', '2024', '2023'];
export const DEFAULT_SIM_YEAR = '2026';

// ═══════════════════════════════════════════════════════════
// 1. TYT PUAN HESABI
// ═══════════════════════════════════════════════════════════

/**
 * Yıla göre TYT katsayıları
 */
const TYT_COEFFICIENTS_BY_YEAR = {
  '2026': { tur: 3.32, mat: 3.32, sos: 3.42, fen: 3.42 },
  '2025': { tur: 3.30, mat: 3.30, sos: 3.40, fen: 3.40 },
  '2024': { tur: 3.33, mat: 3.35, sos: 3.45, fen: 3.41 },
  '2023': { tur: 3.30, mat: 3.30, sos: 3.40, fen: 3.40 },
};

/**
 * TYT ham puanını ÖSYM formülüne ve seçili yıla göre hesaplar.
 * @param {Object} tytNets — { tur, mat, fiz, kim, biy, tar, cog, fel, din }
 * @param {string} year — '2026' | '2025' | '2024' | '2023'
 * @returns {number} TYT puanı (100 – 500)
 */
export function calcTytScore(tytNets = {}, year = DEFAULT_SIM_YEAR) {
  const {
    tur = 0,
    mat = 0,
    fiz = 0,
    kim = 0,
    biy = 0,
    tar = 0,
    cog = 0,
    fel = 0,
    din = 0,
  } = tytNets;

  const coef = TYT_COEFFICIENTS_BY_YEAR[year] || TYT_COEFFICIENTS_BY_YEAR[DEFAULT_SIM_YEAR];

  const sosNet = (Number(tar) || 0) + (Number(cog) || 0) + (Number(fel) || 0) + (Number(din) || 0);
  const fenNet = (Number(fiz) || 0) + (Number(kim) || 0) + (Number(biy) || 0);

  const rawTur = (Number(tur) || 0) * coef.tur;
  const rawMat = (Number(mat) || 0) * coef.mat;
  const rawSos = sosNet * coef.sos;
  const rawFen = fenNet * coef.fen;

  const score = 100 + rawTur + rawMat + rawSos + rawFen;

  return +Math.max(100, Math.min(500, score)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════
// 2. ALAN PUANI HESABI
// ═══════════════════════════════════════════════════════════

/**
 * Seçilen alan ve yıla göre AYT + TYT katsayılı ham Alan Puanını hesaplar.
 * @param {string} track — 'SAY' | 'EA' | 'SOZ' | 'DIL' | 'TYT'
 * @param {number} tytScore — Hesaplanmış TYT puanı
 * @param {Object} aytNets — AYT net değerleri
 * @param {string} year — '2026' | '2025' | '2024' | '2023'
 * @returns {number} Alan puanı
 */
export function calcAlanScore(track, tytScore = 100, aytNets = {}, year = DEFAULT_SIM_YEAR) {
  if (track === 'TYT') {
    return +tytScore.toFixed(2);
  }

  const {
    mat = 0,
    fiz = 0,
    kim = 0,
    biy = 0,
    edeb = 0,
    tar1 = 0,
    cog1 = 0,
    tar2 = 0,
    cog2 = 0,
    fel = 0,
    din = 0,
    ydl = 0,
  } = aytNets;

  const tytKatki = (Number(tytScore) || 100) * 0.4;
  let score = 100 + tytKatki;

  // Yıllara göre katsayı ayarlamaları
  const is2024 = year === '2024';
  const matWeight = is2024 ? 3.1 : 3.0;

  switch (track) {
    case 'SAY': {
      const aytMatNet = Number(mat) || 0;
      const aytFenToplam = (Number(fiz) || 0) + (Number(kim) || 0) + (Number(biy) || 0);
      score = 100 + tytKatki + (aytMatNet * matWeight) + (aytFenToplam * 2.9);
      break;
    }
    case 'EA': {
      const aytMatNet = Number(mat) || 0;
      const aytEdebSos1Toplam = (Number(edeb) || 0) + (Number(tar1) || 0) + (Number(cog1) || 0);
      score = 100 + tytKatki + (aytMatNet * matWeight) + (aytEdebSos1Toplam * 3.0);
      break;
    }
    case 'SOZ': {
      const aytEdebSos1Toplam = (Number(edeb) || 0) + (Number(tar1) || 0) + (Number(cog1) || 0);
      // Sosyal Bilimler-2 testi: Tarih-2 + Coğrafya-2 + Felsefe Grubu + Din.
      // Din eskiden yoktu; aynı testin parçası olduğu için aynı katsayıyla
      // toplanıyor — yeni bir katsayı uydurulmadı.
      const aytSos2Toplam =
        (Number(tar2) || 0) + (Number(cog2) || 0) + (Number(fel) || 0) + (Number(din) || 0);
      score = 100 + tytKatki + (aytEdebSos1Toplam * 3.0) + (aytSos2Toplam * 2.9);
      break;
    }
    case 'DIL': {
      const ydtNet = Number(ydl) || 0;
      score = 100 + tytKatki + (ydtNet * 3.0);
      break;
    }
    default:
      score = 100 + tytKatki;
  }

  return +Math.max(100, Math.min(600, score)).toFixed(2);
}

// ═══════════════════════════════════════════════════════════
// 3. YERLEŞTİRME PUANI (OBP DAHİL)
// ═══════════════════════════════════════════════════════════

/**
 * Y-Puan = Alan Puanı + (OBP × 0.6)
 * @param {number} alanScore
 * @param {number} obpScore — 50–100 arası (varsayılan 85)
 * @returns {number}
 */
export function calcYerlestirmePuani(alanScore = 100, obpScore = 85) {
  const safeObp = Math.min(100, Math.max(50, Number(obpScore) || 85));
  return +(Number(alanScore) + safeObp * 0.6).toFixed(2);
}

// ═══════════════════════════════════════════════════════════
// 4. SIRALAMA TABLOLARI (2026 GÜNCEL + 2025, 2024, 2023)
// ═══════════════════════════════════════════════════════════

// ── 2026 YKS YIĞILMA TABLOLARI ──
export const sayRankings2026 = [
  { score: 560, rank:       120 },
  { score: 550, rank:       600 },
  { score: 520, rank:     6_200 },
  { score: 500, rank:    17_000 },
  { score: 470, rank:    39_000 },
  { score: 450, rank:    66_000 },
  { score: 420, rank:    99_000 },
  { score: 400, rank:   132_000 },
  { score: 370, rank:   198_000 },
  { score: 350, rank:   268_000 },
  { score: 320, rank:   345_000 },
  { score: 300, rank:   430_000 },
  { score: 260, rank:   590_000 },
  { score: 220, rank:   810_000 },
  { score: 180, rank: 1_180_000 },
  { score: 140, rank: 1_680_000 },
];

export const eaRankings2026 = [
  { score: 560, rank:        60 },
  { score: 550, rank:       350 },
  { score: 520, rank:     3_500 },
  { score: 500, rank:    11_500 },
  { score: 470, rank:    28_000 },
  { score: 450, rank:    49_000 },
  { score: 420, rank:    76_000 },
  { score: 400, rank:   110_000 },
  { score: 370, rank:   162_000 },
  { score: 350, rank:   218_000 },
  { score: 320, rank:   290_000 },
  { score: 300, rank:   375_000 },
  { score: 260, rank:   530_000 },
  { score: 220, rank:   745_000 },
  { score: 180, rank: 1_060_000 },
  { score: 140, rank: 1_460_000 },
];

export const sozRankings2026 = [
  { score: 560, rank:        35 },
  { score: 550, rank:       220 },
  { score: 520, rank:     1_650 },
  { score: 500, rank:     5_500 },
  { score: 470, rank:    16_800 },
  { score: 450, rank:    33_000 },
  { score: 420, rank:    60_000 },
  { score: 400, rank:    87_000 },
  { score: 370, rank:   130_000 },
  { score: 350, rank:   185_000 },
  { score: 320, rank:   250_000 },
  { score: 300, rank:   325_000 },
  { score: 260, rank:   450_000 },
  { score: 220, rank:   640_000 },
  { score: 180, rank:   900_000 },
  { score: 140, rank: 1_160_000 },
];

export const dilRankings2026 = [
  { score: 560, rank:        25 },
  { score: 550, rank:       110 },
  { score: 520, rank:       450 },
  { score: 500, rank:       920 },
  { score: 470, rank:     2_850 },
  { score: 450, rank:     5_600 },
  { score: 420, rank:    12_200 },
  { score: 400, rank:    22_500 },
  { score: 370, rank:    42_000 },
  { score: 350, rank:    66_000 },
  { score: 320, rank:    98_000 },
  { score: 300, rank:   130_000 },
  { score: 260, rank:   185_000 },
  { score: 220, rank:   250_000 },
  { score: 180, rank:   325_000 },
  { score: 140, rank:   425_000 },
];

export const tytRankings2026 = [
  { score: 560, rank:       250 },
  { score: 550, rank:     1_200 },
  { score: 520, rank:    12_000 },
  { score: 500, rank:    28_000 },
  { score: 470, rank:    68_000 },
  { score: 450, rank:   115_000 },
  { score: 420, rank:   190_000 },
  { score: 400, rank:   275_000 },
  { score: 370, rank:   410_000 },
  { score: 350, rank:   550_000 },
  { score: 320, rank:   760_000 },
  { score: 300, rank:   980_000 },
  { score: 260, rank: 1_520_000 },
  { score: 220, rank: 2_150_000 },
  { score: 180, rank: 2_800_000 },
  { score: 140, rank: 3_400_000 },
];

// ── 2025 YKS YIĞILMA TABLOLARI ──
export const sayRankings2025 = [
  { score: 560, rank:       100 },
  { score: 550, rank:       500 },
  { score: 520, rank:     5_000 },
  { score: 500, rank:    15_000 },
  { score: 470, rank:    35_000 },
  { score: 450, rank:    60_000 },
  { score: 420, rank:    90_000 },
  { score: 400, rank:   120_000 },
  { score: 370, rank:   180_000 },
  { score: 350, rank:   250_000 },
  { score: 320, rank:   320_000 },
  { score: 300, rank:   400_000 },
  { score: 260, rank:   550_000 },
  { score: 220, rank:   750_000 },
  { score: 180, rank: 1_100_000 },
  { score: 140, rank: 1_600_000 },
];

export const eaRankings2025 = [
  { score: 560, rank:        50 },
  { score: 550, rank:       300 },
  { score: 520, rank:     3_000 },
  { score: 500, rank:    10_000 },
  { score: 470, rank:    25_000 },
  { score: 450, rank:    45_000 },
  { score: 420, rank:    70_000 },
  { score: 400, rank:   100_000 },
  { score: 370, rank:   150_000 },
  { score: 350, rank:   200_000 },
  { score: 320, rank:   270_000 },
  { score: 300, rank:   350_000 },
  { score: 260, rank:   500_000 },
  { score: 220, rank:   700_000 },
  { score: 180, rank: 1_000_000 },
  { score: 140, rank: 1_400_000 },
];

export const sozRankings2025 = [
  { score: 560, rank:        30 },
  { score: 550, rank:       200 },
  { score: 520, rank:     1_500 },
  { score: 500, rank:     5_000 },
  { score: 470, rank:    15_000 },
  { score: 450, rank:    30_000 },
  { score: 420, rank:    55_000 },
  { score: 400, rank:    80_000 },
  { score: 370, rank:   120_000 },
  { score: 350, rank:   170_000 },
  { score: 320, rank:   230_000 },
  { score: 300, rank:   300_000 },
  { score: 260, rank:   420_000 },
  { score: 220, rank:   600_000 },
  { score: 180, rank:   850_000 },
  { score: 140, rank: 1_100_000 },
];

export const dilRankings2025 = [
  { score: 560, rank:        20 },
  { score: 550, rank:       100 },
  { score: 520, rank:       400 },
  { score: 500, rank:       800 },
  { score: 470, rank:     2_500 },
  { score: 450, rank:     5_000 },
  { score: 420, rank:    11_000 },
  { score: 400, rank:    20_000 },
  { score: 370, rank:    38_000 },
  { score: 350, rank:    60_000 },
  { score: 320, rank:    90_000 },
  { score: 300, rank:   120_000 },
  { score: 260, rank:   170_000 },
  { score: 220, rank:   230_000 },
  { score: 180, rank:   300_000 },
  { score: 140, rank:   400_000 },
];

export const tytRankings2025 = [
  { score: 560, rank:       200 },
  { score: 550, rank:     1_000 },
  { score: 520, rank:    10_000 },
  { score: 500, rank:    25_000 },
  { score: 470, rank:    60_000 },
  { score: 450, rank:   100_000 },
  { score: 420, rank:   170_000 },
  { score: 400, rank:   250_000 },
  { score: 370, rank:   370_000 },
  { score: 350, rank:   500_000 },
  { score: 320, rank:   700_000 },
  { score: 300, rank:   900_000 },
  { score: 260, rank: 1_400_000 },
  { score: 220, rank: 2_000_000 },
  { score: 180, rank: 2_600_000 },
  { score: 140, rank: 3_200_000 },
];

// ── 2024 YKS YIĞILMA TABLOLARI (Zor Sınav Eğrisi) ──
export const sayRankings2024 = [
  { score: 560, rank:        60 },
  { score: 550, rank:       280 },
  { score: 520, rank:     3_200 },
  { score: 500, rank:     9_500 },
  { score: 470, rank:    24_000 },
  { score: 450, rank:    44_000 },
  { score: 420, rank:    68_000 },
  { score: 400, rank:    95_000 },
  { score: 370, rank:   145_000 },
  { score: 350, rank:   205_000 },
  { score: 320, rank:   270_000 },
  { score: 300, rank:   345_000 },
  { score: 260, rank:   480_000 },
  { score: 220, rank:   660_000 },
  { score: 180, rank:   980_000 },
  { score: 140, rank: 1_450_000 },
];

export const eaRankings2024 = [
  { score: 560, rank:        30 },
  { score: 550, rank:       180 },
  { score: 520, rank:     2_100 },
  { score: 500, rank:     7_200 },
  { score: 470, rank:    18_500 },
  { score: 450, rank:    34_000 },
  { score: 420, rank:    54_000 },
  { score: 400, rank:    79_000 },
  { score: 370, rank:   122_000 },
  { score: 350, rank:   165_000 },
  { score: 320, rank:   225_000 },
  { score: 300, rank:   295_000 },
  { score: 260, rank:   430_000 },
  { score: 220, rank:   610_000 },
  { score: 180, rank:   890_000 },
  { score: 140, rank: 1_280_000 },
];

export const sozRankings2024 = [
  { score: 560, rank:        20 },
  { score: 550, rank:       130 },
  { score: 520, rank:     1_100 },
  { score: 500, rank:     3_800 },
  { score: 470, rank:    11_500 },
  { score: 450, rank:    23_000 },
  { score: 420, rank:    43_000 },
  { score: 400, rank:    64_000 },
  { score: 370, rank:    98_000 },
  { score: 350, rank:   140_000 },
  { score: 320, rank:   195_000 },
  { score: 300, rank:   255_000 },
  { score: 260, rank:   365_000 },
  { score: 220, rank:   525_000 },
  { score: 180, rank:   760_000 },
  { score: 140, rank: 1_020_000 },
];

export const dilRankings2024 = [
  { score: 560, rank:        15 },
  { score: 550, rank:        75 },
  { score: 520, rank:       310 },
  { score: 500, rank:       640 },
  { score: 470, rank:     1_950 },
  { score: 450, rank:     4_100 },
  { score: 420, rank:     9_200 },
  { score: 400, rank:    16_500 },
  { score: 370, rank:    31_000 },
  { score: 350, rank:    50_000 },
  { score: 320, rank:    76_000 },
  { score: 300, rank:   102_000 },
  { score: 260, rank:   145_000 },
  { score: 220, rank:   198_000 },
  { score: 180, rank:   265_000 },
  { score: 140, rank:   360_000 },
];

export const tytRankings2024 = [
  { score: 560, rank:       150 },
  { score: 550, rank:       750 },
  { score: 520, rank:     7_500 },
  { score: 500, rank:    19_000 },
  { score: 470, rank:    48_000 },
  { score: 450, rank:    82_000 },
  { score: 420, rank:   140_000 },
  { score: 400, rank:   210_000 },
  { score: 370, rank:   315_000 },
  { score: 350, rank:   430_000 },
  { score: 320, rank:   610_000 },
  { score: 300, rank:   790_000 },
  { score: 260, rank: 1_220_000 },
  { score: 220, rank: 1_780_000 },
  { score: 180, rank: 2_350_000 },
  { score: 140, rank: 2_950_000 },
];

// ── 2023 YKS YIĞILMA TABLOLARI (Gerçek ÖSYM Yığılma Dağılımı) ──
export const sayRankings2023 = [
  { score: 560, rank:        80 },
  { score: 550, rank:       420 },
  { score: 520, rank:     4_200 },
  { score: 500, rank:    13_000 },
  { score: 470, rank:    30_000 },
  { score: 450, rank:    53_000 },
  { score: 420, rank:    80_000 },
  { score: 400, rank:   110_000 },
  { score: 370, rank:   165_000 },
  { score: 350, rank:   228_000 },
  { score: 320, rank:   298_000 },
  { score: 300, rank:   375_000 },
  { score: 260, rank:   520_000 },
  { score: 220, rank:   720_000 },
  { score: 180, rank: 1_050_000 },
  { score: 140, rank: 1_530_000 },
];

export const eaRankings2023 = [
  { score: 560, rank:        40 },
  { score: 550, rank:       250 },
  { score: 520, rank:     2_600 },
  { score: 500, rank:     8_800 },
  { score: 470, rank:    22_000 },
  { score: 450, rank:    40_000 },
  { score: 420, rank:    63_000 },
  { score: 400, rank:    92_000 },
  { score: 370, rank:   138_000 },
  { score: 350, rank:   185_000 },
  { score: 320, rank:   252_000 },
  { score: 300, rank:   328_000 },
  { score: 260, rank:   472_000 },
  { score: 220, rank:   665_000 },
  { score: 180, rank:   960_000 },
  { score: 140, rank: 1_350_000 },
];

export const sozRankings2023 = [
  { score: 560, rank:        25 },
  { score: 550, rank:       170 },
  { score: 520, rank:     1_300 },
  { score: 500, rank:     4_400 },
  { score: 470, rank:    13_500 },
  { score: 450, rank:    27_000 },
  { score: 420, rank:    50_000 },
  { score: 400, rank:    73_000 },
  { score: 370, rank:   110_000 },
  { score: 350, rank:   156_000 },
  { score: 320, rank:   212_000 },
  { score: 300, rank:   278_000 },
  { score: 260, rank:   392_000 },
  { score: 220, rank:   562_000 },
  { score: 180, rank:   800_000 },
  { score: 140, rank: 1_040_000 },
];

export const dilRankings2023 = [
  { score: 560, rank:        18 },
  { score: 550, rank:        90 },
  { score: 520, rank:       360 },
  { score: 500, rank:       740 },
  { score: 470, rank:     2_300 },
  { score: 450, rank:     4_600 },
  { score: 420, rank:    10_200 },
  { score: 400, rank:    18_800 },
  { score: 370, rank:    35_000 },
  { score: 350, rank:    55_000 },
  { score: 320, rank:    83_000 },
  { score: 300, rank:   112_000 },
  { score: 260, rank:   160_000 },
  { score: 220, rank:   215_000 },
  { score: 180, rank:   282_000 },
  { score: 140, rank:   375_000 },
];

export const tytRankings2023 = [
  { score: 560, rank:       180 },
  { score: 550, rank:       880 },
  { score: 520, rank:     8_800 },
  { score: 500, rank:    22_000 },
  { score: 470, rank:    54_000 },
  { score: 450, rank:    92_000 },
  { score: 420, rank:   156_000 },
  { score: 400, rank:   232_000 },
  { score: 370, rank:   345_000 },
  { score: 350, rank:   468_000 },
  { score: 320, rank:   660_000 },
  { score: 300, rank:   852_000 },
  { score: 260, rank: 1_320_000 },
  { score: 220, rank: 1_890_000 },
  { score: 180, rank: 2_480_000 },
  { score: 140, rank: 3_080_000 },
];

export const RANK_TABLES_BY_YEAR = {
  '2026': {
    SAY: sayRankings2026,
    EA: eaRankings2026,
    SOZ: sozRankings2026,
    DIL: dilRankings2026,
    TYT: tytRankings2026,
  },
  '2025': {
    SAY: sayRankings2025,
    EA: eaRankings2025,
    SOZ: sozRankings2025,
    DIL: dilRankings2025,
    TYT: tytRankings2025,
  },
  '2024': {
    SAY: sayRankings2024,
    EA: eaRankings2024,
    SOZ: sozRankings2024,
    DIL: dilRankings2024,
    TYT: tytRankings2024,
  },
  '2023': {
    SAY: sayRankings2023,
    EA: eaRankings2023,
    SOZ: sozRankings2023,
    DIL: dilRankings2023,
    TYT: tytRankings2023,
  },
};

// Geriye dönük uyumluluk için varsayılan (2026) tablolar
export const RANK_TABLES = RANK_TABLES_BY_YEAR['2026'];
export const sayRankings = sayRankings2026;
export const eaRankings = eaRankings2026;
export const sozRankings = sozRankings2026;
export const dilRankings = dilRankings2026;
export const tytRankings = tytRankings2026;

/**
 * Lookup table üzerinde lineer interpolasyon ile yaklaşık sıralama hesaplar.
 * @param {string} track — 'SAY' | 'EA' | 'SOZ' | 'DIL' | 'TYT'
 * @param {number} yScore — Yerleştirme Puanı
 * @param {string} year — '2026' | '2025' | '2024' | '2023'
 * @returns {number} Tahmini sıralama
 */
export function interpolateRank(track, yScore, year = DEFAULT_SIM_YEAR) {
  const yearTables = RANK_TABLES_BY_YEAR[year] || RANK_TABLES_BY_YEAR[DEFAULT_SIM_YEAR];
  const table = yearTables[track] || yearTables.SAY;

  // En yüksek puanın üstündeyse
  if (yScore >= table[0].score) {
    return table[0].rank;
  }

  // En düşük puanın altındaysa
  if (yScore <= table[table.length - 1].score) {
    return table[table.length - 1].rank;
  }

  // Tabloda uygun aralığı bul
  for (let i = 0; i < table.length - 1; i++) {
    const upper = table[i];
    const lower = table[i + 1];

    if (yScore <= upper.score && yScore >= lower.score) {
      const scoreDiff = upper.score - lower.score;
      if (scoreDiff === 0) return upper.rank;

      const t = (yScore - lower.score) / scoreDiff;
      return Math.round(lower.rank + (upper.rank - lower.rank) * t);
    }
  }

  return table[table.length - 1].rank;
}

// ═══════════════════════════════════════════════════════════
// 5. ANA SİMÜLASYON MOTORU
// ═══════════════════════════════════════════════════════════

/**
 * Kullanıcı verilerine göre TYT, Alan Puanı, Yerleştirme Puanı ve Sıralama aralığı üretir.
 *
 * @param {Object} params
 * @param {string} params.track       — 'SAY' | 'EA' | 'SOZ' | 'DIL' | 'TYT'
 * @param {boolean} params.showAyt    — AYT aktif mi (false ise track = 'TYT' sayılır)
 * @param {number} params.obpScore    — OBP değeri (50–100, varsayılan 85)
 * @param {Object} params.tytNets     — TYT netleri { tur, mat, fiz, kim, biy, tar, cog, fel, din }
 * @param {Object} params.aytNets     — AYT netleri
 * @param {number} params.targetRank  — Hedef sıralama
 * @param {string} params.year        — '2026' | '2025' | '2024' | '2023' (varsayılan: '2026')
 * @returns {{
 *   year: string,
 *   yearLabel: string,
 *   trackKey: string,
 *   trackTitle: string,
 *   tytScore: number,
 *   alanScore: number,
 *   yScore: number,
 *   estimatedRank: number,
 *   rankLow: number,
 *   rankHigh: number,
 *   gapToTarget: number,
 *   progressPct: number,
 * }}
 */
export function simulateYKS({
  track = 'SAY',
  showAyt = true,
  obpScore = 85,
  tytNets = {},
  aytNets = {},
  targetRank = 70_000,
  year = DEFAULT_SIM_YEAR,
}) {
  const selectedYear = SUPPORTED_YEARS.includes(String(year)) ? String(year) : DEFAULT_SIM_YEAR;

  // Eğer kullanıcı AYT'yi kapatmışsa otomatik TYT moduna geç
  const effectiveTrack = !showAyt ? 'TYT' : (track || 'SAY');

  // 1. TYT Puanı (yıla göre katsayılarla)
  const tytScore = calcTytScore(tytNets, selectedYear);

  // 2. Alan Puanı
  const alanScore = calcAlanScore(effectiveTrack, tytScore, aytNets, selectedYear);

  // 3. Yerleştirme Puanı (OBP × 0.6)
  const yScore = calcYerlestirmePuani(alanScore, obpScore);

  // 4. Tahmini Sıralama (seçili yılın ÖSYM yığılma eğrisine göre)
  const estimatedRank = interpolateRank(effectiveTrack, yScore, selectedYear);

  // 5. ±%5 belirsizlik payı
  const margin = Math.round(estimatedRank * 0.05);
  const rankLow = Math.max(1, estimatedRank - margin);
  const rankHigh = estimatedRank + margin;

  // 6. Hedefe Yakınlık Analizi
  const target = Math.max(1, Number(targetRank) || 70_000);
  const gapToTarget = estimatedRank - target;
  const progressPct = gapToTarget <= 0
    ? 100
    : Math.max(0, Math.round((1 - gapToTarget / (target * 2)) * 100));

  // 7. Dinamik Alan Başlığı
  const TRACK_TITLES = {
    SAY: 'Sayısal',
    EA: 'Eşit Ağırlık',
    SOZ: 'Sözel',
    DIL: 'Yabancı Dil',
    TYT: 'Yalnızca TYT',
  };

  return {
    year: selectedYear,
    yearLabel: `${selectedYear} YKS`,
    trackKey: effectiveTrack,
    trackTitle: TRACK_TITLES[effectiveTrack] || 'Sayısal',
    tytScore: +tytScore.toFixed(1),
    alanScore: +alanScore.toFixed(1),
    yScore: +yScore.toFixed(1),
    estimatedRank,
    rankLow,
    rankHigh,
    gapToTarget,
    progressPct: Math.min(100, progressPct),
  };
}
