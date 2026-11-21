/**
 * ─── AYLIK BLOKLAR AKTİVİTE ISI HARİTASI (HEATMAP) ───
 *
 * Özellikler:
 *  - 12 Aylık Blok Mimarisi (Her ayın günleri kendi 7xN ızgarasında)
 *  - `flex-shrink-0 min-w-[40px]` ile asla ezilmeyen 7 Günün Tamamı
 *  - Pürüzsüz ve donmayan Alt Bilgi Çubuğu (Koyu/Açık/Sepia %100 Yüksek Kontrast)
 *  - Temiz, modern ve %100 Dark/Light/Sepia tema uyumu
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Flame, Clock, Award } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import { useStreak } from '../../hooks/useStreak';

const MONTH_NAMES_FULL = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

// 7 Günün Tamamı (Pazartesi ilk gün = Row 0)
const ALL_WEEKDAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

// ─── Tarih Formatlayıcı (YYYY-MM-DD) ───
function getLocalDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Süre Formatlayıcı (dk → "2s 15dk" veya "45dk") ───
function formatMinutes(mins) {
  if (!mins || mins === 0) return '0 dk';
  const hrs = Math.floor(mins / 60);
  const m = mins % 60;
  if (hrs > 0 && m > 0) return `${hrs}s ${m}dk`;
  if (hrs > 0) return `${hrs} saat`;
  return `${m} dk`;
}

export default function Heatmap() {
  const { studySessions, trials } = useAppStore();
  // Seri seans geçmişinden türetilir (store'daki alan yalnızca önbellek)
  const { current: studyStreak } = useStreak();
  const [hoveredData, setHoveredData] = useState(null);

  // ─── Son 12 Ayı ve Günleri Blok Olarak Hesaplama (Read-Only) ───
  const { monthlyBlocks, totalStudyMinutes, activeDaysCount } = useMemo(() => {
    const dayMap = {};

    (studySessions || []).forEach((session) => {
      if (session?.date) {
        if (!dayMap[session.date]) {
          dayMap[session.date] = { minutes: 0, trials: 0 };
        }
        dayMap[session.date].minutes += Number(session.durationMinutes) || 0;
      }
    });

    (trials || []).forEach((trial) => {
      if (trial?.date) {
        if (!dayMap[trial.date]) {
          dayMap[trial.date] = { minutes: 0, trials: 0 };
        }
        dayMap[trial.date].trials += 1;
      }
    });

    const now = new Date();
    const todayStr = getLocalDateString(now);

    let totMins = 0;
    let actDays = 0;

    // Son 12 Ayı hesapla (11 ay önce -> bu ay)
    const blocks = [];

    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // Pazartesi ilk gün (0: Pzt, 1: Sal, ..., 6: Paz)
      const jsDay = new Date(year, month, 1).getDay(); // 0: Paz, 1: Pzt ... 6: Cmt
      const firstWeekdayMon = (jsDay + 6) % 7;

      const monthCells = [];

      // 1. Ayın ilk gününden önceki boşlukları (placeholder) doldur
      for (let p = 0; p < firstWeekdayMon; p++) {
        monthCells.push({ isPlaceholder: true, key: `pad_start_${year}_${month}_${p}` });
      }

      // 2. Ayın günlerini ekle
      for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
        const currentDate = new Date(year, month, dayNum);
        const dateStr = getLocalDateString(currentDate);
        const isFuture = currentDate.getTime() > now.getTime() && dateStr !== todayStr;
        const isToday = dateStr === todayStr;

        const dayData = dayMap[dateStr] || { minutes: 0, trials: 0 };
        const mins = isFuture ? 0 : dayData.minutes;
        const trialCount = isFuture ? 0 : dayData.trials;

        if (!isFuture) {
          totMins += mins;
          if (mins > 0 || trialCount > 0) {
            actDays += 1;
          }
        }

        // Aktivite Seviyesi (0 - 4)
        let level = 0;
        if (!isFuture) {
          if (mins >= 180 || trialCount >= 2) {
            level = 4;
          } else if (mins >= 100 || trialCount >= 1) {
            level = 3;
          } else if (mins >= 45) {
            level = 2;
          } else if (mins > 0) {
            level = 1;
          }
        }

        const dateFormatted = currentDate.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          weekday: 'long',
        });

        monthCells.push({
          isPlaceholder: false,
          key: dateStr,
          date: dateStr,
          dateFormatted,
          dayNum,
          minutes: mins,
          trials: trialCount,
          level,
          isToday,
          isFuture,
        });
      }

      // 3. 7'nin katına tamamlamak için sondaki boşlukları ekle
      const remainder = monthCells.length % 7;
      if (remainder > 0) {
        const endPad = 7 - remainder;
        for (let ep = 0; ep < endPad; ep++) {
          monthCells.push({ isPlaceholder: true, key: `pad_end_${year}_${month}_${ep}` });
        }
      }

      blocks.push({
        name: MONTH_NAMES_FULL[month],
        year,
        cells: monthCells,
      });
    }

    return {
      monthlyBlocks: blocks,
      totalStudyMinutes: totMins,
      activeDaysCount: actDays,
    };
  }, [studySessions, trials]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="card p-5 lg:p-6 pb-6 sm:pb-7 space-y-4 shadow-card"
    >
      {/* ── Üst Başlık ve Özet Metrikler ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: 'var(--accent-brand-light)' }}
          >
            <Calendar className="w-5 h-5" style={{ color: 'var(--accent-brand)' }} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
              Yıllık Çalışma Haritası
            </h2>
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              Aylık bloklar halinde ders seansları ve deneme aktivitesi
            </p>
          </div>
        </div>

        {/* Özet Rozetler */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl border bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatMinutes(totalStudyMinutes)}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
            <Award className="w-3.5 h-3.5" />
            <span>Toplam {activeDaysCount} Gün Aktif</span>
          </div>

          {studyStreak > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl border bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400 font-extrabold text-[11px]">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>{studyStreak} Gün Seri</span>
            </div>
          )}

        </div>
      </div>

      {/* ── Aylık Bloklar Alanı (Flex + Yatay Kaydırma) ── */}
      <div className="overflow-x-auto pb-2 pt-1 scrollbar-thin">
        <div className="flex items-start gap-3 select-none" style={{ minWidth: 'max-content' }}>
          
          {/* Sol: 7 Günün Tamamı (Kesintisiz Sabit Sütun - flex-shrink-0) */}
          <div className="w-10 min-w-[40px] flex-shrink-0 text-xs text-gray-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#a89078] text-left pt-6">
            <div className="flex flex-col gap-1.5">
              {ALL_WEEKDAYS_TR.map((dayName) => (
                <div
                  key={dayName}
                  className="h-3.5 sm:h-4 flex items-center justify-start text-[10px] font-bold text-slate-400 dark:text-slate-500 [html.theme-sepia_&]:text-[#8c735d] leading-none"
                >
                  {dayName}
                </div>
              ))}
            </div>
          </div>

          {/* Sağ: 12 Aylık Bloklar Listesi */}
          <div className="flex items-start gap-3.5">
            {monthlyBlocks.map((block, bIdx) => (
              <div
                key={`${block.name}_${block.year}_${bIdx}`}
                className="flex flex-col items-center shrink-0"
              >
                {/* 1. Ay Başlığı (Ortalanmış) */}
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 [html.theme-sepia_&]:text-[#a89078] mb-2 leading-none">
                  {block.name}
                </span>

                {/* 2. O Aya Ait 7 Satırlı Mini Izgara */}
                <div className="grid grid-rows-7 grid-flow-col gap-1.5">
                  {block.cells.map((cell) => {
                    // Ayın başındaki/sonundaki hizalama boşlukları (pad_start /
                    // pad_end). Takvimde KARŞILIĞI OLMAYAN sahte kutulardır:
                    // yalnızca 7'li sütun ızgarasını dikdörtgen tutmak için
                    // basılırlar. Gerçek günlerle aynı ölçüde dururlar ki hiza
                    // bozulmasın, ama tamamen şeffaf ve etkileşimsizdirler.
                    if (cell.isPlaceholder) {
                      return (
                        <div
                          key={cell.key}
                          aria-hidden="true"
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] bg-transparent border-0 pointer-events-none"
                        />
                      );
                    }

                    // NOT: Gelecek günler için ayrı bir dal YOKTUR ve olmamalıdır.
                    // Takvimde gerçek karşılığı olan her gün (1..ayın son günü)
                    // buradan aşağıdaki tek <button> yolundan geçer: aynı DOM
                    // yapısı, aynı hover/tıklama, aynı tooltip. Gelecek günler
                    // veri katmanında zaten 0 dk / level 0 olarak işaretlendiği
                    // için geçmişteki boş günlerle birebir aynı görünür.

                    // Seviye ve Tema Renk Sınıfları
                    let colorClass =
                      'bg-gray-100 dark:bg-slate-800 border border-gray-200/70 dark:border-slate-700 [html.theme-sepia_&]:bg-[#2c2018] [html.theme-sepia_&]:border-[#453225]';

                    if (cell.level === 1) {
                      colorClass =
                        'bg-indigo-200 dark:bg-indigo-900/60 border border-indigo-300 dark:border-indigo-800/70 [html.theme-sepia_&]:bg-amber-900/60 [html.theme-sepia_&]:border-amber-700/60';
                    } else if (cell.level === 2) {
                      colorClass =
                        'bg-indigo-400 dark:bg-indigo-600 border border-indigo-500 dark:border-indigo-500 [html.theme-sepia_&]:bg-amber-700 [html.theme-sepia_&]:border-amber-600';
                    } else if (cell.level === 3) {
                      colorClass =
                        'bg-indigo-600 dark:bg-indigo-400 border border-indigo-700 dark:border-indigo-300 text-white [html.theme-sepia_&]:bg-amber-500 [html.theme-sepia_&]:border-amber-400';
                    } else if (cell.level === 4) {
                      colorClass =
                        'bg-purple-600 dark:bg-purple-500 border border-purple-400 dark:border-purple-300 ring-1 ring-purple-400/60 [html.theme-sepia_&]:bg-amber-400 [html.theme-sepia_&]:border-amber-300';
                    }

                    const todayRing = cell.isToday
                      ? 'ring-2 ring-indigo-500 dark:ring-indigo-400 ring-offset-1'
                      : '';

                    return (
                      <button
                        key={cell.key}
                        type="button"
                        onMouseEnter={() => setHoveredData(cell)}
                        onMouseLeave={() => setHoveredData(null)}
                        onClick={() =>
                          setHoveredData((prev) => (prev?.date === cell.date ? null : cell))
                        }
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-[3px] transition-transform duration-100 hover:scale-125 focus:outline-none ${colorClass} ${todayRing}`}
                        aria-label={`${cell.date}: ${formatMinutes(cell.minutes)}`}
                      />
                    );
                  })}

                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Alt Bilgi Çubuğu (Kaydırma Alanının Dışında, Esnek Yükseklik, Yüksek Kontrast) ── */}
      <div className="min-h-[2.5rem] py-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-sm font-medium text-gray-800 dark:text-gray-200 [html.theme-sepia_&]:text-[#f3eadc] mt-4 px-1 border-t border-slate-200/60 dark:border-slate-800 [html.theme-sepia_&]:border-[#453225] pt-3">
        {/* Sol: Dinamik Tarih ve Çalışma Detayı */}
        <div className="flex items-center min-w-0 flex-1">
          {hoveredData ? (
            <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 [html.theme-sepia_&]:text-[#f3eadc] flex-wrap">
              {/* Tarih + Bugün Rozeti */}
              <div className="inline-flex items-center gap-1.5 shrink-0">
                <span className="text-gray-800 dark:text-gray-200 [html.theme-sepia_&]:text-[#f3eadc]">
                  {hoveredData.dateFormatted}:
                </span>
                {hoveredData.isToday && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 [html.theme-sepia_&]:text-emerald-300 border border-emerald-500/20 inline-flex items-center">
                    Bugün
                  </span>
                )}
              </div>

              {/* Çalışma Süresi */}
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 [html.theme-sepia_&]:text-amber-400">
                {hoveredData.minutes > 0
                  ? `${formatMinutes(hoveredData.minutes)} Çalışma`
                  : 'Çalışma Yok'}
              </span>

              {/* Deneme Sayısı */}
              {hoveredData.trials > 0 && (
                <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 [html.theme-sepia_&]:bg-amber-500/20 [html.theme-sepia_&]:text-amber-300 text-xs font-bold">
                  {hoveredData.trials} Deneme
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400 [html.theme-sepia_&]:text-[#a89078]">
              Detayları görmek için karelerin üzerine gelin.
            </span>
          )}
        </div>

        {/* Sağ: Renk Skalası (Legend) */}
        <div className="flex items-center gap-1.5 shrink-0 text-[10px] font-semibold text-slate-400 dark:text-slate-500 [html.theme-sepia_&]:text-[#8c735d]">
          <span>Az</span>
          <span
            className="w-3 h-3 rounded-[2px] bg-gray-100 dark:bg-slate-800 border border-gray-200/70 dark:border-slate-700 [html.theme-sepia_&]:bg-[#2c2018] [html.theme-sepia_&]:border-[#453225]"
            title="0 dk"
          />
          <span
            className="w-3 h-3 rounded-[2px] bg-indigo-200 dark:bg-indigo-900/60 border border-indigo-300 [html.theme-sepia_&]:bg-amber-900/60"
            title="1-44 dk"
          />
          <span
            className="w-3 h-3 rounded-[2px] bg-indigo-400 dark:bg-indigo-600 border border-indigo-500 [html.theme-sepia_&]:bg-amber-700"
            title="45-99 dk"
          />
          <span
            className="w-3 h-3 rounded-[2px] bg-indigo-600 dark:bg-indigo-400 border border-indigo-700 [html.theme-sepia_&]:bg-amber-500"
            title="100-179 dk"
          />
          <span
            className="w-3 h-3 rounded-[2px] bg-purple-600 dark:bg-purple-500 border border-purple-400 ring-1 ring-purple-400/60 [html.theme-sepia_&]:bg-amber-400"
            title="180+ dk"
          />
          <span>Çok</span>
        </div>
      </div>
    </motion.div>
  );
}
