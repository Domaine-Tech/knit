import { useEffect, useRef } from 'react';
import { debugStore } from '../stores/debugStore';
import type { DebugStatsKey, GlobalDebugReport } from '../types';

/**
 * Enregistre un provider de stats debug sans re-register à chaque rendu.
 * Le getter lit toujours la dernière valeur via ref.
 * `enabled=false` désenregistre (ex. Editor en Hover Preview).
 */
export function useRegisterDebugStats<K extends DebugStatsKey>(
  key: K,
  report: NonNullable<GlobalDebugReport[K]>,
  enabled = true
): void {
  const reportRef = useRef(report);
  reportRef.current = report;

  useEffect(() => {
    if (!enabled) {
      debugStore.unregisterStats(key);
      return;
    }
    debugStore.registerStats(key, () => reportRef.current);
    return () => {
      debugStore.unregisterStats(key);
    };
  }, [key, enabled]);
}
