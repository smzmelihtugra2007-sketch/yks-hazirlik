/**
 * ─── SENTEZLENMİŞ BAŞARI SESLERİ (Web Audio API) ───
 *
 * Hiçbir ses dosyası indirilmez; tınılar tarayıcıda osilatörle üretilir.
 * Bu sayede PWA çevrimdışıyken de çalışır ve bundle boyutu büyümez.
 *
 * Tasarım notları:
 *  - Frekanslar bir majör akorun basamakları (C6 - E6 - G6 - C7) üzerinden
 *    yükselir; kulakta "kilit açıldı" hissi veren klasik yükselen arpej.
 *  - Her nota sine + triangle osilatör çiftiyle çalınır: sine gövdeyi,
 *    düşük seviyeli triangle ise fütüristik parlaklığı verir.
 *  - Ataklar 12ms, sönümler üstel — tıkırtı (click) olmaz, yumuşak duyulur.
 *  - AudioContext tek örnek olarak tutulur ve tarayıcı politikası gereği
 *    yalnızca kullanıcı etkileşiminden sonra başlatılır.
 */

let audioCtx = null;

/** Tek bir AudioContext örneği döndürür; desteklenmiyorsa null. */
function getAudioContext() {
  if (typeof window === 'undefined') return null;

  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;

  if (!audioCtx) {
    try {
      audioCtx = new Ctor();
    } catch {
      return null;
    }
  }

  // Sekme arka plana alındığında bağlam askıya alınmış olabilir
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

/**
 * Tek bir yumuşak nota çalar.
 *
 * @param {AudioContext} ctx
 * @param {number} frequency  Hz
 * @param {number} startAt    ctx.currentTime'a göre saniye cinsinden gecikme
 * @param {number} duration   Saniye
 * @param {number} peakGain   Tepe ses seviyesi (0-1)
 */
function playNote(ctx, frequency, startAt, duration, peakGain) {
  const t0 = ctx.currentTime + startAt;

  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  // Üstel sönüm: 0'dan başlayamayacağı için çok küçük bir değerle başlatılır
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peakGain, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  // Gövde (sine) + parlaklık (triangle, daha kısık)
  const voices = [
    { type: 'sine', detune: 0, level: 1 },
    { type: 'triangle', detune: 4, level: 0.35 },
  ];

  for (const voice of voices) {
    const osc = ctx.createOscillator();
    osc.type = voice.type;
    osc.frequency.setValueAtTime(frequency, t0);
    osc.detune.setValueAtTime(voice.detune, t0);

    if (voice.level === 1) {
      osc.connect(gain);
    } else {
      const sub = ctx.createGain();
      sub.gain.setValueAtTime(voice.level, t0);
      sub.connect(gain);
      osc.connect(sub);
    }

    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }
}

/**
 * "Level Up / Kilit Açıldı" tınısı: yükselen dört notalık kısa arpej.
 * Ses çalınamazsa (desteklenmiyor, sekme sessizde) sessizce yutulur —
 * kutlama akışı asla bu yüzden kesilmez.
 */
export function playLevelUpChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // C6 - E6 - G6 - C7: yükselen majör arpej
    const notes = [
      { freq: 1046.5, at: 0.0,  dur: 0.18, gain: 0.16 },
      { freq: 1318.5, at: 0.09, dur: 0.18, gain: 0.15 },
      { freq: 1568.0, at: 0.18, dur: 0.22, gain: 0.14 },
      { freq: 2093.0, at: 0.28, dur: 0.55, gain: 0.12 }, // Son nota uzar ve söner
    ];

    for (const n of notes) {
      playNote(ctx, n.freq, n.at, n.dur, n.gain);
    }
  } catch {
    // Ses üretilemedi — sessizce geç
  }
}

/**
 * Odak sayacının hedef süresi dolduğunda çalan alarm.
 *
 * Kutlama tınısından (yükselen arpej) kasıtlı olarak farklı: aynı iki nota
 * üç kez tekrarlanır, yani "bitti" der, "tebrikler" demez. Dışarıdan ses
 * dosyası indirmediği için uygulama çevrimdışıyken de çalışır.
 */
export function playTimerAlarm() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // G5 - C6 ikilisi, üç kez, aralarında nefes payı
    for (let i = 0; i < 3; i += 1) {
      const at = i * 0.42;
      playNote(ctx, 784.0, at, 0.16, 0.13);
      playNote(ctx, 1046.5, at + 0.13, 0.22, 0.12);
    }
  } catch {
    // Ses üretilemedi — sessizce geç
  }
}

/**
 * Sayaç bir kural nedeniyle kendiliğinden duraklatıldığında çalan kısa tını.
 *
 * İnen iki nota (E5 → B4): alarm gibi zorlayıcı değil, "durdu" der. Hedef
 * süre alarmından (yükselen, tekrarlı) ve kutlama tınısından (arpej) kasten
 * farklıdır ki öğrenci sesi duyunca ne olduğunu ayırt edebilsin.
 *
 * Not: Duraklatma "uygulamadan çıkıldı" sebebiyle tetiklendiyse sekme o an
 * arka plana geçmiş olur; tarayıcılar arka plandaki sekmede sesi askıya
 * alabildiği için bu durumda ses her cihazda duyulmayabilir.
 */
export function playPauseChime() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    playNote(ctx, 659.3, 0, 0.14, 0.11);   // E5
    playNote(ctx, 493.9, 0.11, 0.26, 0.10); // B4
  } catch {
    // Ses üretilemedi — sessizce geç
  }
}

/**
 * İmza uyuşmazlığı şakasının "bum" efekti. Eskiden telifli bir meme ses
 * dosyasıydı; herkese açık depoda tutulamadığı için sentezleniyor. Etki,
 * perdenin hızla düştüğü alçak bir sinüsten geliyor.
 */
export function playBoom() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const t0 = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.5, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);

    for (const [type, level] of [['sine', 1], ['triangle', 0.3]]) {
      const osc = ctx.createOscillator();
      const voice = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(140, t0);
      osc.frequency.exponentialRampToValueAtTime(36, t0 + 0.9);
      voice.gain.setValueAtTime(level, t0);
      osc.connect(voice);
      voice.connect(gain);
      osc.start(t0);
      osc.stop(t0 + 1.15);
    }
  } catch {
    // Sessizce geç
  }
}

/** Kilitli bir düğüme dokunulduğunda çalan kısa, alçak "reddedildi" tınısı. */
export function playLockedThud() {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    playNote(ctx, 180, 0, 0.14, 0.09);
    playNote(ctx, 120, 0.06, 0.18, 0.07);
  } catch {
    // Sessizce geç
  }
}
