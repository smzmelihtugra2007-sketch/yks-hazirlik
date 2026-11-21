/**
 * ─── ODAK KRONOMETRESİ MODLARI ───
 *
 * Bu liste eskiden StudyTimer.jsx içindeydi. Artık seans durumu store'da
 * yaşadığı ve sayaç sayfası kapalıyken de (arka planda çalışan gözcü
 * tarafından) değerlendirildiği için ortak bir yere taşındı.
 *
 * `seconds` yalnızca geri sayım modlarının hedef süresidir; kronometrede
 * null'dur. Özel Süre'nin hedefi kullanıcının girdiği dakikadan hesaplanır,
 * bu yüzden burada 0 durur.
 */

export const MODES = [
  { id: 'stopwatch', label: 'Kronometre',      seconds: null,     countdown: false },
  { id: 'custom',    label: 'Özel Süre',       seconds: 0,        countdown: true  },
  { id: 'pomo25',    label: 'Pomodoro (25dk)', seconds: 25 * 60,  countdown: true  },
  { id: 'lesson40',  label: 'Ders (40dk)',     seconds: 40 * 60,  countdown: true  },
  { id: 'deep50',    label: 'Derin (50dk)',    seconds: 50 * 60,  countdown: true  },
  { id: 'tyt165',    label: 'TYT (165dk)',     seconds: 165 * 60, countdown: true  },
  { id: 'ayt180',    label: 'AYT (180dk)',     seconds: 180 * 60, countdown: true  },
];

export const DEFAULT_MODE_ID = 'stopwatch';
export const DEFAULT_CUSTOM_MINUTES = 35;

/** Kimliğe göre mod kaydı; bilinmeyen kimlikte kronometreye düşer. */
export function getMode(modeId) {
  return MODES.find((m) => m.id === modeId) || MODES[0];
}

/**
 * Modun hedef süresi (saniye). Kronometrede null döner — bitiş yok.
 * Özel Süre'de kullanıcının girdiği dakika esas alınır.
 */
export function getTargetSeconds(modeId, customMinutes = DEFAULT_CUSTOM_MINUTES) {
  const mode = getMode(modeId);
  if (!mode.countdown) return null;
  if (mode.id === 'custom') {
    return Math.max(1, Number(customMinutes) || DEFAULT_CUSTOM_MINUTES) * 60;
  }
  return mode.seconds;
}
