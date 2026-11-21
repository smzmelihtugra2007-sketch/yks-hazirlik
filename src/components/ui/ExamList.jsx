/**
 * ─── EXAM LIST (Deneme Listesi & Kartları) ───
 *
 * Geçmiş denemeleri listeleyen kart görünümü.
 *
 * Özellikler:
 *  - Sıralama: Gerçek sınav tarihine göre en güncel deneme en üstte (new Date(b.date) - new Date(a.date))
 *  - Başarıyı Kutlama: '✨ En iyi: Matematik' ve '! En zayıf: Türkçe' analitik göstergeleri (Soru ağırlıklı & tie-breaker)
 *  - Ders bazlı mini progress göstergesi (yüksek kontrastlı hap kutucuklar)
 *  - Animasyonlar src/utils/motion.js içindeki ortak hareket dilinden gelir:
 *    kartlar kademeli açılır, silinen kart yumuşak solar, kalanlar yay ile kayar
 *  - %100 Tema ve Mobil/PC Uyumluluğu
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, TrendingUp, AlertCircle, Trash2, BookOpen, Sparkles, ChevronDown } from 'lucide-react';
import TrialFindings from './TrialFindings';
import useAppStore from '../../store/useAppStore';
import { SUBJECT_LABELS } from '../../data/mockData';
import {
  calcNet,
  calcTotalNet,
  getWorstSubjectByPercentage,
  getBestSubjectByPercentage,
  getEffectiveResult,
} from '../../utils/triage';
import { listCard, emptyState, SOFT_SPRING, EASE_OUT_SOFT } from '../../utils/motion';

/**
 * Tek bir deneme kartı.
 * `index` yalnızca açılış gecikmesi için kullanılır (kademeli giriş).
 */
export function ExamCard({ trial, index = 0, previousTrials = [] }) {
  const { deleteTrial } = useAppStore();
  const totalNet = calcTotalNet(trial.results);

  // Tespitler karta tıklanınca açılır — liste sakin kalsın, detay istenince gelsin
  const [expanded, setExpanded] = useState(false);

  // En Zayıf Ders Analizi
  const worstInfo = getWorstSubjectByPercentage(trial.results);
  const worstSubject = worstInfo?.code
    ? (SUBJECT_LABELS[worstInfo.code] || worstInfo.code).replace('TYT ', '').replace('AYT ', '')
    : '—';

  // En İyi Ders Analizi (Başarıyı Kutlama)
  const bestInfo = getBestSubjectByPercentage(trial.results);
  const bestSubject = bestInfo?.code
    ? (SUBJECT_LABELS[bestInfo.code] || bestInfo.code).replace('TYT ', '').replace('AYT ', '')
    : '—';

  const formattedDate = new Date(trial.date).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <motion.div
      layout="position"
      custom={index}
      variants={listCard}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={SOFT_SPRING}
      className="card p-4 sm:p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Sol: Bilgiler — tıklanınca tespitler açılır.
            <button> DEĞİL: buton yalnızca phrasing content alır, içindeki
            blok düzeyi div'ler flex düzenini bozuyordu. role + tabIndex +
            klavye işleyicisi ile hem geçerli HTML hem erişilebilir. */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          aria-expanded={expanded}
          className="flex-1 min-w-0 text-left cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-brand)]"
        >
          {/* Başlık satırı */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="text-sm sm:text-base font-bold truncate" style={{ color: 'var(--text-main)' }}>
              {trial.name}
            </h3>
            <span
              className="shrink-0 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider shadow-sm"
              style={{
                backgroundColor: 'var(--accent-brand-light)',
                color: 'var(--accent-brand)',
                border: '1px solid var(--accent-brand)',
              }}
            >
              {trial.type}
            </span>
            {/* Açılır olduğunu belli eden ok */}
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT_SOFT }}
              className="flex shrink-0 ml-auto"
              style={{ color: 'var(--text-subtle)' }}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.span>
          </div>

          {/* Meta satırlar (Tarih, Net, En Zayıf & En İyi Ders) */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium">
            {/* Tarih */}
            <span className="flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--text-subtle)' }} />
              {formattedDate}
            </span>

            {/* Toplam Net */}
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              <span className="font-extrabold" style={{ color: 'var(--text-main)' }}>
                {totalNet.toFixed(2)} net
              </span>
            </span>

            {/* En İyi Ders (Başarıyı Kutlama) */}
            {bestInfo?.code && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                <span>En iyi:</span>
                <span className="font-extrabold">{bestSubject}</span>
              </span>
            )}

            {/* En Zayıf Ders */}
            {worstInfo?.code && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                <span style={{ color: 'var(--text-muted)' }}>En zayıf:</span>
                <span className="font-bold">{worstSubject}</span>
              </span>
            )}
          </div>

          {/* Ders bazında mini bar'lar / Hap Kutucuklar */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.entries(trial.results || {}).map(([code, raw]) => {
              // Çubuk GİRİLEN soruya değil, dersin RESMÎ soru sayısına göre
              // dolar. Eskiden 5D/0Y/0B giren öğrencide payda da 5 olduğu için
              // çubuk tamamen yeşil görünüyordu — 40 soruluk Türkçe'de 5 net
              // büyük başarı gibi duruyordu.
              const r = getEffectiveResult(raw, code);
              const net = calcNet(raw);
              const pct = r.total > 0 ? Math.round((Math.max(0, net) / r.total) * 100) : 0;
              const label = SUBJECT_LABELS[code]?.replace('AYT ', '').replace('TYT ', '') || code;

              return (
                <div
                  key={code}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs shadow-2xs transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-card)',
                  }}
                  title={`${label}: ${r.correct}D ${r.wrong}Y ${r.blank}B — ${net.toFixed(2)} / ${r.total} net${
                    r.blankInferred ? ' (boş, soru sayısından türetildi)' : ''
                  }`}
                >
                  <span className="font-bold text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {label}
                  </span>
                  <div className="w-8 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-card)' }}>
                    <motion.div
                      className={`h-full rounded-full origin-left ${
                        pct >= 70
                          ? 'bg-emerald-500'
                          : pct >= 40
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        duration: 0.5,
                        ease: EASE_OUT_SOFT,
                        delay: Math.min(index * 0.045, 0.27) + 0.12,
                      }}
                    />
                  </div>
                  {/* Net tek başına yanıltıcı: "5.00" 40 soruluk derste az,
                      5 soruluk derste tam puan. Payda hep görünür. */}
                  <span className="font-extrabold text-[11px] tabular-nums" style={{ color: 'var(--text-main)' }}>
                    {net.toFixed(2)}
                    <span className="font-semibold" style={{ color: 'var(--text-subtle)' }}>
                      /{r.total}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sağ: Sil butonu */}
        <motion.button
          type="button"
          onClick={() => deleteTrial(trial.id)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          transition={SOFT_SPRING}
          className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          title="Denemeyi sil"
          aria-label="Denemeyi sil"
        >
          <Trash2 className="w-4 h-4" />
        </motion.button>
      </div>

      {/* ── Tespitler (açılır) ── */}
      <AnimatePresence initial={false}>
        {expanded && <TrialFindings trial={trial} previousTrials={previousTrials} />}
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Ana Liste Bileşeni — Gerçek Sınav Tarihi (date) bazlı azalan sıralama (Yeniden Eskiye).
 */
export default function ExamList({ examType = 'ALL' }) {
  const { trials } = useAppStore();

  // Gerçek Sınav Tarihi (date) bazlı sıralama (En güncel tarih her zaman en üstte)
  const filteredTrials = useMemo(() => {
    return (trials || [])
      .filter((t) => (examType === 'ALL' ? true : t.type === examType))
      .sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
  }, [trials, examType]);

  if (filteredTrials.length === 0) {
    return (
      <motion.div
        variants={emptyState}
        initial="initial"
        animate="animate"
        exit="exit"
        className="card p-8 flex flex-col items-center justify-center text-center"
      >
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-inner"
          style={{ backgroundColor: 'var(--bg-input)' }}
        >
          <BookOpen className="w-6 h-6" style={{ color: 'var(--text-subtle)' }} />
        </div>
        <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
          Henüz deneme kaydı yok
        </p>
        <p className="text-xs mt-1 max-w-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Yukarıdaki &quot;Yeni Deneme Ekle&quot; butonunu kullanarak ilk deneme sonucunu kaydet.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {filteredTrials.map((trial, index) => (
          <ExamCard
            key={trial.id}
            trial={trial}
            index={index}
            // Liste yeniden-eskiye sıralı; bu denemeden SONRA gelenler
            // tarihsel olarak ONDAN ÖNCEKİ denemelerdir (trend kıyası için).
            previousTrials={filteredTrials.slice(index + 1)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
