/**
 * ─── KARNEMİ PAYLAŞ — Instagram Hikaye Kartı ───
 *
 * Kart, tam olarak 1080 × 1920 px (9:16) boyutunda kurulur ve o ölçüde
 * dışa aktarılır; Instagram'ın hikaye çözünürlüğüyle birebir örtüştüğü için
 * yüklerken yeniden ölçeklenmez, yazılar net kalır.
 *
 * Tasarım kararları:
 *  - Tipografi tek ailede (Inter) ve gerçek bir hiyerarşide kurulur:
 *    tek bir kahraman sayı, onu destekleyen orta ölçekli metrikler, en altta
 *    ince künye. Hikayede telefon boyunda okunabilmesi için en küçük metin
 *    22px'tir (eski kartta 8px vardı).
 *  - Tek vurgu rengi (indigo) kullanılır; ders çubukları da aynı rengin
 *    azalan opaklıklarıdır. Çok renkli palet "şablon" hissi veriyordu.
 *  - Süs amaçlı sahte teknik detaylar (monospace her yerde, köşeli parantezli
 *    rozetler, anlamsız "SHA256" satırı) tamamen kaldırıldı.
 *
 * Önizleme, kartın kendisine transform uygulamadan, bir üst sarmalayıcıyı
 * ölçekleyerek gösterilir — böylece html-to-image her zaman 1:1 yakalar.
 */
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toPng } from 'html-to-image';
import { X, Download, Share2, Loader2 } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { useStreak } from '../hooks/useStreak';
import { calcNet, calcTotalNet } from '../utils/triage';
import { simulateYKS } from '../utils/calculateScore';
import { TRACKS } from '../data/mockData';

/** Hikaye formatı — Instagram'ın tam çözünürlüğü. */
const CARD_W = 1080;
const CARD_H = 1920;

const FONT_STACK = "'Inter Variable', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

/** Renk paleti — tek vurgu rengi, üç kademe metin. */
const C = {
  bg: '#0A0A0C',
  surface: 'rgba(255,255,255,0.035)',
  border: 'rgba(255,255,255,0.07)',
  text: '#FAFAFA',
  muted: '#A1A1AA',
  faint: '#52525B',
  accent: '#818CF8',
  accentSoft: 'rgba(99,102,241,0.14)',
  accentEdge: 'rgba(99,102,241,0.30)',
};

// ─── Kısa ders isimleri — ÇALIŞMA dersi kimliğine göre (subjects.js) ───
// Haftalık dağılım SEANSLARDAN geliyor, seanslar da çalışma dersi taşıyor.
// Bu tablo eskiden deneme kodlarıyla anahtarlıydı ama seanslar ders ADIYLA
// ("TYT Temel Matematik") aranıyordu — hiçbir zaman eşleşmiyor, kartta hep
// uzun ad çıkıyordu ("AYT Tarih-2 / Coğrafya-2 / Felsefe Grubu" 1080px'lik
// kartta taşıyordu). Artık `subjectId` ile aranıyor.
const SHORT_LABELS = {
  TYT_TUR: 'Türkçe',   TYT_MAT: 'T. Matematik', TYT_GEO: 'T. Geometri',
  TYT_FIZ: 'Fizik',    TYT_KIM: 'Kimya',        TYT_BIY: 'Biyoloji',
  TYT_TAR: 'Tarih',    TYT_COG: 'Coğrafya',     TYT_FEL: 'Felsefe & Din',
  AYT_MAT: 'AYT Matematik', AYT_GEO: 'AYT Geometri', AYT_FIZ: 'AYT Fizik',
  AYT_KIM: 'AYT Kimya',     AYT_BIY: 'AYT Biyoloji', AYT_EDEB: 'Edebiyat',
  AYT_TAR1: 'Tarih-1 / Coğ-1', AYT_TAR2: 'Tarih-2 / Coğ-2', AYT_DIN: 'AYT Din',
  AYT_YDL: 'Yabancı Dil',
};

/** Ders çubukları: tek rengin azalan opaklıkları — çok renkli palet yerine. */
const BAR_OPACITY = [1, 0.7, 0.48, 0.32];

function fmtNum(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('tr-TR');
}

function fmtRank(n) {
  if (!n || n <= 0) return '—';
  return Number(n).toLocaleString('tr-TR');
}

function fmtShortMin(min) {
  if (!min || min <= 0) return '0 dk';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

export default function ShareCardModal({ isOpen, onClose }) {
  const {
    userName, studySessions, trials,
    selectedTrack, showAyt, obpScore, targetRank,
  } = useAppStore();

  // Seri seans geçmişinden türetilir — paylaşılan kart her zaman doğru olmalı
  const { current: studyStreak } = useStreak();

  const [isGenerating, setIsGenerating] = useState(false);

  // ─── Önizleme ölçeği ───
  // Kart 1080×1920 olarak kurulduğu için ekrana sığdırmak gerekiyor. Ölçek
  // yalnızca ÖNİZLEME sarmalayıcısına uygulanır; kart düğümünün kendisi
  // dokunulmadan kalır ki dışa aktarım tam çözünürlükte olsun.
  const [scale, setScale] = useState(0.26);

  useEffect(() => {
    if (!isOpen) return undefined;

    const compute = () => {
      const maxW = Math.min(window.innerWidth - 48, 400);
      const maxH = window.innerHeight - 190; // üst bar + butonlar + boşluklar
      setScale(Math.min(maxW / CARD_W, maxH / CARD_H));
    };

    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [isOpen]);

  // ─── Metrikler ───
  const totalFocusMinutes = useMemo(
    () => (studySessions || []).reduce((s, x) => s + (Number(x.durationMinutes) || 0), 0),
    [studySessions]
  );

  const focusHours = Math.floor(totalFocusMinutes / 60);
  const focusMins = totalFocusMinutes % 60;

  const totalTrials = (trials || []).length;

  // En yüksek net GERÇEK bir denemenin netidir, yani 0.25'in katıdır.
  // Tek ondalığa yuvarlamak 24.25'i "24,3" yapıp imkânsız bir net gösteriyordu.
  // (Ortalama aşağıda tek ondalıkta kalıyor — o zaten 0.25'in katı değil.)
  const peakTytNet = useMemo(() => {
    const t = (trials || []).filter((x) => x.type === 'TYT');
    return t.length ? Math.max(...t.map((x) => +calcTotalNet(x.results).toFixed(2))) : 0;
  }, [trials]);

  const peakAytNet = useMemo(() => {
    const t = (trials || []).filter((x) => x.type === 'AYT');
    return t.length ? Math.max(...t.map((x) => +calcTotalNet(x.results).toFixed(2))) : 0;
  }, [trials]);

  const avgTytNet = useMemo(() => {
    const t = (trials || []).filter((x) => x.type === 'TYT');
    if (!t.length) return 0;
    const sum = t.reduce((acc, x) => acc + calcTotalNet(x.results), 0);
    return +(sum / t.length).toFixed(1);
  }, [trials]);

  // ─── Haftalık ders dağılımı (ilk 4) ───
  const weeklySubjects = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 6);
    const cutoff = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    // Gruplama ADA göre (eski seanslarda subjectId olmayabilir), kısa ad
    // ise o grubun subjectId'sinden bulunur
    const map = {};
    for (const s of (studySessions || []).filter((s) => s.date >= cutoff)) {
      const k = s.subject || 'Diğer';
      if (!map[k]) map[k] = { minutes: 0, subjectId: s.subjectId || null };
      map[k].minutes += Number(s.durationMinutes) || 0;
      if (!map[k].subjectId && s.subjectId) map[k].subjectId = s.subjectId;
    }
    return Object.entries(map)
      .sort((a, b) => b[1].minutes - a[1].minutes)
      .slice(0, 4)
      .map(([subj, { minutes, subjectId }], i) => ({
        label: SHORT_LABELS[subjectId] || subj,
        minutes,
        opacity: BAR_OPACITY[i] ?? 0.3,
      }));
  }, [studySessions]);

  const maxWeeklyMin = Math.max(...weeklySubjects.map((s) => s.minutes), 1);

  // ─── Son deneme netleri (simülasyon girdisi) ───
  const { tytNets, aytNets } = useMemo(() => {
    const lastTyt = (trials || []).filter((t) => t.type === 'TYT')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const lastAyt = (trials || []).filter((t) => t.type === 'AYT')
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const r = lastTyt?.results || {};
    const a = lastAyt?.results || {};
    return {
      tytNets: { tur: calcNet(r.TYT_TUR), mat: calcNet(r.TYT_MAT), fiz: calcNet(r.TYT_FIZ),
                 kim: calcNet(r.TYT_KIM), biy: calcNet(r.TYT_BIY), tar: calcNet(r.TYT_TAR),
                 cog: calcNet(r.TYT_COG), fel: calcNet(r.TYT_FEL), din: calcNet(r.TYT_DIN) },
      aytNets: { mat: calcNet(a.AYT_MAT), fiz: calcNet(a.AYT_FIZ), kim: calcNet(a.AYT_KIM),
                 biy: calcNet(a.AYT_BIY), edeb: calcNet(a.AYT_EDEB), tar1: calcNet(a.AYT_TAR1),
                 cog1: calcNet(a.AYT_COG1), tar2: calcNet(a.AYT_TAR2), cog2: calcNet(a.AYT_COG2),
                 fel: calcNet(a.AYT_FEL), din: calcNet(a.AYT_DIN), ydl: calcNet(a.AYT_YDL) },
    };
  }, [trials]);

  // ─── 4 yıllık ÖSYM simülasyonu ───
  const simResults = useMemo(() => {
    const base = { track: selectedTrack, showAyt, obpScore: obpScore ?? 85, tytNets, aytNets, targetRank };
    return {
      2023: simulateYKS({ ...base, year: '2023' }),
      2024: simulateYKS({ ...base, year: '2024' }),
      2025: simulateYKS({ ...base, year: '2025' }),
      2026: simulateYKS({ ...base, year: '2026' }),
    };
  }, [selectedTrack, showAyt, obpScore, tytNets, aytNets, targetRank]);

  const firstName = (userName || 'Öğrenci').split(' ')[0];
  const trackLabel = TRACKS[selectedTrack]?.label || '';
  const todayStr = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  // ─── PNG yakala (tam 1080×1920) ───
  const capture = async () => {
    const node = document.getElementById('share-card-node');
    if (!node) return null;
    await document.fonts.ready;
    return toPng(node, {
      width: CARD_W,
      height: CARD_H,
      pixelRatio: 1, // Düğüm zaten 1080×1920 kurulu; 1:1 yakalanır
      cacheBust: true,
    });
  };

  const fileName = `yks-karnem-${new Date().toISOString().slice(0, 10)}.png`;

  const handleDownload = async () => {
    try {
      setIsGenerating(true);
      const url = await capture();
      if (!url) return;
      const a = document.createElement('a');
      a.download = fileName;
      a.href = url;
      a.click();
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  const handleShare = async () => {
    try {
      setIsGenerating(true);
      const url = await capture();
      if (!url) return;
      if (navigator.share && navigator.canShare) {
        const blob = await (await fetch(url)).blob();
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'YKS Çalışma Karnem' });
          return;
        }
      }
      const a = document.createElement('a');
      a.download = fileName;
      a.href = url;
      a.click();
    } catch (e) { if (e.name !== 'AbortError') console.error(e); } finally { setIsGenerating(false); }
  };

  if (typeof document === 'undefined') return null;

  // 2×2 metrik seti — AYT kapalıysa dördüncü kutu hedef sıralamaya döner
  const statCells = [
    { label: 'Çözülen Deneme', value: totalTrials > 0 ? fmtNum(totalTrials) : '—' },
    { label: 'TYT Ortalama', value: avgTytNet > 0 ? fmtNum(avgTytNet) : '—' },
    { label: 'En Yüksek TYT', value: peakTytNet > 0 ? fmtNum(peakTytNet) : '—', accent: true },
    showAyt
      ? { label: 'En Yüksek AYT', value: peakAytNet > 0 ? fmtNum(peakAytNet) : '—', accent: true }
      : { label: 'Hedef Sıralama', value: fmtRank(targetRank), accent: true },
  ];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="relative z-10 flex flex-col gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Üst bar */}
            <div className="flex items-center justify-between">
              <span className="text-white/45 text-[11px] font-semibold tracking-[0.16em] uppercase">
                Hikaye Formatı · 1080 × 1920
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Kapat"
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-white/50 hover:text-white transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ── Önizleme: yalnızca sarmalayıcı ölçeklenir ── */}
            <div
              style={{
                width: CARD_W * scale,
                height: CARD_H * scale,
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 20,
                boxShadow: '0 30px 60px rgba(0,0,0,0.6)',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }}>

                {/* ══════════════════════════════════════════════
                    DIŞA AKTARILAN KART — #share-card-node
                    Tailwind html-to-image'da çalışmadığı için
                    tüm stiller inline.
                ══════════════════════════════════════════════ */}
                <div
                  id="share-card-node"
                  style={{
                    width: CARD_W,
                    height: CARD_H,
                    background: C.bg,
                    position: 'relative',
                    overflow: 'hidden',
                    fontFamily: FONT_STACK,
                  }}
                >
                  {/* Zemin ışıkları — derinlik için, desen/filigran yok */}
                  <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'radial-gradient(900px 720px at 82% -6%, rgba(99,102,241,0.20), transparent 62%)',
                  }} />
                  <div style={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'radial-gradient(760px 620px at 6% 104%, rgba(16,185,129,0.10), transparent 60%)',
                  }} />

                  <div style={{
                    position: 'relative',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '92px 80px 80px',
                    boxSizing: 'border-box',
                  }}>

                    {/* ── 1. KÜNYE SATIRI ── */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '0.18em', color: C.faint, textTransform: 'uppercase' }}>
                        YKS Hazırlık
                      </span>
                      <span style={{ fontSize: 24, fontWeight: 500, color: C.faint }}>
                        {todayStr}
                      </span>
                    </div>

                    {/* ── 2. BAŞLIK ── */}
                    <div style={{ marginTop: 76 }}>
                      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '0.22em', color: C.accent, textTransform: 'uppercase' }}>
                        Çalışma Karnesi
                      </div>
                      <div style={{ fontSize: 88, fontWeight: 700, color: C.text, letterSpacing: '-0.035em', lineHeight: 1.05, marginTop: 14 }}>
                        {firstName}
                      </div>

                      {studyStreak > 0 && (
                        <div style={{
                          marginTop: 26,
                          display: 'inline-flex', alignItems: 'center', gap: 13,
                          padding: '13px 24px',
                          borderRadius: 999,
                          background: C.accentSoft,
                          border: `1px solid ${C.accentEdge}`,
                        }}>
                          <div style={{ width: 11, height: 11, borderRadius: '50%', background: C.accent }} />
                          <span style={{ fontSize: 27, fontWeight: 600, color: C.accent }}>
                            {studyStreak} günlük seri
                          </span>
                        </div>
                      )}
                    </div>

                    {/* ── 3. KAHRAMAN METRİK: TOPLAM ODAK ── */}
                    <div style={{
                      marginTop: 60,
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 28,
                      padding: '40px 44px 44px',
                    }}>
                      <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: '0.17em', color: C.faint, textTransform: 'uppercase' }}>
                        Toplam Odak Süresi
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 20 }}>
                        <span style={{ fontSize: 152, fontWeight: 700, color: C.text, letterSpacing: '-0.05em', lineHeight: 0.88, fontVariantNumeric: 'tabular-nums' }}>
                          {focusHours}
                        </span>
                        <span style={{ fontSize: 46, fontWeight: 600, color: C.muted }}>saat</span>
                        {focusMins > 0 && (
                          <span style={{ fontSize: 46, fontWeight: 500, color: C.faint, fontVariantNumeric: 'tabular-nums' }}>
                            {focusMins} dk
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── 4. DESTEK METRİKLER (2×2) ── */}
                    <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      {statCells.map((cell) => (
                        <StatCell key={cell.label} label={cell.label} value={cell.value} accent={cell.accent} />
                      ))}
                    </div>

                    {/* ── 5. HAFTALIK DAĞILIM ── */}
                    <div style={{ marginTop: 56 }}>
                      <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: '0.17em', color: C.faint, textTransform: 'uppercase' }}>
                        Bu Hafta
                      </div>

                      {weeklySubjects.length === 0 ? (
                        <div style={{ fontSize: 30, fontWeight: 500, color: C.faint, marginTop: 26 }}>
                          Bu hafta kayıtlı seans yok
                        </div>
                      ) : (
                        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 24 }}>
                          {weeklySubjects.map((s) => (
                            <div key={s.label}>
                              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 11 }}>
                                <span style={{ fontSize: 30, fontWeight: 600, color: C.text }}>{s.label}</span>
                                <span style={{ fontSize: 27, fontWeight: 500, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
                                  {fmtShortMin(s.minutes)}
                                </span>
                              </div>
                              <div style={{ height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  borderRadius: 999,
                                  width: `${Math.max(6, Math.round((s.minutes / maxWeeklyMin) * 100))}%`,
                                  background: C.accent,
                                  opacity: s.opacity,
                                }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Esnek boşluk — alt blok her zaman kartın dibine yaslanır */}
                    <div style={{ flex: 1, minHeight: 40 }} />

                    {/* ── 6. ÖSYM SIRALAMA SİMÜLASYONU ── */}
                    <div>
                      <div style={{ fontSize: 23, fontWeight: 700, letterSpacing: '0.17em', color: C.faint, textTransform: 'uppercase' }}>
                        Sıralama Simülasyonu
                      </div>
                      <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                        {[2023, 2024, 2025, 2026].map((yr) => {
                          const isCurrent = yr === 2026;
                          return (
                            <div
                              key={yr}
                              style={{
                                background: isCurrent ? C.accentSoft : C.surface,
                                border: `1px solid ${isCurrent ? C.accentEdge : C.border}`,
                                borderRadius: 18,
                                padding: '20px 10px 22px',
                                textAlign: 'center',
                              }}
                            >
                              <div style={{ fontSize: 22, fontWeight: 600, color: isCurrent ? C.accent : C.faint, letterSpacing: '0.04em' }}>
                                {yr}
                              </div>
                              <div style={{
                                fontSize: 34, fontWeight: 700, marginTop: 10,
                                color: isCurrent ? C.text : C.muted,
                                letterSpacing: '-0.02em',
                                fontVariantNumeric: 'tabular-nums',
                              }}>
                                {fmtRank(simResults[yr]?.estimatedRank)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── 7. ALT KÜNYE ── */}
                    <div style={{
                      marginTop: 40,
                      paddingTop: 30,
                      borderTop: `1px solid ${C.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: 23, fontWeight: 600, color: C.faint }}>
                        {trackLabel ? `${trackLabel} · ${showAyt ? 'TYT + AYT' : 'Sadece TYT'}` : 'YKS Hazırlık'}
                      </span>
                      <span style={{ fontSize: 23, fontWeight: 600, color: C.faint, letterSpacing: '0.04em' }}>
                        ykshazirlik
                      </span>
                    </div>

                  </div>
                </div>
              </div>
            </div>

            {/* Eylem butonları */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 text-white text-xs font-bold tracking-wide transition-colors"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isGenerating ? 'Hazırlanıyor…' : 'PNG İndir'}</span>
              </button>
              <button
                type="button"
                onClick={handleShare}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 disabled:opacity-50 text-indigo-300 text-xs font-bold tracking-wide transition-colors"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                <span>Paylaş</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Destek metrik kutusu — kahraman sayının altındaki 2×2 ızgara. */
function StatCell({ label, value, accent }) {
  return (
    <div style={{
      background: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 22,
      padding: '28px 30px 30px',
    }}>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '0.12em', color: C.faint, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        fontSize: 56,
        fontWeight: 700,
        marginTop: 14,
        color: accent ? C.accent : C.text,
        letterSpacing: '-0.035em',
        lineHeight: 1,
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
    </div>
  );
}
