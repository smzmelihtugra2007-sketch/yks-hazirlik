/**
 * ─── SAYAÇ MOTORU ───
 *
 * İki kanca:
 *  - useTimerWatchdog() : uygulama boyunca BİR kez (MainLayout) çağrılır.
 *    Duraklatma kurallarını uygular, hedef süre dolunca alarmı çalar,
 *    sekme başlığını ve PWA rozetini günceller.
 *  - useTimerElapsed()  : geçen süreyi canlı döndürür, saniyede bir tazeler.
 *
 * Kurallar sayaç sayfası KAPALIYKEN de işlemeli; bu yüzden gözcü, sayfaya
 * değil her zaman ekranda olan MainLayout'a bağlıdır.
 *
 * Abonelik notu: gözcü store'a yalnızca birkaç ilkel alanla abone olur ve
 * güncel durumu `getState()` ile okur. Bütün `timer` nesnesine abone olsaydı,
 * periyodik `lastAliveAt` damgası tüm uygulamayı yeniden render ederdi.
 */
import { useEffect, useReducer } from 'react';
import useAppStore from '../store/useAppStore';
import { getTargetSeconds } from '../data/timerModes';
import {
  ALIVE_TOUCH_MS,
  getElapsedSeconds,
  hasReachedTarget,
  isKeepAliveSession,
} from '../utils/session';
import { playTimerAlarm, playPauseChime } from '../utils/sound';

/** O anki sayaç durumunu abonelik yaratmadan okur. */
const readTimer = () => useAppStore.getState().timer;

/** Saniyede bir yeniden render ederek canlı geçen süreyi döndürür. */
export function useTimerElapsed() {
  const timer = useAppStore((s) => s.timer);
  const [, tick] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    if (!timer.isRunning) return undefined;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timer.isRunning]);

  return getElapsedSeconds(timer);
}

export function useTimerWatchdog() {
  // Yalnızca ilkel alanlara abone ol — nesnenin tamamına değil
  const isRunning = useAppStore((s) => s.timer.isRunning);
  const topic = useAppStore((s) => s.timer.topic);
  const activity = useAppStore((s) => s.timer.activity);
  const activePage = useAppStore((s) => s.activePage);

  const onTimerPage = activePage === 'timer';

  // ── 1. Sayaç sayfasından ayrılma: anında duraklat ──
  // Uygulama içinde başka bir sekmeye geçmek de odaktan çıkmaktır; başka
  // uygulamaya geçmekten farkı yok. (Eskiden 5 dakikalık tolerans vardı.)
  // Tekrar/Video istisnası burada da geçerli.
  useEffect(() => {
    if (onTimerPage || !isRunning) return;

    const t = readTimer();
    if (!t.isRunning || isKeepAliveSession(t)) return;

    useAppStore.getState().pauseTimer('away');
    playPauseChime();
  }, [onTimerPage, isRunning]);

  // ── 2. Başka uygulamaya/sekmeye geçiş: anında duraklat ──
  // Tekrar/Video istisnası: öğrenci başka uygulamada video izliyor olabilir,
  // bu da çalışmanın kendisidir; seans devam eder.
  useEffect(() => {
    const handleHidden = () => {
      if (document.visibilityState !== 'hidden') return;

      const t = readTimer();
      if (!t.isRunning) return;

      if (isKeepAliveSession(t)) {
        // Seans sürüyor; yalnızca "hayattayım" damgasını tazele
        useAppStore.getState().touchTimerAlive();
        return;
      }

      useAppStore.getState().pauseTimer('background');
      playPauseChime();
    };

    document.addEventListener('visibilitychange', handleHidden);
    // pagehide: sekme kapatılırken visibilitychange'in kaçtığı durumları yakalar
    window.addEventListener('pagehide', handleHidden);

    return () => {
      document.removeEventListener('visibilitychange', handleHidden);
      window.removeEventListener('pagehide', handleHidden);
    };
  }, []);

  // ── 3. Saniyelik gözcü: hedef süre, 5 dakika kuralı, canlılık damgası ──
  useEffect(() => {
    if (!isRunning) return undefined;

    let lastTouch = Date.now();

    const id = setInterval(() => {
      const t = readTimer();
      if (!t.isRunning) return;

      const now = Date.now();
      const { pauseTimer, touchTimerAlive, setTimerAlarmFired } = useAppStore.getState();

      // Hedef süre doldu mu? (geri sayım modları)
      const target = getTargetSeconds(t.modeId, t.customMinutes);
      if (target && hasReachedTarget(t, target, now)) {
        // Hedefin TAM olarak dolduğu an: bu çalışma parçasının başlangıcı +
        // hedeften geriye kalan süre. Böylece bankaya tam `target` yazılır;
        // uygulama arka planda kalıp geç fark edilse bile süre şişmez.
        const reachedAt =
          t.startedAt + Math.max(0, target - (t.accumulatedSeconds || 0)) * 1000;
        pauseTimer('target', reachedAt);
        setTimerAlarmFired(true);
        playTimerAlarm();
        return;
      }

      // Uygulamanın açık olduğunu seyrek aralıklarla damgala.
      // Bu damga yalnızca "zorla kapatma" senaryosunun güvenlik ağı; sık
      // yazmak gereksiz IndexedDB trafiği ve yeniden render demek olurdu.
      if (now - lastTouch >= ALIVE_TOUCH_MS) {
        lastTouch = now;
        touchTimerAlive();
      }
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning]);

  // ── 4. Sekme başlığı ve PWA rozeti ──
  // Sayaç çalışırken sekme başlığı süreyi gösterir; kurulu PWA'da ana ekran
  // ikonuna rozet düşer. (Web'de ikonun kendisini değiştirmek mümkün değil,
  // yalnızca rozet eklenebiliyor.)
  useEffect(() => {
    const base = 'YKS Hazırlık';

    if (!isRunning) {
      document.title = base;
      if (navigator.clearAppBadge) navigator.clearAppBadge().catch(() => {});
      return undefined;
    }

    if (navigator.setAppBadge) navigator.setAppBadge().catch(() => {});

    const paint = () => {
      const t = readTimer();
      const total = getElapsedSeconds(t);
      const target = getTargetSeconds(t.modeId, t.customMinutes);
      const shown = target ? Math.max(0, target - total) : total;
      const m = String(Math.floor(shown / 60)).padStart(2, '0');
      const s = String(shown % 60).padStart(2, '0');
      document.title = `${m}:${s} · ${base}`;
    };

    paint();
    const id = setInterval(paint, 1000);

    return () => {
      clearInterval(id);
      document.title = base;
    };
  }, [isRunning]);

  return { keepAlive: isKeepAliveSession({ activity, topic }) };
}
