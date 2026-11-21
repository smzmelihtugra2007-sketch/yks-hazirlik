/**
 * ─── ADD EXAM MODAL (Kurşun Geçirmez Deneme Ekleme Formu) ───
 *
 * Props:
 *  - isOpen      : boolean
 *  - onClose     : () => void
 *  - defaultType : 'TYT' | 'AYT' — hangi sekmeden açıldı
 *
 * Güvenlik & Doğrulama Kuralları:
 *  - 0.25 Net Kuralı: Netler yalnızca 0.25 katları olabilir (JS doğrulama + step koruması)
 *  - Maksimum Soru Sınırı: D + Y + B toplamı dersin soru sayısını aşamaz
 *  - Negatif Net Sınırı: En düşük net -(totalQ / 4) olabilir
 *  - Sayısal Input Mouse Wheel Koruması: onWheel={(e) => e.target.blur()}
 *  - Koyu ve Gece Teması Net Sınırlar: border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/90 text-gray-900 dark:text-white
 *  - %100 Tema ve Mobil/PC uyumluluğu
 */
import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, BookOpen, AlertTriangle, ChevronDown, Crosshair } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import {
  TYT_SUBJECTS,
  AYT_SUBJECTS,
  TRACKS,
} from '../../data/mockData';
import { calcNet } from '../../utils/triage';
import { toDateKey } from '../../utils/dateKey';
import { BLANK_REASONS, BLANK_REASON_CODES } from '../../utils/examAnalysis';
import { getTopicsForExamSubject } from '../../data/examTopicMap';

// ─── Animasyon varyantları ───
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 8 },
};

/**
 * Tek bir ders satırı — doğru / yanlış / boş girişi ve soru sınırı kontrolü.
 */
function SubjectRow({ subject, values, onChange }) {
  // Boş artık girilmiyor, HESAPLANIYOR: sınavda her soru ya doğru ya yanlış ya
  // boştur. Öğrenciler pratikte yalnızca D ve Y giriyor, "kalanı zaten boş"
  // diye alanı boş bırakıyordu; bu da boş oranını %0 gösterip analizi
  // bozuyordu. Alan okunur ama düzenlenemez.
  const answered = (values.correct || 0) + (values.wrong || 0);
  const blank = Math.max(0, subject.totalQ - answered);
  const net = calcNet(values);
  const overLimit = answered > subject.totalQ;
  const maxNet = subject.totalQ;
  const minNet = -(subject.totalQ / 4);
  const isNetError = overLimit || net > maxNet || net < minNet;

  // Konu etiketleme paneli KAPALI açılır. Form zaten 9-11 ders satırı taşıyor;
  // hepsi açık gelse ekran okunamaz hale gelir ve öğrenci formu terk eder.
  const [topicsOpen, setTopicsOpen] = useState(false);
  const topicOptions = useMemo(
    () => getTopicsForExamSubject(subject.code),
    [subject.code]
  );

  // Bazı satırlar birden çok çalışma dersini kapsıyor (Matematik + Geometri,
  // Tarih-2 + Tarih-1 kapsamı). Ek kaynakların konuları ayrı başlık altında
  // gösterilir; tek düz listede 45 çip arasında geometriyi bulmak zordu.
  const topicGroups = useMemo(() => {
    const groups = [];
    for (const opt of topicOptions) {
      const title = opt.group || null;
      let g = groups.find((x) => x.title === title);
      if (!g) {
        g = { title, items: [] };
        groups.push(g);
      }
      g.items.push(opt);
    }
    return groups;
  }, [topicOptions]);
  const selectedTopics = values.lossTopics || [];
  // Kayıp yoksa atfedilecek bir şey de yok
  const hasLoss = answered > 0 && (values.wrong || 0) + blank > 0;

  const toggleTopic = (key) => {
    const next = selectedTopics.includes(key)
      ? selectedTopics.filter((k) => k !== key)
      : [...selectedTopics, key];
    onChange({ ...values, lossTopics: next });
  };

  return (
    <div
      className={`p-3 rounded-xl border transition-colors ${
        overLimit
          ? 'bg-red-500/10 border-red-500/30'
          : 'bg-slate-50 dark:bg-slate-800/40 [html.theme-sepia_&]:bg-[#241a13] border-slate-200/80 dark:border-slate-800 [html.theme-sepia_&]:border-[#453225]'
      }`}
    >
      {/* 1. Katman: Ders Adı ve Net Rozeti (Aynı Satırda İki Uca Yaslı) */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 [html.theme-sepia_&]:text-amber-100 truncate">
          {subject.label}{' '}
          <span
            className={`text-xs font-normal ${
              overLimit ? 'text-red-500 font-bold' : 'text-slate-400 dark:text-slate-500 [html.theme-sepia_&]:text-[#8c735d]'
            }`}
          >
            ({answered}/{subject.totalQ} işaretli)
          </span>
        </span>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-md border shrink-0 ${
            isNetError
              ? 'bg-red-500/10 border-red-500/30 text-red-500'
              : 'bg-indigo-50 dark:bg-indigo-950/40 [html.theme-sepia_&]:bg-amber-950/40 text-indigo-600 dark:text-indigo-400 [html.theme-sepia_&]:text-amber-400 border-indigo-200/60 dark:border-indigo-800/40 [html.theme-sepia_&]:border-amber-700/40'
          }`}
        >
          {Number(net || 0).toFixed(2)} net
        </span>
      </div>

      {/* 2. Katman: D - Y - B Kutuları (Tam Genişlik Eşit Grid) */}
      <div className="grid grid-cols-3 gap-2">
        <NumberBox
          label="D"
          max={subject.totalQ}
          value={values.correct}
          onChange={(v) => onChange({ ...values, correct: v })}
          labelColor="text-emerald-600 dark:text-emerald-400 [html.theme-sepia_&]:text-emerald-400"
          focusRing="focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500/30"
        />
        <NumberBox
          label="Y"
          max={subject.totalQ}
          value={values.wrong}
          onChange={(v) => onChange({ ...values, wrong: v })}
          labelColor="text-red-500 dark:text-red-400 [html.theme-sepia_&]:text-red-400"
          focusRing="focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/30"
        />
        {/* B otomatik: girilmeyen her soru boştur. Salt okunur kutu. */}
        <div
          className="rounded-lg border px-2 py-1.5 flex items-center justify-between gap-1"
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border-card)',
            opacity: 0.85,
          }}
          title="Boş = toplam soru − (doğru + yanlış). Otomatik hesaplanır."
        >
          <span
            className="text-[11px] font-extrabold"
            style={{ color: 'var(--text-subtle)' }}
          >
            B
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: 'var(--text-muted)' }}
          >
            {blank}
          </span>
        </div>
      </div>

      <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-subtle)' }}>
        Boş otomatik hesaplanır — işaretlemediğin sorular boş sayılır.
      </p>

      {/* 3. Katman: Boş Bırakma Sebebi — yalnızca boş varsa sorulur.
           Veriden "neden boş bıraktı" bilinemiyor: bilmiyordu / süre yetmedi /
           emin olamadı üçü bambaşka müdahale gerektiriyor. Tek dokunuşluk bu
           seçim analizi kat kat keskinleştiriyor. Opsiyonel. */}
      <AnimatePresence initial={false}>
        {blank > 0 && answered > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="pt-2.5 mt-2.5" style={{ borderTop: '1px solid var(--border-card)' }}>
              <span
                className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--text-subtle)' }}
              >
                Boş bırakma sebebi
                <span className="font-medium normal-case tracking-normal"> (opsiyonel)</span>
              </span>

              {/* Mobilde alt alta, tablet ve üstünde yan yana */}
              <div className="flex flex-wrap gap-1.5">
                {BLANK_REASON_CODES.map((code) => {
                  const active = values.blankReason === code;
                  return (
                    <button
                      key={code}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        onChange({ ...values, blankReason: active ? null : code })
                      }
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-colors duration-200 flex-1 min-w-[88px]"
                      style={{
                        backgroundColor: active ? 'var(--accent-brand-light)' : 'var(--bg-input)',
                        borderColor: active ? 'var(--accent-brand)' : 'var(--border-card)',
                        color: active ? 'var(--accent-brand)' : 'var(--text-muted)',
                      }}
                    >
                      {BLANK_REASONS[code].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Katman: Kaybın geldiği konular — opsiyonel, kapalı başlar.
           Ders düzeyinde "matematikte kaybediyorsun" diyebiliyorduk ama
           "matematiğin NESİNDE" diyemiyorduk. Tek dokunuşluk işaretleme
           denemeler boyunca toplanınca tekrarlayan kaybı ortaya çıkarıyor
           (bkz. utils/topicLeaks.js). Anahtarlar Yol Haritası düğümleriyle
           aynı formatta yazılır. */}
      <AnimatePresence initial={false}>
        {hasLoss && topicOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="pt-2.5 mt-2.5" style={{ borderTop: '1px solid var(--border-card)' }}>
              <button
                type="button"
                onClick={() => setTopicsOpen((v) => !v)}
                aria-expanded={topicsOpen}
                className="w-full flex items-center gap-1.5 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-brand)]"
              >
                <Crosshair className="w-3 h-3 shrink-0" style={{ color: 'var(--text-subtle)' }} />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  Kaybın geldiği konular
                  <span className="font-medium normal-case tracking-normal"> (opsiyonel)</span>
                </span>

                {selectedTopics.length > 0 && (
                  <span
                    className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-extrabold tabular-nums"
                    style={{
                      backgroundColor: 'var(--accent-brand-light)',
                      color: 'var(--accent-brand)',
                    }}
                  >
                    {selectedTopics.length}
                  </span>
                )}

                <motion.span
                  animate={{ rotate: topicsOpen ? 180 : 0 }}
                  transition={{ duration: 0.24 }}
                  className="flex shrink-0 ml-auto"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {topicsOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    {/* Mobilde iki sütun, tablet ve üstünde üç; konu adları uzun
                        olduğu için grid taşmayı önlüyor. Ek kaynaklar (Geometri,
                        Tarih-1 kapsamı…) kendi başlığı altında. */}
                    {topicGroups.map((group) => (
                      <div key={group.title || '__primary'} className="pt-2">
                        {group.title && (
                          <span
                            className="block text-[9px] font-extrabold uppercase tracking-wider mb-1"
                            style={{ color: 'var(--text-subtle)' }}
                          >
                            {group.title}
                          </span>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {group.items.map((opt) => {
                            const active = selectedTopics.includes(opt.key);
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                aria-pressed={active}
                                onClick={() => toggleTopic(opt.key)}
                                title={opt.label}
                                className="px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-colors duration-200 text-left leading-tight"
                                style={{
                                  backgroundColor: active
                                    ? 'var(--accent-brand-light)'
                                    : 'var(--bg-input)',
                                  borderColor: active
                                    ? 'var(--accent-brand)'
                                    : 'var(--border-card)',
                                  color: active ? 'var(--accent-brand)' : 'var(--text-muted)',
                                }}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <p className="text-[9px] mt-1.5 leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
                      Yanlış ve boşların hangi konulardan geldiğini işaretle. Sayı
                      girmen gerekmiyor — birkaç deneme sonra hangi konunun sürekli
                      kaybettirdiği kendiliğinden çıkıyor.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * D / Y / B Kutucuğu — İç içe etiket ve input, mouse wheel blur korumalı
 */
function NumberBox({ label, value, max, onChange, labelColor, focusRing }) {
  return (
    <div
      className={`flex items-center gap-1 bg-white dark:bg-slate-900 [html.theme-sepia_&]:bg-[#2c2018] px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 [html.theme-sepia_&]:border-[#453225] transition-all ${focusRing}`}
    >
      <span className={`text-[11px] font-bold ${labelColor || 'text-slate-400'} select-none shrink-0`}>
        {label}
      </span>
      <input
        type="number"
        min="0"
        max={max || 100}
        step="1"
        value={value === 0 ? '' : value}
        placeholder="0"
        onWheel={(e) => e.target.blur()}
        onChange={(e) => {
          const raw = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
          const clamped = Math.max(0, Math.min(max || 100, isNaN(raw) ? 0 : raw));
          onChange(clamped);
        }}
        className="w-full text-center font-bold text-sm bg-transparent outline-none p-0 text-slate-800 dark:text-slate-100 [html.theme-sepia_&]:text-amber-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  );
}


// ─── Ana Modal Bileşeni ───
export default function AddExamModal({ isOpen, onClose, defaultType = 'TYT' }) {
  const { addTrial, selectedTrack, showAyt } = useAppStore();

  // Yalnızca TYT modunda tip her zaman TYT'dir
  const effectiveDefaultType = showAyt ? defaultType : 'TYT';

  // Form state
  const [examType, setExamType] = useState(effectiveDefaultType);
  const [examName, setExamName] = useState('');
  // Yerel gün anahtarı: UTC kullanılsaydı gece yarısından sonra deneme
  // eklemek varsayılan tarihi bir gün geriye atardı
  const [examDate, setExamDate] = useState(toDateKey());
  const [errorMessage, setErrorMessage] = useState('');

  // Gösterilecek dersler (AYT ise seçili track'e göre filtrele)
  const subjects = useMemo(() => {
    if (examType === 'TYT') return TYT_SUBJECTS;
    const trackCodes = TRACKS[selectedTrack]?.aytSubjects || [];
    return AYT_SUBJECTS.filter((s) => trackCodes.includes(s.code));
  }, [examType, selectedTrack]);

  // Her ders için doğru/yanlış/boş
  const [subjectValues, setSubjectValues] = useState(() => buildInitialValues(subjects));

  // Ders listesi değiştiğinde değerleri güncelle
  const prevSubjectsKey = subjects.map((s) => s.code).join(',');
  const [lastKey, setLastKey] = useState(prevSubjectsKey);
  if (prevSubjectsKey !== lastKey) {
    setSubjectValues(buildInitialValues(subjects));
    setLastKey(prevSubjectsKey);
  }

  // Toplam net
  const totalNet = useMemo(() => {
    return Object.values(subjectValues).reduce((sum, v) => sum + calcNet(v), 0);
  }, [subjectValues]);

  // Ders değeri güncelleme
  const handleSubjectChange = useCallback((code, newValues) => {
    setSubjectValues((prev) => ({ ...prev, [code]: newValues }));
    setErrorMessage('');
  }, []);

  // Formu Gönder & Kurşun Geçirmez Doğrulama
  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!examName.trim()) {
      setErrorMessage('Lütfen deneme adını giriniz.');
      return;
    }

    // 1. Soru Sayısı Aşım Kontrolü — boş hesaplandığı için yalnızca
    //    işaretlenenler (D + Y) sınırı aşabilir
    for (const subject of subjects) {
      const v = subjectValues[subject.code] || { correct: 0, wrong: 0, blank: 0 };
      const answered = (v.correct || 0) + (v.wrong || 0);

      if (answered > subject.totalQ) {
        setErrorMessage(
          `${subject.label} dersinde işaretlenen soru sayısı (${subject.totalQ}) aşıldı! Girilen: ${answered}`
        );
        return;
      }

      // 2. Negatif ve Maksimum Net Sınır Kontrolü
      const net = calcNet(v);
      const minPossibleNet = -(subject.totalQ / 4);
      if (net > subject.totalQ) {
        setErrorMessage(`${subject.label} neti maksimum soru sayısını (${subject.totalQ}) aşamaz!`);
        return;
      }
      if (net < minPossibleNet) {
        setErrorMessage(`${subject.label} neti en düşük sınırın (${minPossibleNet}) altına inemez!`);
        return;
      }

      // 3. 0.25 Net Katı Kuralı Kontrolü
      const netTimesFour = net * 4;
      const isQuarterMultiple = Math.abs(Math.round(netTimesFour) - netTimesFour) < 0.001;
      if (!isQuarterMultiple) {
        setErrorMessage('Netler sadece 0.25, 0.50, 0.75 küsuratlı olabilir!');
        return;
      }
    }

    // Sonuçları oluştur — sadece en az 1 soru girilen dersleri kaydet
    const results = {};
    let hasAnyInput = false;

    const subjectByCode = Object.fromEntries(subjects.map((s) => [s.code, s]));

    for (const [code, v] of Object.entries(subjectValues)) {
      const correct = Number(v.correct) || 0;
      const wrong = Number(v.wrong) || 0;

      // Yalnızca işaretleme yapılan dersler kaydedilir. Boş kendi başına
      // "bu derse girdim" anlamına gelmez (hesaplanan bir değer artık).
      if (correct + wrong > 0) {
        const totalQ = subjectByCode[code]?.totalQ || correct + wrong;
        const blank = Math.max(0, totalQ - correct - wrong);

        // Konu etiketleri yalnızca atfedilecek bir kayıp varsa anlamlı.
        // Tam doğru çözülmüş derste işaretleme kalmışsa (öğrenci önce
        // işaretleyip sonra sayıları düzeltmişse) kaydedilmez.
        const lossTopics =
          wrong + blank > 0 && Array.isArray(v.lossTopics) && v.lossTopics.length > 0
            ? [...new Set(v.lossTopics)]
            : null;

        results[code] = {
          correct,
          wrong,
          // Hesaplanan boş kaydedilir ki eski veriyle aynı şekilde okunabilsin
          blank,
          // Sebep yalnızca boş varsa anlamlı; yoksa alanı hiç yazmıyoruz
          ...(blank > 0 && v.blankReason ? { blankReason: v.blankReason } : {}),
          ...(lossTopics ? { lossTopics } : {}),
        };
        hasAnyInput = true;
      }
    }

    if (!hasAnyInput) {
      setErrorMessage('Lütfen en az bir derse ait soru ve net bilgisi giriniz.');
      return;
    }

    // Denemeyi ekle (createdAt timestamp ile)
    addTrial({
      date: examDate,
      createdAt: Date.now(),
      name: examName.trim(),
      type: examType,
      results,
    });

    // Formu sıfırla ve kapat
    setExamName('');
    setSubjectValues(buildInitialValues(subjects));
    setErrorMessage('');
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 top-0 left-0 w-screen h-screen min-h-screen z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          {/* Arkaplan overlay */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal kutusu */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="relative w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl border flex flex-col overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
              color: 'var(--text-main)',
            }}
          >
            {/* ── Başlık ── */}
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--border-card)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: 'var(--accent-brand-light)' }}
                >
                  <BookOpen className="w-4.5 h-4.5" style={{ color: 'var(--accent-brand)' }} />
                </div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>
                    Yeni Deneme Ekle
                  </h2>
                  <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
                    Gelişimini takip etmek için yeni bir sınav sonucu gir.
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                style={{ backgroundColor: 'var(--bg-input)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-5 py-4 space-y-4">
                {/* Sınav Tipi Toggle — yalnızca AYT etkinse göster */}
                {showAyt && (
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                    Sınav Tipi
                  </label>
                  <div
                    className="flex gap-1.5 p-1 rounded-2xl border border-slate-300 dark:border-slate-700 bg-slate-100/80 dark:bg-slate-900/50 [html.theme-sepia_&]:border-[#453225] [html.theme-sepia_&]:bg-[#2c2018]"
                  >
                    {['TYT', 'AYT'].map((type) => {
                      const isActive = examType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setExamType(type);
                            setErrorMessage('');
                          }}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                            isActive
                              ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-md dark:border dark:border-slate-600 [html.theme-sepia_&]:bg-[#3a2c20] [html.theme-sepia_&]:text-amber-300'
                              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:dark:text-slate-200 [html.theme-sepia_&]:text-[#a89078] hover:[html.theme-sepia_&]:text-[#f3eadc]'
                          }`}
                        >
                          {type} {type === 'AYT' && `(${selectedTrack})`}
                        </button>
                      );
                    })}
                  </div>
                </div>
                )}

                {/* Ad ve Tarih */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                      Deneme Adı
                    </label>
                    <input
                      type="text"
                      value={examName}
                      onChange={(e) => {
                        setExamName(e.target.value);
                        setErrorMessage('');
                      }}
                      placeholder="ör. 3D TYT-4"
                      required
                      className="input-field py-2 text-xs font-semibold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/90 text-gray-900 dark:text-white [html.theme-sepia_&]:border-[#453225] [html.theme-sepia_&]:bg-[#2c2018] [html.theme-sepia_&]:text-amber-100"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
                      Tarih
                    </label>
                    <input
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      required
                      className="input-field py-2 text-xs font-semibold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/90 text-gray-900 dark:text-white [html.theme-sepia_&]:border-[#453225] [html.theme-sepia_&]:bg-[#2c2018] [html.theme-sepia_&]:text-amber-100"
                    />
                  </div>
                </div>

                {/* Hata Mesajı Banner'ı */}
                <AnimatePresence>
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400"
                    >
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Ders Girişleri */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Ders Sonuçları (Doğru / Yanlış / Boş)
                    </label>
                    <span
                      className="text-xs font-extrabold px-2.5 py-0.5 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--accent-brand-light)',
                        borderColor: 'var(--accent-brand)',
                        color: 'var(--accent-brand)',
                      }}
                    >
                      Toplam: {totalNet.toFixed(2)} net
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {subjects.map((subject) => (
                      <SubjectRow
                        key={subject.code}
                        subject={subject}
                        values={subjectValues[subject.code] || { correct: 0, wrong: 0, blank: 0 }}
                        onChange={(v) => handleSubjectChange(subject.code, v)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Alt Butonlar ── */}
              <div
                className="sticky bottom-0 flex items-center justify-end gap-3 px-5 py-4 border-t shadow-lg"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-card)' }}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors hover:opacity-80 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800/80 text-gray-700 dark:text-gray-200 [html.theme-sepia_&]:border-[#453225]"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all active:scale-95 hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent-brand)' }}
                >
                  <Plus className="w-4 h-4" />
                  Denemeyi Kaydet
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ─── Yardımcı ───
function buildInitialValues(subjects) {
  const values = {};
  for (const s of subjects) {
    values[s.code] = { correct: 0, wrong: 0, blank: 0, blankReason: null, lossTopics: [] };
  }
  return values;
}
