/**
 * ─── ÇALIŞMA İSTATİSTİKLERİ: DERS → KONU → TÜR ───
 *
 * Seans geçmişini üç kademeli bir dökümе çevirir. Hesap `StudyTimer.jsx`
 * içindeydi; iki sebeple buraya taşındı:
 *   1. O dosya 1000 satırı aştı ve en çok dokunduğumuz dosya.
 *   2. Bu hesap artık tür kırılımı da taşıyor; saf olmadan test edilemezdi.
 *
 * ─ Neden tür kırılımı ─
 *   `activity` alanı her seansa yazılıyordu ama hiçbir ekranda görünmüyordu:
 *   veri toplanıyor, kullanılmıyordu. Oysa asıl soruyu ancak bu kırılım
 *   cevaplıyor — "bu konuyu çok izledim ama hiç soru çözmemişim." Ders ya da
 *   konu toplamı tek başına bunu gizler.
 *
 * ─ Branş denemesi ─
 *   `topic` alanında BRANCH_EXAM_TOPIC taşır, yani konu listesinde kendi
 *   satırı olarak görünür. Gizlemiyoruz: süre gerçekten oraya gitti ve
 *   gizlenseydi konu toplamları ders toplamını tutmazdı.
 */
import { ACTIVITIES, resolveActivity, getActivity } from '../data/activities.js';

/** Tüm tür kimlikleri, ACTIVITIES sırasıyla — kırılımların sabit sırası. */
export const ACTIVITY_IDS = ACTIVITIES.map((a) => a.id);

/** Sıfırlanmış tür kovası: { lecture: 0, practice: 0, branch: 0 } */
export function emptyBreakdown() {
  const out = {};
  for (const id of ACTIVITY_IDS) out[id] = 0;
  return out;
}

/**
 * Tür kovasını yığılı çubuk için segmentlere çevirir.
 * Yalnızca DOLU türler döner; sıfır genişlikli segment çizmenin anlamı yok.
 */
export function toSegments(breakdown, totalMinutes) {
  if (!totalMinutes || totalMinutes <= 0) return [];

  return ACTIVITY_IDS.filter((id) => (breakdown[id] || 0) > 0).map((id) => {
    const meta = getActivity(id);
    const minutes = breakdown[id];
    return {
      id,
      label: meta.label,
      short: meta.short,
      icon: meta.icon,
      minutes,
      pct: (minutes / totalMinutes) * 100,
    };
  });
}

/**
 * Seansları ders → konu → tür olarak toplar.
 *
 * Konu yüzdesi DERSİN kendi toplamına göre hesaplanır — "Fizik'in %60'ı Optik"
 * bilgisi, genel toplamdaki payından daha okunabilir.
 *
 * @param {Array} sessions studySessions
 * @returns {{ stats: Array, grandTotal: number, byActivity: object }}
 */
export function buildSubjectStats(sessions) {
  const bySubject = new Map();
  const overall = emptyBreakdown();
  let total = 0;

  for (const s of sessions || []) {
    const subject = s?.subject || 'Diğer';
    const topic = s?.topic || 'Konu Belirtilmemiş';
    const minutes = Number(s?.durationMinutes) || 0;
    if (minutes <= 0) continue;

    // Eski kayıtlarda `activity` yok; konu adından türetilir
    const activity = resolveActivity(s);

    if (!bySubject.has(subject)) {
      bySubject.set(subject, {
        totalMinutes: 0,
        byActivity: emptyBreakdown(),
        topics: new Map(),
      });
    }

    const entry = bySubject.get(subject);
    entry.totalMinutes += minutes;
    entry.byActivity[activity] += minutes;

    if (!entry.topics.has(topic)) {
      entry.topics.set(topic, { totalMinutes: 0, byActivity: emptyBreakdown() });
    }
    const topicEntry = entry.topics.get(topic);
    topicEntry.totalMinutes += minutes;
    topicEntry.byActivity[activity] += minutes;

    overall[activity] += minutes;
    total += minutes;
  }

  const stats = [...bySubject.entries()]
    .map(([subject, entry]) => ({
      subject,
      totalMinutes: entry.totalMinutes,
      percentage: total > 0 ? Math.round((entry.totalMinutes / total) * 100) : 0,
      byActivity: entry.byActivity,
      segments: toSegments(entry.byActivity, entry.totalMinutes),
      topics: [...entry.topics.entries()]
        .map(([topic, t]) => ({
          topic,
          totalMinutes: t.totalMinutes,
          // Ders içi pay
          percentage:
            entry.totalMinutes > 0
              ? Math.round((t.totalMinutes / entry.totalMinutes) * 100)
              : 0,
          byActivity: t.byActivity,
          segments: toSegments(t.byActivity, t.totalMinutes),
        }))
        .sort((a, b) => b.totalMinutes - a.totalMinutes),
    }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes);

  return { stats, grandTotal: total, byActivity: overall };
}
