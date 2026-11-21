/**
 * ─── STREAK (ÇALIŞMA SERİSİ) MOTORU ───
 *
 * Seri SAKLANMAZ, her seferinde seans geçmişinden HESAPLANIR. Eskiden store'da
 * `studyStreak` + `lastActiveDate` tutuluyor ve olay anında artırılıyordu; bu
 * kırılgandı: bir seans silinince seri düzelmiyor, veri içe aktarılınca şaşıyor,
 * kısmi gün / hak mantığı ise zaten geçmişe bakmayı gerektiriyordu.
 *
 * ─ Kurallar (bir günün sınıfı) ─
 *   Tam    : ≥ 180 dk           → seri +1
 *   Kısmi  : 144-179 dk (%80+)  → önce haftalık esneme hakkı (1/hafta),
 *                                 yoksa aylık hak, o da yoksa seri kırılır.
 *                                 Seri KORUNUR ama ARTMAZ.
 *   Yetersiz: < 144 dk (0 dahil) → aylık hak, yoksa seri kırılır. Korunur, artmaz.
 *
 *   Aylık hak : 3 adet, ayın 1'inde sıfırlanır, DEVRETMEZ, otomatik kullanılır.
 *   Haftalık esneme : 1 adet/hafta (Pazartesi başlar), yalnızca KISMİ günler
 *                     için. Hiç çalışılmayan gün bunu kullanamaz — "hak edilmiş"
 *                     ayrımı böyle korunur.
 *
 * ─ Neden İLERİ simülasyon ─
 *   Seriyi geriye doğru yürüyerek hesaplamak aylık bütçeyle ÇALIŞMAZ: geriye
 *   giderken ayın başındaki harcamalar henüz görülmediği için, hakkı çoktan
 *   tükenmiş bir güne yanlışlıkla hak verilirdi. Bu yüzden ilk seans gününden
 *   bugüne ileri yürünür; haftalık ve aylık bütçeler doğal sınırlarında sıfırlanır.
 *
 * ─ Bugün yargılanmaz ─
 *   Gün bitmeden kısmi/yetersiz sayılmaz. Sabah 1 saat çalışmış öğrenci serisini
 *   kırılmış görmemeli. Bugün yalnızca hedefi tutturduysa seriye eklenir.
 */
import { toDateKey, shiftDateKey, monthKeyOf, weekKeyOf } from './dateKey.js';

export const DAILY_GOAL_MINUTES = 180;
export const PARTIAL_RATIO = 0.8;
export const PARTIAL_THRESHOLD_MINUTES = Math.round(DAILY_GOAL_MINUTES * PARTIAL_RATIO); // 144
export const MONTHLY_RIGHTS = 3;
export const WEEKLY_PARTIAL_ALLOWANCE = 1;

/** Bozuk veriye karşı güvenlik: en fazla bu kadar gün geriye yürünür. */
const MAX_WALK_DAYS = 2000;

/** Bir günün dakikasını sınıflandırır. */
export function classifyDay(minutes) {
  if (minutes >= DAILY_GOAL_MINUTES) return 'full';
  if (minutes >= PARTIAL_THRESHOLD_MINUTES) return 'partial';
  return 'miss';
}

/** Seansları gün anahtarına göre toplar: Map<'YYYY-MM-DD', dakika>. */
export function sumMinutesByDay(sessions) {
  const byDay = new Map();
  for (const s of sessions || []) {
    if (!s?.date) continue;
    const mins = Number(s.durationMinutes) || 0;
    byDay.set(s.date, (byDay.get(s.date) || 0) + mins);
  }
  return byDay;
}

/**
 * Seriyi ve hak bütçelerini hesaplar.
 *
 * @param {Array}  sessions  studySessions
 * @param {Date}   now       test edilebilirlik için enjekte edilir
 * @returns {{
 *   current: number,                // güncel seri (gün)
 *   todayMinutes: number,
 *   todayStatus: 'full'|'partial'|'miss',
 *   minutesToGoal: number,          // bugün hedefe kalan
 *   monthlyRightsUsed: number,      // BU ay
 *   monthlyRightsLeft: number,
 *   weeklyPartialUsed: number,      // BU hafta
 *   weeklyPartialLeft: number,
 *   lastEvent: object|null,         // bildirim için son kayda değer olay
 * }}
 */
export function computeStreak(sessions, now = new Date()) {
  const todayKey = toDateKey(now);
  const byDay = sumMinutesByDay(sessions);

  const todayMinutes = byDay.get(todayKey) || 0;
  const todayStatus = classifyDay(todayMinutes);
  const minutesToGoal = Math.max(0, DAILY_GOAL_MINUTES - todayMinutes);

  const currentMonthKey = monthKeyOf(todayKey);
  const currentWeekKey = weekKeyOf(todayKey);

  const empty = {
    current: 0,
    todayMinutes,
    todayStatus,
    minutesToGoal,
    monthlyRightsUsed: 0,
    monthlyRightsLeft: MONTHLY_RIGHTS,
    weeklyPartialUsed: 0,
    weeklyPartialLeft: WEEKLY_PARTIAL_ALLOWANCE,
    lastEvent: null,
  };

  // Geçmişte hiç seans yoksa hesaplanacak bir şey yok
  const pastKeys = [...byDay.keys()].filter((k) => k <= todayKey).sort();
  if (pastKeys.length === 0) return empty;

  // Bugün tam değilse değerlendirme dünde biter (bugün yargılanmaz)
  const endKey = todayStatus === 'full' ? todayKey : shiftDateKey(todayKey, -1);

  let streak = 0;
  let monthCursor = null;
  let rightsUsed = 0;
  let weekCursor = null;
  let partialUsed = 0;
  let lastEvent = null;

  let key = pastKeys[0];
  let guard = 0;

  while (key <= endKey && guard < MAX_WALK_DAYS) {
    guard += 1;

    // Bütçeleri doğal sınırlarında sıfırla (ayın 1'i / Pazartesi)
    const mk = monthKeyOf(key);
    if (mk !== monthCursor) {
      monthCursor = mk;
      rightsUsed = 0;
    }
    const wk = weekKeyOf(key);
    if (wk !== weekCursor) {
      weekCursor = wk;
      partialUsed = 0;
    }

    const minutes = byDay.get(key) || 0;
    const cls = classifyDay(minutes);

    if (cls === 'full') {
      streak += 1;
    } else if (streak === 0) {
      // ─── Korunacak seri yoksa HİÇBİR hak harcanmaz ───
      // Haklar "seriyi koruma" aracı; seri zaten sıfırken harcanmaları saf
      // kayıptı. Hiç çalışmayan öğrenci ayın ilk üç gününde haklarını
      // yakıyor, asıl seriye başladığında elinde hiçbir şey kalmıyordu.
      // Olay da üretilmez: "serin korundu" / "serin sıfırlandı" bildirimleri
      // ortada seri yokken anlamsız olurdu.
    } else if (cls === 'partial') {
      if (partialUsed < WEEKLY_PARTIAL_ALLOWANCE) {
        partialUsed += 1;
        lastEvent = { date: key, kind: 'partialWeekly', minutes };
      } else if (rightsUsed < MONTHLY_RIGHTS) {
        rightsUsed += 1;
        lastEvent = {
          date: key,
          kind: 'partialMonthly',
          minutes,
          rightsLeft: MONTHLY_RIGHTS - rightsUsed,
        };
      } else {
        streak = 0;
        lastEvent = { date: key, kind: 'broken', minutes };
      }
    } else {
      // Yetersiz gün: yalnızca aylık hak kurtarabilir
      if (rightsUsed < MONTHLY_RIGHTS) {
        rightsUsed += 1;
        lastEvent = {
          date: key,
          kind: 'rightUsed',
          minutes,
          rightsLeft: MONTHLY_RIGHTS - rightsUsed,
        };
      } else {
        streak = 0;
        lastEvent = { date: key, kind: 'broken', minutes };
      }
    }

    key = shiftDateKey(key, 1);
  }

  // Yürüyüş geçmiş bir ay/haftada bittiyse, BU ayın/haftanın bütçesi tam dolu.
  // (Örn. yürüyüş 30 Eylül'de bitti, bugün 3 Ekim → Ekim hakları hiç kullanılmadı.)
  const usedThisMonth = monthCursor === currentMonthKey ? rightsUsed : 0;
  const usedThisWeek = weekCursor === currentWeekKey ? partialUsed : 0;

  return {
    current: streak,
    todayMinutes,
    todayStatus,
    minutesToGoal,
    monthlyRightsUsed: usedThisMonth,
    monthlyRightsLeft: Math.max(0, MONTHLY_RIGHTS - usedThisMonth),
    weeklyPartialUsed: usedThisWeek,
    weeklyPartialLeft: Math.max(0, WEEKLY_PARTIAL_ALLOWANCE - usedThisWeek),
    lastEvent,
  };
}

/**
 * Bildirim gösterilmeli mi?
 * Yalnızca DÜNE ait bir olay için gösterilir — aksi hâlde haftalar önce kırılmış
 * bir seri için bayat uyarı çıkardı. `seenDate` kullanıcının gördüğü son olayın
 * tarihidir (store'da tutulur).
 */
export function getPendingStreakNotice(result, seenDate, now = new Date()) {
  const ev = result?.lastEvent;
  if (!ev) return null;

  const yesterdayKey = shiftDateKey(toDateKey(now), -1);
  if (ev.date !== yesterdayKey) return null;
  if (seenDate === ev.date) return null;

  return ev;
}
