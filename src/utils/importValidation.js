/**
 * ─── İÇE AKTARMA DOĞRULAMASI (saf, Node ile test edilebilir) ───
 *
 * Yedek dosyası dışarıdan gelen veridir: elle düzenlenmiş, yarım indirilmiş
 * ya da başkasından alınmış olabilir. Eskiden doğrudan store'a yazılıyordu;
 * `trials: "abc"` gibi tek bir yanlış tip uygulamayı HER AÇILIŞTA
 * çökertiyordu, çünkü bozuk durum kalıcı depoya geçiyordu. Kurtulmanın tek
 * yolu site verisini silmekti, yani bir yıllık kaydı kaybetmek.
 *
 * İlke: kaydı reddetmek yerine ayıkla. Bozuk tek bir deneme yüzünden 300
 * sağlam seansı geri çevirmek, öğrencinin yedeğini işe yaramaz kılardı.
 * Atılan kayıtlar sayılır ve onay ekranında söylenir.
 *
 * Bilinen alanlar tip kontrolünden geçer; bilinmeyen alanlardan yalnızca
 * İLKEL değerler (metin/sayı/mantıksal) taşınır — ileride eklenen bir alan
 * kaybolmasın ama ekranda nesne çizilip React çökmesin.
 */

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024;

const LIMITS = {
  trials: 5_000,
  studySessions: 100_000,
  topics: 2_000,
  completedMissions: 10_000,
  lossTopics: 60,
};

const MAX_STRING = 500;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const RESULT_CODE_RE = /^[A-Z0-9_]{2,24}$/;
const THEMES = ['light', 'dark', 'sepia'];
const ACTIVITIES = ['lecture', 'practice', 'branch'];
const BLANK_REASONS = ['unknown', 'time', 'unsure'];
const EXAM_TYPES = ['TYT', 'AYT'];
const MAX_SESSION_MINUTES = 24 * 60;
const MAX_QUESTIONS = 200;

export class ImportValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImportValidationError';
  }
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const safeEntries = (obj) => Object.entries(obj).filter(([k]) => !FORBIDDEN_KEYS.has(k));

function str(v, max = MAX_STRING) {
  return typeof v === 'string' ? v.slice(0, max) : undefined;
}

function num(v, min, max) {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined;
}

function copyPrimitives(src) {
  const out = {};
  for (const [k, v] of safeEntries(src)) {
    if (typeof v === 'string') out[k] = v.slice(0, MAX_STRING);
    else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean' || v === null) out[k] = v;
  }
  return out;
}

function sanitizeArray(value, limit, label, itemFn) {
  if (value === undefined) return { items: undefined, skipped: 0 };
  if (!Array.isArray(value)) {
    throw new ImportValidationError(`"${label}" alanı liste değil; dosya bozuk görünüyor.`);
  }
  if (value.length > limit) {
    throw new ImportValidationError(`"${label}" alanında ${value.length} kayıt var (sınır ${limit}).`);
  }
  const items = [];
  let skipped = 0;
  value.forEach((raw, i) => {
    const clean = itemFn(raw, i);
    if (clean === null) skipped += 1;
    else items.push(clean);
  });
  return { items, skipped };
}

function sanitizeResult(r) {
  if (!isPlainObject(r)) return null;
  const out = copyPrimitives(r);
  for (const field of ['correct', 'wrong', 'blank']) {
    const value = num(r[field], 0, MAX_QUESTIONS);
    if (value === undefined) return null;
    out[field] = value;
  }
  if (!BLANK_REASONS.includes(out.blankReason)) delete out.blankReason;
  // copyPrimitives metin olarak gelen lossTopics'i taşımış olabilir; dizi
  // bekleyen topicLeaks onu .forEach ile gezerken çökerdi.
  delete out.lossTopics;
  if (Array.isArray(r.lossTopics)) {
    const topics = r.lossTopics
      .filter((t) => typeof t === 'string' && t.length > 0)
      .map((t) => t.slice(0, 200))
      .slice(0, LIMITS.lossTopics);
    if (topics.length > 0) out.lossTopics = [...new Set(topics)];
  }
  return out;
}

function sanitizeTrial(t, i) {
  if (!isPlainObject(t)) return null;
  if (!DATE_KEY_RE.test(t.date ?? '')) return null;
  if (!EXAM_TYPES.includes(t.type)) return null;
  if (!isPlainObject(t.results)) return null;

  const results = {};
  for (const [code, r] of safeEntries(t.results)) {
    if (!RESULT_CODE_RE.test(code)) continue;
    const clean = sanitizeResult(r);
    if (clean) results[code] = clean;
  }
  if (Object.keys(results).length === 0) return null;

  const out = copyPrimitives(t);
  out.id = str(t.id, 100) || `trial_import_${i}`;
  out.name = str(t.name, 120) ?? '';
  out.results = results;
  if (num(t.createdAt, 0, 8.64e15) === undefined) delete out.createdAt;
  return out;
}

function sanitizeSession(s, i) {
  if (!isPlainObject(s)) return null;
  if (!DATE_KEY_RE.test(s.date ?? '')) return null;
  const minutes = num(s.durationMinutes, 0, MAX_SESSION_MINUTES);
  if (minutes === undefined) return null;
  const subject = str(s.subject, 120);
  if (!subject) return null;

  const out = copyPrimitives(s);
  out.id = str(s.id, 100) || `session_import_${i}`;
  out.subject = subject;
  out.durationMinutes = minutes;
  out.subjectId = str(s.subjectId, 40) ?? null;
  out.topic = str(s.topic, 200) ?? null;
  // Türü olmayan eski kayıtlar okuma anında konu adından türetilir
  if (!ACTIVITIES.includes(out.activity)) delete out.activity;
  return out;
}

function sanitizeTopic(t) {
  if (!isPlainObject(t)) return null;
  const id = str(t.id, 100);
  const name = str(t.name, 200);
  const subject = str(t.subject, 40);
  if (!id || !name || !subject) return null;
  return { ...copyPrimitives(t), id, name, subject };
}

function sanitizeMission(id) {
  return typeof id === 'string' && id.length > 0 && id.length <= 300 ? id : null;
}

/**
 * @param {unknown} data       Yedek dosyasının veri nesnesi
 * @param {{ trackIds: string[] }} options
 * @returns {{ data: object, skipped: Record<string, number> }}
 *   `data` yalnızca geçerli alanları taşır; olmayan alan store'da korunur.
 */
export function sanitizeImport(data, { trackIds }) {
  if (!isPlainObject(data)) {
    throw new ImportValidationError('Geçersiz dosya formatı: veri nesnesi bulunamadı.');
  }

  const out = {};
  const skipped = {};

  const userName = str(data.userName, 60)?.trim();
  if (userName) out.userName = userName;

  const targetRank = num(data.targetRank, 1, 5_000_000);
  if (targetRank !== undefined) out.targetRank = Math.round(targetRank);

  const obp = num(data.obpScore, 0, 100);
  if (obp !== undefined) out.obpScore = Math.min(100, Math.max(50, obp));

  if (trackIds.includes(data.selectedTrack)) out.selectedTrack = data.selectedTrack;
  if (typeof data.showAyt === 'boolean') out.showAyt = data.showAyt;
  if (THEMES.includes(data.theme)) out.theme = data.theme;

  const streak = num(data.studyStreak, 0, 100_000);
  if (streak !== undefined) out.studyStreak = Math.floor(streak);
  if (data.lastActiveDate === null || DATE_KEY_RE.test(data.lastActiveDate ?? '')) {
    out.lastActiveDate = data.lastActiveDate ?? null;
  }

  const arrays = [
    ['trials', LIMITS.trials, sanitizeTrial],
    ['studySessions', LIMITS.studySessions, sanitizeSession],
    ['completedMissions', LIMITS.completedMissions, sanitizeMission],
    ['tytTopics', LIMITS.topics, sanitizeTopic],
    ['aytTopics', LIMITS.topics, sanitizeTopic],
  ];
  for (const [key, limit, fn] of arrays) {
    const { items, skipped: n } = sanitizeArray(data[key], limit, key, fn);
    if (items !== undefined) out[key] = key === 'completedMissions' ? [...new Set(items)] : items;
    if (n > 0) skipped[key] = n;
  }

  if (!out.trials && !out.studySessions && !out.userName && !out.selectedTrack) {
    throw new ImportValidationError('Bu dosya bir YKS Hazırlık yedeği gibi görünmüyor.');
  }

  return { data: out, skipped };
}
