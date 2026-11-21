/**
 * ─── MOCK DATA ───
 * YKS Hazırlık uygulaması için sahte veri katmanı.
 * Gerçek veritabanına geçildiğinde bu dosya kaldırılıp
 * API çağrılarıyla değiştirilecek.
 */

// ─── Kullanıcı Profili ───
export const userProfile = {
  id: 'usr_001',
  name: 'Emre Yılmaz',
  targetRank: 70_000,        // Hedef sıralama
  selectedTrack: 'SAY',      // SAY | EA | SOZ | DIL
  examDate: '2027-06-14',    // YKS tarihi (yaklaşık)
  avatarInitials: 'EY',
};

// ─── Alan Tanımları ───
export const TRACKS = {
  SAY: { label: 'Sayısal',        color: '#6366f1', aytSubjects: ['AYT_MAT', 'AYT_FIZ', 'AYT_KIM', 'AYT_BIY'] },
  EA:  { label: 'Eşit Ağırlık',   color: '#f59e0b', aytSubjects: ['AYT_MAT', 'AYT_EDEB', 'AYT_TAR1', 'AYT_COG1'] },
  // SOZ: AYT_DIN eklendi — Sosyal Bilimler-2 testinin 6 sorusu. Eksikken
  // SÖZ öğrencisinin AYT'si 80 yerine 74 soru sayılıyordu.
  SOZ: { label: 'Sözel',          color: '#10b981', aytSubjects: ['AYT_EDEB', 'AYT_TAR1', 'AYT_COG1', 'AYT_TAR2', 'AYT_COG2', 'AYT_FEL', 'AYT_DIN'] },
  DIL: { label: 'Dil',            color: '#f43f5e', aytSubjects: ['AYT_YDL'] },
};

// ─── TYT Konu Havuzu ───
// Her konu: benzersiz id, ders kodu, konu adı, YKS katsayısı (1-5),
// kullanıcının kendine verdiği ustalık seviyesi (0-100),
// ve toplam soru sayısı (YKS formatında)
export const tytTopics = [
  // ── Türkçe (40 soru) ──
  { id: 'tyt_tur_01', subject: 'TYT_TUR', name: 'Sözcükte Anlam',          coefficient: 4, mastery: 55, totalQ: 40 },
  { id: 'tyt_tur_02', subject: 'TYT_TUR', name: 'Cümlede Anlam',           coefficient: 5, mastery: 40, totalQ: 40 },
  { id: 'tyt_tur_03', subject: 'TYT_TUR', name: 'Paragraf',                coefficient: 5, mastery: 60, totalQ: 40 },
  { id: 'tyt_tur_04', subject: 'TYT_TUR', name: 'Ses Bilgisi',             coefficient: 2, mastery: 80, totalQ: 40 },
  { id: 'tyt_tur_05', subject: 'TYT_TUR', name: 'Yazım-Noktalama',         coefficient: 3, mastery: 70, totalQ: 40 },
  { id: 'tyt_tur_06', subject: 'TYT_TUR', name: 'Fiilde Çatı',             coefficient: 3, mastery: 45, totalQ: 40 },
  { id: 'tyt_tur_07', subject: 'TYT_TUR', name: 'Cümle Türleri',           coefficient: 3, mastery: 50, totalQ: 40 },
  { id: 'tyt_tur_08', subject: 'TYT_TUR', name: 'Anlatım Bozuklukları',    coefficient: 4, mastery: 35, totalQ: 40 },

  // ── Sosyal Bilimler (20 soru) ──
  { id: 'tyt_tar_01', subject: 'TYT_TAR', name: 'İlk Çağ Uygarlıkları',    coefficient: 2, mastery: 60, totalQ: 20 },
  { id: 'tyt_tar_02', subject: 'TYT_TAR', name: 'İslam Tarihi',            coefficient: 3, mastery: 40, totalQ: 20 },
  { id: 'tyt_tar_03', subject: 'TYT_TAR', name: 'Osmanlı Kuruluş',         coefficient: 3, mastery: 55, totalQ: 20 },
  { id: 'tyt_cog_01', subject: 'TYT_COG', name: 'Harita Bilgisi',          coefficient: 3, mastery: 65, totalQ: 20 },
  { id: 'tyt_cog_02', subject: 'TYT_COG', name: 'İklim ve Bitki Örtüsü',   coefficient: 3, mastery: 50, totalQ: 20 },
  { id: 'tyt_fel_01', subject: 'TYT_FEL', name: 'Felsefeye Giriş',         coefficient: 2, mastery: 70, totalQ: 20 },
  { id: 'tyt_din_01', subject: 'TYT_DIN', name: 'İslam ve Bilim',          coefficient: 2, mastery: 75, totalQ: 20 },

  // ── Temel Matematik (40 soru) ──
  { id: 'tyt_mat_01', subject: 'TYT_MAT', name: 'Temel Kavramlar',          coefficient: 4, mastery: 70, totalQ: 40 },
  { id: 'tyt_mat_02', subject: 'TYT_MAT', name: 'Sayı Basamakları',         coefficient: 3, mastery: 65, totalQ: 40 },
  { id: 'tyt_mat_03', subject: 'TYT_MAT', name: 'Bölme-Bölünebilme',       coefficient: 4, mastery: 50, totalQ: 40 },
  { id: 'tyt_mat_04', subject: 'TYT_MAT', name: 'EBOB-EKOK',               coefficient: 4, mastery: 60, totalQ: 40 },
  { id: 'tyt_mat_05', subject: 'TYT_MAT', name: 'Oran-Orantı',             coefficient: 5, mastery: 45, totalQ: 40 },
  { id: 'tyt_mat_06', subject: 'TYT_MAT', name: 'Problemler',              coefficient: 5, mastery: 30, totalQ: 40 },
  { id: 'tyt_mat_07', subject: 'TYT_MAT', name: 'Kümeler',                 coefficient: 3, mastery: 75, totalQ: 40 },
  { id: 'tyt_mat_08', subject: 'TYT_MAT', name: 'Fonksiyonlar',            coefficient: 4, mastery: 40, totalQ: 40 },
  { id: 'tyt_mat_09', subject: 'TYT_MAT', name: 'Polinomlar',              coefficient: 3, mastery: 35, totalQ: 40 },
  { id: 'tyt_mat_10', subject: 'TYT_MAT', name: 'Olasılık',                coefficient: 3, mastery: 55, totalQ: 40 },

  // ── Fen Bilimleri (20 soru) ──
  { id: 'tyt_fiz_01', subject: 'TYT_FIZ', name: 'Kuvvet ve Hareket',       coefficient: 4, mastery: 35, totalQ: 20 },
  { id: 'tyt_fiz_02', subject: 'TYT_FIZ', name: 'Enerji',                  coefficient: 3, mastery: 50, totalQ: 20 },
  { id: 'tyt_fiz_03', subject: 'TYT_FIZ', name: 'Elektrik',                coefficient: 4, mastery: 30, totalQ: 20 },
  { id: 'tyt_kim_01', subject: 'TYT_KIM', name: 'Atom ve Periyodik Sistem', coefficient: 3, mastery: 55, totalQ: 20 },
  { id: 'tyt_kim_02', subject: 'TYT_KIM', name: 'Kimyasal Bağlar',         coefficient: 4, mastery: 40, totalQ: 20 },
  { id: 'tyt_kim_03', subject: 'TYT_KIM', name: 'Mol Kavramı',             coefficient: 5, mastery: 25, totalQ: 20 },
  { id: 'tyt_biy_01', subject: 'TYT_BIY', name: 'Hücre',                   coefficient: 3, mastery: 60, totalQ: 20 },
  { id: 'tyt_biy_02', subject: 'TYT_BIY', name: 'Canlıların Sınıflandırılması', coefficient: 2, mastery: 70, totalQ: 20 },
  { id: 'tyt_biy_03', subject: 'TYT_BIY', name: 'Ekosistem',               coefficient: 2, mastery: 65, totalQ: 20 },
];

// ─── AYT Konu Havuzu ───
export const aytTopics = [
  // ── AYT Matematik ──
  { id: 'ayt_mat_01', subject: 'AYT_MAT', name: 'Trigonometri',             coefficient: 5, mastery: 20, totalQ: 40 },
  { id: 'ayt_mat_02', subject: 'AYT_MAT', name: 'Logaritma',               coefficient: 4, mastery: 30, totalQ: 40 },
  { id: 'ayt_mat_03', subject: 'AYT_MAT', name: 'Diziler ve Seriler',       coefficient: 4, mastery: 25, totalQ: 40 },
  { id: 'ayt_mat_04', subject: 'AYT_MAT', name: 'Limit ve Süreklilik',      coefficient: 5, mastery: 15, totalQ: 40 },
  { id: 'ayt_mat_05', subject: 'AYT_MAT', name: 'Türev',                    coefficient: 5, mastery: 20, totalQ: 40 },
  { id: 'ayt_mat_06', subject: 'AYT_MAT', name: 'İntegral',                 coefficient: 5, mastery: 10, totalQ: 40 },
  { id: 'ayt_mat_07', subject: 'AYT_MAT', name: 'Analitik Geometri',        coefficient: 4, mastery: 35, totalQ: 40 },
  { id: 'ayt_mat_08', subject: 'AYT_MAT', name: 'Kombinatorik',             coefficient: 3, mastery: 45, totalQ: 40 },
  { id: 'ayt_mat_09', subject: 'AYT_MAT', name: 'Karmaşık Sayılar',         coefficient: 3, mastery: 40, totalQ: 40 },

  // ── AYT Fizik ──
  { id: 'ayt_fiz_01', subject: 'AYT_FIZ', name: 'Kuvvet ve Hareket (İleri)', coefficient: 5, mastery: 25, totalQ: 14 },
  { id: 'ayt_fiz_02', subject: 'AYT_FIZ', name: 'Elektrik ve Manyetizma',    coefficient: 5, mastery: 20, totalQ: 14 },
  { id: 'ayt_fiz_03', subject: 'AYT_FIZ', name: 'Optik',                     coefficient: 4, mastery: 40, totalQ: 14 },
  { id: 'ayt_fiz_04', subject: 'AYT_FIZ', name: 'Dalgalar',                  coefficient: 4, mastery: 35, totalQ: 14 },
  { id: 'ayt_fiz_05', subject: 'AYT_FIZ', name: 'Modern Fizik',              coefficient: 3, mastery: 30, totalQ: 14 },

  // ── AYT Kimya ──
  { id: 'ayt_kim_01', subject: 'AYT_KIM', name: 'Kimyasal Tepkimeler',       coefficient: 5, mastery: 30, totalQ: 13 },
  { id: 'ayt_kim_02', subject: 'AYT_KIM', name: 'Asitler ve Bazlar',         coefficient: 4, mastery: 25, totalQ: 13 },
  { id: 'ayt_kim_03', subject: 'AYT_KIM', name: 'Organik Kimya',             coefficient: 5, mastery: 15, totalQ: 13 },
  { id: 'ayt_kim_04', subject: 'AYT_KIM', name: 'Elektrokimya',              coefficient: 4, mastery: 20, totalQ: 13 },

  // ── AYT Biyoloji ──
  { id: 'ayt_biy_01', subject: 'AYT_BIY', name: 'Genetik',                   coefficient: 5, mastery: 25, totalQ: 13 },
  { id: 'ayt_biy_02', subject: 'AYT_BIY', name: 'Biyoteknoloji',             coefficient: 3, mastery: 40, totalQ: 13 },
  { id: 'ayt_biy_03', subject: 'AYT_BIY', name: 'İnsan Fizyolojisi',         coefficient: 4, mastery: 30, totalQ: 13 },
  { id: 'ayt_biy_04', subject: 'AYT_BIY', name: 'Bitki Biyolojisi',          coefficient: 3, mastery: 50, totalQ: 13 },

  // ── AYT Edebiyat ──
  { id: 'ayt_edeb_01', subject: 'AYT_EDEB', name: 'Şiir Bilgisi',           coefficient: 4, mastery: 40, totalQ: 24 },
  { id: 'ayt_edeb_02', subject: 'AYT_EDEB', name: 'Roman-Hikaye Analizi',    coefficient: 4, mastery: 35, totalQ: 24 },
  { id: 'ayt_edeb_03', subject: 'AYT_EDEB', name: 'Edebi Akımlar',          coefficient: 3, mastery: 50, totalQ: 24 },

  // ── AYT Tarih-1 ──
  { id: 'ayt_tar1_01', subject: 'AYT_TAR1', name: 'Kurtuluş Savaşı',        coefficient: 5, mastery: 45, totalQ: 10 },
  { id: 'ayt_tar1_02', subject: 'AYT_TAR1', name: 'Atatürk İlke ve İnkılapları', coefficient: 4, mastery: 55, totalQ: 10 },

  // ── AYT Coğrafya-1 ──
  { id: 'ayt_cog1_01', subject: 'AYT_COG1', name: 'Beşeri Coğrafya',        coefficient: 3, mastery: 50, totalQ: 6 },
  { id: 'ayt_cog1_02', subject: 'AYT_COG1', name: 'Türkiye Ekonomik Coğrafyası', coefficient: 4, mastery: 40, totalQ: 6 },

  // ── AYT Tarih-2 (Sözel) ──
  { id: 'ayt_tar2_01', subject: 'AYT_TAR2', name: 'Osmanlı Duraklama-Gerileme', coefficient: 4, mastery: 35, totalQ: 11 },

  // ── AYT Coğrafya-2 (Sözel) ──
  { id: 'ayt_cog2_01', subject: 'AYT_COG2', name: 'Bölgeler Coğrafyası',    coefficient: 3, mastery: 45, totalQ: 11 },

  // ── AYT Felsefe (Sözel) ──
  { id: 'ayt_fel_01', subject: 'AYT_FEL', name: 'Bilgi Felsefesi',          coefficient: 3, mastery: 50, totalQ: 12 },
  { id: 'ayt_fel_02', subject: 'AYT_FEL', name: 'Ahlak Felsefesi',          coefficient: 3, mastery: 45, totalQ: 12 },

  // ── AYT Yabancı Dil (Dil) ──
  { id: 'ayt_ydl_01', subject: 'AYT_YDL', name: 'Reading Comprehension',    coefficient: 5, mastery: 55, totalQ: 80 },
  { id: 'ayt_ydl_02', subject: 'AYT_YDL', name: 'Grammar & Vocabulary',     coefficient: 5, mastery: 50, totalQ: 80 },
];

// ─── Ders Adı Haritası ───
export const SUBJECT_LABELS = {
  TYT_TUR: 'Türkçe',
  TYT_TAR: 'Tarih',
  TYT_COG: 'Coğrafya',
  TYT_FEL: 'Felsefe',
  TYT_DIN: 'Din Kültürü',
  TYT_MAT: 'Temel Matematik',
  TYT_FIZ: 'Fizik',
  TYT_KIM: 'Kimya',
  TYT_BIY: 'Biyoloji',
  AYT_MAT: 'AYT Matematik',
  AYT_FIZ: 'AYT Fizik',
  AYT_KIM: 'AYT Kimya',
  AYT_BIY: 'AYT Biyoloji',
  AYT_EDEB: 'AYT Edebiyat',
  AYT_TAR1: 'AYT Tarih-1',
  AYT_COG1: 'AYT Coğrafya-1',
  AYT_TAR2: 'AYT Tarih-2',
  AYT_COG2: 'AYT Coğrafya-2',
  AYT_FEL: 'AYT Felsefe',
  AYT_DIN: 'AYT Din Kültürü',
  AYT_YDL: 'AYT Yabancı Dil',
};

// ─── Deneme Kayıtları ───
// Her kayıt: tarih, deneme adı, ve ders bazında doğru/yanlış/boş
export const trialRecords = [
  {
    id: 'trial_001',
    date: '2026-07-20',
    createdAt: new Date('2026-07-20T10:00:00').getTime(),
    name: '3D TYT-1',
    type: 'TYT',
    results: {
      TYT_TUR: { correct: 28, wrong: 8,  blank: 4 },
      TYT_MAT: { correct: 22, wrong: 12, blank: 6 },
      TYT_FIZ: { correct: 4,  wrong: 2,  blank: 1 },
      TYT_KIM: { correct: 3,  wrong: 3,  blank: 1 },
      TYT_BIY: { correct: 5,  wrong: 1,  blank: 1 },
      TYT_TAR: { correct: 3,  wrong: 1,  blank: 1 },
      TYT_COG: { correct: 3,  wrong: 1,  blank: 1 },
      TYT_FEL: { correct: 3,  wrong: 1,  blank: 1 },
      TYT_DIN: { correct: 3,  wrong: 1,  blank: 1 },
    },
  },
  {
    id: 'trial_002',
    date: '2026-07-27',
    createdAt: new Date('2026-07-27T10:00:00').getTime(),
    name: '3D TYT-2',
    type: 'TYT',
    results: {
      TYT_TUR: { correct: 30, wrong: 6,  blank: 4 },
      TYT_MAT: { correct: 25, wrong: 10, blank: 5 },
      TYT_FIZ: { correct: 5,  wrong: 1,  blank: 1 },
      TYT_KIM: { correct: 4,  wrong: 2,  blank: 1 },
      TYT_BIY: { correct: 6,  wrong: 0,  blank: 1 },
      TYT_TAR: { correct: 4,  wrong: 0,  blank: 1 },
      TYT_COG: { correct: 3,  wrong: 1,  blank: 1 },
      TYT_FEL: { correct: 4,  wrong: 0,  blank: 1 },
      TYT_DIN: { correct: 4,  wrong: 0,  blank: 1 },
    },
  },
  {
    id: 'trial_003',
    date: '2026-08-03',
    createdAt: new Date('2026-08-03T10:00:00').getTime(),
    name: '3D TYT-3',
    type: 'TYT',
    results: {
      TYT_TUR: { correct: 32, wrong: 5,  blank: 3 },
      TYT_MAT: { correct: 27, wrong: 9,  blank: 4 },
      TYT_FIZ: { correct: 5,  wrong: 2,  blank: 0 },
      TYT_KIM: { correct: 4,  wrong: 2,  blank: 1 },
      TYT_BIY: { correct: 5,  wrong: 1,  blank: 1 },
      TYT_TAR: { correct: 4,  wrong: 1,  blank: 0 },
      TYT_COG: { correct: 4,  wrong: 0,  blank: 1 },
      TYT_FEL: { correct: 4,  wrong: 1,  blank: 0 },
      TYT_DIN: { correct: 4,  wrong: 0,  blank: 1 },
    },
  },
  {
    id: 'trial_004',
    date: '2026-07-20',
    createdAt: new Date('2026-07-20T14:00:00').getTime(),
    name: 'Limit AYT-1',
    type: 'AYT',
    results: {
      AYT_MAT: { correct: 14, wrong: 16, blank: 10 },
      AYT_FIZ: { correct: 4,  wrong: 6,  blank: 4 },
      AYT_KIM: { correct: 5,  wrong: 5,  blank: 3 },
      AYT_BIY: { correct: 6,  wrong: 4,  blank: 3 },
    },
  },
  {
    id: 'trial_005',
    date: '2026-08-10',
    createdAt: new Date('2026-08-10T10:00:00').getTime(),
    name: 'Limit AYT-2',
    type: 'AYT',
    results: {
      AYT_MAT: { correct: 18, wrong: 14, blank: 8 },
      AYT_FIZ: { correct: 6,  wrong: 4,  blank: 4 },
      AYT_KIM: { correct: 6,  wrong: 4,  blank: 3 },
      AYT_BIY: { correct: 7,  wrong: 3,  blank: 3 },
    },
  },
];

// ─── Menü Yapılandırması ───
export const MENU_ITEMS = [
  { id: 'dashboard', name: 'Genel Bakış',       label: 'Genel Bakış',       shortName: 'Özet',        icon: 'BarChart3' },
  // TYT ve AYT tek sayfada birleşti (ExamsPage); mobilde iki slot yiyorlardı
  { id: 'exams',     name: 'Denemeler',          label: 'Denemeler',          shortName: 'Denemeler',   icon: 'FileText' },
  { id: 'triage',    name: 'Akıllı Öncelikler',  label: 'Akıllı Öncelikler',  shortName: 'Öncelikler',  icon: 'Zap' },
  { id: 'roadmap',   name: 'Yol Haritası',       label: 'Yol Haritası',       shortName: 'Harita',      icon: 'Milestone' },
  { id: 'timer',     name: 'Çalışma Sayacı',    label: 'Çalışma Sayacı',    shortName: 'Sayaç',       icon: 'Timer' },
  { id: 'settings',  name: 'Ayarlar',            label: 'Ayarlar',            shortName: 'Ayarlar',     icon: 'Settings' },
];

// ─── Ders Yapılandırmaları (Form'lar için) ───
// Her ders: kod, kısa etiket, toplam soru sayısı (YKS formatı)
export const TYT_SUBJECTS = [
  { code: 'TYT_TUR', label: 'Türkçe',       totalQ: 40 },
  { code: 'TYT_MAT', label: 'Matematik',    totalQ: 40 },
  { code: 'TYT_FIZ', label: 'Fizik',        totalQ: 7 },
  { code: 'TYT_KIM', label: 'Kimya',        totalQ: 7 },
  { code: 'TYT_BIY', label: 'Biyoloji',     totalQ: 6 },
  { code: 'TYT_TAR', label: 'Tarih',        totalQ: 5 },
  { code: 'TYT_COG', label: 'Coğrafya',     totalQ: 5 },
  { code: 'TYT_FEL', label: 'Felsefe',      totalQ: 5 },
  { code: 'TYT_DIN', label: 'Din Kültürü',  totalQ: 5 },
];

export const AYT_SUBJECTS = [
  { code: 'AYT_MAT',  label: 'Matematik',    totalQ: 40 },
  { code: 'AYT_FIZ',  label: 'Fizik',        totalQ: 14 },
  { code: 'AYT_KIM',  label: 'Kimya',        totalQ: 13 },
  { code: 'AYT_BIY',  label: 'Biyoloji',     totalQ: 13 },
  { code: 'AYT_EDEB', label: 'Edebiyat',     totalQ: 24 },
  { code: 'AYT_TAR1', label: 'Tarih-1',      totalQ: 10 },
  { code: 'AYT_COG1', label: 'Coğrafya-1',   totalQ: 6 },
  { code: 'AYT_TAR2', label: 'Tarih-2',      totalQ: 11 },
  { code: 'AYT_COG2', label: 'Coğrafya-2',   totalQ: 11 },
  { code: 'AYT_FEL',  label: 'Felsefe',      totalQ: 12 },
  { code: 'AYT_DIN',  label: 'Din Kültürü',  totalQ: 6 },
  { code: 'AYT_YDL',  label: 'Yabancı Dil',  totalQ: 80 },
];

