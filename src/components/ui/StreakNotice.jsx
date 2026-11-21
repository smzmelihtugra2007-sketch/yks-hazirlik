/**
 * ─── STREAK BİLDİRİMİ ───
 *
 * Seri korunduğunda veya kırıldığında öğrenciyi bilgilendirir. Haklar otomatik
 * kullanıldığı için bu bildirim zorunlu: aksi hâlde öğrenci aylık hakkının
 * sessizce eridiğini ancak bittiğinde fark ederdi.
 *
 * Yalnızca DÜNE ait, henüz görülmemiş olaylar için çıkar (bkz.
 * getPendingStreakNotice) — haftalar önce kırılmış bir seri için bayat uyarı
 * göstermez. "Anladım" denince store'a işaretlenir ve bir daha çıkmaz.
 */
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, ShieldCheck, AlertTriangle } from 'lucide-react';
import useAppStore from '../../store/useAppStore';
import { useStreakNotice } from '../../hooks/useStreak';
import { DAILY_GOAL_MINUTES } from '../../utils/streak';
import { EASE_OUT_SOFT } from '../../utils/motion';

/** Dakikayı "2 sa 55 dk" biçiminde yazar. */
function formatMinutes(mins) {
  if (!mins || mins <= 0) return '0 dk';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m} dk`;
  if (m === 0) return `${h} sa`;
  return `${h} sa ${m} dk`;
}

/** Olaya göre ikon, renk ve metni üretir. */
function describe(event) {
  const pct = Math.round((event.minutes / DAILY_GOAL_MINUTES) * 100);
  const left = event.rightsLeft;

  switch (event.kind) {
    case 'partialWeekly':
      return {
        Icon: ShieldCheck,
        tone: '#10b981',
        title: 'Serin korundu',
        body: `Dün ${formatMinutes(event.minutes)} çalıştın — hedefin %${pct}'si. Seri bozulmadı ama bu haftaki esneme hakkını kullandın.`,
      };

    case 'partialMonthly':
      return {
        Icon: ShieldCheck,
        tone: '#f59e0b',
        title: 'Serin korundu',
        body: `Dün ${formatMinutes(event.minutes)} çalıştın (hedefin %${pct}'si). Bu haftaki esneme hakkın doluydu, aylık hakkından biri kullanıldı. (${left} hak kaldı.)`,
      };

    case 'rightUsed':
      return {
        Icon: ShieldCheck,
        tone: '#f59e0b',
        title: 'Aylık hakkın kullanıldı',
        body: `Dün hedefe ulaşamadığın için seri bozulmasın diye aylık hakkından biri kullanıldı. (${left} hak kaldı.)`,
      };

    case 'broken':
    default:
      return {
        Icon: AlertTriangle,
        tone: '#f43f5e',
        title: 'Serin sıfırlandı',
        body: `Dün hedefe ulaşılamadı (${formatMinutes(event.minutes)}) ve koruma hakkın kalmadığı için seri baştan başlıyor. Bugün 3 saat çalışarak yeniden başlatabilirsin.`,
      };
  }
}

export default function StreakNotice() {
  const event = useStreakNotice();
  const markSeen = useAppStore((s) => s.markStreakNoticeSeen);

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.32, ease: EASE_OUT_SOFT }}
          className="overflow-hidden"
        >
          {(() => {
            const { Icon, tone, title, body } = describe(event);
            return (
              <div
                className="card p-4 flex items-start gap-3"
                style={{ borderColor: `${tone}55` }}
              >
                <div
                  className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${tone}1f`, color: tone }}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" style={{ color: tone }} />
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                      {title}
                    </h3>
                  </div>
                  <p
                    className="text-xs mt-1 leading-relaxed"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {body}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => markSeen(event.date)}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors duration-200"
                  style={{ color: tone }}
                >
                  Anladım
                </button>
              </div>
            );
          })()}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
