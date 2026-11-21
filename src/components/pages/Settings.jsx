/**
 * ─── AYARLAR SAYFASI (INDEXEDDB VE VERİ YÖNETİMİ) ───
 *
 * Kullanıcı profil ayarları:
 *  - Ad
 *  - Hedef Sıralama
 *  - OBP (Okul Başarı Puanı)
 *  - Sınav Hedefi (TYT+AYT / Sadece TYT)
 *  - Görünüm / Tema Motoru (Açık ☀️, Karanlık 🌙, Gece Kahvesi ☕)
 *  - Alan Seçimi (SAY 💜, EA 🧡, SOZ 💚, DIL 💖)
 *  - Veri Yedekleme ve Güvenlik (SHA-256 İmzalı JSON Dışa / İçe Aktarma)
 *  - Kriptografik İmza Uyuşmazlığı → Easter Egg Modalı
 *  - Verileri Sıfırlama
 */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  User,
  Target,
  Map,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Palette,
  Sun,
  Moon,
  Coffee,
  Download,
  Upload,
  Database,
  ShieldCheck,
  FileJson,
} from 'lucide-react';
import { playBoom } from '../../utils/sound';
import useAppStore from '../../store/useAppStore';
import { TRACKS } from '../../data/mockData';
import {
  exportDataAsJson,
  generateBackupJSON,
  parseAndValidateJsonFile,
  SignatureMismatchError,
  savePreImportSnapshot,
  loadPreImportSnapshot,
  clearPreImportSnapshot,
} from '../../utils/storage';
import { sanitizeImport } from '../../utils/importValidation';
import { BACKUP_INTERVAL_OPTIONS, describeAge } from '../../utils/backupReminder';
import ResetConfirmModal from '../ResetConfirmModal';
import ConfirmDialog from '../ui/ConfirmDialog';

const TRACK_IDS = Object.keys(TRACKS);

// Geri alma yalnızca kısa süre sunulur: haftalar sonra geri almak, içe
// aktarmadan bu yana girilen her kaydı sessizce silerdi.
const UNDO_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function isWithinUndoWindow(isoDate) {
  const t = Date.parse(isoDate);
  return Number.isFinite(t) && Date.now() - t < UNDO_WINDOW_MS;
}

function formatDateTime(isoDate) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' });
}

/** Onay penceresi metni: ne gelecek, ne gidecek, ne atlandı. */
function describeImport(pending, current) {
  const parts = [];
  const when = pending.exportedAt && formatDateTime(pending.exportedAt);
  if (when) parts.push(`Yedek tarihi: ${when}.`);

  const incomingTrials = pending.data.trials;
  const incomingSessions = pending.data.studySessions;
  if (incomingTrials || incomingSessions) {
    parts.push(
      `Yedekte ${incomingTrials?.length ?? 0} deneme ve ${incomingSessions?.length ?? 0} çalışma seansı var. ` +
        `Şu anki ${current.trials.length} deneme ve ${current.studySessions.length} seansın bu yedekle DEĞİŞTİRİLECEK.`
    );
  }

  const skippedTotal = Object.values(pending.skipped).reduce((a, b) => a + b, 0);
  if (skippedTotal > 0) parts.push(`Bozuk olduğu için ${skippedTotal} kayıt atlandı.`);

  parts.push("Mevcut durumun otomatik saklanır; 7 gün içinde buradan geri alabilirsin.");
  return parts.join(' ');
}

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function SettingsPage() {
  const storeState = useAppStore();
  const {
    userName, setUserName,
    targetRank, setTargetRank,
    obpScore, setObpScore,
    showAyt, setShowAyt,
    selectedTrack, setSelectedTrack,
    theme, setTheme,
    importFullData,
    resetToDefaults,
    lastBackupAt,
    backupReminderDays, setBackupReminderDays,
    markBackupTaken,
  } = storeState;

  const [resetSuccess, setResetSuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState(null); // { type: 'success' | 'error', message: string }
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState(null); // { data, skipped, exportedAt }
  const [undoSnapshot, setUndoSnapshot] = useState(null);   // { exportedAt, data }
  const [isUndoOpen, setIsUndoOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadPreImportSnapshot()
      .then((snap) => {
        if (snap && isWithinUndoWindow(snap.exportedAt)) setUndoSnapshot(snap);
      })
      .catch(() => {});
  }, []);

  // ─── OBP Local State (Yazarken anında zıplamayı önler) ───
  const [localObpText, setLocalObpText] = useState(() => String(obpScore ?? 75));

  useEffect(() => {
    setLocalObpText(String(obpScore ?? 75));
  }, [obpScore]);

  const commitObp = () => {
    const sanitized = String(localObpText).replace(',', '.').trim();
    const parsed = parseFloat(sanitized);
    if (!isNaN(parsed)) {
      const clamped = Math.min(100, Math.max(50, parsed));
      setObpScore(clamped);
      setLocalObpText(String(clamped));
    } else {
      setLocalObpText(String(obpScore ?? 75));
    }
  };

  // ─── Verileri Dışa Aktar (SHA-256 İmzalı JSON Backup & Çoklu Paylaşım) ───
  const handleExport = async (options = {}) => {
    const result = await exportDataAsJson(storeState, options);
    if (result.success) {
      // Elle alınan yedek de hatırlatıcının sayacını sıfırlar
      markBackupTaken();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3500);
    }
    return result;
  };

  const handleDownloadBackup = async () => {
    return await handleExport({ mode: 'download' });
  };

  const handleShareOrCloud = async () => {
    try {
      const backupData = await generateBackupJSON(storeState);
      const blob = new Blob([backupData], { type: 'application/json' });
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const file = new File([blob], `yks-yedek-${dateStr}.json`, { type: 'application/json' });

      let canShare = false;
      try {
        canShare = typeof navigator !== 'undefined' && Boolean(navigator.canShare && navigator.canShare({ files: [file] }));
      } catch {
        canShare = false;
      }

      if (canShare) {
        await navigator.share({
          files: [file],
          title: 'YKS Hazırlık Yedek',
          text: 'YKS Hazırlık verilerimin güvenli yedeği.'
        });
      } else {
        // Masaüstü veya desteksiz tarayıcı fallback'i:
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert("Masaüstü tarayıcınız doğrudan uygulama paylaşımını desteklemediği için yedek dosyanız indirildi. Dosyayı WhatsApp Web veya Google Drive'a iletebilirsiniz.");
      }
      markBackupTaken();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error(err);
        alert("Paylaşım başlatılamadı, lütfen yerel indirme seçeneğini kullanın.");
      }
    }
  };

  // ─── Verileri İçe Aktar (SHA-256 Doğrulamalı JSON Restore) ───
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Dosya burada yalnızca okunur; store'a onaydan sonra yazılır
      setPendingImport(await parseAndValidateJsonFile(file, { trackIds: TRACK_IDS }));
    } catch (err) {
      // ─── İmza Uyuşmazlığı → Easter Egg Modalı ───
      if (err instanceof SignatureMismatchError) {
        playBoom();
        setShowEasterEgg(true);
      } else {
        setImportStatus({
          type: 'error',
          message: err.message || 'Dosya içe aktarılırken bir hata oluştu.',
        });
        setTimeout(() => setImportStatus(null), 5000);
      }
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const showImportStatus = (type, message) => {
    setImportStatus({ type, message });
    setTimeout(() => setImportStatus(null), type === 'success' ? 4000 : 6000);
  };

  const confirmImport = async () => {
    const pending = pendingImport;
    setPendingImport(null);
    if (!pending) return;

    try {
      // Güvenlik kopyası alınamazsa içe aktarma YAPILMAZ: geri dönüşü
      // olmayan bir değiştirmeyi kopyasız yapmaktansa vazgeçmek iyidir.
      await savePreImportSnapshot(useAppStore.getState());
    } catch {
      showImportStatus('error', 'Mevcut verinin güvenlik kopyası alınamadığı için içe aktarma yapılmadı.');
      return;
    }

    importFullData(pending.data);
    loadPreImportSnapshot().then(setUndoSnapshot).catch(() => {});
    showImportStatus('success', 'Yedek yüklendi. Önceki durumun saklandı; gerekirse geri alabilirsin.');
  };

  const confirmUndo = () => {
    setIsUndoOpen(false);
    if (!undoSnapshot) return;
    try {
      const { data } = sanitizeImport(undoSnapshot.data, { trackIds: TRACK_IDS });
      importFullData(data);
      clearPreImportSnapshot().catch(() => {});
      setUndoSnapshot(null);
      showImportStatus('success', 'İçe aktarma geri alındı; önceki verilerin yüklendi.');
    } catch (err) {
      showImportStatus('error', err.message || 'Geri alma başarısız oldu.');
    }
  };

  // ─── Easter Egg Modal Kapanış ───
  const closeEasterEgg = () => {
    setShowEasterEgg(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ─── Sıfırlama Modalı Tetikleyici ───
  const handleReset = () => {
    setIsResetModalOpen(true);
  };

  // ─── Sıfırlama Onayı (5s kilit açıldıktan sonra) ───
  const handleConfirmReset = () => {
    resetToDefaults();
    setIsResetModalOpen(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 3000);
  };

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="space-y-6 max-w-3xl mx-auto w-full"
    >
      {/* ── Başlık ── */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
          style={{ backgroundColor: 'var(--bg-input)' }}
        >
          <SettingsIcon className="w-5 h-5" style={{ color: 'var(--accent-brand)' }} />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-main)' }}>
            Ayarlar
          </h1>
          <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-muted)' }}>
            Profil, tema, sınav tercihleri ve veri güvenliğini buradan yönet.
          </p>
        </div>
      </div>

      {/* ═══════════════════ Görünüm / Tema Seçimi ═══════════════════ */}
      <section className="card p-5 lg:p-6 space-y-5">
        <SectionHeader icon={Palette} title="Görünüm & Tema" />

        <FieldGroup label="Uygulama Teması">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Açık (Light) */}
            <ThemeCard
              selected={theme === 'light'}
              onClick={() => setTheme('light')}
              title="Açık (Light)"
              description="Aydınlık, ferah ve net beyaz arayüz."
              Icon={Sun}
              iconColor="text-amber-500"
              cardStyle="bg-white border-slate-300 text-slate-900"
              descStyle="text-slate-600"
            />

            {/* 2. Karanlık (Dark) */}
            <ThemeCard
              selected={theme === 'dark'}
              onClick={() => setTheme('dark')}
              title="Karanlık (Dark)"
              description="Göz yormayan koyu gri ve lacivert tonları."
              Icon={Moon}
              iconColor="text-indigo-400"
              cardStyle="bg-slate-900 border-slate-700 text-slate-100"
              descStyle="text-slate-400"
            />

            {/* 3. Gece Kahvesi (Sepia/OLED) */}
            <ThemeCard
              selected={theme === 'sepia'}
              onClick={() => setTheme('sepia')}
              title="Gece Kahvesi ☕"
              description="Sıcak kahverengi ve OLED dostu tonlar."
              Icon={Coffee}
              iconColor="text-amber-500"
              cardStyle="bg-[#1f1610] border-[#453225] text-amber-100"
              descStyle="text-[#c2ab99]"
            />
          </div>
        </FieldGroup>
      </section>

      {/* ═══════════════════ Profil Bilgileri ═══════════════════ */}
      <section className="card p-5 lg:p-6 space-y-5">
        <SectionHeader icon={User} title="Profil Bilgileri" />

        {/* Ad */}
        <FieldGroup label="Ad Soyad">
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="input-field font-medium"
            placeholder="Adınız Soyadınız"
          />
        </FieldGroup>

        {/* Hedef Sıralama */}
        <FieldGroup label="Hedef Sıralama">
          <input
            type="number"
            value={targetRank}
            onChange={(e) => setTargetRank(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            className="input-field font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="ör. 70000"
          />
          <p className="text-[11px] mt-1 font-medium" style={{ color: 'var(--text-subtle)' }}>
            YKS'de hedeflediğin sıralama (1 – 2.000.000)
          </p>
        </FieldGroup>

        {/* OBP: Okul Başarı Puanı */}
        <FieldGroup label="OBP — Okul Başarı Puanı (50 – 100)">
          <div className="flex items-center gap-3 mb-2">
            <input
              type="text"
              inputMode="decimal"
              value={localObpText}
              onChange={(e) => setLocalObpText(e.target.value)}
              onBlur={commitObp}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitObp();
                  e.target.blur();
                }
              }}
              className="input-field font-bold w-28 text-center"
              placeholder="75.00"
            />
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-bold border"
              style={{
                backgroundColor:
                  obpScore >= 90 ? 'rgba(16,185,129,0.12)'
                  : obpScore >= 75 ? 'rgba(99,102,241,0.12)'
                  : 'rgba(245,158,11,0.12)',
                borderColor:
                  obpScore >= 90 ? 'rgba(16,185,129,0.3)'
                  : obpScore >= 75 ? 'rgba(99,102,241,0.3)'
                  : 'rgba(245,158,11,0.3)',
                color:
                  obpScore >= 90 ? '#10b981'
                  : obpScore >= 75 ? '#6366f1'
                  : '#f59e0b',
              }}
            >
              {obpScore >= 90 ? 'Çok İyi ⭐' : obpScore >= 75 ? 'İyi ✓' : 'Orta ―'}
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            step={0.5}
            value={obpScore}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setObpScore(val);
              setLocalObpText(String(val));
            }}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] font-bold mt-1 select-none" style={{ color: 'var(--text-subtle)' }}>
            <span>50</span><span>75</span><span>100</span>
          </div>
          <p className="text-[11px] mt-1.5 font-medium" style={{ color: 'var(--text-subtle)' }}>
            Yerleşme puanı hesabına dahil edilir. Y-Puan ve OBP katkısı dahil tahmini puan üretilir.
          </p>
        </FieldGroup>
      </section>

      {/* ═══════════════════ Sınav Hedefi ═══════════════════ */}
      <section className="card p-5 lg:p-6 space-y-5">
        <SectionHeader icon={Target} title="Sınav Hedefi" />

        <FieldGroup label="Hangi sınava hazırlanıyorsun?">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ExamGoalCard
              selected={showAyt}
              onClick={() => setShowAyt(true)}
              title="TYT + AYT"
              description="4 yıllık lisans programları için her iki sınavı da hedefliyorum."
              emoji="🎓"
            />
            <ExamGoalCard
              selected={!showAyt}
              onClick={() => setShowAyt(false)}
              title="Sadece TYT"
              description="2 yıllık ön lisans veya yalnızca TYT puanıyla yerleşme hedefi."
              emoji="📋"
            />
          </div>
        </FieldGroup>
      </section>

      {/* ═══════════════════ Alan Seçimi (Renkli Ayrışım) ═══════════════════ */}
      {showAyt && (
        <motion.section
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.25 }}
          className="card p-5 lg:p-6 space-y-5"
        >
          <SectionHeader icon={Map} title="Alan Seçimi" />

          <FieldGroup label="AYT alanın">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.entries(TRACKS).map(([key, track]) => {
                const isSelected = selectedTrack === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedTrack(key)}
                    className="relative flex flex-col items-center gap-1.5 px-3 py-4 rounded-xl border-2 transition-all duration-200"
                    style={{
                      backgroundColor: isSelected ? `${track.color}15` : 'var(--bg-input)',
                      borderColor: isSelected ? track.color : 'var(--border-card)',
                      color: 'var(--text-main)',
                      boxShadow: isSelected ? `0 0 12px ${track.color}30` : 'none',
                    }}
                  >
                    <div
                      className="absolute top-0 left-3 right-3 h-1 rounded-full"
                      style={{ backgroundColor: track.color }}
                    />
                    <span
                      className="text-sm font-extrabold mt-1 tracking-tight"
                      style={{ color: isSelected ? track.color : 'var(--text-main)' }}
                    >
                      {key}
                    </span>
                    <span
                      className="text-[10px] text-center leading-tight font-semibold"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {track.label}
                    </span>
                    {isSelected && (
                      <motion.div
                        layoutId="trackIndicator"
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                        style={{ backgroundColor: track.color }}
                        transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                      >
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </FieldGroup>
        </motion.section>
      )}

      {/* ═══════════════════ Veri Yedekleme ve Güvenlik (IndexedDB) ═══════════════════ */}
      <section className="card p-5 lg:p-6 space-y-5 shadow-card">
        <div
          className="flex items-center justify-between pb-3"
          style={{ borderBottom: '1px solid var(--border-card)' }}
        >
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" style={{ color: 'var(--accent-brand)' }} />
            <h2 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
              Veri Yedekleme & Güvenlik (IndexedDB)
            </h2>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Yalnızca Bu Cihazda</span>
          </div>
        </div>

        {/* Dürüst olmak zorundayız: tek kopya bu cihazda. "Güvenle saklanır"
            demek öğrenciyi yedek almaktan alıkoyuyordu. */}
        <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--text-muted)' }}>
          Verilerin hiçbir sunucuya gönderilmez, yalnızca bu cihazdaki tarayıcı deposunda durur. Tarayıcı verisini silersen ya da cihaz değiştirirsen kaybolur; düzenli yedek al. Yedek dosyaları bozulmaya karşı bütünlük kontrolü içerir.
        </p>

        {/* Buton Grubu */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* 1. Dışa Aktar (Yedekle) */}
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Verileri Dışa Aktar (Yedekle)</span>
          </button>

          {/* 2. İçe Aktar (Geri Yükle) */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Verileri İçe Aktar (Geri Yükle)</span>
          </button>

          {/* Gizli Dosya Girişi */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {/* Yedek hatırlatıcısı: aralık + son yedeğin yaşı */}
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl"
          style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-card)' }}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
              Yedek hatırlatıcısı
            </p>
            <p className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
              {describeAge(lastBackupAt) ? `Son yedek: ${describeAge(lastBackupAt)}` : 'Henüz yedek alınmadı'}
            </p>
          </div>
          <div className="flex gap-1.5 shrink-0" role="radiogroup" aria-label="Hatırlatma aralığı">
            {BACKUP_INTERVAL_OPTIONS.map((days) => {
              const selected = backupReminderDays === days;
              return (
                <button
                  key={days}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setBackupReminderDays(days)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200"
                  style={
                    selected
                      ? { backgroundColor: 'var(--accent-brand)', color: '#ffffff' }
                      : { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-card)' }
                  }
                >
                  {days} günde bir
                </button>
              );
            })}
          </div>
        </div>

        {undoSnapshot && (
          <button
            type="button"
            onClick={() => setIsUndoOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors active:scale-[0.98]"
            style={{
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-card)',
            }}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Son içe aktarmayı geri al</span>
          </button>
        )}

        {/* Bildirimler */}
        <AnimatePresence>
          {exportSuccess && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-2"
            >
              <FileJson className="w-4 h-4 shrink-0" />
              <span>Yedek dosyası hazırlandı ve güvenle dışa aktarıldı!</span>
            </motion.div>
          )}

          {importStatus && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 ${
                importStatus.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              }`}
            >
              {importStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{importStatus.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* ═══════════════════ Tehlikeli Bölge / Verileri Sıfırla ═══════════════════ */}
      <section
        className="card p-5 lg:p-6 space-y-4"
        style={{
          borderColor: 'rgba(239, 68, 68, 0.4)',
          backgroundColor: 'rgba(239, 68, 68, 0.04)',
        }}
      >
        <div
          className="flex items-center gap-2 pb-3"
          style={{ borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}
        >
          <AlertTriangle className="w-4.5 h-4.5 text-red-500" />
          <h2 className="text-sm font-bold text-red-600 dark:text-red-400">Veri Yönetimi & Sıfırlama</h2>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
              Uygulama Verilerini Sıfırla
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Tüm denemeleri, konu ilerlemelerini ve ayarları başlangıç durumuna döndürür.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {resetSuccess && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" /> Sıfırlandı!
              </span>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white transition-all shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tüm Verileri Sıfırla
            </button>
          </div>
        </div>
      </section>

      {/* ═══════════════════ Easter Egg Modalı (İmza Uyuşmazlığı) ═══════════════════ */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {showEasterEgg && (
              <div className="fixed inset-0 top-0 left-0 w-screen h-screen min-h-screen z-[999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                {/* Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-black/70 dark:bg-black/85 backdrop-blur-sm"
                  onClick={closeEasterEgg}
                />

                {/* Modal */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.85, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                  className="relative w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 [html.theme-sepia_&]:bg-[#1f1610] [html.theme-sepia_&]:border-[#453225]"
                >
                  <div className="p-6 flex flex-col items-center text-center space-y-4">
                    <motion.div
                      initial={{ rotate: -12, scale: 0.6 }}
                      animate={{ rotate: [-12, 10, -6, 0], scale: 1 }}
                      transition={{ duration: 0.7 }}
                      className="text-7xl leading-none select-none"
                      role="img"
                      aria-label="Gülen kedi"
                    >
                      😹
                    </motion.div>

                    {/* Başlık */}
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white [html.theme-sepia_&]:text-amber-100">
                      ÖSYM zekâna hayran kaldı ve seni bir sene daha denemek istiyor!
                    </h2>

                    {/* Kırmızı Gösterge (Monospace) */}
                    <p className="text-red-500 font-mono text-sm bg-red-500/10 p-2 rounded w-full dark:bg-red-500/15 [html.theme-sepia_&]:bg-red-900/20">
                      Orijinal sıralama: 3.450.812. ama dosyalarda ve gönüllerde birincisin :D
                    </p>

                    {/* Yerleşilen Bölüm */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 [html.theme-sepia_&]:text-[#c2ab99]">
                      🎓 Yerleşilen Bölüm: Burkina Faso Maymun Yetiştiriciliği (Tam Burslu)
                    </p>

                    {/* Açıklama */}
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed [html.theme-sepia_&]:text-[#b09880]">
                      Not Defteri ile yapılan bu taktiksel hamle güvenlik sistemine takıldı. Dosya bütünlüğü bozulduğu için veriler içeri aktarılamadı.
                    </p>

                    {/* Buton */}
                    <button
                      type="button"
                      onClick={closeEasterEgg}
                      className="w-full py-2.5 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-medium text-sm transition-all active:scale-[0.98] hover:opacity-90 [html.theme-sepia_&]:bg-amber-200 [html.theme-sepia_&]:text-[#1f1610]"
                    >
                      Pekala. Sanırım yakalandım :&apos;) (Orijinal dosyayı seç.)
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}

      <ConfirmDialog
        isOpen={Boolean(pendingImport)}
        title="Yedek yüklensin mi?"
        message={pendingImport ? describeImport(pendingImport, useAppStore.getState()) : ''}
        confirmLabel="Yükle"
        onConfirm={confirmImport}
        onClose={() => setPendingImport(null)}
      />

      <ConfirmDialog
        isOpen={isUndoOpen}
        title="İçe aktarma geri alınsın mı?"
        message={`Veriler ${
          (undoSnapshot && formatDateTime(undoSnapshot.exportedAt)) || 'içe aktarma'
        } öncesine döner. O andan sonra girdiğin deneme ve seanslar silinir.`}
        confirmLabel="Geri al"
        onConfirm={confirmUndo}
        onClose={() => setIsUndoOpen(false)}
      />

      {/* ─── Tüm Verileri Sıfırla Güvenlik Modalı (5s Kilitli & Çift Yedekleme Seçenekli) ─── */}
      <ResetConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleConfirmReset}
        onDownloadBackup={handleDownloadBackup}
        onShareBackup={handleShareOrCloud}
      />
    </motion.div>
  );
}

// ─── Yardımcı Alt Bileşenler ───

function SectionHeader({ icon: Icon, title }) {
  return (
    <div
      className="flex items-center gap-2 pb-3"
      style={{ borderBottom: '1px solid var(--border-card)' }}
    >
      <Icon className="w-4.5 h-4.5" style={{ color: 'var(--accent-brand)' }} />
      <h2 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{title}</h2>
    </div>
  );
}

function FieldGroup({ label, children }) {
  return (
    <div>
      <label
        className="text-xs font-semibold uppercase tracking-wider mb-2 block"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function ThemeCard({ selected, onClick, title, description, Icon, iconColor, cardStyle, descStyle }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-4 rounded-xl border-2 transition-all duration-200 flex flex-col justify-between shadow-sm ${
        selected ? 'ring-2 ring-indigo-500 scale-[1.02]' : 'hover:scale-[1.01]'
      } ${cardStyle}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-xs font-bold">{title}</span>
        </div>
        {selected && (
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm" />
        )}
      </div>
      <p className={`text-[11px] leading-relaxed font-medium ${descStyle}`}>{description}</p>
    </button>
  );
}

function ExamGoalCard({ selected, onClick, title, description, emoji }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-4 rounded-xl border-2 transition-all duration-200"
      style={{
        backgroundColor: selected ? 'var(--accent-brand-light)' : 'var(--bg-input)',
        borderColor: selected ? 'var(--accent-brand)' : 'var(--border-card)',
        color: 'var(--text-main)',
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-lg">{emoji}</span>
        <span className="text-sm font-bold">{title}</span>
      </div>
      <p className="text-[11px] leading-relaxed font-medium" style={{ color: 'var(--text-muted)' }}>
        {description}
      </p>
    </button>
  );
}
