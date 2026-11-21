/**
 * ─── DASHBOARD (Genel Bakış) ───
 *
 * Bileşenler:
 *  - YKS Geri Sayım Aracı (19 Haziran 2027 UTC+3, Merkezi & Şık Hizalama)
 *  - 4'lü Dinamik StatCard Izgarası (Bugünkü Odak: Dünün dakikasıyla karşılaştırmalı trend)
 *  - GitHub Stili Yıllık Aktivite Isı Haritası (Heatmap)
 *  - TYT Net Gelişim Grafiği (Kronolojik Eskiden Yeniye Gerçek Tarih Sıralaması)
 *  - AYT Net Gelişim Grafiği (showAyt true ise)
 *  - Gelişmiş Tüm Alanlar YKS Simülasyon Kartı (SAY, EA, SÖZ, DİL, TYT)
 */
import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Trophy,
  FileText,
  Target,
  AlertTriangle,
  Clock,
  Sparkles,
  Flame,
  Share2,
} from 'lucide-react';
import StatCard from '../ui/StatCard';
import Heatmap from '../ui/Heatmap';
import ShareCardModal from '../ShareCardModal';
import QuickStartCard from '../ui/QuickStartCard';
import StreakNotice from '../ui/StreakNotice';
import useAppStore from '../../store/useAppStore';
import { SUBJECT_LABELS } from '../../data/mockData';
import { triageTopics, calcTotalNet, calcNet } from '../../utils/triage';
import { simulateYKS } from '../../utils/calculateScore';

// ─── Sayfa animasyonu ───
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

// ─── YKS Tarihi: 19 Haziran 2027, 10:15 Türkiye saati (UTC+3) ───
const YKS_TARGET_DATE = new Date('2027-06-19T10:15:00+03:00').getTime();

function calculateTimeLeft(targetMs) {
  const diff = Math.max(0, targetMs - Date.now());
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    isFinished: diff <= 0,
  };
}

function useCountdown(targetMs) {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(targetMs));

  useEffect(() => {
    if (timeLeft.isFinished) return;
    const id = setInterval(() => setTimeLeft(calculateTimeLeft(targetMs)), 1000);
    return () => clearInterval(id);
  }, [targetMs, timeLeft.isFinished]);

  return timeLeft;
}

// ─── Süre Formatlayıcı ───
function formatDuration(totalMins) {
  if (!totalMins || totalMins === 0) return '0 dk';
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs > 0 && mins > 0) return `${hrs}s ${mins}dk`;
  if (hrs > 0) return `${hrs} saat`;
  return `${mins} dk`;
}

// ─── Geri Sayım Kartı (Merkezi & Derli Toplu Hizalama) ───
function CountdownBanner() {
  const { days, hours, minutes, seconds } = useCountdown(YKS_TARGET_DATE);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl p-5 sm:p-6 shadow-card transition-colors duration-200 border bg-gradient-to-r from-blue-50/90 via-indigo-50/80 to-purple-50/90 border-indigo-100 text-slate-900 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/70 dark:border-slate-700/60 dark:text-white [html.theme-sepia_&]:from-[#241a13] [html.theme-sepia_&]:via-[#1e150f] [html.theme-sepia_&]:to-[#17100b] [html.theme-sepia_&]:border-[#453225] [html.theme-sepia_&]:text-amber-100"
    >
      {/* Arka plan dekoratif daireler */}
      <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
      <div className="absolute left-1/4 -top-10 w-32 h-32 rounded-full bg-indigo-400/10 blur-xl pointer-events-none" />

      {/* Merkezi & Derli Toplu Kapsayıcı */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center gap-5 md:gap-10 lg:gap-14 w-full">
        {/* Sol Metin Bilgisi */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 text-center sm:text-left">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border bg-white border-indigo-100 text-indigo-600 dark:bg-white/10 dark:border-white/20 dark:text-indigo-300 [html.theme-sepia_&]:bg-[#2e221a] [html.theme-sepia_&]:border-[#453225] [html.theme-sepia_&]:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h2 className="text-base lg:text-lg font-extrabold tracking-tight text-slate-900 dark:text-white [html.theme-sepia_&]:text-amber-100">
                YKS 2027 Geri Sayım
              </h2>
              <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border bg-indigo-100/80 border-indigo-200 text-indigo-700 dark:bg-indigo-500/25 dark:border-indigo-400/30 dark:text-indigo-200 [html.theme-sepia_&]:bg-amber-500/20 [html.theme-sepia_&]:border-amber-500/40 [html.theme-sepia_&]:text-amber-300">
                <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-300" /> 19 Haziran 2027
              </span>
            </div>
            <p className="text-xs mt-0.5 font-medium text-slate-600 dark:text-slate-300 [html.theme-sepia_&]:text-[#c2ab99]">
              Hedefine ulaşmak için her gün bir adım daha yaklaş!
            </p>
          </div>
        </div>

        {/* Sayaç Kutuları */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 shrink-0">
          <CountdownUnit value={days} label="GÜN" />
          <span className="font-extrabold text-lg -mt-3 text-indigo-400 dark:text-indigo-400 [html.theme-sepia_&]:text-amber-500">:</span>
          <CountdownUnit value={hours} label="SAAT" />
          <span className="font-extrabold text-lg -mt-3 text-indigo-400 dark:text-indigo-400 [html.theme-sepia_&]:text-amber-500">:</span>
          <CountdownUnit value={minutes} label="DAKİKA" />
          <span className="font-extrabold text-lg -mt-3 text-indigo-400 dark:text-indigo-400 [html.theme-sepia_&]:text-amber-500">:</span>
          <CountdownUnit value={seconds} label="SANİYE" />
        </div>
      </div>
    </motion.div>
  );
}

function CountdownUnit({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="min-w-[50px] sm:min-w-[58px] px-2.5 py-1.5 rounded-xl border text-center shadow-sm transition-colors bg-white border-indigo-200/90 text-slate-900 dark:bg-slate-800/90 dark:border-slate-700/80 dark:text-white [html.theme-sepia_&]:bg-[#2c2018] [html.theme-sepia_&]:border-[#453225] [html.theme-sepia_&]:text-amber-100">
        <span className="text-lg sm:text-xl font-extrabold tracking-tight tabular-nums">
          {String(value).padStart(2, '0')}
        </span>
      </div>
      <span className="text-[9px] font-extrabold tracking-wider mt-1 text-indigo-600 dark:text-indigo-300 [html.theme-sepia_&]:text-amber-400">
        {label}
      </span>
    </div>
  );
}

// ─── Hesaplamalar (Gerçek Tarih Bazlı: new Date(date).getTime()) ───

function getLatestTrial(trials, type) {
  const filtered = (trials || [])
    .filter((t) => t.type === type)
    .sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  if (filtered.length === 0) return { net: 0, name: '—' };

  const latest = filtered[0];
  const totalNet = calcTotalNet(latest.results);
  return { net: totalNet.toFixed(2), name: latest.name, date: latest.date };
}

function getNetTrend(trials, type) {
  const filtered = (trials || [])
    .filter((t) => t.type === type)
    .sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      if (timeB !== timeA) return timeB - timeA;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

  if (filtered.length < 2) return { direction: 'neutral', diff: '—' };

  const current = calcTotalNet(filtered[0].results);
  const previous = calcTotalNet(filtered[1].results);
  const diff = current - previous;

  return {
    direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
    diff: `${diff > 0 ? '+' : ''}${diff.toFixed(2)} net`,
  };
}

function getMostUrgentTopic(tytTopics, aytTopics, trials, showAyt) {
  const triaged = [
    ...triageTopics(tytTopics, trials, 'TYT'),
    // AYT konularını yalnızca AYT planı etkinse dahil et
    ...(showAyt ? triageTopics(aytTopics, trials, 'AYT') : []),
  ].filter((t) => !t.isCompleted)
   .sort((a, b) => b.urgencyScore - a.urgencyScore);

  if (triaged.length === 0) return { name: '—', score: 0, subject: '' };
  const top = triaged[0];
  return {
    name: top.name,
    score: top.urgencyScore,
    subject: SUBJECT_LABELS[top.subject] || top.subject,
    level: top.urgencyLevel,
  };
}

// ─── Grafik Verisi Oluşturma (Kronolojik Eskiden Yeniye Sıralama) ───
function buildChartData(trials, type) {
  return (trials || [])
    .filter((t) => t.type === type)
    .sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.createdAt || 0) - (b.createdAt || 0);
    })
    .map((trial, index) => {
      const dateFormatted = new Date(trial.date).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short',
      });

      // Her nokta için benzersiz X ekseni tanımlayıcısı
      const chartKey = `${trial.id || `pt_${index}`}`;

      return {
        id: chartKey,
        key: chartKey,
        chartKey: chartKey,
        displayDate: dateFormatted,
        rawDate: trial.date,
        createdAt: trial.createdAt || Date.now(),
        name: trial.name || `${type} Denemesi`,
        type: trial.type,
        net: +calcTotalNet(trial.results).toFixed(2),
      };
    });
}

// ─── Özel Tooltip Bileşeni ───
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  if (!data) return null;

  return (
    <div
      className="rounded-xl shadow-card-lg px-4 py-3 border"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-card)',
        color: 'var(--text-main)',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <p className="text-xs font-bold truncate max-w-[160px]" style={{ color: 'var(--text-main)' }}>
          {data.name}
        </p>
        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-500">
          {data.type}
        </span>
      </div>

      <p className="text-xl font-black tracking-tight" style={{ color: 'var(--text-main)' }}>
        {data.net}{' '}
        <span className="text-xs font-semibold" style={{ color: 'var(--text-subtle)' }}>
          net
        </span>
      </p>

      <p className="text-[11px] font-medium mt-1" style={{ color: 'var(--text-muted)' }}>
        📅 {new Date(data.rawDate || data.createdAt).toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </p>
    </div>
  );
}

// ─── Tekrar Kullanılabilir Grafik Kartı ───
function NetChart({ title, subtitle, data, gradientId, strokeColor }) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-6 flex flex-col items-center justify-center text-center">
        <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-main)' }}>{title}</h2>
        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
          Bu alan için henüz deneme kaydı girilmedi.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: 'easeOut' }}
      className="card p-5 lg:p-6 shadow-card"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>{title}</h2>
          <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: strokeColor }}
          />
          <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Toplam Net</span>
        </div>
      </div>

      <div className="w-full h-64 lg:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
                <stop offset="95%" stopColor={strokeColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#64748b"
              strokeOpacity={0.25}
              vertical={false}
            />

            <XAxis
              dataKey="chartKey"
              tickFormatter={(chartKey) => {
                const item = data.find((d) => d.chartKey === chartKey);
                return item ? item.displayDate : '';
              }}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: "'Inter Variable', Inter, system-ui" }}
              dy={8}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#94a3b8', fontFamily: "'Inter Variable', Inter, system-ui" }}
              dx={-4}
              domain={['dataMin - 5', 'dataMax + 5']}
            />

            <Tooltip
              content={<ChartTooltip />}
              cursor={{
                stroke: strokeColor,
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            <Area
              type="monotone"
              dataKey="net"
              stroke={strokeColor}
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={{
                r: 4,
                fill: '#ffffff',
                stroke: strokeColor,
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: strokeColor,
                stroke: '#ffffff',
                strokeWidth: 3,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ─── Dashboard Bileşeni ───
export default function Dashboard() {
  const {
    userName,
    targetRank,
    obpScore,
    selectedTrack,
    showAyt,
    trials,
    tytTopics,
    aytTopics,
    studySessions,
    simYear = '2026',
    setSimYear,
  } = useAppStore();

  const [showShareCard, setShowShareCard] = useState(false);

  // Hesaplamalar (Memoized & Gerçek Tarih Sıralı)
  const latestTyt = useMemo(() => getLatestTrial(trials, 'TYT'), [trials]);
  const latestAyt = useMemo(() => getLatestTrial(trials, 'AYT'), [trials]);
  const tytTrend = useMemo(() => getNetTrend(trials, 'TYT'), [trials]);
  const aytTrend = useMemo(() => getNetTrend(trials, 'AYT'), [trials]);
  const urgentTopic = useMemo(
    () => getMostUrgentTopic(tytTopics, aytTopics, trials, showAyt),
    [tytTopics, aytTopics, trials, showAyt]
  );
  const tytChartData = useMemo(() => buildChartData(trials, 'TYT'), [trials]);
  const aytChartData = useMemo(() => buildChartData(trials, 'AYT'), [trials]);

  // ─── Bugünkü ve Dünkü Odak Dakikası Farkı (Trend Rozeti) ───
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const todayTotalMinutes = useMemo(
    () => (studySessions || [])
      .filter((s) => s.date === todayStr)
      .reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0),
    [studySessions, todayStr]
  );

  const yesterdayTotalMinutes = useMemo(
    () => (studySessions || [])
      .filter((s) => s.date === yesterdayStr)
      .reduce((sum, s) => sum + (Number(s.durationMinutes) || 0), 0),
    [studySessions, yesterdayStr]
  );

  const diffMinutes = todayTotalMinutes - yesterdayTotalMinutes;
  const focusTrendDirection = diffMinutes > 0 ? 'up' : diffMinutes < 0 ? 'down' : 'neutral';
  const focusTrendBadgeText = diffMinutes > 0
    ? `+${diffMinutes} dk`
    : diffMinutes < 0
    ? `-${Math.abs(diffMinutes)} dk`
    : '0 dk';

  // ─── YKS Simülasyon Hesaplaması (Gerçek Tarihe Göre Son Denemeler & 2026 Desteği) ───
  const simResult = useMemo(() => {
    const lastTyt = (trials || [])
      .filter((t) => t.type === 'TYT')
      .sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      })[0];

    const lastAyt = (trials || [])
      .filter((t) => t.type === 'AYT')
      .sort((a, b) => {
        const timeA = a.date ? new Date(a.date).getTime() : 0;
        const timeB = b.date ? new Date(b.date).getTime() : 0;
        if (timeB !== timeA) return timeB - timeA;
        return (b.createdAt || 0) - (a.createdAt || 0);
      })[0];

    const tytNets = lastTyt
      ? {
          tur: calcNet(lastTyt.results?.TYT_TUR),
          mat: calcNet(lastTyt.results?.TYT_MAT),
          fiz: calcNet(lastTyt.results?.TYT_FIZ),
          kim: calcNet(lastTyt.results?.TYT_KIM),
          biy: calcNet(lastTyt.results?.TYT_BIY),
          tar: calcNet(lastTyt.results?.TYT_TAR),
          cog: calcNet(lastTyt.results?.TYT_COG),
          fel: calcNet(lastTyt.results?.TYT_FEL),
          din: calcNet(lastTyt.results?.TYT_DIN),
        }
      : {};

    const aytNets = lastAyt
      ? {
          mat:  calcNet(lastAyt.results?.AYT_MAT),
          fiz:  calcNet(lastAyt.results?.AYT_FIZ),
          kim:  calcNet(lastAyt.results?.AYT_KIM),
          biy:  calcNet(lastAyt.results?.AYT_BIY),
          edeb: calcNet(lastAyt.results?.AYT_EDEB),
          tar1: calcNet(lastAyt.results?.AYT_TAR1),
          cog1: calcNet(lastAyt.results?.AYT_COG1),
          tar2: calcNet(lastAyt.results?.AYT_TAR2),
          cog2: calcNet(lastAyt.results?.AYT_COG2),
          fel:  calcNet(lastAyt.results?.AYT_FEL),
          din:  calcNet(lastAyt.results?.AYT_DIN),
          ydl:  calcNet(lastAyt.results?.AYT_YDL),
        }
      : {};

    return simulateYKS({
      track: selectedTrack,
      showAyt: showAyt,
      obpScore: obpScore ?? 85,
      tytNets,
      aytNets,
      targetRank,
      year: simYear,
    });
  }, [trials, selectedTrack, showAyt, obpScore, targetRank, simYear]);

  const firstName = (userName || 'Öğrenci').split(' ')[0];

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6 max-w-6xl mx-auto w-full"
    >
      {/* ── YKS Geri Sayım Aracı (Merkezi & Dengeli) ── */}
      <CountdownBanner />

      {/* ── Başlık + Paylaş Butonu ── */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
            Merhaba, {firstName} 👋
          </h1>
          <p className="text-sm mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
            YKS hazırlık sürecinde genel performans durumuna ve çalışma sürelerine göz atalım.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowShareCard(true)}
          className="shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-90 active:scale-[0.97] shadow-md transition-all"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Karnemi Paylaş</span>
          <span className="sm:hidden">Paylaş</span>
        </button>
      </div>

      {/* ── Paylaşım Karnesi Modalı ── */}
      <ShareCardModal isOpen={showShareCard} onClose={() => setShowShareCard(false)} />

      {/* ── Streak Bildirimi ──
           Haklar otomatik kullanıldığı için öğrenci bilgilendirilmeli;
           yalnızca düne ait, görülmemiş olaylarda çıkar. */}
      <StreakNotice />

      {/* ── Hızlı Başlat / Yarım Seans ──
           En sık yapılan eylem burada, ana ekranda. Canlı süre kartın kendi
           içinde tik attığı için aşağıdaki grafikler yeniden render olmaz. */}
      <QuickStartCard />

      {/* ── Stat Kartları (Genişletilmiş Grid) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Hedef Sıralama */}
        <StatCard
          icon={Trophy}
          iconColor="bg-amber-500/15"
          iconText="text-amber-500"
          title="Hedef Sıralama"
          value={targetRank.toLocaleString('tr-TR')}
          subtitle={showAyt ? selectedTrack : 'Yalnızca TYT'}
          trend="neutral"
          index={0}
        />

        {/* 2. Bugünkü Odak / Çalışma Sayacı (Düne Göre Dakika Farkı) */}
        <StatCard
          icon={Flame}
          iconColor="bg-orange-500/15"
          iconText="text-orange-500"
          title="Bugünkü Odak"
          value={formatDuration(todayTotalMinutes)}
          subtitle={focusTrendBadgeText}
          trend={focusTrendDirection}
          index={1}
        />

        {/* 3. Son TYT Neti */}
        <StatCard
          icon={FileText}
          iconColor="bg-indigo-500/15"
          iconText="text-indigo-500"
          title="Son TYT Neti"
          value={latestTyt.net}
          subtitle={tytTrend.diff}
          trend={tytTrend.direction}
          index={2}
        />

        {/* 4. Son AYT Neti (showAyt ise) veya En Acil Konu */}
        {showAyt ? (
          <StatCard
            icon={Target}
            iconColor="bg-indigo-500/15"
            iconText="text-indigo-500"
            title="Son AYT Neti"
            value={latestAyt.net}
            subtitle={aytTrend.diff}
            trend={aytTrend.direction}
            index={3}
          />
        ) : (
          <StatCard
            icon={AlertTriangle}
            iconColor="bg-red-500/15"
            iconText="text-red-500"
            title="En Acil Konu"
            value={urgentTopic.name}
            subtitle={urgentTopic.subject}
            trend="down"
            index={3}
          />
        )}
      </div>

      {/* ── GitHub Stili Yıllık Aktivite Isı Haritası (Heatmap) ── */}
      <Heatmap />

      {/* ── Net Gelişim Grafikleri ── */}
      <div className="grid grid-cols-1 gap-6">
        {/* TYT Net Gelişim Grafiği (Kronolojik Eskiden Yeniye) */}
        <NetChart
          title="TYT Net Gelişimi"
          subtitle="TYT denemelerinin gerçek tarihe göre net değişimi"
          data={tytChartData}
          gradientId="tytGrad"
          strokeColor="#6366f1"
        />

        {/* AYT Net Gelişim Grafiği (showAyt true ise) */}
        {showAyt && (
          <NetChart
            title="AYT Net Gelişimi"
            subtitle="AYT denemelerinin gerçek tarihe göre net değişimi"
            data={aytChartData}
            gradientId="aytGrad"
            strokeColor="#8b5cf6"
          />
        )}
      </div>

      {/* ── YKS Simülasyon Kartı (Dinamik Tüm Alanlar & Yıl Seçici) ── */}
      <YksSimCard
        simResult={simResult}
        selectedTrack={selectedTrack}
        targetRank={targetRank}
        showAyt={showAyt}
        simYear={simYear}
        setSimYear={setSimYear}
      />
    </motion.div>
  );
}

// ─── YKS Simülasyon Kartı (Tüm Alanlar Uyumlu) ───
const TRACK_PALETTES = {
  SAY: { from: '#6366f1', to: '#8b5cf6', badgeBg: 'rgba(99,102,241,0.15)', badgeBorder: 'rgba(99,102,241,0.4)', text: '#6366f1' },
  EA:  { from: '#f59e0b', to: '#f97316', badgeBg: 'rgba(245,158,11,0.15)', badgeBorder: 'rgba(245,158,11,0.4)', text: '#f59e0b' },
  SOZ: { from: '#10b981', to: '#06b6d4', badgeBg: 'rgba(16,185,129,0.15)', badgeBorder: 'rgba(16,185,129,0.4)', text: '#10b981' },
  DIL: { from: '#f43f5e', to: '#ec4899', badgeBg: 'rgba(244,63,94,0.15)', badgeBorder: 'rgba(244,63,94,0.4)', text: '#f43f5e' },
  TYT: { from: '#3b82f6', to: '#6366f1', badgeBg: 'rgba(59,130,246,0.15)', badgeBorder: 'rgba(59,130,246,0.4)', text: '#3b82f6' },
};

function YksSimCard({ simResult, selectedTrack, targetRank, showAyt, simYear, setSimYear }) {
  const paletteKey = !showAyt ? 'TYT' : (selectedTrack || 'SAY');
  const palette = TRACK_PALETTES[paletteKey] || TRACK_PALETTES.SAY;

  const rankDisplay = `${simResult.rankLow.toLocaleString('tr-TR')} – ${simResult.rankHigh.toLocaleString('tr-TR')}`;
  const onTarget = simResult.gapToTarget <= 0;
  const gapLabel = onTarget
    ? '🎯 Hedef sıralamana ulaştın!'
    : `Hedefine ${Math.abs(simResult.gapToTarget).toLocaleString('tr-TR')} sıralama uzaktasın`;

  const availableYears = ['2026', '2025', '2024', '2023'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
      className="card p-5 lg:p-6 overflow-hidden relative shadow-card"
    >
      {/* Dekoratif arka plan gradyanı */}
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-10"
        style={{ background: `radial-gradient(circle, ${palette.from}, transparent)`, transform: 'translate(30%, -30%)' }}
      />

      {/* Başlık ve Alan Göstergesi + Yıl Seçici */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: `linear-gradient(135deg, ${palette.from}, ${palette.to})` }}
            />
            <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>
              YKS Simülasyonu ({simResult.trackTitle})
            </h2>
            <span
              className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: palette.badgeBg,
                borderColor: palette.badgeBorder,
                color: palette.text,
              }}
            >
              {simResult.trackTitle}
            </span>

            {/* YKS Yılı Seçici (2026 Güncel / 2025 / 2024 / 2023) */}
            <div className="flex items-center gap-1 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/90 dark:bg-slate-800/80 [html.theme-sepia_&]:border-[#453225] [html.theme-sepia_&]:bg-[#2c2018]">
              {availableYears.map((yearOption) => {
                const isActive = (simYear || '2026') === yearOption;
                return (
                  <button
                    key={yearOption}
                    type="button"
                    onClick={() => setSimYear && setSimYear(yearOption)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold transition-all ${
                      isActive
                        ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white dark:shadow-md [html.theme-sepia_&]:bg-[#3a2c20] [html.theme-sepia_&]:text-amber-300'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:dark:text-slate-200 [html.theme-sepia_&]:text-[#a89078]'
                    }`}
                    title={`${yearOption} YKS yığılma eğrisine göre simüle et`}
                  >
                    {yearOption} {yearOption === '2026' ? '🔥' : ''}
                  </button>
                );
              })}
            </div>
          </div>
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {simResult.year} YKS resmi ÖSYM yığılma ve katsayı eğrilerine göre hesaplanmıştır
          </p>
        </div>

        {/* Alan / Yerleştirme Puanı */}
        <div className="text-right shrink-0">
          <div
            className="text-3xl sm:text-4xl font-extrabold tabular-nums tracking-tight"
            style={{ color: palette.text }}
          >
            {simResult.yScore}
          </div>
          <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            Tahmini Yerleştirme Puanı
          </div>
        </div>
      </div>

      {/* İstatistik Tablosu: Mobilde 2'li (grid-cols-2), PC'de Dengeli 4'lü Grid (lg:grid-cols-4) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {/* 1. TYT Puanı */}
        <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/50 [html.theme-sepia_&]:bg-[#2c2018] rounded-xl border border-slate-200/80 dark:border-slate-700/60 [html.theme-sepia_&]:border-[#453225] flex flex-col justify-center text-center transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#a89078] font-medium mb-1">
            TYT Puanı
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white [html.theme-sepia_&]:text-amber-100 tabular-nums whitespace-nowrap">
            {simResult.tytScore}
          </span>
        </div>

        {/* 2. Y-Puan */}
        <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/50 [html.theme-sepia_&]:bg-[#2c2018] rounded-xl border border-slate-200/80 dark:border-slate-700/60 [html.theme-sepia_&]:border-[#453225] flex flex-col justify-center text-center transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#a89078] font-medium mb-1">
            Y-Puan
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white [html.theme-sepia_&]:text-amber-100 tabular-nums whitespace-nowrap">
            {simResult.yScore}
          </span>
        </div>

        {/* 3. Tahmini Sıralama */}
        <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/50 [html.theme-sepia_&]:bg-[#2c2018] rounded-xl border border-slate-200/80 dark:border-slate-700/60 [html.theme-sepia_&]:border-[#453225] flex flex-col justify-center text-center transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#a89078] font-medium mb-1">
            Tahmini Sıralama
          </span>
          <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white [html.theme-sepia_&]:text-amber-100 tabular-nums whitespace-nowrap">
            {simResult.estimatedRank.toLocaleString('tr-TR')}
          </span>
        </div>

        {/* 4. Sıralama Aralığı */}
        <div className="p-3 sm:p-3.5 bg-slate-50 dark:bg-slate-800/50 [html.theme-sepia_&]:bg-[#2c2018] rounded-xl border border-slate-200/80 dark:border-slate-700/60 [html.theme-sepia_&]:border-[#453225] flex flex-col justify-center text-center transition-colors">
          <span className="text-xs text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#a89078] font-medium mb-1">
            Sıralama Aralığı
          </span>
          <span className="text-xs sm:text-sm lg:text-base font-bold text-slate-800 dark:text-slate-100 [html.theme-sepia_&]:text-amber-100 tracking-tight whitespace-nowrap tabular-nums">
            {rankDisplay}
          </span>
        </div>
      </div>

      {/* Hedefe İlerleme Çubuğu */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>
            {gapLabel}
          </span>
          <span className="font-extrabold tabular-nums" style={{ color: palette.text }}>
            Hedef: {targetRank.toLocaleString('tr-TR')} • %{simResult.progressPct}
          </span>
        </div>

        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--bg-input)' }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${simResult.progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${palette.from}, ${palette.to})` }}
          />
        </div>
      </div>
    </motion.div>
  );
}
