/**
 * ─── HAREKET DİLİ (TYT / AYT ANALİZ + AKILLI ÖNCELİKLER) ───
 *
 * Bu sayfaların paylaştığı animasyon tanımları.
 * Amaç: sıçramayan, yumuşak başlayıp yumuşak duran kısa geçişler.
 *
 *  - EASE_OUT_SOFT / EASE_IN_SOFT : giriş ve çıkış eğrileri
 *  - SOFT_SPRING                  : layout kaymaları için taşmasız yay
 *  - pageContainer / pageSection  : sayfa giriş-çıkışı (kademeli / stagger)
 *  - listCard                     : liste satır/kartlarının giriş-çıkışı
 *  - collapsible                  : katlanan form ve akordeon gövdeleri
 *  - tabPanel                     : sekme içeriği tazelenmesi (yalnız opaklık)
 *  - contentReveal                : kategori/ders geçişi (opaklık + küçük yükseliş)
 *  - pressable                    : buton dokunma geri bildirimi
 *
 * Not: Sayfalar <MotionConfig reducedMotion="user"> ile sarılır; işletim
 * sisteminde "hareketi azalt" açıksa konum/ölçek animasyonları kendiliğinden
 * devre dışı kalır, yalnızca opaklık geçişi çalışır.
 */

/** Sona doğru yumuşayan giriş eğrisi (ease-out-quint benzeri). */
export const EASE_OUT_SOFT = [0.22, 1, 0.36, 1];

/** Yavaş başlayan çıkış eğrisi — kaybolurken göz yormaz. */
export const EASE_IN_SOFT = [0.4, 0, 1, 1];

/** Liste yeniden dizilirken kullanılan, salınım yapmayan yay. */
export const SOFT_SPRING = {
  type: 'spring',
  stiffness: 210,
  damping: 30,
  mass: 0.85,
};

/** Sayfa gövdesi — çocuklarını sırayla açar, çıkarken ters sırada kapatır. */
export const pageContainer = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.06, delayChildren: 0.03 },
  },
  exit: {
    transition: { staggerChildren: 0.03, staggerDirection: -1 },
  },
};

/** Sayfa içindeki her bir blok (başlık, liste, ...). */
export const pageSection = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: EASE_OUT_SOFT },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: EASE_IN_SOFT },
  },
};

/**
 * Liste kartı / satırı — `custom` olarak sıra numarası alır ve kademeli açılır.
 * Gecikme üst sınırı var; uzun listede son kart beklemede kalmaz.
 */
export const listCard = {
  initial: { opacity: 0, y: 16 },
  animate: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: EASE_OUT_SOFT,
      delay: Math.min(index * 0.045, 0.27),
    },
  }),
  exit: {
    opacity: 0,
    y: -4,
    scale: 0.98,
    transition: { duration: 0.18, ease: EASE_IN_SOFT },
  },
};

/** Boş durum kartı — sade opaklık geçişi. */
export const emptyState = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT_SOFT } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/**
 * Katlanan gövde (form / akordeon).
 * Opaklık yüksekliğin biraz gerisinden gelir; kutu "patlayarak" açılmaz.
 */
export const collapsible = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: 'auto',
    transition: {
      height: { duration: 0.36, ease: EASE_OUT_SOFT },
      opacity: { duration: 0.26, ease: EASE_OUT_SOFT, delay: 0.06 },
    },
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      height: { duration: 0.26, ease: EASE_IN_SOFT },
      opacity: { duration: 0.14, ease: EASE_IN_SOFT },
    },
  },
};

/**
 * Sekme içeriği — yalnızca opaklık değişir.
 * Dikey hareketi içindeki kartlar yapar, ikisi üst üste binmez.
 */
export const tabPanel = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.24, ease: EASE_OUT_SOFT } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: EASE_IN_SOFT } },
};

/**
 * İçerik değişimi (kategori/ders seçimi gibi kısa ömürlü geçişler) —
 * Tailwind'in "animate-in fade-in slide-in-from-bottom-2" hissinin karşılığı.
 * tabPanel'den farkı: küçük (8px) bir dikey yükseliş de taşır. Mesafe kasıtlı
 * olarak küçük tutulur ki içindeki liste elemanlarının kendi stagger
 * hareketiyle (listCard, 16px) çakışıp "çift zıplama" hissi vermesin —
 * ikisi birlikte tek, bütünlüklü bir yükseliş gibi okunur.
 */
export const contentReveal = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT_SOFT },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.16, ease: EASE_IN_SOFT },
  },
};

/** Butonlara takılan hafif hover/tap geri bildirimi. */
export const pressable = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.98, y: 0 },
  transition: SOFT_SPRING,
};
