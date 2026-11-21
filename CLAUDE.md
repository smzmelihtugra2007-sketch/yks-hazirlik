# YKS Hazırlık — Proje Rehberi

YKS'ye hazırlanan bir öğrenci için çalışma takip uygulaması. Çevrimdışı çalışan
PWA; tüm veri cihazda (IndexedDB) durur, sunucu yoktur.

## Yığın ve komutlar

React 19 · Vite 8 · Tailwind 3 · Zustand (persist) · localforage · framer-motion
· recharts · lucide-react · canvas-confetti · vite-plugin-pwa

```
npm run dev     # geliştirme sunucusu (5173)
npm run build   # üretim derlemesi
npm run lint    # oxlint
```

Test altyapısı yok. Saf mantık (`src/utils/session.js` gibi) Node ile doğrudan
test edilebilir; bunun için göreli importlar açık `.js` uzantısı taşır.

---

## ⚠️ Kritik tuzaklar

### 1. Kaynak dosyalarda PowerShell ile toplu değişiklik YAPMA

Dosyalar BOM'suz UTF-8. PowerShell 5.1'in `Get-Content`/`Set-Content` çifti
onları sistem ANSI kod sayfası (Windows-1254) olarak okur ve UTF-8 yazar →
tüm Türkçe karakterler çift kodlanır. Bir kez `Triage.jsx`'te oldu ve
`ğ Ğ ş Ş Ö Ü Ç` karakterleri (UTF-8 ikinci baytı 0x80-0x9F aralığında olanlar)
kalıcı hasar gördü; kelime düzeyinde elle onarmak gerekti.

**Kural:** toplu düzenleme gerekiyorsa **Node betiği** yaz (`fs.readFileSync(p,
'utf8')`). PowerShell komut satırındaki Türkçe literaller de bozulur — string
karşılaştırmaları bile güvenilmez, kod noktası (`ı`) kullan.

### 2. Üç tema var; Tailwind'in `dark:` varyantı yetmez

Temalar `<html>` sınıfıyla seçilir: yok (açık) · `.dark` · `.theme-sepia`
("Gece Kahvesi"). **`dark:` varyantı yalnızca `.dark` ile tetiklenir**, sepia'da
açık tema stilleri uygulanır. Bu yüzden sabit renkli sınıflar sepia'da bozulur
(alt menü beyaz kalmıştı, Akıllı Öncelikler kahverengi görünüyordu).

**Tercih sırası:**
1. **CSS değişkenleri** — `var(--bg-card)`, `var(--text-main)`,
   `var(--border-card)`, `var(--accent-brand)`, `var(--accent-brand-light)`,
   `var(--bg-input)`, `var(--text-muted)`, `var(--text-subtle)`.
   Üçüncü temayı bedavaya doğru çözer, tercih edilen yol.
2. Alfa gerekiyorsa (CSS değişkenleri alfa taşımaz) `index.css`'te tema başına
   sınıf tanımla — örnek: `.glass-panel`, `.bottom-nav-surface`.
3. Zorunlu kalırsan üçlü yaz: `bg-white dark:bg-slate-800
   [html.theme-sepia_&]:bg-[#201712]`.

Koyu tema paleti **slate** (soğuk), sepia **amber/kahve** (sıcak). Koyu temada
`stone` kullanma — uygulamanın geri kalanıyla çakışır.

Sepia palet tonları: zemin `#150f0b`, kart `#201712`, girdi `#2e221a`,
kenarlık `#453225`, metin `#faf5ee` / `#d6c5b6` / `#a38d7b`, vurgu amber.

### 3. `backdrop-filter`'da prefix'i standarttan ÖNCE yaz

Ters sırada küçültücü standart özelliği atıyor ve Firefox'ta bulanıklık
kayboluyor.

---

## Mimari kararlar

### Sayaç: zaman damgası tabanlı, store'da yaşar

`MainLayout` sayfaları `AnimatePresence` + `key={activePage}` ile render eder,
yani **sayfa değişince o sayfa unmount olur**. Sayaç durumu eskiden
`StudyTimer.jsx` içinde yerel state'ti; sekme değiştirince seans yok oluyordu.
Ayrıca `setInterval` ile saniye sayıldığı için arka planda kısıtlanıp süreyi
**eksik** sayıyordu.

Şimdi: durum store'da (`timer`), geçen süre `startedAt` zaman damgasından
hesaplanır (`accumulatedSeconds + (now - startedAt)`). `setInterval` yalnızca
ekranı tazeler, doğruluktan sorumlu değildir.

- `src/utils/session.js` — saf kurallar ve hesap
- `src/hooks/useTimerEngine.js` — `useTimerWatchdog()` (MainLayout'ta BİR kez)
  ve `useTimerElapsed()` (canlı süre, saniyede bir tik)
- `src/data/timerModes.js` — mod tanımları (sayaç sayfası kapalıyken de gerekir)

**Duraklatma kuralları:**

| Durum | ✏️ Soru / 🎯 Branş | 📖 Konu Anlatımı |
|---|---|---|
| Sayaç sayfasından ayrılma (uygulama içi) | **Anında durur** | Devam eder |
| Başka uygulamaya / sekmeye geçiş | Anında durur | Devam eder |
| Uygulama kapanıp açılma | `lastAliveAt`'e kadar sayılır, durur | Devam eder |

Uygulama içinde gezinme için bir zamanlar 5 dakikalık tolerans vardı; odak
ölçümünü gevşettiği için kaldırıldı. Başka sekmeye geçmek artık uygulamadan
çıkmakla aynı muameleyi görüyor.

**Seans kilidi:** sayaç bir kez başladıysa (`geçen süre > 0`) ders, konu,
**çalışma türü** ve mod kilitlenir; çıkış yalnızca Kaydet veya Sıfırla'dır. Bu
bir açığı kapatıyor: seçimler eskiden yalnızca `isRunning` iken kilitliydi,
yani duraklatılmışken değiştirilebiliyordu — öğrenci Tekrar/Video ile arka
planda saatlerce süre biriktirip konuyu değiştirip kaydedebiliyordu. Mod da
kilitli, çünkü mod değişimi biriken süreyi sessizce siliyor. Aynı nedenle "AYT
gizlenince dersi temizle" efekti aktif seansta çalışmaz.

**Çalışma türü kilidi özellikle kritik:** arka planda sayma ayrıcalığı eskiden
tek bir konu kovasına aitti, şimdi her dersin her konusunda seçilebilen bir
tür. Tür kilitli olmasaydı aynı açık birebir geri gelirdi — "Konu Anlatımı"nda
biriktir, kaydetmeden "Soru Çözümü"ne çevir.

Otomatik duraklamada kısa bir ses çalar ve sayaç sayfasında sebebi yazan bir
bildirim çıkar. Gözcü `getState()` ile okur, `timer` nesnesinin tamamına abone
olmaz — yoksa periyodik `lastAliveAt` damgası tüm uygulamayı render ederdi.

### Streak: saklanmaz, seans geçmişinden hesaplanır

`src/utils/streak.js` (saf, Node ile test edilebilir) + `src/hooks/useStreak.js`.

Eskiden `studyStreak` + `lastActiveDate` store'da tutulup olay anında
artırılıyordu. Kırılgandı: seans silinince seri düzelmiyor, veri içe aktarılınca
şaşıyordu. **Bu iki alan artık doğruluk kaynağı değil, yalnızca JSON dışa
aktarma için önbellek — ekranda gösterilecek değeri `useStreak()` verir.**

| Gün | Dakika | Sonuç |
|---|---|---|
| Tam | ≥ 180 | Seri **+1** |
| Kısmi | 144–179 (%80+) | Haftalık esneme (1/hafta) → yoksa aylık hak → o da yoksa **kırılır**. Seri korunur, **artmaz** |
| Yetersiz | < 144 (0 dahil) | Aylık hak → yoksa **kırılır**. Korunur, artmaz |

- **Aylık hak:** 3 adet, ayın 1'inde sıfırlanır, **devretmez**, otomatik kullanılır.
- **Haftalık esneme:** 1/hafta (Pazartesi başlar), yalnızca KISMİ günler için.
  Hiç çalışılmayan gün bunu kullanamaz — "hak edilmiş" ayrımı böyle korunur.
- **Bugün yargılanmaz:** gün bitmeden kısmi/yetersiz sayılmaz; yalnızca hedefi
  tutturursa seriye eklenir. Yoksa sabah 1 saat çalışan öğrenci serisini
  kırılmış görürdü.
- **Seri 0 iken hiçbir hak harcanmaz** (ne haftalık esneme ne aylık hak), olay
  da üretilmez. Haklar "seriyi koruma" aracı; ortada seri yokken harcanmaları
  saf kayıptı — hiç çalışmayan öğrenci ayın ilk üç gününde haklarını yakıp
  asıl seriye başladığında elinde hiçbir şey bulamıyordu.
- Ters teşvik tuzağı: kısmi gün aylık haktan da düşebilir. Yoksa 2sa 55dk
  çalışanın serisi kırılırken, hiç çalışmayanınki hakla kurtulurdu.

**Neden İLERİ simülasyon:** geriye doğru yürümek aylık bütçeyle çalışmaz —
geriye giderken ayın başındaki harcamalar görülmediği için hakkı tükenmiş bir
güne yanlışlıkla hak verilir. İlk seans gününden bugüne ileri yürünür.

Bildirim (`StreakNotice.jsx`, Dashboard'da): haklar otomatik kullanıldığı için
öğrenci bilgilendirilir. Yalnızca **düne** ait ve görülmemiş olaylarda çıkar
(`streakNoticeSeenDate`), yoksa haftalar önceki kırılma için bayat uyarı çıkardı.

### Gün anahtarı yerel saattir

`src/utils/dateKey.js` — `toDateKey()`. Eskiden `toISOString().slice(0,10)`
kullanılıyordu, yani UTC: Türkiye UTC+3 olduğu için gece 00:00-03:00 arası
çalışma ÖNCEKİ güne yazılıyordu ve streak yanlış hesaplanıyordu. Yeni gün
damgası yazan her yer bu modülü kullanmalı. (Heatmap'in kendi yerel yardımcısı
var, davranışı aynı.)

### Deneme analizi: yanlış ile boş aynı şey değil

`src/utils/examAnalysis.js` (saf, Node ile test edilebilir) + görünüm
`TrialFindings.jsx` (deneme kartına tıklanınca açılır).

YKS'de 4 yanlış 1 doğruyu götürür, **boşun net maliyeti sıfırdır.** Dolayısıyla
20 yanlış 5 net kaybı, 20 boş 0 net kaybıdır.

- **Başabaş kuralı:** boş soruyu işaretlemenin beklenen neti `E = 1.25p − 0.25`,
  başabaş `p = %20`. Rastgele işaretlemek tam sıfır kârlı; bir seçenek elenirse
  (%25) kâra geçer. Tüm tavsiyeler buna dayanır.
- **Kilit metrik `markedAccuracy` = D/(D+Y)** — "işaretlediğimin ne kadarı
  doğru". `wrong/total`'dan farklı: bilgi kalitesini risk iştahından ayırır.
  30D/2Y/8B olan öğrenci (29.5 net), 30D/10Y/0B olandan (27.5 net) öndedir —
  aynı tavsiye ikisine zıt sonuç verir.
- **Teşhis matrisi:** doğruluk (≥%85 / %70-85 / <%70) × boş oranı
  (≥%20 / %10-20 / <%10) → dört köşe dört farklı müdahale.
- **En değerli tespit:** boş oranı düşerken yanlış artıyorsa net kaybı olabilir;
  öğrenci "boşum azaldı" diye ilerleme sanır. `diagnoseTrend` bunu yakalar.

**Net gösterimi daima iki ondalık** (`triage.formatNet`). Net 0.25'in katıdır
(D − Y/4); tek ondalığa yuvarlamak İMKÂNSIZ değerler üretiyordu — 25D 3Y
gerçekte 24.25 netken ekranda "24.3" görünüyordu ve öğrenci haklı olarak
hesabın bozuk olduğunu sanıyordu. Hesap baştan beri doğruydu, kayıp yalnızca
görseldi; ama güveni bozan tam da buydu. **Ortalamalar bu kuralın dışında** —
birkaç denemenin ortalaması 0.25'in katı olmak zorunda değil ve öyle göstermek
yeni bir yalan olurdu; cümlede "ortalaması" diye belirtilir.

**Yüzdelere Türkçe iyelik eki `utils/turkish.js` ile eklenir.** Ek okunuşa göre
değişiyor ("%22'si" ama "%31'i") ve sabit şablonla "%22'ini" gibi bozuk
ifadeler çıkıyordu. `percentWithPossessive` / `countWithPossessive` doğru eki
sayının son kelimesinden seçer.

**Tespit metinleri "ne oldu → neden → ne yapacağım" sırasını izler** ve
sonuncusu somut bir eylem olur. `BLANK_REASONS.advice` metinleri **kapsamdan
bağımsız** yazılır: aynı cümle hem deneme geneli hem tek ders tespitinde
kullanılıyor, "bu ders için" demek deneme genelinde hangi dersten bahsettiğini
belirsiz bırakıyordu. Ders adı cümleyi kuran tespit fonksiyonunun işi.

**Uydurmadığımız şey:** "8 boşu işaretlesen +2 net kazanırdın" demiyoruz —
`markedAccuracy` öğrencinin SEÇTİĞİ (bildiği) sorularda ölçülür, boş
bıraktıkları zaten en zorları. Yerine başabaş kuralı söylenir.

**Mutlak hedef koymuyoruz:** "boş oranın %8 olmalı" yanlış olurdu; AYT
Matematik'te 15 boş normal, TYT Türkçe'de 5 boş çoktur. Kıyas öğrencinin kendi
geçmişine göre.

**Boş bırakma sebebi:** her ders satırında opsiyonel —
`blankReason: 'unknown' | 'time' | 'unsure'`. Veriden "neden boş bıraktı"
bilinemiyor ve üçü bambaşka müdahale gerektiriyor (konu çalış / hız / özgüven).
Yalnızca `blank > 0` iken sorulur, yalnızca doluysa kaydedilir.

### Konu kimliği tek biçim: `DERS_KODU::Konu Adı`

`subjects.js` → `makeTopicKey()` / `parseTopicKey()`. Görev Ağacı'nın düğüm
kimliği (`missions.makeMissionId`) artık buna devrediyor ve deneme
kayıtlarındaki konu etiketleri de aynı anahtarı yazıyor. Böylece "haritada
çalıştığım düğüm" ile "denemede kaybettiğim konu" aynı şeyi işaret ediyor.

Konu adında `:` geçebildiği için (`AYT_TAR2::Felsefe: Mantık`) ayrıştırma
yalnızca İLK ayırıcıdan böler. Düz konu-adı sözlükleri bu yüzden yetersiz:
`OSYM_QUESTION_MAP`'te `Optik` hem TYT hem AYT Fizik'te geçiyor ve biri
diğerini eziyordu. Ezilen TYT satırı kaldırıldı (Öncelikler'in havuzunda TYT
Optik yok, yani hiç okunmuyordu); havuz birleşmesinde anahtarlı olarak geri
gelecek. Anahtarlı format bu sorunu yapısal olarak yaşamaz.

### Sınav dersi ≠ çalışma dersi: `data/examTopicMap.js`

Deneme formu ÖSYM'nin ayrı puanladığı **21** sınav dersiyle çalışır
(`mockData.js`), çalışma konuları ise `subjects.js`'teki **19** derste durur;
orada bazıları katlanmıştır (TYT Felsefe & Din, AYT Tarih-1 / Coğrafya-1 …).
Bu modül yalnızca **ders düzeyinde** köprü kurar; katlanmış dersleri
`subjects.js`'te hâlihazırda bulunan konu adı önekleriyle ayırır
(`'Din Kültürü: '`, `'Coğrafya-1: '`, `'Felsefe: '`). Önek gösterimde atılır.

**Her köprü bir KAYNAK DİZİSİ** — bazı satırlar birden çok çalışma dersini
kapsar: `TYT_MAT` → Matematik + Geometri, `AYT_MAT` → Matematik + Geometri,
`AYT_TAR2` → Tarih-2'ye özgü + Tarih-1 kapsamı, `AYT_COG2` → Coğrafya-2'ye özgü
+ Coğrafya-1 kapsamı. Ek kaynaklar `group` taşır; deneme formu çipleri o
başlık altında gösterir.

**Sonucu: aynı konu anahtarı iki deneme satırından gelebilir.** Bu yüzden
`topicLeaks.js` tekrar sayımını **deneme başına** yapar (satır başına değil) —
yoksa tek denemede Tarih-1 ve Tarih-2 satırından işaretlenen konu "2 denemede
tekrar" görünür, frekans %100'ü aşardı. Kayıp **miktarı** ise satırlardan
toplanır: iki testte kaybedilen soru gerçekten iki kat kayıptır.

**Konu adlarını eşlemeye KALKMIYOR** — bilinçli. İki havuzdaki adların yalnızca
%42'si tutuyor ve çakışmalar 1:1 değil (Harita'da "Yazım Kuralları" +
"Noktalama İşaretleri", Önceliklerde tek "Yazım-Noktalama"). Takma ad tablosu
yapısal farkı gizler, çözmez; doğru çözüm havuzları birleştirmek.

### Konu bazlı kayıp: `utils/topicLeaks.js`

Deneme sonucunda her ders satırı opsiyonel `lossTopics: string[]` taşır —
kaybın geldiği konuların anahtarları. Alan **tamamen opsiyonel ve geriye
uyumlu**; eski kayıtlar olduğu gibi çözümlenir.

- **Sayı değil işaretleme:** konu başına yanlış sayısı sormak daha hassas
  olurdu ama form zaten 9-11 ders satırı taşıyor; öğrenci doldurmazdı. Tek
  dokunuşluk işaretleme toplanınca asıl sinyali veriyor: **tekrar**.
- **Eşit bölüşüm bir TAHMİN ve öyle sunulur** (arayüzde `~`). Bölüştürülen
  miktar ölçülmüş (dersin gerçek yanlış/boşu), bölen öğrencinin kendi beyanı;
  tek varsayım eşit dağılım ve gizlenmiyor.
- **Sıralama ağırlıklı kayba göre:** yanlış 1.25, boş 1.00 (triage.js'teki
  ağırlıklar). Bu tek sayı hem tekrarı hem ders ağırlığını içerir, ayrı bir
  ÖSYM katsayı tablosuna ihtiyaç duymaz — o tablo kanonik havuz için henüz
  anahtarlanmadı.
- **Frekansın paydası dersin girildiği deneme sayısı**, toplam deneme sayısı
  değil: öğrenci her denemede her derse girmiyor.
- `diagnoseRepeatTopics()` deneme tespitlerine eklendi ve `diagnoseTrend` ile
  birlikte ilk ikide duruyor — ikisi de öğrencinin tek denemeye bakarak
  göremeyeceği türden.
- Toplu görünüm `TopicLeakPanel.jsx`, **Denemeler** sayfasında listenin
  altında.

**Akıllı Öncelikler'de ölçüm kartı:** `MeasuredLeakCard.jsx`, beyan listesinin
**üstünde**, aktif sekmeyi (TYT/AYT) izler. Sayfanın geri kalanı öğrencinin
beyanına dayanıyor; bu kart denemelerden gelen ölçüme. Ayrı kart olarak duruyor
çünkü iki konu havuzu henüz birleşmedi — ölçülen kayıpları beyan listesine
karıştırmak iki havuzu birbirine geçirirdi. Birleşmeden sonra listeye erimesi
planlanıyor.

`annotateLeaksWithDeclared(leaks, declaredTopics)` ölçümü beyanla eşleştirir ve
**çelişkiyi** yakalar — kartın asıl değeri bu:
- `completed` : "Cebe atıldı" işaretli ama hâlâ kaybettiriyor
- `underrated`: "Hafif Pürüz" işaretli ama tekrar tekrar kayıp kaynağı

Eşleşme **ders kodu + TAM ad eşitliği** arar (ders kodu `subjectId` ya da
`examCode`'dan; katlanmış derslerde ikisi farklı). İki havuz ayrı olduğu için
eşleşme kısmi — tutmayan konu **sessizce geçilir**, kayıp yine listelenir ama
çelişki rozeti çıkmaz. Yaklaşık eşleştirme (benzerlik, önek) bilinçli olarak
YAPILMIYOR: yanlış konuyu suçlamak, hiçbir şey söylememekten kötüdür.

**Triage motoru düzeltildi:** `calcSubjectLossRate` eskiden `wrong + blank`
yapıyordu. Artık ağırlıklı: boş 1.00, yanlış 1.25 (mükemmel kâğıda göre
kaçırılan net). `getSubjectErrorProfile()` kaybın yanlış mı boş mu ağırlıklı
olduğunu söyler — Akıllı Öncelikler'deki "En Kritik Kaçak" kartı bunu
müdahale tavsiyesine çevirir.

### Sesler: Web Audio ile sentezlenir, dosya indirilmez

`src/utils/sound.js`. Eskiden alarm dışarıdan mp3 çekiyordu ve çevrimdışı
çalışmıyordu. Beş tını: yükselen arpej (görev tamamlama), tekrarlı ikili
(hedef süre), inen ikili (kural ihlalinden duraklama), alçak vuruş (kilitli),
perdesi düşen "bum" (yedek imzası uyuşmazlığı şakası).

**Depoda telifli medya yok.** Şaka modalı eskiden bir meme mp3'ü ve GIF'i
kullanıyordu; depo herkese açık olacağı için ses sentezlendi, GIF emoji oldu.
Yeni medya eklerken lisansı kontrol et.

### Ders → konu hiyerarşisi tek kaynaktan

`src/data/subjects.js` — **19 ders, 294 konu**, her birinde konular ve AYT
derslerinde `tracks` (alan kodları: `SAY`/`EA`/`SOZ`/`DIL`, `mockData.js`'teki
`TRACKS` anahtarlarıyla aynı). `getTopicsForSubject()` **yalnızca müfredat
konularını** döndürür.

**Ekim 2026'da tamamlandı** (116 → 294 konu). Listeler eskiden "temsilî"ydi ve
üç ders hiç yoktu: **TYT Geometri**, **AYT Geometri** (Matematik testlerinin
~10'ar sorusu) ve **AYT Din Kültürü** (Sosyal Bilimler-2'nin 6 sorusu — deneme
formunda da yoktu, SÖZ öğrencisinin AYT'si 80 yerine 74 soru sayılıyordu).
Kaynak: MEB ünite yapısı + 2026 YKS konu sayfaları. Granülerlik ünite düzeyi.

**Değiştirilemez kurallar** (dosyanın başında ayrıntılı):
1. Mevcut konu/ders **adı değiştirilmez, silinmez** — seanslar adı metin olarak,
   Harita ve deneme etiketleri `DERS::Konu` anahtarını saklıyor.
2. Mevcut **kapsayıcı konular bölünmez** ("Modern Fizik", "Elektrik ve
   Manyetizma", "Dil Bilgisi") — bölünse aynı çalışma iki düğüme yazılabilirdi.
3. Sıra **müfredat sırası**, değiştirilebilir (anahtarı etkilemez).
4. `AYT_TAR1` / `AYT_TAR2` / `TYT_FEL` konuları **önek taşımak zorunda**;
   öneksiz konu hiçbir deneme satırında çıkmaz.

**Bilinçli tuhaflıklar:**
- `AYT_MAT::Analitik Geometri` AYT Geometri'ye taşınmadı (kural 1). MEB'de de
  11. sınıf matematik ünitesi. AYT Geometri'de tekrarı yok.
- Tarih-2 ve Coğrafya-2 yalnızca **kendilerine özgü** 12. sınıf konularını
  taşır; ortak kapsam Tarih-1/Coğrafya-1'de. Deneme köprüsü AYT_TAR2 satırına
  ikisini de bağlar — konular iki kez yazılmadı ki aynı çalışma bölünmesin.
- TYT ile AYT'de aynı adlı konular (ör. Tarih) ayrı anahtarlardır; bu kasıtlı,
  öğrenci TYT ve AYT hazırlığını ayrı takip ediyor.

Kronometre seansı şunu yazar:
`{ subject, subjectId, topic, activity, durationMinutes, date, type }`
Alan adları **değiştirilmemeli** — Dashboard, istatistikler, Heatmap ve JSON
dışa aktarma buna bağlı.

### Çalışma türü ayrı bir eksen: `data/activities.js`

`activity: 'lecture' | 'practice' | 'branch'` — 📖 Konu Anlatımı · ✏️ Soru
Çözümü · 🎯 Branş Denemesi. **Konu ile tür iki ayrı eksen:** "Fonksiyonlar ·
Konu Anlatımı" ile "Fonksiyonlar · Soru Çözümü" aynı konunun iki çalışması.

**Çözdüğü veri kaybı:** bu ayrım eskiden konu listesine gömülü iki özel
kovaydı (`🔁 Tekrar/Video`, `🎯 Branş Denemesi`). Fonksiyonlar anlatımını 3
saat izleyen öğrencinin seansı `topic: 'Tekrar/Video'` olarak kaydediliyor,
Yol Haritası ilerlemeyi konu adına göre topladığı için (`missions.js`)
**Fonksiyonlar düğümüne 0 dakika** yazılıyordu. Artık `topic` her zaman gerçek
konuyu taşıyor ve anlatım da haritaya sayılıyor.

Alternatif her konuyu listede ikiye katlamaktı ("Fonksiyonlar — Anlatım" /
"— Soru"); 10 konuluk ders 20 satır olurdu ve veri modeli metin ayrıştırmaya
dayanırdı.

- **`keepAlive`** yalnızca `lecture`'da true — arka planda sayma ayrıcalığı
  Tekrar/Video kovasından buraya **aynen** taşındı. Kural artık konuya değil
  türe bakıyor: `session.isKeepAliveSession(sessionLike)`.
- **Varsayılan `practice`**, bilinçli: öğrenci türü seçmeyi unutup aslında
  video izliyorsa uygulamadan çıkınca sayaç sesli uyarıyla durur ve hatayı
  fark eder. Varsayılan `lecture` olsaydı sayaç sessizce saymaya devam ederdi.
- **`branch` konu istemez** (dersin tamamını kapsar); `topic` alanına
  `BRANCH_EXAM_TOPIC` yazılır ve hiçbir Harita düğümüne sayılmaz.
- **`nextTopicOnActivityChange()`** tür değişince konunun ne olacağını söyler.
  Konu yalnızca "konu gerektiren ↔ gerektirmeyen" sınırı geçilince değişir;
  anlatım ↔ soru geçişinde **korunur** ("videoyu izledim, şimdi aynı konudan
  soru çözeyim" en sık akış). Kural saf fonksiyonda, çünkü store'da gömülü
  kalsaydı test edilemezdi.
- **Geriye uyumluluk:** `resolveActivity()` `activity` alanı olmayan eski
  kayıtlarda türü konu adından türetir (`Tekrar/Video`→lecture,
  `Branş Denemesi`→branch, diğerleri→practice). Geçmiş seanslar migrasyonda
  **ellenmiyor**, okuma anında türetiliyor: yanlış türetme hâlinde veri
  kaybolmasın diye. Persist v2→v3 yalnızca diskteki SAYAÇ durumuna `activity`
  ekler — yoksa yarım kalmış bir Tekrar/Video seansı ayrıcalığını kaybederdi.

**Açık kalan risk:** ayrıcalık artık istisna değil, her konuda seçilebilir bir
tür. Öğrenci "Konu Anlatımı" seçip başka uygulamaya geçebilir ve sayaç işler.
Sunucusuz bu tamamen engellenemez; 6 saatlik `MAX_SESSION_SECONDS` dışında ek
koruma **yok**. Önerilen ama henüz eklenmemiş iki önlem: uzun aradan sonra
dönüşte "bu sürenin hepsi anlatım mıydı?" sorusu ve arka plan için daha kısa
(ör. 2 saat) ayrı tavan.

**Ekran kilidi ≠ uygulamadan çıkma, ama web bunu AYIRT EDEMEZ.** İkisi de tek
bir `visibilityState === 'hidden'` olayı üretir; `wakeLock.onrelease`, Page
Lifecycle `freeze` ve `blur` da sebebi söylemez. Bu yüzden "soru çözümünde
ekran kilidine izin ver, uygulama değişimini engelle" ayrımı web'de
yapılamıyor. Doğru çözüm tespit değil **önleme**: wake lock'u tam ekrana değil
sayacın çalışmasına bağlamak — ekran hiç kilitlenmezse `hidden` gerçekten
"uygulamadan çıktım" demek olur. (Native sarmalayıcıda ayrım mümkün: Android
`ACTION_SCREEN_OFF` temiz bir API, iOS'ta daha kırılgan.)

### Çalışma istatistikleri: `utils/studyStats.js`

`buildSubjectStats(sessions)` → ders → konu → **tür** kırılımı. Hesap
`StudyTimer.jsx` içindeydi; dosya 1000 satırı aştığı ve tür kırılımı saf
olmadan test edilemediği için taşındı.

- `toSegments(breakdown, total)` yalnızca **dolu** türleri döndürür; sıfır
  genişlikli segment çizmenin anlamı yok.
- **`ActivityBar` iki bilgiyi birden taşır:** çubuğun toplam genişliği
  (`fillPct`) satırın üst kümedeki payı — eski tek renkli çubuğun anlamıydı ve
  dersler arası kıyası sağlıyordu; içindeki segmentler tür dağılımı. Yalnızca
  türe çevirseydik tüm çubuklar tam genişlik olur ve o kıyas kaybolurdu.
- Branş denemesi `topic` olarak `BRANCH_EXAM_TOPIC` taşıdığı için konu
  listesinde kendi satırıyla görünür. Gizlenmiyor: süre gerçekten oraya gitti
  ve gizlenseydi konu toplamları ders toplamını tutmazdı.
- Eski kayıtlarda tür `resolveActivity` ile konu adından türetilir, yani
  geçmiş veri de kırılımda doğru yerde çıkar.

Asıl kazanç: "Türev'e 10 saat" iyi görünür, "Türev'e 📖 8 saat ✏️ 2 saat"
sorunu söyler. Tek sayı pasif çalışmayı gizliyordu.

### Alan (bölüm) tek kaynak

`selectedTrack` + `showAyt` global store alanlarıdır, Ayarlar'dan yönetilir.
Yol Haritası ve Akıllı Öncelikler bunları **yalnızca okur**. Yol Haritası'na
bir zamanlar yerel alan dropdown'ı eklenmiş, "Single Source of Truth" gereği
kaldırıldı.

### Hareket dili ortak

`src/utils/motion.js` — `EASE_OUT_SOFT`, `SOFT_SPRING`, `pageContainer`,
`pageSection`, `listCard`, `collapsible`, `tabPanel`, `contentReveal`,
`pressable`. Sayfalar `<MotionConfig reducedMotion="user">` ile sarılır.
Yeni animasyon yazarken buradaki tanımları kullan, elle süre/eğri uydurma.

### İlk açılış ve persist sürümü

Yeni kullanıcı `Onboarding.jsx` görür (ad, alan, hedef sıralama, OBP); tamamlanınca
demo veri temizlenir. Persist `version: 1` ve `migrate` ile sürüm 0'dan gelen
mevcut kullanıcılar `onboardingCompleted: true` işaretlenir — **bu olmadan
mevcut kullanıcıların verisi silinirdi.** Store'a yeni kalıcı alan eklerken bu
migrasyon yolunu hatırla.

### Paylaşım kartı

`ShareCardModal.jsx` kartı tam **1080×1920** kurar ve o ölçüde dışa aktarır
(Instagram hikaye çözünürlüğü). Önizleme için **karta değil üst sarmalayıcıya**
transform uygulanır; karta uygulanırsa html-to-image küçülmüş hali yakalar.
Tailwind html-to-image'da çalışmadığı için kartın tüm stilleri inline.

### Uygulama bilgileri: `config/appInfo.js`

İmza (`AUTHOR_NAME`), telif yılı, geri bildirim bağlantısı (`FEEDBACK_URL`,
Google Form — boşken düğme hiç çizilmez) ve sürüm tek yerde. Sürüm etiketi
derlemede `vite.config.js` `define` ile gelir: Cloudflare Pages'in
`CF_PAGES_COMMIT_SHA`'sının ilk 7 hanesi + tarih; yerelde "yerel".
Testçi hata bildirirken bu etiketi yazar (Ayarlar altbilgisi ve geri
bildirim bölümü). `AppFooter` karşılamada ve Ayarlar'ın altında.

**Lisans: açık kaynak DEĞİL** (kullanıcı kararı). `LICENSE` "tüm hakları
saklıdır" der; depo yalnızca incelemek için açık. Depoya MIT/Apache gibi
bir lisans ya da başka projeden lisanslı kod EKLEME.

**Vitrin:** `README.md` (GitHub ziyaretçisi için: ürün + öne çıkan teknik
kararlar), `docs/screenshots/` (örnek kullanıcı "Elif" ile gerçek
uygulamadan alındı), `public/og-image.png` + `index.html`'de Open Graph
etiketleri (görsel adresi MUTLAK olmalı, yoksa LinkedIn boş kart gösterir),
`public/gizlilik.html` (Play Store da gizlilik adresi isteyecek). Canlı
adresi **`/gizlilik`**: Cloudflare `.html` adreslerini 308 ile uzantısıza
yönlendiriyor, bağlantılar doğrudan son adrese verilir.
Gizlilik sayfası ayrı HTML: service worker'ın `navigateFallback`'i her
gezintiye index.html döndürdüğü için `navigateFallbackDenylist`'te. Yeni
bir dış servis (analitik vb.) eklenirse bu sayfa GÜNCELLENMELİ, yoksa
yanlış beyan olur.

### Güvenlik ve veri dayanıklılığı

Sunucu yok: öğrencinin bir yıllık verisinin **tek kopyası** tarayıcı
deposunda. Bu yüzden asıl tehdit saldırgan değil, verinin kendi kodumuz
tarafından ezilmesi. Kullanıcı izolasyonu mimariden geliyor (her tarayıcı
kendi deposu). Ölçek sorun değil: bir yıl (~2200 seans, ~180 deneme) diskte
~410 KB, en ağır hesap 3.5 ms.

**Yazma koruyucusu — `utils/persistGuard.js`.** Depo adaptörü
(`storage.js`) yazmadan önce `canWrite()` sorar. Dört kapı:
1. **Hidrasyon bitmeden yazma yok.** Zustand persist okuma sürerken gelen her
   `set`'i de yazıyor; o an bellekte demo durumu var. Kapı
   `onRehydrateStorage` başında açılır.
2. **Okuma başarısızsa yazma yok.** `getItem` hata durumunda eskiden `null`
   dönüyordu → "yeni kullanıcı" → karşılama → form gerçek verinin üstüne
   yazıyordu. Artık hata fırlatır; App karşılama yerine
   `DataRescueScreen`'i gösterir. JSON ayrıştırma hatası da (yarım yazma)
   aynı yoldan geçer. **`getItem`'da hatayı asla yutma.**
3. **Tek sekme yazar.** İki sekme durumun tamamını tutuyor, son yazan
   kazanıyordu. Açılan/öne gelen sekme `BroadcastChannel` ile sahiplenir,
   diğerleri susar ve `TabConflictOverlay` perdesi iner. Geri dönüşte sıra:
   **önce `persist.rehydrate()`, sonra `claimTab()`** — tersi bayat durumu
   yazdırır. iOS'ta kurulu uygulama ve Safari ayrı depo kullanır.
4. **Yazma hatası görünür.** `SaveErrorBanner` bir sonraki başarılı yazmaya
   kadar kalır.

**İçe aktarma — `utils/importValidation.js`** (saf, Node ile test edilebilir).
Yedek dışarıdan gelen veri: tek bir yanlış tip (`trials: "abc"`) diske
geçince uygulama HER açılışta çöküyordu. `sanitizeImport` **reddetmez,
ayıklar**: bozuk kayıt atlanır ve sayılır, sağlamlar kalır. Bilinen alanlar
tip kontrolünden geçer, bilinmeyenlerden yalnızca ilkel değerler taşınır
(ileride eklenen alan kaybolmasın, ama ekranda nesne çizilip React
çökmesin). `__proto__`/`constructor` anahtarları atılır. Yeni bir dizi ya da
nesne alanı eklersen **buraya da ekle**, yoksa içe aktarmada sessizce düşer.

Akış: dosya → doğrula → **onay penceresi** (ne gelecek, ne gidecek, kaç
kayıt atlandı) → mevcut durumun kopyası `yks_pre_import_snapshot`'a →
yaz. Kopya alınamazsa içe aktarma yapılmaz. Geri alma 7 gün sunulur;
sonrasında aradaki kayıtları sessizce silerdi.

**Kurtarma:** `ErrorBoundary` (main.jsx) + `DataRescueScreen`. Store'a ve
framer-motion'a bağlı değil, çünkü çökmenin sebebi onlar olabilir. "Ham
verimi indir" diskteki kaydı olduğu gibi verir; içe aktarma bu biçimi
(`{ state, version }`) de kabul eder. Bilinçli olarak yüklemede otomatik
"onarma" YOK: öğrencinin asıl verisinden sessizce kayıt düşürmek, kurtarma
ekranından daha kötü.

**Yedek hatırlatıcısı** — `utils/backupReminder.js` (saf) +
`BackupReminderModal.jsx` (App'te). Verinin tek kopyası cihazda olduğu için
düzenli yedeği sağlayan tek mekanizma.
- **Çapa son giriş DEĞİL, son yedek ya da son "Şimdi değil"**
  (`backupReminderAnchorAt`). Her gün giren öğrencinin son girişi hiç
  eskimez; ona bağlı hatırlatıcı en çok veri biriktirene hiç çıkmazdı.
  Zaman damgası diskte, yani kapalıyken geçen günler de sayılır.
- Aralık 5 ya da 7 gün (Ayarlar), varsayılan 7. Karşılama çapayı "şimdi"
  yapar (ilk gün sorulmaz); çapası `null` olan mevcut kullanıcı ilk açılışta
  görür — kasıtlı. Verisi olmayana çıkmaz. Saat geri alınmışsa (çapa
  gelecekte) çıkar, yoksa süresiz susardı.
- Pencere uygulamayı **kilitler**: Esc / arka plan kapatmaz, `#root` `inert`
  olur. "Şimdi değil" 5 sn kilitli; indirmeye kilit yok. Bir kez açılınca
  cevap gelene kadar açık kalır.
- Ayarlar'dan alınan her yedek de `markBackupTaken()` çağırır — yeni bir
  dışa aktarma yolu eklersen sen de çağır. İçe aktarma yedek sayılmaz.
- iOS'ta kurulu uygulamada blob indirme davranışı cihazda doğrulanmadı;
  sorun çıkarsa iOS için `mode: 'share'` kullan.

**"SHA-256 imza" imza değil.** Anahtarsız özet; kazara bozulmayı yakalar,
kasıtlı değişikliği engellemez (kod açık, alan silinince kontrol atlanır).
Güvenliği `sanitizeImport` sağlıyor. Arayüz metni de buna göre dürüst.

**CSP** (`vite.config.js`, yalnızca derlemede — dev sunucusu satır içi script
enjekte ediyor) + `public/_headers` (`frame-ancestors`, `X-Frame-Options`,
`sw.js` için `no-cache`). Uygulama **hiçbir dış sunucuya bağlanmıyor**;
yazı tipi de paketten (`@fontsource-variable/inter`), Google Fonts IP'yi
Google'a gönderiyordu. Yeni bir dış kaynak (analitik, CDN, API) eklemek CSP'yi
değiştirmeyi ve gizlilik metnini güncellemeyi gerektirir.

Kabul edilen riskler: depo şifresiz (cihazı paylaşan görebilir); 4 orta
seviye `npm audit` bulgusu yalnızca derleme aracında (workbox-build → glob),
tek "çözüm" eklentiyi eski sürüme düşürmek.

### Mobil uyum ve mağaza hazırlığı (PWA)

Hedef sıra: web (PWA) → Play Store (TWA, ör. Bubblewrap) → App Store
(Capacitor sarmalayıcı). Manifest ve ikonlar ilk ikisine şimdiden hazır.

- **İkonlar PNG** (`public/`): `pwa-192x192`, `pwa-512x512` (şeffaf köşe,
  `any`), `maskable-icon-512x512` ve `apple-touch-icon-180x180` (tam dolgu).
  iOS SVG ikonu ana ekranda göstermiyor ve şeffaf köşeyi siyah boyuyor;
  Android maskesi şeffaf köşeli ikonu kırpınca boşluk bırakıyor. Kaynak
  `pwa-icon.svg`; PNG'ler Edge headless ile çizildi (`<text>` gerçek fontla
  çizilsin diye). İkon değişirse dördü birlikte yeniden üretilmeli.
- **Manifest `id: '/'` sabit:** kurulu uygulamanın kimliği bu. Değişirse
  kurulu kopyalar ayrı uygulama sayılır, TWA paketi de buna bağlanacak.
- **`apple-mobile-web-app-status-bar-style: default`:** üst kenar için
  `safe-area-inset-top` boşluğu yok; `black-translucent`'a geçilirse eklenmeli.
  Alt kenar (`BottomNav`) zaten safe-area kullanıyor.
- **Kalıcı depolama:** `utils/persistentStorage.js`, karşılama tamamlandıktan
  sonra `navigator.storage.persist()` ister (Firefox soruyor; ilk açılışta
  sormak anlamsız). iOS'ta asıl koruma ana ekrana eklemek — eklenmemiş
  sitenin verisini Safari 7 gün etkileşimsizlikte silebiliyor.
- **Ana ekrana ekleme kartı** — `utils/installPrompt.js` (saf karar:
  `pickInstallCard`) + `ui/InstallCard.jsx` (Genel Bakış). Üç durum:
  `inApp` (LinkedIn/Instagram içi tarayıcı → "tarayıcıda aç"; depo geçici,
  kurulum imkânsız — LinkedIn'de paylaşılan link TAM orada açılır, bu yüzden
  karşılama ekranında da `compact` olarak, veri girilmeden önce çıkar),
  `prompt` (Chromium `beforeinstallprompt` → "Yükle"), `ios` (adım adım
  talimat; iOS'ta programatik kurulum yok). "Daha sonra" 3 gün erteler,
  tamamen kapatma yok. `beforeinstallprompt` erken ve bir kez geldiği için
  dinleyici modül yüklenirken kurulur — `main.jsx` bu modülü İLK içe aktarır.
  Test notu: masaüstü Edge siteyi kurulabilir bulup gerçek olayı atar;
  telefon taklidinde bu olay engellenmeli.
- **`registerType: 'autoUpdate'`:** yeni sürüm sormadan yüklenir. Kullanıcı
  verisi yalnızca cihazda olduğu için store'a alan eklerken persist
  migrasyonunu unutmak doğrudan veri bozar; geri alma yolu yok.

---

## Mevcut durum

Tamamlanan (yol haritası sırasıyla):

1. ✅ Sayaç kalıcılığı + ders/konu seçiminin store'a taşınması
2. ✅ Tek dokunuşla başlat — Dashboard'da `QuickStartCard` (çalışan / yarım
   kalmış / boşta durumlarına göre şekil alır; başlatınca sayaç sayfasına da
   geçer, yoksa 5 dk kuralı seansı durdururdu)
3. ✅ İlk açılış karşılaması + OBP alanı
4. ✅ Tema onarımları: alt menü sepia uyumu, Akıllı Öncelikler koyu tema
5. ✅ Navigasyon beş sekmeye indi — TYT+AYT tek "Denemeler" sayfasında
   (`ExamsPage`, içinde segmented control), Ayarlar mobil header'a taşındı.
   Persist v2 migrasyonu eski `'tyt'`/`'ayt'` sayfa kimliklerini `'exams'`e çevirir.
6. ✅ Sayaç seans kilidi + sıfırlama onayı (`ConfirmDialog`) — Tekrar/Video
   açığı kapatıldı
7. ✅ Streak motoru — türetilmiş hesap, kısmi gün, haftalık esneme, aylık 3 hak,
   bildirim
8. ✅ Yanlış/boş oranı analizi — ders bazlı boş sebebi, deneme kartında açılır
   Tespitler, Triage motorunda ağırlıklı kayıp
9. ✅ Denemeler konu düzeyine bağlandı — ders satırında opsiyonel "kaybın
   geldiği konular" çipleri, `DERS::Konu` anahtarıyla (Görev Ağacı ile aynı),
   tekrar tespiti ve Denemeler sayfasında toplu kayıp paneli
10. ✅ Çalışma türü eksen oldu — her dersin **her konusu** için 📖 Konu
    Anlatımı / ✏️ Soru Çözümü / 🎯 Branş Denemesi. Arka planda sayma
    ayrıcalığı anlatıma taşındı, tür seans kilidine eklendi, konu anlatımı
    artık Yol Haritası ilerlemesine sayılıyor (persist v3)
11. ✅ Tür kırılımı ekranlara taşındı — `utils/studyStats.js` (saf, test
    edilebilir), yığılı tür çubukları (genel / ders / konu) ve seans
    listesinde tür rozeti. Veri toplanıp gösterilmiyordu; artık
    "bu konuyu çok izledim ama hiç soru çözmemişim" görülebiliyor
12. ✅ Konu havuzu tamamlandı — 116 → 294 konu, 3 eksik ders (TYT/AYT
    Geometri, AYT Din). AYT Din deneme formuna, SÖZ alanına ve puan
    hesabına da eklendi. Köprü çok kaynaklı oldu; kayıp analizi deneme
    başına sayıyor. Yol Haritası: **süresi olan düğüm artık kilitli
    görünmüyor** (araya konu eklenince ilerleme gizleniyordu; ayrıca
    kronometrede konu kilidi olmadığı için gerçeği yansıtmıyordu).
    Paylaşım kartında kısa ders adı hiç eşleşmiyordu — düzeltildi.

    **Yan etki:** Yol Haritası'ndaki genel ilerleme yüzdesi düşer, çünkü
    payda büyüdü (aynı tamamlanmış düğüm sayısı / çok daha fazla konu).
    Veri kaybı değil, doğru ölçüm.

    **Akıllı Öncelikler'in LİSTESİ bu konuları görmüyor** — o liste hâlâ ayrı
    `mockData` havuzunu (69 konu) okuyor. Geometri ve AYT Din orada yok.
    Havuz birleşmesinin (aşağıda 2. madde) değeri bu yüzden daha da arttı.
13. ✅ Akıllı Öncelikler'e ölçüm kartı — `MeasuredLeakCard.jsx` denemelerden
    gelen konu bazlı kaybı sayfaya soktu ve beyanla çeliştiğinde söylüyor.
    Havuz birleşmesini beklemeden, ayrı kart olarak.
14. ✅ Yayın öncesi temizlik (test kullanıcıları + herkese açık depo
    hazırlığı, Aşama 1) — ölü sayfalar ve şablon artığı `icons.svg`
    silindi, telifli meme medyası kaldırıldı, PNG/maskable/apple ikonlar ve
    iOS meta etiketleri eklendi, kalıcı depolama izni, lint sıfır uyarı.
    Git sonradan kuruldu (bkz. 17).
15. ✅ Güvenlik ve veri dayanıklılığı denetimi — yazma koruyucusu (okuma
    hatası / hidrasyon / çoklu sekme / yazma hatası), doğrulamalı ve onaylı
    içe aktarma + geri alma, hata yakalayıcı ve kurtarma ekranı, CSP ve
    güvenlik başlıkları, Google Fonts kaldırıldı. 30 birim testi
    (`sanitizeImport`) ve 46 tarayıcı kontrolü (CDP, üretim derlemesi)
    geçti; testler oturum dışında, depoda değil.
16. ✅ Yedek hatırlatıcısı — 5/7 günlük, gerçek saate göre, uygulamayı
    kilitleyen pencere (indir / 5 sn kilitli "Şimdi değil"). 12 kural testi
    + 25 tarayıcı kontrolü geçti.
17. ✅ Yayında: **https://yks-hazirlik.pages.dev** (Cloudflare Pages, gizli
    GitHub deposu `smzmelihtugra2007-sketch/yks-hazirlik`, `main`'e push =
    canlıya çıkış). Adres KALICI: veri adrese bağlı, değişirse öğrencinin
    verisi eski adreste kalır. Commit kimliği GitHub noreply adresi.
18. ✅ Aşama 3 tamam — ana ekrana ekleme kartı + uygulama içi tarayıcı
    uyarısı, geri bildirim bölümü (Google Form, kısa link
    forms.gle/GkP3WLarD77JNWgb8 — uygulamada uzun adres), imza/telif
    altbilgisi, sürüm etiketi. 15 kural + 16 tarayıcı kontrolü geçti.
19. ✅ Aşama 4 vitrin — README, LICENSE (tüm hakları saklı), ekran
    görüntüleri, Open Graph görseli, gizlilik sayfası. Depo hâlâ GİZLİ;
    herkese açma kullanıcının GitHub ayarlarından.

**Yayın planı:** Aşama 2 ücretsiz statik barındırma (Cloudflare Pages ya
da Vercel, GitHub'a bağlı; GitHub Pages alt yol `/yks-hazirlik/` yüzünden
kök yolları kırar) → Aşama 3 test güvenlik ağı (yedek hatırlatıcısı, ana
ekrana ekleme yönlendirmesi, geri bildirim bağlantısı; yedek hatırlatıcısı
yapıldı) → Aşama 4 vitrin
(README, lisans, Open Graph görseli, gizlilik notu). Kullanıcı izolasyonu
mimariden geliyor: sunucu yok, her tarayıcı kendi verisini tutuyor.

Sayfalar: Genel Bakış · Denemeler · Akıllı Öncelikler · Yol Haritası ·
Odak Kronometresi · Ayarlar (mobilde header'da)

## Sıradaki adımlar

1. **Tekrar planlayıcı (aralıklı tekrar)** — `completedAt` alanı store'da
   **yazılıyor ama hiç okunmuyor**; 1-7-30 günlük aralıklar eklenince "bugün
   tekrar etmen gerekenler" çıkar. Veri hazır, bağımsız, düşük maliyetli.
2. **Öncelikler ↔ Yol Haritası havuz birleşmesi** — ertelendi, ama asıl sorun
   sanıldığından derin: **iki ayrı konu evreni** var (Öncelikler 69 konu
   `mockData.js`'ten, Harita/Kronometre 116 konu `subjects.js`'ten) ve
   adların yalnızca **%42'si** birebir tutuyor. Sonuçları:
   - Öncelikler'in "en kritik" dediği konu (ör. ~12 soruluk `Problemler`)
     Harita'da hiç yok; öğrenci tavsiyeyi alıp düğümü bulamıyor.
   - Kronometre `'Bölme ve Bölünebilme'` yazıyor, Öncelikler
     `'Bölme-Bölünebilme'` okuyor — çalışılan süre Öncelikler'e hiç ulaşmıyor,
     yani o sayfa %100 öz-beyana dayanıyor.
   - İki ayrı "bitti" var: `topic.isCompleted` (Öncelikler) ve
     `completedMissions[]` (Harita). Biri ✓ iken diğeri `locked` olabiliyor.
   - 81 Harita konusunun ÖSYM ağırlığı tabloda yok → sabit 2 saat barajı.

   **Önerilen yön:** `subjects.js` doğruluk kaynağı olur (daha eksiksiz ve
   kronometre zaten ona yazıyor), Öncelikler kendi havuzunu bırakıp bir
   **durum katmanına** (`{ 'TYT_MAT::Problemler': 'critical' }`) iner.
   Takma ad tablosu ÖNERİLMEZ: 1:1 olmayan çakışmaları gizler.
   Adımlar: havuzu birleştir → ÖSYM ağırlıklarını 3 kovaya indirip yeni
   anahtarlara taşı (değişken baraj bedavaya gelir) → iki "bitti"yi
   `studied` (otomatik) ve `resolved` (beyan) olarak ayır → çapraz besleme
   **öneri** olarak (otomatik değil; çalışma süresi anlamanın kanıtı değil)
   → en son kilidi gevşet.
3. **Yanlış defteri** — hata sebebiyle birlikte (bilgi eksiği / dikkat hatası /
   zaman yetmedi). En büyük iş, en çok fark yaratan. `lossTopics` artık
   kaba katmanı sağlıyor; defter bunun ince katmanı.

Ayrıca bekleyen küçük işler: Yol Haritası'nın sabit 2 saat barajını konunun
ÖSYM soru ağırlığına göre değişken yapmak (2'nin parçası); 4 yıllık
simülasyonu (2023-2025) sadeleştirmek; SHA-256 imzalı yedekte uyuşmazlığı
engelleyici hata değil uyarı yapmak; 7 kronometre modunu azaltmak; tek
paket ~1 MB (gzip 292 KB) — sayfaları `lazy()` ile bölmek ilk açılışı
hızlandırır.

Ayrıntılı gerekçeler ve tartışma: yol haritası dokümanı
(claude.ai/code/artifact/21fffbe3-55cc-4d75-a8ff-b0aee7613e6e).

## Çalışma biçimi

- Değişiklikten sonra `npm run lint` ve `npm run build` çalıştır. Lint
  **sıfır uyarıda**; yeni uyarı bırakma.
- Kod yorumları ve arayüz metinleri Türkçe. Yorumlar "ne" değil "neden"
  anlatır; bir karar tuzaktan kaçınmak için alındıysa bunu yaz.
- Mevcut sayfaları bozmamak önemli: yeni özellik eklerken mevcut veri
  alanlarını yeniden adlandırma, store'a ekleme yap.
