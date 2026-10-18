import { useEffect, useMemo, useRef } from 'react';
import { createDelayedHoverController } from '../utils/hoverPreviewUtils';

type DelayedHoverCtl = ReturnType<typeof createDelayedHoverController>;

/**
 * Contrôleur Hover Preview avec debounce + dispose automatique au démontage.
 */
export function useDelayedHoverPreview(delayMs = 200): {
  schedule: (path: string, x: number, y: number) => void;
  cancel: (force?: boolean) => void;
} {
  const ctlRef = useRef<DelayedHoverCtl | null>(null);

  useEffect(() => {
    ctlRef.current = createDelayedHoverController(delayMs);
    return () => {
      ctlRef.current?.dispose();
      ctlRef.current = null;
    };
  }, [delayMs]);

  return useMemo(
    () => ({
      schedule: (path: string, x: number, y: number) => {
        ctlRef.current?.schedule(path, x, y);
      },
      cancel: (force?: boolean) => {
        ctlRef.current?.cancel(force);
      },
    }),
    []
  );
}
