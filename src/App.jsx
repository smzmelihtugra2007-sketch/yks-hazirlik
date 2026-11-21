/**
 * ─── APP.JSX ───
 * Uygulamanın giriş noktası.
 *
 * Hidrasyon tamamlanana kadar MainLayout kendi yükleme ekranını gösterir.
 * Sonrasında karşılama tamamlanmamışsa uygulama yerine karşılama ekranı
 * çıkar; böylece yeni öğrenci demo veriyle karşılaşmaz.
 *
 * Depo okunamadıysa karşılama GÖSTERİLMEZ: okuma hatası "yeni kullanıcı"
 * gibi görünür ve karşılama formu gerçek verinin üstüne yazardı.
 *
 * Store zaten Zustand ile global olduğundan Provider sarmalaması gerekmez.
 */
import { useEffect } from 'react';
import MainLayout from './components/layout/MainLayout';
import Onboarding from './components/Onboarding';
import DataRescueScreen from './components/DataRescueScreen';
import TabConflictOverlay from './components/TabConflictOverlay';
import SaveErrorBanner from './components/ui/SaveErrorBanner';
import BackupReminderModal from './components/BackupReminderModal';
import useAppStore from './store/useAppStore';
import usePersistStatus from './hooks/usePersistStatus';
import { requestPersistentStorage } from './utils/persistentStorage';

export default function App() {
  const hasHydrated = useAppStore((s) => s.hasHydrated);
  const onboardingCompleted = useAppStore((s) => s.onboardingCompleted);
  const persist = usePersistStatus();

  useEffect(() => {
    if (hasHydrated && onboardingCompleted) requestPersistentStorage();
  }, [hasHydrated, onboardingCompleted]);

  if (persist.readFailed) {
    return <DataRescueScreen reason="read" />;
  }

  return (
    <>
      {hasHydrated && !onboardingCompleted ? <Onboarding /> : <MainLayout />}
      <BackupReminderModal enabled={hasHydrated && onboardingCompleted && persist.tabActive} />
      {persist.writeFailed && <SaveErrorBanner />}
      <TabConflictOverlay active={persist.tabActive} />
    </>
  );
}
