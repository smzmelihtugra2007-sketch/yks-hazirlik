/**
 * ─── DENEME TESPİTLERİ (açılır detay kartı) ───
 *
 * Deneme kartına tıklanınca açılır. Yanlış/boş oranını net kazancı diline
 * çevirir (bkz. utils/examAnalysis.js).
 *
 * Tasarım notları:
 *  - Renkler CSS değişkenlerinden; durum renkleri (iyi/uyarı/kötü) her üç
 *    temada okunur tonlarda sabit tutuldu.
 *  - Üç metrik mobilde alt alta değil 3'lü ızgarada durur (kısa sayılar),
 *    ders tablosu ise mobilde yatay kaydırma yerine sıkıştırılmış satırlar
 *    kullanır — tablo mobilde taşmasın diye.
 */
import { motion } from 'framer-motion';
import { TrendingUp, AlertTriangle, Info, CheckCircle2, Target, Crosshair } from 'lucide-react';
import { getTrialFindings, BLANK_REASONS } from '../../utils/examAnalysis';
import { formatNet } from '../../utils/triage';
import { getTrialLossTopics } from '../../utils/topicLeaks';
import { collapsible, EASE_OUT_SOFT } from '../../utils/motion';

/** Tespit tonuna göre renk ve ikon. */
const TONES = {
  good: { color: '#10b981', Icon: CheckCircle2 },
  warn: { color: '#f59e0b', Icon: AlertTriangle },
  bad: { color: '#f43f5e', Icon: AlertTriangle },
  info: { color: '#38bdf8', Icon: Info },
};

const pct = (x) => (x === null || x === undefined ? '—' : `%${Math.round(x * 100)}`);

/** Tek metrik kutusu. */
function Metric({ label, value, hint, tone }) {
  return (
    <div
      className="rounded-xl p-2.5 text-center"
      style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-card)' }}
    >
      <div
        className="text-[9px] font-bold uppercase tracking-wider leading-tight"
        style={{ color: 'var(--text-subtle)' }}
      >
        {label}
      </div>
      <div
        className="text-base sm:text-lg font-extrabold tabular-nums mt-1 leading-none"
        style={{ color: tone || 'var(--text-main)' }}
      >
        {value}
      </div>
      {hint && (
        <div className="text-[9px] font-medium mt-0.5" style={{ color: 'var(--text-subtle)' }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export default function TrialFindings({ trial, previousTrials }) {
  const { analysis, findings } = getTrialFindings(trial, previousTrials);

  if (analysis.total === 0) {
    return (
      <div className="pt-3 text-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
        Bu denemede çözümlenecek veri yok.
      </div>
    );
  }

  // Ders tablosunda yalnızca anlamlı satırlar (en az 3 soru girilmiş)
  const rows = analysis.subjects
    .filter((s) => s.total >= 3)
    .sort((a, b) => b.netLostToWrong - a.netLostToWrong);

  // Bu denemede işaretlenen kayıp konuları (etiketlenmemişse boş dizi)
  const lossTopics = getTrialLossTopics(trial);

  return (
    <motion.div
      variants={collapsible}
      initial="initial"
      animate="animate"
      exit="exit"
      className="overflow-hidden"
    >
      <div
        className="mt-3 pt-3 space-y-3"
        style={{ borderTop: '1px solid var(--border-card)' }}
      >
        {/* ── Üç ana metrik ── */}
        <div className="grid grid-cols-3 gap-2">
          {/* "89/110" tek başına toplam soru sanılıyordu; paydanın
              İŞARETLENEN soru olduğu açıkça yazılıyor. */}
          <Metric
            label="İşaretli doğruluk"
            value={pct(analysis.markedAccuracy)}
            hint={`${analysis.answered} işaretlide ${analysis.correct}D`}
          />
          <Metric
            label="Boş oranı"
            value={pct(analysis.blankRate)}
            hint={`${analysis.total} soruda ${analysis.blank} boş`}
          />
          <Metric
            label="Yanlışın bedeli"
            value={`-${formatNet(analysis.netLostToWrong)}`}
            hint={`${analysis.wrong} yanlış × 0,25`}
            tone={analysis.netLostToWrong >= 2 ? '#f43f5e' : undefined}
          />
        </div>

        {/* ── Tespitler ── */}
        <div className="space-y-2">
          {findings.map((f, i) => {
            const { color, Icon } = TONES[f.tone] || TONES.info;
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05, ease: EASE_OUT_SOFT }}
                className="flex items-start gap-2.5 p-2.5 rounded-xl"
                style={{ backgroundColor: `${color}12`, border: `1px solid ${color}33` }}
              >
                <Icon className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} />
                <div className="min-w-0">
                  <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                    {f.title}
                  </p>
                  <p
                    className="text-[11px] leading-relaxed mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {f.body}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Ders bazında kırılım ── */}
        {rows.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Target className="w-3.5 h-3.5" style={{ color: 'var(--text-subtle)' }} />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-subtle)' }}
              >
                Ders bazında
              </span>
            </div>

            <div className="space-y-1">
              {rows.map((s) => (
                <div
                  key={s.code}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px]"
                  style={{ backgroundColor: 'var(--bg-input)' }}
                >
                  <span
                    className="font-bold truncate flex-1 min-w-0"
                    style={{ color: 'var(--text-main)' }}
                    title={s.label}
                  >
                    {s.label}
                  </span>

                  {/* Sayılar tabular; mobilde de hizalı kalsın */}
                  <span className="tabular-nums shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {s.correct}D {s.wrong}Y {s.blank}B
                  </span>
                  {/* Net her zaman payda ile: "5.00" 40 soruluk derste az,
                      5 soruluk derste tam puan demektir.
                      İki ondalık zorunlu: net 0.25'in katıdır, tek ondalık
                      24.25'i "24.3" yapıp imkânsız bir değer gösteriyordu. */}
                  <span
                    className="tabular-nums font-bold shrink-0 text-right"
                    style={{ color: 'var(--text-main)' }}
                  >
                    {formatNet(s.net)}
                    <span className="font-semibold" style={{ color: 'var(--text-subtle)' }}>
                      /{s.total}
                    </span>
                  </span>
                  {s.blankReason && BLANK_REASONS[s.blankReason] && (
                    <span
                      className="hidden sm:inline shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold"
                      style={{
                        backgroundColor: 'var(--accent-brand-light)',
                        color: 'var(--accent-brand)',
                      }}
                    >
                      {BLANK_REASONS[s.blankReason].short}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Kaybın geldiği konular ──
             Sayılar "~" ile: dersin ölçülmüş yanlış/boş sayısı, öğrencinin
             işaretlediği konu sayısına EŞİT bölüştürülüyor. Bölüştürülen
             miktar gerçek, bölen öğrencinin kendi beyanı; tek varsayım eşit
             dağılım ve bunu gizlemiyoruz (bkz. utils/topicLeaks.js). */}
        {lossTopics.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Crosshair className="w-3.5 h-3.5" style={{ color: 'var(--text-subtle)' }} />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--text-subtle)' }}
              >
                Kaybın geldiği konular
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {lossTopics.map((t) => (
                <span
                  key={`${t.examCode}-${t.key}`}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold border max-w-full"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-card)',
                    color: 'var(--text-main)',
                  }}
                  title={`${t.subjectLabel} — ${t.topic}`}
                >
                  <span className="truncate">{t.topic}</span>
                  <span
                    className="shrink-0 tabular-nums font-extrabold"
                    style={{ color: 'var(--text-subtle)' }}
                  >
                    ~{t.wrong.toFixed(0)}Y {t.blank.toFixed(0)}B
                  </span>
                </span>
              ))}
            </div>

            <p className="text-[9px] mt-1.5" style={{ color: 'var(--text-subtle)' }}>
              Sayılar yaklaşık: dersin yanlış/boşu işaretlediğin konulara eşit bölündü.
            </p>
          </div>
        )}

        {/* ── Başabaş hatırlatması ── */}
        <p
          className="flex items-start gap-1.5 text-[10px] leading-relaxed"
          style={{ color: 'var(--text-subtle)' }}
        >
          <TrendingUp className="w-3 h-3 shrink-0 mt-0.5" />
          <span>
            4 yanlış 1 doğruyu götürür. Bir soruda iki seçeneği eleyebiliyorsan
            işaretlemek net kazandırır; tamamen rastgele işaretlemek ise sıfır kârlıdır.
          </span>
        </p>
      </div>
    </motion.div>
  );
}
