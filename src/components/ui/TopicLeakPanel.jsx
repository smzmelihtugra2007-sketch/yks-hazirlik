/**
 * ─── TEKRARLAYAN KAYIP KONULARI ───
 *
 * Deneme listesinin altında duran toplu görünüm. Tek bir denemeye bakarak
 * görülemeyen şeyi gösterir: hangi konu denemeler boyunca SÜREKLİ kaybettiriyor.
 *
 * Neden Denemeler sayfasında: veri buradan giriliyor ve kaynağına en yakın
 * yerde durması gerekiyor. Akıllı Öncelikler'e koymak cazipti ama o sayfa
 * ayrı bir konu havuzu okuyor; ikisini aynı ekranda karıştırmak mevcut
 * Öncelikler ↔ Yol Haritası çelişkisini büyütürdü. Havuzlar birleşince bu
 * panel oraya taşınabilir.
 *
 * Tasarım: renkler CSS değişkenlerinden (üç tema), satırlar mobilde iki
 * kademeye düşer — konu adları uzun ve yatay kaydırma istemiyoruz.
 */
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, ChevronDown, Repeat } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import { collectTopicLeaks, hasAnyLossTopics } from '../../utils/topicLeaks';
import { listCard, SOFT_SPRING, EASE_OUT_SOFT } from '../../utils/motion';

/** İlk açılışta gösterilen satır sayısı. */
const COLLAPSED_COUNT = 5;

export default function TopicLeakPanel({ examType = 'TYT' }) {
  const { trials } = useAppStore();
  const [showAll, setShowAll] = useState(false);

  const leaks = useMemo(
    () => collectTopicLeaks(trials, { examType }),
    [trials, examType]
  );

  const hasTrialsOfType = useMemo(
    () => (trials || []).some((t) => t?.type === examType),
    [trials, examType]
  );

  const anyTags = useMemo(
    () => hasAnyLossTopics((trials || []).filter((t) => t?.type === examType)),
    [trials, examType]
  );

  // Hiç deneme yoksa ExamList kendi boş durumunu gösteriyor; burada susalım
  if (!hasTrialsOfType) return null;

  // Deneme var ama konu etiketi girilmemiş → ne yapması gerektiğini söyle
  if (!anyTags) {
    return (
      <div className="card p-4 flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--bg-input)' }}
        >
          <Crosshair className="w-4 h-4" style={{ color: 'var(--text-subtle)' }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
            Konu bazlı kayıp analizi henüz boş
          </p>
          <p className="text-[11px] mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Deneme eklerken her dersin altındaki{' '}
            <span className="font-bold" style={{ color: 'var(--text-main)' }}>
              &quot;Kaybın geldiği konular&quot;
            </span>{' '}
            bölümünü işaretlersen, iki-üç deneme sonra hangi konunun sürekli net
            götürdüğünü burada görürsün. Sayı girmen gerekmiyor.
          </p>
        </div>
      </div>
    );
  }

  const maxLoss = leaks[0]?.weightedLoss || 1;
  const visible = showAll ? leaks : leaks.slice(0, COLLAPSED_COUNT);
  const hiddenCount = leaks.length - visible.length;

  return (
    <div className="card p-4 sm:p-5">
      {/* ── Başlık ── */}
      <div className="flex items-center gap-2.5 mb-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--accent-brand-light)' }}
        >
          <Crosshair className="w-4 h-4" style={{ color: 'var(--accent-brand)' }} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
            Kaybın Geldiği Konular
          </h3>
          <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {examType} denemelerinde işaretlediğin konular, ağırlıklı kayba göre sıralı
          </p>
        </div>
      </div>

      {/* ── Satırlar ── */}
      <div className="space-y-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((leak, i) => {
            const barPct = Math.max(4, Math.round((leak.weightedLoss / maxLoss) * 100));

            return (
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
                  borderColor: leak.isRepeat ? 'rgba(244,63,94,0.3)' : 'var(--border-card)',
                }}
              >
                {/* Üst satır: konu adı + tekrar rozeti + ağırlıklı kayıp */}
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
                      className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold"
                      style={{ backgroundColor: 'rgba(244,63,94,0.12)', color: '#f43f5e' }}
                      title={`${leak.subjectTrials} denemeden ${leak.flagCount}'inde işaretlendi`}
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
                    <span className="text-[9px] font-bold ml-0.5" style={{ color: 'var(--text-subtle)' }}>
                      net
                    </span>
                  </span>
                </div>

                {/* Alt satır: ders adı + kırılım + çubuk */}
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="text-[10px] font-semibold shrink-0"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    {leak.subjectLabel}
                  </span>
                  <span
                    className="text-[10px] font-bold tabular-nums shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    ~{leak.wrong.toFixed(0)}Y · {leak.blank.toFixed(0)}B
                  </span>

                  <div
                    className="flex-1 h-1 rounded-full overflow-hidden min-w-[32px]"
                    style={{ backgroundColor: 'var(--border-card)' }}
                  >
                    <motion.div
                      className="h-full rounded-full origin-left"
                      style={{
                        width: `${barPct}%`,
                        backgroundColor: leak.isRepeat ? '#f43f5e' : 'var(--accent-brand)',
                      }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        duration: 0.5,
                        ease: EASE_OUT_SOFT,
                        delay: Math.min(i * 0.05, 0.25),
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
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
            transition={{ duration: 0.24 }}
            className="flex"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.span>
        </button>
      )}

      <p className="text-[9px] mt-2.5 leading-relaxed" style={{ color: 'var(--text-subtle)' }}>
        Net değerleri yaklaşıktır: her dersin ölçülmüş yanlış/boşu, o denemede
        işaretlediğin konulara eşit bölünür. Yanlış 1.25, boş 1.00 ağırlıklıdır —
        yanlış daha çok net götürdüğü için.
      </p>
    </div>
  );
}
