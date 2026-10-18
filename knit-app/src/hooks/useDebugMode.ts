import { useSyncExternalStore, useCallback } from 'react';
import { debugStore } from '../stores/debugStore';
import type { AppViewMode, VaultProfilingReport } from '../types';

const subscribeDebug = (callback: () => void) => debugStore.subscribe(callback);
const getIsDebugActive = () => debugStore.isActive;
const getActiveView = () => debugStore.activeView;
const getIsBenchmarking = () => debugStore.isBenchmarking;
const getLatestProfilingReport = () => debugStore.latestProfilingReport;

/**
 * Hook React pour écouter l'état du mode debug global dans les composants.
 * Utilise useSyncExternalStore avec des abonnements stables pour garantir
 * une synchronisation synchrone parfaite sans dérive d'état ni désynchronisation.
 */
export function useDebugMode(): {
  isDebugActive: boolean;
  activeView: AppViewMode;
  toggleDebug: () => void;
  isBenchmarking: boolean;
  profilingReport: VaultProfilingReport | null;
  runBenchmark: () => Promise<VaultProfilingReport>;
} {
  const isDebugActive = useSyncExternalStore(subscribeDebug, getIsDebugActive);
  const activeView = useSyncExternalStore(subscribeDebug, getActiveView);
  const isBenchmarking = useSyncExternalStore(subscribeDebug, getIsBenchmarking);
  const profilingReport = useSyncExternalStore(subscribeDebug, getLatestProfilingReport);

  const toggleDebug = useCallback(() => {
    debugStore.toggle();
  }, []);

  const runBenchmark = useCallback(() => {
    return debugStore.runVaultBenchmark();
  }, []);

  return {
    isDebugActive,
    activeView,
    toggleDebug,
    isBenchmarking,
    profilingReport,
    runBenchmark,
  };
}
