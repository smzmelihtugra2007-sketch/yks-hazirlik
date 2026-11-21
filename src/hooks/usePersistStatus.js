import { useSyncExternalStore } from 'react';
import { getPersistStatus, subscribePersistStatus } from '../utils/persistGuard';

/** Depo sağlığı: { hydrated, readFailed, writeFailed, tabActive } */
export default function usePersistStatus() {
  return useSyncExternalStore(subscribePersistStatus, getPersistStatus);
}
