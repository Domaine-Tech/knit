import { useLayoutEffect, useState, type RefObject } from 'react';
import type { HoverPreviewData } from '../types';
import { clampPreviewPosition } from '../utils';

/**
 * Recale un panneau Hover Preview dans le viewport après mesure DOM.
 */
export function useClampedHoverPos(
  preview: HoverPreviewData | null,
  rootRef: RefObject<HTMLDivElement | null>,
  panelWidth: number,
  reclampToken?: unknown
): { x: number; y: number } {
  const [clamped, setClamped] = useState<{
    x: number;
    y: number;
    srcX: number;
    srcY: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!preview) {
      setClamped(null);
      return;
    }
    const root = rootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const next = clampPreviewPosition(preview.originX, preview.originY, {
      width: rect.width || panelWidth,
      height: rect.height > 1 ? rect.height : undefined,
      docType: preview.docType,
    });
    setClamped({
      x: next.x,
      y: next.y,
      srcX: preview.originX,
      srcY: preview.originY,
    });
  }, [preview, panelWidth, rootRef, reclampToken]);

  const matches =
    clamped !== null &&
    preview !== null &&
    clamped.srcX === preview.originX &&
    clamped.srcY === preview.originY;
  return {
    x: matches ? clamped.x : (preview?.x ?? 0),
    y: matches ? clamped.y : (preview?.y ?? 0),
  };
}
