import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import type { Tab } from '../types';

const DRAG_THRESHOLD_PX = 4;

export interface TabStripDragState {
  fromIndex: number;
  toIndex: number;
  deltaX: number;
  tabWidth: number;
}

export interface UseTabStripDragOptions {
  tabs: Tab[];
  onReorder: (fromIndex: number, toIndex: number) => void;
}

export interface UseTabStripDragResult {
  drag: TabStripDragState | null;
  getTabTransform: (index: number) => string | undefined;
  isDraggingIndex: (index: number) => boolean;
  /** True si le dernier geste a dépassé le seuil de drag (ignorer le click). */
  consumeDragClickGuard: () => boolean;
  onTabPointerDown: (e: ReactPointerEvent, index: number) => void;
}

/**
 * Réordonnancement d'onglets au pointeur (seuil 4 px, slide des voisins,
 * `onReorder` une seule fois au relâchement). Les épinglés restent dans
 * leur sous-groupe (indices 0..pinnedCount-1) — la liste doit être
 * normalisée (épinglés à gauche) via `pinTab`.
 */
export function useTabStripDrag({
  tabs,
  onReorder,
}: UseTabStripDragOptions): UseTabStripDragResult {
  const [drag, setDrag] = useState<TabStripDragState | null>(null);
  const dragRef = useRef<TabStripDragState | null>(null);
  const tabsRef = useRef(tabs);
  const onReorderRef = useRef(onReorder);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    onReorderRef.current = onReorder;
  }, [onReorder]);

  const pendingRef = useRef<{
    index: number;
    startX: number;
    pointerId: number;
    tabWidth: number;
    el: HTMLElement;
    didDrag: boolean;
  } | null>(null);

  const moveHandlerRef = useRef<((e: PointerEvent) => void) | null>(null);
  const upHandlerRef = useRef<((e: PointerEvent) => void) | null>(null);

  const pinnedCount = () => tabsRef.current.reduce((n, t) => n + (t.isPinned ? 1 : 0), 0);

  const clampToGroup = (fromIndex: number, rawTo: number, length: number): number => {
    const pinN = pinnedCount();
    const isPinned = fromIndex < pinN;
    if (isPinned) {
      return Math.max(0, Math.min(pinN - 1, rawTo));
    }
    return Math.max(pinN, Math.min(length - 1, rawTo));
  };

  const detach = (el: HTMLElement, pointerId: number) => {
    if (moveHandlerRef.current) {
      el.removeEventListener('pointermove', moveHandlerRef.current);
      moveHandlerRef.current = null;
    }
    if (upHandlerRef.current) {
      el.removeEventListener('pointerup', upHandlerRef.current);
      el.removeEventListener('pointercancel', upHandlerRef.current);
      upHandlerRef.current = null;
    }
    try {
      el.releasePointerCapture(pointerId);
    } catch {
      /* already released */
    }
  };

  const onTabPointerDown = useCallback(
    (e: ReactPointerEvent, index: number) => {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('.knit-tab-close')) return;

      const el = e.currentTarget as HTMLElement;
      const tabWidth = el.getBoundingClientRect().width;
      const startX = e.clientX;
      const pointerId = e.pointerId;

      pendingRef.current = {
        index,
        startX,
        pointerId,
        tabWidth,
        el,
        didDrag: false,
      };

      el.setPointerCapture(pointerId);

      const onMove = (ev: PointerEvent) => {
        const pending = pendingRef.current;
        if (!pending || pending.pointerId !== ev.pointerId) return;

        const dx = ev.clientX - pending.startX;
        const length = tabsRef.current.length;

        if (!dragRef.current) {
          if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
          pending.didDrag = true;
          const next: TabStripDragState = {
            fromIndex: pending.index,
            toIndex: pending.index,
            deltaX: dx,
            tabWidth: pending.tabWidth,
          };
          dragRef.current = next;
          setDrag(next);
          return;
        }

        const from = dragRef.current.fromIndex;
        const shiftSlots = Math.round(dx / Math.max(pending.tabWidth, 1));
        const toIndex = clampToGroup(from, from + shiftSlots, length);
        const next: TabStripDragState = {
          fromIndex: from,
          toIndex,
          deltaX: dx,
          tabWidth: pending.tabWidth,
        };
        dragRef.current = next;
        setDrag(next);
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const pending = pendingRef.current;
        const current = dragRef.current;
        pendingRef.current = null;
        dragRef.current = null;
        setDrag(null);
        detach(el, pointerId);

        if (pending?.didDrag) {
          suppressClickRef.current = true;
        }

        if (current && current.fromIndex !== current.toIndex) {
          onReorderRef.current(current.fromIndex, current.toIndex);
        }
      };

      moveHandlerRef.current = onMove;
      upHandlerRef.current = onUp;
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    },
    []
  );

  const consumeDragClickGuard = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  const getTabTransform = useCallback(
    (index: number): string | undefined => {
      if (!drag) return undefined;
      const { fromIndex, toIndex, deltaX, tabWidth } = drag;

      if (index === fromIndex) {
        return `translateX(${deltaX}px)`;
      }
      if (fromIndex < toIndex && index > fromIndex && index <= toIndex) {
        return `translateX(${-tabWidth}px)`;
      }
      if (fromIndex > toIndex && index >= toIndex && index < fromIndex) {
        return `translateX(${tabWidth}px)`;
      }
      return undefined;
    },
    [drag]
  );

  const isDraggingIndex = useCallback(
    (index: number) => drag !== null && drag.fromIndex === index,
    [drag]
  );

  return {
    drag,
    getTabTransform,
    isDraggingIndex,
    consumeDragClickGuard,
    onTabPointerDown,
  };
}
