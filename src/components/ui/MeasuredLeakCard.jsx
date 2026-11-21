/**
 * ─── DENEMELERDEN ÖLÇÜLEN KAYIPLAR (Akıllı Öncelikler) ───
 *
 * Akıllı Öncelikler'in geri kalanı öğrencinin BEYANINA dayanır: konuyu elle
 * "Sıfır Temel / Konu Eksiği / Hafif Pürüz" diye işaretler. Bu kart ise
 * ÖLÇÜME dayanır — deneme eklerken işaretlenen konu bazlı kayıplar.
 *
 * ─ Neden ayrı bir kart ─
 *   Sayfanın konu havuzu (`mockData`, 69 konu) ile kayıpların havuzu
 *   (`subjects.js`, 294 konu) henüz ayrı. Ölçülen kayıpları aşağıdaki listeye
 *   karıştırmak, iki havuzu birbirine geçirip mevcut karışıklığı büyütürdü.
 *   Ayrı kart, havuz birleşmesini beklemeden gerçek veriyi sayfaya sokuyor;
 *   birleşmeden sonra bu kart listeye eriyebilir.
 *
 * ─ Çelişki rozeti ─
 *   Asıl değer burada: beyan ile ölçüm uyuşmadığında söylemek. Eşleşme kısmi
 *   (iki havuz ayrı), bu yüzden rozet yalnızca adı birebir tutan konularda
 *   çıkar — yanlış konuyu suçlamaktansa sessiz kalmak yeğdir.
 *
 * Üç tema: renkler CSS değişkenlerinden; durum renkleri (kırmızı/amber) üç
 * temada da okunur sabit tonlar.
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, ChevronDown, Repeat, AlertTriangle } from 'lucide-react';
import {
  collectTopicLeaks,
  annotateLeaksWithDeclared,
  hasAnyLossTopics,
} from '../../utils/topicLeaks';
import { listCard, SOFT_SPRING, EASE_OUT_SOFT } from '../../utils/motion';

/** İlk açılışta gösterilen satır sayısı. */
const COLLAPSED_COUNT = 4;

/** Çelişki türüne göre uyarı metni — beyan ile ölçümün uyuşmadığı yer. */
function conflictMessage(leak) {
  if (leak.conflict === 'completed') {
    return `"Cebe atıldı" olarak işaretlemişsin ama ${leak.flagCount} denemede hâlâ buradan kaybettin.`;
  }
  if (leak.conflict === 'underrated') {
    return `"Hafif Pürüz" olarak işaretlemişsin ama ${leak.flagCount} denemede kayıp kaynağı oldu — durumunu yükseltmeyi düşün.`;
  }
  return null;
}

export default function MeasuredLeakCard({ trials, examType, declaredTopics }) {
  const [showAll, setShowAll] = useState(false);

  const leaks = useMemo(() => {
    const raw = collectTopicLeaks(trials, { examType });
    return annotateLeaksWithDeclared(raw, declaredTopics);
  }, [trials, examType, declaredTopics]);

  const hasTrialsOfType = useMemo(
    () => (trials || []).some((t) => t?.type === examType),
    [trials, examType]
  );

  const anyTags = useMemo(
    () => hasAnyLossTopics((trials || []).filter((t) => t?.type === examType)),
    [trials, examType]
  );

  // Hiç deneme yoksa sessiz kal — öğrenci zaten Denemeler sayfasına yönlendirilmiş
  if (!hasTrialsOfType) return null;

  // ── Boş durum: deneme var ama konu etiketi girilmemiş ──
  if (!anyTags) {
    return (
      <div className="card p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 [html.theme-sepia_&]:border-[#453225] bg-white dark:bg-slate-800/60 [html.theme-sepia_&]:bg-[#201712] shadow-sm flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--bg-input)' }}
        >
          <Crosshair className="w-4 h-4" style={{ color: 'var(--text-subtle)' }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
            Denemelerden ölçüm henüz yok
          </p>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Aşağıdaki liste senin beyanına dayanıyor. Deneme eklerken her dersin
            altındaki{' '}
            <span className="font-bold" style={{ color: 'var(--text-main)' }}>
              &quot;Kaybın geldiği konular&quot;
            </span>{' '}
            bölümünü işaretlersen, burada hangi konunun gerçekten net
            götürdüğünü ölçümle görürsün.
          </p>
        </div>
      </div>
    );
  }

  const conflicts = leaks.filter((l) => l.conflict);
  const visible = showAll ? leaks : leaks.slice(0, COLLAPSED_COUNT);
  const hiddenCount = leaks.length - visible.length;

  return (
    <div className="card p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 [html.theme-sepia_&]:border-[#453225] bg-white dark:bg-slate-800/60 [html.theme-sepia_&]:bg-[#201712] shadow-sm">
      {/* ── Başlık ── */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'var(--accent-brand-light)' }}
          >
            <Crosshair className="w-4 h-4" style={{ color: 'var(--accent-brand)' }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
              Denemelerde Kaybettiğin Konular
            </h2>
            {/* Bu ayrım önemli: aşağıdaki liste beyan, bu kart ölçüm */}
            <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {examType} denemelerinden ölçüldü — aşağıdaki liste senin beyanın
            </p>
          </div>
        </div>

        {conflicts.length > 0 && (
          <span
            className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold"
            style={{ backgroundColor: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}
          >
            <AlertTriangle className="w-3 h-3" />
            {conflicts.length} çelişki
          </span>
        )}
      </div>

      {/* ── Satırlar ── */}
      <div className="space-y-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((leak, i) => (
            <motion.div
              key={leak.key}
              layout="position"
              custom={i}
              variants={listCard}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={SOFT_SPRING}
              className="px-3 py-2.5 rounded-xl border"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: leak.conflict
                  ? 'rgba(244,63,94,0.35)'
                  : leak.isRepeat
                  ? 'rgba(245,158,11,0.3)'
                  : 'var(--border-card)',
              }}
            >
              {/* Üst satır: konu + tekrar rozeti + tahmini net */}
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold truncate flex-1 min-w-0"
                  style={{ color: 'var(--text-main)' }}
                  title={leak.topic}
                >
                  {leak.topic}
                </span>

                {leak.isRepeat && (
                  <span
                    className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold tabular-nums"
                    style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}
                    title={`${leak.subjectTrials} denemeden ${leak.flagCount}'inde kayıp kaynağı`}
                  >
                    <Repeat className="w-2.5 h-2.5" />
                    {leak.flagCount}/{leak.subjectTrials}
                  </span>
                )}

                <span
                  className="shrink-0 text-xs font-extrabold tabular-nums"
                  style={{ color: 'var(--text-main)' }}
                  title="Mükemmel kâğıda göre bu konudan kaçırılan tahmini net"
                >
                  ~{leak.weightedLoss.toFixed(1)}
                  <span
                    className="text-[9px] font-bold ml-0.5"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    net
                  </span>
                </span>
              </div>

              {/* Alt satır: ders + kırılım */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: 'var(--text-subtle)' }}
                >
                  {leak.subjectLabel}
                </span>
                <span
                  className="text-[10px] font-bold tabular-nums"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ~{leak.wrong.toFixed(0)}Y · {leak.blank.toFixed(0)}B
                </span>
                {!leak.isRepeat && (
                  <span className="text-[10px] font-semibold" style={{ color: 'var(--text-subtle)' }}>
                    {leak.subjectTrials} denemeden {leak.flagCount}&apos;inde
                  </span>
                )}
              </div>

              {/* Çelişki: beyan ile ölçüm uyuşmuyor */}
              {leak.conflict && (
                <p
                  className="text-[10px] font-semibold mt-1.5 flex items-start gap-1.5 leading-relaxed"
                  style={{ color: '#f43f5e' }}
                >
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>{conflictMessage(leak)}</span>
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Tümünü gör ── */}
      {(hiddenCount > 0 || showAll) && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-bold transition-colors"
          style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}
        >
          {showAll ? 'Daha az göster' : `${hiddenCount} konu daha`}
          <motion.span
            animate={{ rotate: showAll ? 180 : 0 }}
            transition={{ duration: 0.24, ease: EASE_OUT_SOFT }}
            className="flex"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.span>
        </button>
      )}

      <p className="text-[9px] mt-2.5 leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
        Net değerleri yaklaşıktır: dersin ölçülmüş yanlış/boşu, o denemede
        işaretlediğin konulara eşit bölünür. Çelişki uyarısı yalnızca bu konunun
        aşağıdaki listede de bulunduğu durumlarda çıkar.
      </p>
    </div>
  );
}
