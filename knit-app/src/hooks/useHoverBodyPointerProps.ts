import type React from 'react';
import { isMiddleButton, preventMiddleCompass } from '../utils';

function resolveDataTarget(eventTarget: EventTarget | null): string | null {
  const linkEl = (eventTarget as HTMLElement | null)?.closest(
    '[data-target]'
  ) as HTMLElement | null;
  return linkEl?.getAttribute('data-target') ?? null;
}

/**
 * Handlers pointeur du corps Hover Preview (nested preview + navigation).
 */
export function useHoverBodyPointerProps(
  isPinned: boolean,
  showNestedHoverPreview:
    | ((target: string, x: number, y: number) => void | Promise<void>)
    | undefined,
  hideNestedHoverPreview: (() => void) | undefined,
  navigateAndHide: (target: string, hideNested?: boolean) => void
) {
  return {
    onMouseMove: (e: React.MouseEvent) => {
      if (!isPinned || !showNestedHoverPreview || !hideNestedHoverPreview) return;
      const target = resolveDataTarget(e.target);
      if (target) {
        void showNestedHoverPreview(target, e.clientX, e.clientY);
      } else {
        hideNestedHoverPreview();
      }
    },
    onMouseLeave: () => {
      hideNestedHoverPreview?.();
    },
    onClick: (e: React.MouseEvent) => {
      if (!isPinned) return;
      const target = resolveDataTarget(e.target);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      navigateAndHide(target, true);
    },
    onMouseDown: preventMiddleCompass,
    onAuxClick: (e: React.MouseEvent) => {
      if (!isPinned || !isMiddleButton(e)) return;
      const target = resolveDataTarget(e.target);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      navigateAndHide(target, true);
    },
  };
}
