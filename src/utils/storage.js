/**
 * ─── INDEXEDDB & LOCALFORAGE DEPOLAMA MOTORU ───
 *
 * App Store ve Play Store standartlarına uygun asenkron IndexedDB depolaması.
 *  - localforage ile IndexedDB yapılandırması
 *  - Eski LocalStorage verilerini otomatik IndexedDB'ye taşıyan Migration mekanizması
 *  - SHA-256 Kriptografik İmzalı JSON Dışa Aktarma (Backup)
 *  - İmza Doğrulamalı JSON İçe Aktarma (Restore)
 */
import localforage from 'localforage';
import { canWrite, markReadFailed, markWriteResult } from './persistGuard';
import { sanitizeImport, MAX_IMPORT_BYTES } from './importValidation';

// ─── IndexedDB Veritabanı Yapılandırması ───
localforage.config({
  name: 'YKS_Hazirlik_DB',
  storeName: 'yks_store',
  description: 'YKS Hazırlık ve Net Takip Uygulaması Veritabanı',
  version: 1.0,
});

const STORAGE_KEY = 'yks_hazirlik_storage_v3';
const LEGACY_STORAGE_KEYS = ['yks_hazirlik_storage_v2', 'yks_hazirlik_storage'];

// ─── LocalStorage -> IndexedDB Otomatik Migration (Veri Taşıma) ───
export async function migrateFromLocalStorage() {
  try {
    const existingIndexedDbData = await localforage.getItem(STORAGE_KEY);

    // IndexedDB'de veri yoksa, eski LocalStorage verilerini kontrol et
    if (!existingIndexedDbData && typeof window !== 'undefined' && window.localStorage) {
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const rawLegacyData = localStorage.getItem(legacyKey);
        if (rawLegacyData) {
          try {
            const parsed = JSON.parse(rawLegacyData);
            if (parsed && typeof parsed === 'object') {
              await localforage.setItem(STORAGE_KEY, rawLegacyData);
              console.log(`[Migration] ${legacyKey} verisi başarıyla IndexedDB'ye taşındı.`);
              localStorage.removeItem(legacyKey);
              break;
            }
          } catch (e) {
            console.warn(`[Migration] ${legacyKey} ayrıştırma hatası:`, e);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Migration] IndexedDB migration hatası:', err);
  }
}

// ─── Zustand Async Storage Adaptörü ───
// Yazma kararı persistGuard'da: okunamayan veri ezilmez, tek sekme yazar.
export const asyncIndexedDbStorage = {
  getItem: async (name) => {
    try {
      await migrateFromLocalStorage();
      const item = await localforage.getItem(name);
      return item ?? null;
    } catch (err) {
      // null DÖNDÜRME: "veri yok" sanılır, karşılama açılır ve boş durum
      // gerçek verinin üstüne yazılır. Hata hidrasyonu durdurmalı.
      console.error('[IndexedDB] Veri okuma hatası:', err);
      markReadFailed();
      throw err;
    }
  },
  setItem: async (name, value) => {
    if (!canWrite()) return;
    try {
      await localforage.setItem(name, value);
      markWriteResult(true);
    } catch (err) {
      console.error('[IndexedDB] Veri kaydetme hatası:', err);
      markWriteResult(false);
    }
  },
  removeItem: async (name) => {
    if (!canWrite()) return;
    try {
      await localforage.removeItem(name);
    } catch (err) {
      console.error('[IndexedDB] Veri silme hatası:', err);
    }
  },
};

/**
 * Diskteki ham kaydı olduğu gibi indirir. React ağacı çöktüğünde ya da
 * okuma JSON ayrıştırmasında patladığında öğrencinin elindeki tek çıkış
 * yolu bu; store'a hiç dokunmaz. İndirilen dosya içe aktarmada kabul edilir.
 */
export async function downloadRawData() {
  const raw = await localforage.getItem(STORAGE_KEY);
  if (raw == null) return false;
  const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `yks-kurtarma-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

// İçe aktarmadan hemen önceki durumun kopyası — "geri al" bunu okur.
const PRE_IMPORT_KEY = 'yks_pre_import_snapshot';

export async function savePreImportSnapshot(currentState) {
  const json = await generateBackupJSON(currentState);
  await localforage.setItem(PRE_IMPORT_KEY, json);
}

export async function loadPreImportSnapshot() {
  const json = await localforage.getItem(PRE_IMPORT_KEY);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return { exportedAt: parsed.exportedAt, data: parsed.data };
  } catch {
    return null;
  }
}

export async function clearPreImportSnapshot() {
  await localforage.removeItem(PRE_IMPORT_KEY);
}

// ─── SHA-256 Hash Hesaplama (Web Crypto API) ───
async function computeSHA256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ─── SHA-256 İmzalı JSON Veri Üretimi ───
export async function generateBackupJSON(currentState) {
  const exportPayload = {
    app: 'YKS Hazırlık Takip',
    version: '3.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      userName: currentState.userName,
      targetRank: currentState.targetRank,
      obpScore: currentState.obpScore,
      selectedTrack: currentState.selectedTrack,
      showAyt: currentState.showAyt,
      theme: currentState.theme,
      studyStreak: currentState.studyStreak,
      lastActiveDate: currentState.lastActiveDate,
      trials: currentState.trials || [],
      studySessions: currentState.studySessions || [],
      completedMissions: currentState.completedMissions || [],
      tytTopics: currentState.tytTopics || [],
      aytTopics: currentState.aytTopics || [],
    },
  };

  // 1. _signature hariç ham JSON metnini oluştur
  const rawJsonForHashing = JSON.stringify(exportPayload, null, 2);

  // 2. SHA-256 hash hesapla
  const signature = await computeSHA256(rawJsonForHashing);

  // 3. İmzayı payload'a ekle
  exportPayload._signature = signature;

  return JSON.stringify(exportPayload, null, 2);
}

// ─── JSON Veri İhracatı (SHA-256 İmzalı Dışa Aktarma) ───
export async function exportDataAsJson(currentState, { mode = 'auto' } = {}) {
  try {
    const signedJsonString = await generateBackupJSON(currentState);
    const jsonBlob = new Blob([signedJsonString], { type: 'application/json;charset=utf-8;' });
    
    // Yerel tarih ile dosya adı (YYYY-MM-DD)
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const fileName = `yks-yedek-${dateStr}.json`;
    const backupFile = new File([jsonBlob], fileName, { type: 'application/json' });

    // Standart tarayıcı indirme tetikleyicisi
    const triggerDownload = () => {
      const url = URL.createObjectURL(jsonBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    // 1. Mod: Doğrudan Yerel İndirme
    if (mode === 'download') {
      triggerDownload();
      return { success: true, fileName, method: 'download' };
    }

    // 2. Mod: Doğrudan Uygulamalara Gönder (Web Share API)
    if (mode === 'share') {
      const canShare = typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [backupFile] });
      if (canShare) {
        try {
          await navigator.share({
            files: [backupFile],
            title: 'YKS Hazırlık Yedek Dosyası',
            text: 'YKS takip verilerimin güvenli yedeği.',
          });
          return { success: true, fileName, method: 'share' };
        } catch (shareErr) {
          // Kullanıcı iptal etti (AbortError) veya paylaşım penceresi kapandı
          if (shareErr.name === 'AbortError') {
            return { success: false, fileName, method: 'share_canceled' };
          }
          triggerDownload();
          return { success: true, fileName, method: 'fallback_download' };
        }
      } else {
        // Cihaz dosya paylaşımını desteklemiyor -> indirmeye yönlendir ve bildir
        triggerDownload();
        return { success: true, fileName, method: 'fallback_download', unsupported: true };
      }
    }

    // 3. Mod: 'auto' — Destekleniyorsa Paylaş, değilse İndir
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [backupFile] })) {
      try {
        await navigator.share({
          files: [backupFile],
          title: 'YKS Hazırlık Yedek Dosyası',
          text: 'YKS takip verilerimin güvenli yedeği.',
        });
        return { success: true, fileName, method: 'share' };
      } catch {
        triggerDownload();
        return { success: true, fileName, method: 'fallback_download' };
      }
    } else {
      triggerDownload();
      return { success: true, fileName, method: 'download' };
    }
  } catch (error) {
    console.error('Dışa aktarma hatası:', error);
    return { success: false, error: error.message };
  }
}

export const exportData = exportDataAsJson;

// ─── Özel Hata Sınıfı: İmza Uyuşmazlığı ───
export class SignatureMismatchError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SignatureMismatchError';
  }
}

// ─── JSON Veri İthalatı (SHA-256 İmza Doğrulamalı İçe Aktarma) ───
// DİKKAT: buradaki "imza" anahtarsız bir SHA-256 özeti, gerçek imza değil.
// Kazara bozulmayı yakalar; dosyayı bilerek değiştiren özeti yeniden
// hesaplayabilir ya da alanı silebilir. Güvenliği asıl sağlayan şey
// sanitizeImport — özet kontrolüne güvenlik sınırı gibi yaslanma.
//
// Döner: { data, skipped, exportedAt } — data store'a yazılmaya hazır.
export function parseAndValidateJsonFile(file, { trackIds }) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('Dosya seçilmedi.'));
    }

    if (!file.name.toLowerCase().endsWith('.json')) {
      return reject(new Error('Lütfen geçerli bir .json uzantılı dosya seçin.'));
    }

    if (file.size > MAX_IMPORT_BYTES) {
      return reject(new Error('Dosya çok büyük; bu bir YKS Hazırlık yedeği olamaz.'));
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          throw new Error('Dosya okunamadı: geçerli bir JSON değil.');
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Geçersiz dosya formatı.');
        }

        // Yedek `data` altında; kurtarma dosyası (ham kayıt) `state` altında
        const rawData = parsed.data ?? parsed.state ?? parsed;

        // ─── SHA-256 İmza Doğrulaması ───
        const receivedSignature = parsed._signature;

        if (receivedSignature) {
          // _signature alanını çıkararak orijinal payload'u yeniden oluştur
          const { _signature, ...payloadWithoutSignature } = parsed;
          const rawJsonForHashing = JSON.stringify(payloadWithoutSignature, null, 2);
          const computedSignature = await computeSHA256(rawJsonForHashing);

          if (computedSignature !== receivedSignature) {
            throw new SignatureMismatchError(
              'Kriptografik imza doğrulaması başarısız! Dosya içeriği değiştirilmiş.'
            );
          }
        }

        const { data, skipped } = sanitizeImport(rawData, { trackIds });
        resolve({
          data,
          skipped,
          exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : null,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Dosya okunamadı.'));
    };

    reader.readAsText(file);
  });
}
