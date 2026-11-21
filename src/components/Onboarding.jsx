/**
 * ─── İLK AÇILIŞ KARŞILAMASI ───
 *
 * Bu ekran olmadan yeni kullanıcı uygulamayı açtığında "Emre Yılmaz" adına
 * kayıtlı sahte denemelerle karşılaşıyordu; kendi verisini nereden
 * başlatacağını bilmiyor ve uygulama demo gibi duruyordu.
 *
 * Tek ekran, dört alan, tek düğme. Kasıtlı olarak adım adım bir sihirbaz
 * değil: amaç öğrenciyi en kısa yoldan içeri almak. Yalnızca ad zorunlu;
 * alan Sayısal, hedef sıralama 70.000 ve OBP 75 varsayılan gelir, hepsi
 * değiştirilebilir ve sonradan Ayarlar'dan düzenlenebilir.
 *
 * OBP (Okul Başarı Puanı) sıralama simülasyonunun girdisidir; karşılamada
 * sorulmazsa öğrencinin ilk tahminleri gerçek puanından sapar.
 *
 * Tamamlanınca demo veri temizlenir (bkz. store: completeOnboarding).
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, ArrowRight } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { TRACKS } from '../data/mockData';
import { EASE_OUT_SOFT } from '../utils/motion';

/** "Sadece TYT" bir alan değil, showAyt === false durumudur. */
const TYT_ONLY = 'TYT_ONLY';

const DEFAULT_TRACK = 'SAY';
const DEFAULT_TARGET_RANK = 70000;
const DEFAULT_OBP = 75;

export default function Onboarding() {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [name, setName] = useState('');
  const [choice, setChoice] = useState(DEFAULT_TRACK);
  const [targetRank, setTargetRank] = useState(String(DEFAULT_TARGET_RANK));
  const [obp, setObp] = useState(String(DEFAULT_OBP));

  const canSubmit = name.trim().length > 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    const parsedRank = parseInt(targetRank, 10);
    const parsedObp = parseFloat(obp);

    completeOnboarding({
      userName: name,
      selectedTrack: choice === TYT_ONLY ? DEFAULT_TRACK : choice,
      showAyt: choice !== TYT_ONLY,
      targetRank: Number.isFinite(parsedRank) && parsedRank > 0
        ? Math.min(3_000_000, parsedRank)
        : DEFAULT_TARGET_RANK,
      // OBP 50-100 aralığında; store da aynı aralığa kıstırıyor
      obpScore: Number.isFinite(parsedObp)
        ? Math.min(100, Math.max(50, parsedObp))
        : DEFAULT_OBP,
    });
  };

  const options = [
    ...Object.entries(TRACKS).map(([code, track]) => ({ value: code, label: track.label })),
    { value: TYT_ONLY, label: 'Sadece TYT' },
  ];

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 transition-colors duration-200"
      style={{ backgroundColor: 'var(--bg-app)' }}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: EASE_OUT_SOFT }}
        className="w-full max-w-md"
      >
        {/* ── Başlık ── */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--text-main)' }}
          >
            YKS Hazırlık
          </h1>
          <p
            className="text-sm mt-1.5 font-medium max-w-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            Üç kısa soruyla başlayalım. Hepsini sonradan Ayarlar'dan
            değiştirebilirsin.
          </p>
        </div>

        {/* ── Form ── */}
        <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-5">
          {/* 1. Ad */}
          <label className="block">
            <span
              className="text-[11px] font-bold uppercase tracking-wider block mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Adın
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Elif"
              autoFocus
              maxLength={40}
              className="input-field text-sm font-semibold"
            />
          </label>

          {/* 2. Alan */}
          <div>
            <span
              className="text-[11px] font-bold uppercase tracking-wider block mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Alanın
            </span>
            <div className="flex flex-wrap gap-2">
              {options.map((opt) => {
                const isActive = choice === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setChoice(opt.value)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                      isActive
                        ? 'text-white border-transparent shadow-sm'
                        : 'hover:opacity-80'
                    }`}
                    style={
                      isActive
                        ? { backgroundColor: 'var(--accent-brand)' }
                        : {
                            backgroundColor: 'var(--bg-input)',
                            borderColor: 'var(--border-card)',
                            color: 'var(--text-muted)',
                          }
                    }
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Hedef sıralama + 4. OBP — yan yana, form kısa kalsın */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span
                className="text-[11px] font-bold uppercase tracking-wider block mb-2"
                style={{ color: 'var(--text-muted)' }}
              >
                Hedef sıralama
              </span>
              <input
                type="number"
                min={1}
                max={3000000}
                value={targetRank}
                onChange={(e) => setTargetRank(e.target.value)}
                placeholder="70000"
                className="input-field text-sm font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </label>

            <label className="block">
              <span
                className="text-[11px] font-bold uppercase tracking-wider block mb-2"
                style={{ color: 'var(--text-muted)' }}
              >
                OBP
              </span>
              <input
                type="number"
                min={50}
                max={100}
                step="0.01"
                value={obp}
                onChange={(e) => setObp(e.target.value)}
                placeholder="75"
                className="input-field text-sm font-semibold tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </label>
          </div>

          <p
            className="text-[11px] font-medium -mt-2"
            style={{ color: 'var(--text-subtle)' }}
          >
            OBP = Okul Başarı Puanı (50-100). Sıralama tahminlerinde kullanılır;
            bilmiyorsan 75 olarak bırakabilirsin.
          </p>

          {/* Gönder */}
          <motion.button
            type="submit"
            disabled={!canSubmit}
            whileHover={canSubmit ? { y: -1 } : undefined}
            whileTap={canSubmit ? { scale: 0.98 } : undefined}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--accent-brand)' }}
          >
            <span>Başla</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>

          {!canSubmit && (
            <p
              className="text-[11px] font-semibold text-center"
              style={{ color: 'var(--text-subtle)' }}
            >
              Devam etmek için adını yaz.
            </p>
          )}
        </form>
      </motion.div>
    </div>
  );
}
