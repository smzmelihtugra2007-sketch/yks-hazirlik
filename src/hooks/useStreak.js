/**
 * ─── STREAK KANCASI ───
 *
 * Seriyi seans geçmişinden türetir (bkz. utils/streak.js). Store'da saklanan
 * `studyStreak` artık yalnızca dışa aktarma için tutulan bir önbellek;
 * ekranda gösterilen değer HER ZAMAN buradan gelmeli ki seans silinince veya
 * veri içe aktarılınca anında doğru sonuç görünsün.
 */
import { useMemo } from 'react';
import useAppStore from '../store/useAppStore';
import { computeStreak, getPendingStreakNotice } from '../utils/streak';

export function useStreak() {
  const studySessions = useAppStore((s) => s.studySessions);

  // Gün içinde yeniden hesaplamak gerekmez; seans listesi değişince yeter.
  return useMemo(() => computeStreak(studySessions), [studySessions]);
}

/**
 * Gösterilmesi gereken streak bildirimi (yoksa null).
 * Yalnızca düne ait, henüz görülmemiş olaylar döner.
 */
export function useStreakNotice() {
  const result = useStreak();
  const seenDate = useAppStore((s) => s.streakNoticeSeenDate);

  return useMemo(
    () => getPendingStreakNotice(result, seenDate),
    [result, seenDate]
  );
}
