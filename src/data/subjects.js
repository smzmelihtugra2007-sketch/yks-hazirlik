/**
 * ─── HİYERARŞİK DERS & KONU VERİ SETİ ───
 *
 * Kronometrenin (ve ileride analitik motorunun) beslendiği tek kaynak.
 * Amaç: "TYT Temel Matematik (200 saat) → Sayı Problemleri (21 saat)" gibi
 * iki kademeli çalışma istatistiklerini üretebilmek.
 *
 * ─ Yapı ─
 *   id     : Kalıcı kod. Mümkün olduğunda mockData.js'teki deneme ders
 *            kodlarıyla aynıdır. Aynı OLMAYANLAR da var: TYT_GEO / AYT_GEO
 *            çalışma dersidir ama denemede ayrı satırı yoktur (Matematik
 *            satırına dahildir). Eşleştirme kod eşitliğine değil
 *            data/examTopicMap.js köprüsüne dayanır.
 *   exam   : 'TYT' | 'AYT' — dropdown'daki optgroup ayrımı bundan gelir.
 *   label  : Ekranda görünen ve seanslara yazılan ders adı. Bu metinler
 *            kronometrenin eski ders listesiyle BİREBİR aynıdır; böylece
 *            daha önce kaydedilmiş seanslar istatistiklerde bozulmaz.
 *   tracks : Yalnızca AYT derslerinde bulunur — dersin hangi alanlarda
 *            okutulduğu. Değerler mockData.js'teki TRACKS anahtarlarıyla
 *            aynıdır ('SAY' | 'EA' | 'SOZ' | 'DIL'); store'daki
 *            `selectedTrack` de bu kodları tuttuğu için filtreleme
 *            ek bir eşleme tablosuna ihtiyaç duymaz. TYT dersleri her
 *            alanda ortak olduğu için `tracks` taşımaz.
 *   topics : Derse ait konu başlıkları.
 *
 * ─ Yeni konu eklemek ─
 *   İlgili dersin `topics` dizisine metni eklemen yeterli; dropdown ve kayıt
 *   akışı kendiliğinden günceller. Yeni bir ders eklerken `id` alanının
 *   benzersiz olmasına dikkat et.
 *
 * ─ Kapsam ─
 *   Listeler MEB'in YKS'ye esas ders/ünite yapısına göre tamamlandı (TYT ve
 *   AYT'nin tüm alt testleri; 2026 YKS konu sayfalarıyla karşılaştırıldı).
 *   Granülerlik ÜNİTE düzeyindedir — yaprak kazanım değil. Bir ünite ÖSYM'de
 *   çok soru taşıyorsa alt başlıklara bölündü (ör. TYT Matematik problemleri).
 *
 * ─ DEĞİŞTİRİLEMEZ KURALLAR ─
 *   1. Mevcut bir konu ya da ders ADI DEĞİŞTİRİLMEZ, SİLİNMEZ.
 *      Seanslar ders adını (`label`) ve konu adını (`topic`) metin olarak
 *      saklar; tamamlanan Harita düğümleri ve deneme konu etiketleri
 *      `DERS::Konu` anahtarını saklar. Ad değişirse geçmiş veri sessizce
 *      kopar. Değişiklik gerekiyorsa persist migrasyonu yazılmalı.
 *   2. Mevcut KAPSAYICI konular bölünmez (ör. "Modern Fizik", "Dil Bilgisi").
 *      Bölünseydi aynı çalışma hem eski hem yeni düğüme yazılabilir, çift
 *      sayılırdı. Yeni konular yalnızca hiç kapsanmayan alanları doldurur.
 *   3. Sıra MÜFREDAT sırasıdır ve değiştirilebilir — anahtarı etkilemez.
 *      Araya konu eklemek Harita zincirini kaydırır; ilerlemesi olan düğümün
 *      kilitlenmemesini missions.js'teki "süresi olan düğüm açıktır" kuralı
 *      garanti eder.
 *   4. AYT_TAR1 / AYT_TAR2 / TYT_FEL içindeki konular ÖNEK taşımak zorunda
 *      ('Tarih-1: ', 'Coğrafya-1: ', 'Tarih-2: ', 'Coğrafya-2: ', 'Felsefe: ',
 *      'Din Kültürü: '). Deneme köprüsü (examTopicMap.js) katlanmış dersleri
 *      bu öneklerle ayırır; öneksiz konu hiçbir deneme dersinde çıkmaz.
 */

/**
 * ─── Özel konu kovaları — ARTIK SEÇİM LİSTESİNDE DEĞİL ───
 *
 * Bir zamanlar her dersin konu listesinin sonuna eklenirlerdi: tek bir konuya
 * yazılamayan çalışma türlerinin gideceği yer olarak. Bu yapı veri kaybına yol
 * açıyordu — "Fonksiyonlar konu anlatımı" izleyen öğrencinin seansı
 * `topic: 'Tekrar/Video'` olarak kaydediliyor ve Fonksiyonlar düğümüne hiç
 * dakika yazılmıyordu.
 *
 * Çalışma türü artık ayrı bir eksen (bkz. data/activities.js) ve `topic` her
 * zaman gerçek müfredat konusunu taşıyor. Bu iki sabit yine de duruyor çünkü:
 *   1. ESKİ seansların `topic` alanında yazılı; tür onlardan türetiliyor.
 *   2. Branş denemesi tüm dersi kapsar, bir konuya yazılamaz — o seanslarda
 *      `topic` olarak BRANCH_EXAM_TOPIC yazılmaya devam ediyor.
 *
 * Görev Ağacı (missions.js) yalnızca `subject.topics` dizisini okuduğu için
 * bu kovalar orada düğüm olarak çıkmaz.
 */
export const BRANCH_EXAM_TOPIC = '🎯 Branş Denemesi';
export const REVIEW_TOPIC = '🔁 Tekrar/Video';

export const STUDY_SUBJECTS = [
  // ══════════════════════ TYT ══════════════════════
  {
    id: 'TYT_TUR',
    exam: 'TYT',
    label: 'TYT Türkçe / Paragraf',
    topics: [
      // Anlam bilgisi (~30 soru)
      'Sözcükte Anlam',
      'Cümlede Anlam',
      'Paragraf',
      // Dil bilgisi (~10 soru) — eskiden yalnızca ses/yazım/noktalama vardı,
      // sözcük türleri ve cümle bilgisi hiç yoktu
      'Ses Bilgisi',
      'Yazım Kuralları',
      'Noktalama İşaretleri',
      'Sözcük Yapısı ve Ekler',
      'İsimler',
      'Zamirler',
      'Sıfatlar',
      'Zarflar',
      'Edat - Bağlaç - Ünlem',
      'İsim ve Sıfat Tamlamaları',
      'Fiiller (Kip, Kişi, Yapı)',
      'Ek Fiil',
      'Fiilimsiler',
      'Fiilde Çatı',
      'Cümlenin Ögeleri',
      'Cümle Türleri',
      'Anlatım Bozuklukları',
    ],
  },
  {
    id: 'TYT_MAT',
    exam: 'TYT',
    label: 'TYT Temel Matematik',
    topics: [
      'Temel Kavramlar',
      'Sayı Basamakları',
      'Bölme ve Bölünebilme',
      'EBOB - EKOK',
      'Rasyonel Sayılar',
      'Basit Eşitsizlikler',
      'Mutlak Değer',
      'Üslü Sayılar',
      'Köklü Sayılar',
      'Çarpanlara Ayırma',
      'Denklem Çözme',
      'Oran - Orantı',
      // Problemler TYT Matematik'in en ağır başlığı (~12-15 soru) ve
      // öğrenciler türüne göre ayrı çalışıyor; tek düğüm olsaydı "Problemler
      // %40" bilgisi neyin eksik olduğunu söylemezdi. Mevcut "Sayı Problemleri"
      // bu ailenin ilk üyesi olarak kaldı.
      'Sayı Problemleri',
      'Kesir Problemleri',
      'Yaş Problemleri',
      'Yüzde - Kâr - Zarar Problemleri',
      'Karışım Problemleri',
      'Hareket Problemleri',
      'İşçi - Havuz Problemleri',
      'Grafik Problemleri',
      'Kümeler',
      'Mantık',
      'Fonksiyonlar',
      'Polinomlar',
      'Permütasyon - Kombinasyon',
      'Olasılık',
      'İstatistik',
    ],
  },
  {
    // ─── YENİ DERS ───
    // TYT Temel Matematik testinin ~10 sorusu geometri; uygulamada hiç yoktu.
    // Ayrı ders olarak tutuluyor çünkü öğrenciler geometriyi ayrı kitap ve
    // çoğu zaman ayrı öğretmenle, matematikle PARALEL çalışıyor — tek zincire
    // konsaydı geometri tüm aritmetiğin arkasında kilitli kalırdı.
    // Denemede ayrı bir satırı yok: TYT_MAT satırı köprüyle bu derse de
    // bağlanır (bkz. examTopicMap.js).
    id: 'TYT_GEO',
    exam: 'TYT',
    label: 'TYT Geometri',
    topics: [
      'Doğruda ve Üçgende Açılar',
      'Dik Üçgen ve Özel Üçgenler',
      'İkizkenar ve Eşkenar Üçgen',
      'Açı - Kenar Bağıntıları',
      'Üçgende Açıortay',
      'Üçgende Kenarortay',
      'Üçgende Eşlik ve Benzerlik',
      'Üçgende Alan',
      'Çokgenler',
      'Dörtgenler',
      'Yamuk',
      'Paralelkenar',
      'Eşkenar Dörtgen ve Deltoid',
      'Dikdörtgen ve Kare',
      'Çember ve Daire',
      'Noktanın ve Doğrunun Analitiği',
      'Katı Cisimler',
    ],
  },
  {
    id: 'TYT_FIZ',
    exam: 'TYT',
    label: 'TYT Fizik',
    topics: [
      'Fizik Bilimine Giriş',
      'Madde ve Özellikleri',
      'Kuvvet ve Hareket',
      'Enerji',                 // iş, güç ve enerji ünitesinin tamamı
      'Isı ve Sıcaklık',
      'Elektrostatik',
      'Elektrik ve Manyetizma', // akım, devreler, manyetizma (10. sınıf)
      'Basınç',
      'Kaldırma Kuvveti',
      'Dalgalar',
      'Optik',
    ],
  },
  {
    id: 'TYT_KIM',
    exam: 'TYT',
    label: 'TYT Kimya',
    topics: [
      'Kimya Bilimi',
      'Atom ve Periyodik Sistem',
      'Kimyasal Türler Arası Etkileşim',
      'Maddenin Halleri',
      'Kimyanın Temel Kanunları',
      'Mol Kavramı',
      'Kimyasal Tepkimeler ve Hesaplamalar',
      'Karışımlar',
      'Asit - Baz ve Tuz',
      'Kimya Her Yerde',
    ],
  },
  {
    id: 'TYT_BIY',
    exam: 'TYT',
    label: 'TYT Biyoloji',
    topics: [
      'Canlıların Ortak Özellikleri',
      'Canlıların Temel Bileşenleri', // inorganik ve organik bileşikler
      'Hücre',
      'Canlıların Sınıflandırılması',
      'Canlı Âlemleri',
      'Hücre Bölünmeleri',
      'Kalıtım',
      'Ekosistem Ekolojisi',          // güncel çevre sorunları dahil
    ],
  },
  {
    id: 'TYT_TAR',
    exam: 'TYT',
    label: 'TYT Tarih',
    topics: [
      'Tarih ve Zaman',
      'İlk Çağ Uygarlıkları',
      "Orta Çağ'da Dünya",
      'İslamiyet Öncesi Türk Tarihi',
      'İslam Tarihi',
      'Türk - İslam Devletleri',
      'Türkiye Selçukluları ve Beylikler',
      'Osmanlı Kuruluş Dönemi',
      'Osmanlı Yükselme Dönemi (1453-1595)',
      'Osmanlı Kültür ve Medeniyeti',
      'Osmanlı Duraklama Dönemi (1595-1774)',
      'Osmanlı Gerileme ve Dağılma (1774-1914)',
      '20. Yüzyıl Başında Osmanlı ve I. Dünya Savaşı',
      'Kurtuluş Savaşı',
      'İnkılaplar',
      'Atatürk İlkeleri',
      'Atatürk Dönemi Dış Politika',
    ],
  },
  {
    id: 'TYT_COG',
    exam: 'TYT',
    label: 'TYT Coğrafya',
    topics: [
      'Doğa ve İnsan',
      "Dünya'nın Şekli ve Hareketleri",
      'Coğrafi Konum',
      'Harita Bilgisi',
      'İklim Bilgisi',
      'İç ve Dış Kuvvetler',
      "Türkiye'nin Yer Şekilleri",
      'Su, Toprak ve Bitki Örtüsü',
      'Nüfus ve Yerleşme',
      'Göç',
      'Ekonomik Faaliyetler',
      'Bölgeler ve Uluslararası Ulaşım Hatları',
      'Doğal Afetler',
      'Çevre ve Toplum',
    ],
  },
  {
    id: 'TYT_FEL',
    exam: 'TYT',
    label: 'TYT Felsefe & Din',
    topics: [
      // Felsefe (5 soru)
      'Felsefeye Giriş',
      'Felsefe ile Düşünme',
      'Bilgi Felsefesi',
      'Bilim Felsefesi',
      'Varlık Felsefesi',
      'Ahlak Felsefesi',
      'Siyaset Felsefesi',
      'Sanat Felsefesi',
      'Din Felsefesi',
      // Din Kültürü (5 soru) — "Din Kültürü: " öneki ZORUNLU: deneme köprüsü
      // TYT_FEL ile TYT_DIN satırlarını bu önekle ayırır (examTopicMap.js)
      'Din Kültürü: Bilgi ve İnanç',
      'Din Kültürü: Din ve İslam',
      'Din Kültürü: İbadetler',
      'Din Kültürü: Gençlik ve Değerler',
      'Din Kültürü: Gönül Coğrafyamız',
      'Din Kültürü: Allah - İnsan İlişkisi',
      'Din Kültürü: Hz. Muhammed',
      'Din Kültürü: Din ve Hayat',
      'Din Kültürü: Ahlaki Tutum ve Davranışlar',
      'Din Kültürü: İslam Düşüncesinde Yorumlar',
      'Din Kültürü: İslam ve Bilim',
      "Din Kültürü: Anadolu'da İslam",
      'Din Kültürü: Güncel Dini Meseleler',
    ],
  },

  // ══════════════════════ AYT ══════════════════════
  {
    id: 'AYT_MAT',
    exam: 'AYT',
    label: 'AYT Matematik',
    tracks: ['SAY', 'EA'],
    topics: [
      'Fonksiyonlar',
      'Polinomlar',
      'İkinci Dereceden Denklemler',
      'Karmaşık Sayılar',
      'Eşitsizlikler',
      'Parabol',
      'Permütasyon - Kombinasyon',
      'Binom',
      'Olasılık',
      'Trigonometri',
      'Logaritma',
      'Diziler',
      'Limit ve Süreklilik',
      'Türev',
      'İntegral',
      // Doğrunun analitik incelemesi. MEB'de 11. sınıf MATEMATİK ünitesi,
      // ÖSYM'de geometri sorusu sayılıyor. AYT Geometri'ye taşınmadı çünkü
      // mevcut seanslar ve tamamlanan düğümler bu anahtarı kullanıyor
      // (değiştirilemez kural 1). AYT Geometri'de tekrarı yok.
      'Analitik Geometri',
    ],
  },
  {
    // ─── YENİ DERS ───
    // AYT Matematik testinin ~10 sorusu geometri; uygulamada yalnızca
    // "Analitik Geometri" vardı. TYT Geometri ile aynı gerekçeyle ayrı ders.
    // Denemede AYT_MAT satırı köprüyle bu derse de bağlanır.
    id: 'AYT_GEO',
    exam: 'AYT',
    label: 'AYT Geometri',
    tracks: ['SAY', 'EA'],
    topics: [
      'Üçgenler',
      'Çokgenler ve Dörtgenler',
      'Çember ve Daire',
      'Çemberin Analitiği',
      'Dönüşüm Geometrisi',
      'Katı Cisimler',
    ],
  },
  {
    id: 'AYT_FIZ',
    exam: 'AYT',
    label: 'AYT Fizik',
    tracks: ['SAY'],
    topics: [
      // 11. sınıf
      'Vektörler',
      'Bağıl Hareket',
      'Dinamik (Newton Yasaları)',
      'Atışlar',
      'İş, Güç ve Enerji',
      'İtme ve Momentum',
      'Tork ve Denge',
      'Kütle Merkezi',
      'Basit Makineler',
      'Elektrik ve Manyetizma', // kapsayıcı: alan, potansiyel, sığa, indüksiyon, AC
      // 12. sınıf
      'Çembersel Hareket',
      'Dönme, Yuvarlanma ve Açısal Momentum',
      'Kütle Çekimi ve Kepler Yasaları',
      'Basit Harmonik Hareket',
      'Dalga Mekaniği',
      'Modern Fizik',           // kapsayıcı: atom, radyoaktivite, görelilik, fotoelektrik
    ],
  },
  {
    id: 'AYT_KIM',
    exam: 'AYT',
    label: 'AYT Kimya',
    tracks: ['SAY'],
    topics: [
      'Modern Atom Teorisi',
      'Gazlar',
      'Sıvı Çözeltiler',
      'Kimyasal Tepkimelerde Enerji',
      'Tepkime Hızları',
      'Kimyasal Denge',
      'Asit - Baz Dengesi',
      'Çözünürlük Dengesi',
      'Kimya ve Elektrik',
      'Karbon Kimyasına Giriş',
      'Organik Kimya',
      'Enerji Kaynakları ve Bilimsel Gelişmeler',
    ],
  },
  {
    id: 'AYT_BIY',
    exam: 'AYT',
    label: 'AYT Biyoloji',
    tracks: ['SAY'],
    topics: [
      // 11. sınıf — insan fizyolojisi ve ekoloji
      'Sinir Sistemi',
      'Endokrin Sistem',
      'Duyu Organları',
      'Destek ve Hareket Sistemi',
      'Sindirim Sistemi',
      'Dolaşım Sistemi',       // bağışıklık dahil
      'Solunum Sistemi',
      'Üriner Sistem',
      'Üreme Sistemi ve Embriyonik Gelişim',
      'Komünite ve Popülasyon Ekolojisi',
      // 12. sınıf
      'Genden Proteine',       // nükleik asitler, genetik şifre, protein sentezi
      'Canlılık ve Enerji',
      'Fotosentez ve Kemosentez',
      'Hücresel Solunum',
      'Bitki Biyolojisi',
      'Canlılar ve Çevre',
    ],
  },
  {
    id: 'AYT_EDEB',
    exam: 'AYT',
    label: 'AYT Türk Dili ve Edebiyatı',
    tracks: ['EA', 'SOZ'],
    topics: [
      'Anlam Bilgisi',  // sözcük, cümle, paragraf — AYT'de de 3-4 soru
      'Şiir Bilgisi',
      'Edebi Sanatlar',
      'Metinlerin Sınıflandırılması',
      'Destan, Masal, Fabl ve Halk Hikâyesi',
      'İslamiyet Öncesi Türk Edebiyatı',
      'İslamiyet Etkisindeki Geçiş Dönemi',
      'Divan Edebiyatı',
      'Halk Edebiyatı',
      'Geleneksel Türk Tiyatrosu',
      'Tanzimat Edebiyatı',
      'Servet-i Fünun Edebiyatı',
      'Fecr-i Âti Edebiyatı',
      'Milli Edebiyat',
      'Cumhuriyet Dönemi Edebiyatı',
      'Edebi Akımlar',
    ],
  },
  {
    id: 'AYT_TAR1',
    exam: 'AYT',
    label: 'AYT Tarih-1 / Coğrafya-1',
    tracks: ['EA', 'SOZ'],
    topics: [
      // Tarih-1 (10 soru): Tarih 9-11 + T.C. İnkılap Tarihi — tüm kronoloji.
      // Eskiden yalnızca üç Osmanlı başlığı vardı.
      'Tarih-1: Tarih ve Zaman',
      'Tarih-1: İlk Çağ Uygarlıkları',
      'Tarih-1: İlk ve Orta Çağlarda Türk Dünyası',
      'Tarih-1: İslam Tarihi ve Uygarlığı',
      'Tarih-1: Türk - İslam Devletleri',
      'Tarih-1: Türkiye Selçukluları ve Beylikler',
      'Tarih-1: Osmanlı Kuruluş ve Yükselme',
      'Tarih-1: Osmanlı Kültür ve Medeniyeti',
      'Tarih-1: Arayış Yılları ve 18. Yüzyıl',
      'Tarih-1: En Uzun Yüzyıl (1800-1922)',
      'Tarih-1: XX. Yüzyıl Başlarında Osmanlı',
      'Tarih-1: Milli Mücadele',
      'Tarih-1: Atatürkçülük ve Türk İnkılabı',
      // Coğrafya-1 (6 soru)
      'Coğrafya-1: Ekosistem ve Biyoçeşitlilik',
      'Coğrafya-1: Ekstrem Doğa Olayları ve İklim Değişikliği',
      'Coğrafya-1: Nüfus Politikaları',
      'Coğrafya-1: Şehirler ve Kırsal Yerleşmeler',
      'Coğrafya-1: Ekonomik Faaliyetler',
      "Coğrafya-1: Türkiye'de Tarım, Hayvancılık ve Ormancılık",
      "Coğrafya-1: Türkiye'de Madenler, Enerji ve Sanayi",
      'Coğrafya-1: Hizmet Sektörü, Ulaşım ve Ticaret',
      "Coğrafya-1: Türkiye'de Turizm",
      'Coğrafya-1: İşlevsel Bölgeler ve Kalkınma Projeleri',
    ],
  },
  {
    id: 'AYT_TAR2',
    exam: 'AYT',
    label: 'AYT Tarih-2 / Coğrafya-2 / Felsefe Grubu',
    tracks: ['SOZ'],
    topics: [
      // Tarih-2 (11 soru) = Tarih-1 kapsamı + Çağdaş Türk ve Dünya Tarihi.
      // Burada YALNIZCA Tarih-2'ye özgü 12. sınıf konuları duruyor; ortak
      // kapsam Tarih-1'de. Deneme köprüsü AYT_TAR2 satırına ikisini de
      // bağlar (examTopicMap.js) — konular iki kez yazılmadı ki aynı çalışma
      // iki düğüme bölünmesin.
      'Tarih-2: XX. Yüzyıl Siyasi Gelişmeleri',
      'Tarih-2: İki Savaş Arası Dönem',
      'Tarih-2: II. Dünya Savaşı',
      'Tarih-2: Soğuk Savaş Dönemi',
      'Tarih-2: Yumuşama Dönemi ve Sonrası',
      'Tarih-2: Küreselleşen Dünya',
      // Coğrafya-2 (11 soru) — aynı ilke: ortak kapsam Coğrafya-1'de
      'Coğrafya-2: Küresel Ortam ve Bölgeler',
      'Coğrafya-2: Kültür Bölgeleri ve Türk Kültürü',
      'Coğrafya-2: Küreselleşen Dünya ve Uluslararası Örgütler',
      'Coğrafya-2: Jeopolitik Konum ve Ülkeler Arası Etkileşim',
      'Coğrafya-2: Çevre ve Toplum',
      // Felsefe Grubu (12 soru): felsefe, mantık, psikoloji, sosyoloji.
      // Eskiden FELSEFENİN KENDİSİ yoktu — yalnızca diğer üç disiplin vardı.
      'Felsefe: Felsefenin Temel Konuları',
      'Felsefe: İlk Çağ ve Orta Çağ Felsefesi',
      'Felsefe: 15. - 19. Yüzyıl Felsefesi',
      'Felsefe: 20. Yüzyıl Felsefesi',
      'Felsefe: Mantık',
      'Felsefe: Psikoloji',
      'Felsefe: Sosyoloji',
    ],
  },
  {
    // ─── YENİ DERS ───
    // AYT Sosyal Bilimler-2 testinin 6 sorusu Din Kültürü ve Ahlak Bilgisi.
    // Uygulamada ne çalışma dersi ne deneme satırı vardı; SÖZ öğrencisinin
    // AYT'si 80 yerine 74 soru sayılıyordu.
    id: 'AYT_DIN',
    exam: 'AYT',
    label: 'AYT Din Kültürü',
    tracks: ['SOZ'],
    topics: [
      'Allah - İnsan İlişkisi',
      'Hz. Muhammed ve Gençlik',
      'Din ve Hayat',
      'Ahlaki Tutum ve Davranışlar',
      'İslam Düşüncesinde Yorumlar',
      'Dünya ve Ahiret',
      "Kur'an'a Göre Hz. Muhammed",
      "Kur'an'da Bazı Kavramlar",
      'İnançla İlgili Meseleler',
      'Yahudilik ve Hristiyanlık',
      'İslam ve Bilim',
      "Anadolu'da İslam",
      'Tasavvufi Yorumlar',
      'Güncel Dini Meseleler',
      'Hint ve Çin Dinleri',
    ],
  },
  {
    id: 'AYT_YDL',
    exam: 'AYT',
    label: 'Yabancı Dil (YDT)',
    tracks: ['DIL'],
    topics: [
      // YDT soru tipleri (80 soru). "Dil Bilgisi" kapsayıcı kaldı — zaman,
      // kip, yan cümleler vb. olarak bölünmesi DİL öğrencisi için değerli
      // olurdu ama kapsayıcı konu bölünmez (değiştirilemez kural 2).
      'Kelime Bilgisi (Vocabulary)',
      'Dil Bilgisi (Grammar)',
      'Cloze Test',
      'Cümle Tamamlama',
      'Çeviri',
      'Paragraf (Reading)',
      'Diyalog Tamamlama',
      'Anlamca En Yakın Cümle',
      'Paragraf Tamamlama',
      'Anlam Bütünlüğünü Bozan Cümle',
    ],
  },
];

/** Sınav türüne göre hazır dilimler — dropdown optgroup'ları bunları kullanır. */
export const TYT_SUBJECTS = STUDY_SUBJECTS.filter((s) => s.exam === 'TYT');
export const AYT_SUBJECTS = STUDY_SUBJECTS.filter((s) => s.exam === 'AYT');

/**
 * ─── Konu kimliği: `DERS_KODU::Konu Adı` ───
 *
 * Bir konuyu uygulama genelinde tek biçimde adlandırır. Görev Ağacı bu formatı
 * zaten kullanıyordu (`missions.makeMissionId`); deneme kayıtlarındaki konu
 * etiketleri de aynı anahtarı yazar. Böylece "Yol Haritası'nda çalıştığım
 * düğüm" ile "denemede kaybettiğim konu" aynı şeyi işaret eder.
 *
 * Tanım burada duruyor çünkü anahtarın doğruluk kaynağı bu dosyadaki konu
 * havuzudur; iki yerde ayrı ayrı üretilse zamanla ayrışırdı.
 */
export const TOPIC_KEY_SEPARATOR = '::';

export function makeTopicKey(subjectId, topic) {
  return `${subjectId}${TOPIC_KEY_SEPARATOR}${topic}`;
}

/**
 * Anahtarı parçalarına ayırır. Konu adında ':' geçebileceği için yalnızca İLK
 * ayırıcıdan bölünür (ör. 'AYT_TAR2::Felsefe: Mantık').
 */
export function parseTopicKey(key) {
  if (typeof key !== 'string') return null;
  const at = key.indexOf(TOPIC_KEY_SEPARATOR);
  if (at <= 0) return null;
  return {
    subjectId: key.slice(0, at),
    topic: key.slice(at + TOPIC_KEY_SEPARATOR.length),
  };
}

/** Ders adından (label) ders kaydını bulur. Bulamazsa undefined döner. */
export function getSubjectByLabel(label) {
  return STUDY_SUBJECTS.find((s) => s.label === label);
}

/**
 * Bir dersin MÜFREDAT konularını döndürür.
 *
 * Eskiden listenin sonuna "Tekrar/Video" ve "Branş Denemesi" kovaları
 * eklenirdi; artık eklenmiyor. Bunlar konu değil çalışma TÜRÜ ve ayrı bir
 * seçicide duruyorlar (bkz. data/activities.js). Bu sayede konu anlatımı da
 * gerçek bir konuya yazılıyor ve Yol Haritası'ndaki ilerlemeye sayılıyor.
 *
 * Ders seçilmemişse veya tanınmıyorsa boş dizi döner; çağıran taraf bu
 * durumda konu dropdown'ını pasif bırakır.
 */
export function getTopicsForSubject(label) {
  return getSubjectByLabel(label)?.topics ?? [];
}

/** Seanslara yazılacak kalıcı ders kodu (analitik eşleştirmesi için). */
export function getSubjectId(label) {
  return getSubjectByLabel(label)?.id ?? null;
}

/**
 * Bir sınav türünün derslerini kullanıcının alanına göre süzer.
 *
 * TYT dersleri her alanda ortak olduğu için `tracks` taşımaz ve hiçbir zaman
 * elenmez. AYT derslerinde `tracks` alanı bulunur; alan kodu eşleşmeyen ders
 * listeden düşer. Tanımsız/bilinmeyen bir alan kodu gelirse (ör. veri
 * bozulması) hiçbir ders elenmez — öğrenciye boş ekran göstermektense
 * tamamını göstermek daha güvenlidir.
 *
 * @param {'TYT'|'AYT'} exam
 * @param {string} trackCode  'SAY' | 'EA' | 'SOZ' | 'DIL'
 */
export function getSubjectsForTrack(exam, trackCode) {
  const pool = exam === 'AYT' ? AYT_SUBJECTS : TYT_SUBJECTS;
  if (exam !== 'AYT' || !trackCode) return pool;

  const filtered = pool.filter((s) => s.tracks?.includes(trackCode));
  return filtered.length > 0 ? filtered : pool;
}
