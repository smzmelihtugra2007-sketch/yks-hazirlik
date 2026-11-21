/**
 * ─── GÖREV AĞACI (MISSION TREE) KURAL MOTORU ───
 *
 * Görev ağacı ayrı bir veri seti tutmaz; src/data/subjects.js içindeki
 * Ders → Konu hiyerarşisini ve kronometrenin ürettiği seansları okuyarak
 * düğümleri türetir. Böylece konu listesine eklenen her başlık ağaçta da
 * kendiliğinden belirir, iki yerde bakım yapılmaz.
 *
 * ─ Düğüm durumları ─
 *   locked    : Önceki düğüm henüz kapatılmadı, sıra buraya gelmedi.
 *   active    : Sırası geldi ama 2 saatlik baraj dolmadı.
 *   ready     : Baraj doldu, "Tamamla" düğmesi açıldı.
 *   completed : Öğrenci düğümü kapattı.
 *
 * Zincir kuralı: İlk düğüm her zaman açıktır, sonrakiler bir öncekinin
 * tamamlanmasıyla açılır. Böylece sayfa bir yol haritası gibi ilerler.
 */
// Açık `.js` uzantısı: bu modül Node ile doğrudan test edilebilir olmalı
// (düğüm kimliğinin deneme etiketleriyle aynı kaldığını doğruluyoruz).
import { getSubjectByLabel, makeTopicKey } from '../data/subjects.js';

/** Bir düğümün "Tamamla" düğmesinin açılması için gereken süre (dakika). */
export const MISSION_THRESHOLD_MINUTES = 120;

/**
 * Düğümün kalıcı kimliği. Ders kodu + konu adından üretilir; ders adı
 * değişse bile kod sabit kaldığı için tamamlanmış görevler kaybolmaz.
 *
 * Üretimi `subjects.makeTopicKey`'e devredildi: deneme kayıtlarındaki konu
 * etiketleri de aynı anahtarı yazıyor ve iki ayrı tanım zamanla ayrışırdı.
 */
export function makeMissionId(subjectId, topic) {
  return makeTopicKey(subjectId, topic);
}

/**
 * Bir dersin görev zincirini hesaplar.
 *
 * @param {object}   subject          subjects.js içindeki ders kaydı
 * @param {Array}    studySessions    Store'daki tüm çalışma seansları
 * @param {string[]} completedIds     Tamamlanmış görev kimlikleri
 * @returns {{nodes: Array, totals: object}}
 */
export function buildMissionChain(subject, studySessions, completedIds) {
  if (!subject) {
    return { nodes: [], totals: { total: 0, completed: 0, percentage: 0, studiedMinutes: 0 } };
  }

  const completed = new Set(completedIds || []);

  // Bu dersin seanslarını konuya göre topla (tek geçiş)
  const minutesByTopic = new Map();
  let studiedMinutes = 0;

  for (const s of studySessions || []) {
    if (s.subject !== subject.label) continue;
    const topic = s.topic;
    if (!topic) continue;

    const mins = s.durationMinutes || 0;
    minutesByTopic.set(topic, (minutesByTopic.get(topic) || 0) + mins);
    studiedMinutes += mins;
  }

  // Zincir: her düğüm bir öncekinin tamamlanmasıyla açılır.
  //
  // İSTİSNA — süresi olan düğüm her zaman açıktır. İki sebep:
  //   1. Konu listesi müfredat sırasıyla genişletildi; araya giren yeni bir
  //      düğüm, öğrencinin üzerinde çalıştığı düğümü kilitleyip ilerlemesini
  //      görünmez kılıyordu.
  //   2. Kronometrede konu kilidi yok — öğrenci her konuya çalışabiliyor.
  //      Haritanın 2 saat çalışılmış bir düğümü "Kilitli" gösterip
  //      kapatılamaz bırakması gerçeği yansıtmıyordu.
  // Kilit artık yalnızca HİÇ dokunulmamış konuların sırasını belirliyor.
  let previousCompleted = true;
  const nodes = subject.topics.map((topic, index) => {
    const id = makeMissionId(subject.id, topic);
    const isCompleted = completed.has(id);
    const minutes = minutesByTopic.get(topic) || 0;
    const isUnlocked = previousCompleted || minutes > 0;
    const progress = Math.min(100, Math.round((minutes / MISSION_THRESHOLD_MINUTES) * 100));
    const meetsThreshold = minutes >= MISSION_THRESHOLD_MINUTES;

    let status;
    if (isCompleted) status = 'completed';
    else if (!isUnlocked) status = 'locked';
    else if (meetsThreshold) status = 'ready';
    else status = 'active';

    previousCompleted = isCompleted;

    return {
      id,
      index,
      topic,
      subjectId: subject.id,
      subjectLabel: subject.label,
      minutes,
      progress,
      status,
      canComplete: status === 'ready',
      remainingMinutes: Math.max(0, MISSION_THRESHOLD_MINUTES - minutes),
    };
  });

  const completedCount = nodes.filter((n) => n.status === 'completed').length;

  return {
    nodes,
    totals: {
      total: nodes.length,
      completed: completedCount,
      percentage: nodes.length > 0 ? Math.round((completedCount / nodes.length) * 100) : 0,
      studiedMinutes,
    },
  };
}

/**
 * Tüm dersler genelindeki ilerleme — üstteki özet kartı besler.
 *
 * @param {Array}    subjects       Görünür ders listesi
 * @param {string[]} completedIds   Tamamlanmış görev kimlikleri
 */
export function getOverallProgress(subjects, completedIds) {
  const completed = new Set(completedIds || []);
  let total = 0;
  let done = 0;

  for (const subject of subjects) {
    for (const topic of subject.topics) {
      total += 1;
      if (completed.has(makeMissionId(subject.id, topic))) done += 1;
    }
  }

  return {
    total,
    completed: done,
    percentage: total > 0 ? Math.round((done / total) * 100) : 0,
  };
}

/** Ders adından o dersin kaydını getirir (sayfa tarafı için ince sarmalayıcı). */
export function getSubject(label) {
  return getSubjectByLabel(label);
}
