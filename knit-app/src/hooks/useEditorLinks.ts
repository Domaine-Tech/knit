import { useRef, useCallback, useEffect } from 'react';
import type { EditorView } from '@codemirror/view';
import type { UseEditorLinksProps } from '../types';
import {
  clearHoverPreview,
  dispatchHoverPreview,
  hoverPreviewPinnedRef,
  navigateKnitLink,
} from '../utils/hoverPreviewUtils';

/**
 * Navigation liens CM6 + pont Hover Preview vers le bus global (HoverPreviewHost).
 */
export function useEditorLinks({
  path,
  viewRef,
  editorRef,
  enableSideEffects = true,
}: UseEditorLinksProps) {
  const handleNavigateLink = useCallback(
    async (target: string, view?: EditorView) => {
      await navigateKnitLink(target, path, view || viewRef.current);
    },
    [path, viewRef]
  );

  const handleNavigateLinkRef = useRef(handleNavigateLink);
  useEffect(() => {
    handleNavigateLinkRef.current = handleNavigateLink;
  }, [handleNavigateLink]);

  const showHoverPreviewRef = useRef(dispatchHoverPreview);
  const hideHoverPreviewRef = useRef(clearHoverPreview);

  // Leave éditeur + scroll CM6 pendant pin (le bus window est géré par HoverPreviewHost)
  useEffect(() => {
    if (!enableSideEffects) return;
    const el = editorRef.current;
    if (!el) return;

    let leaveTimer: ReturnType<typeof setTimeout> | null = null;

    const onKnitNav = (e: Event) => {
      const custom = e as CustomEvent<{ url: string }>;
      if (custom.detail?.url) {
        void handleNavigateLinkRef.current(custom.detail.url, viewRef.current || undefined);
      }
    };

    const onEditorMouseLeave = () => {
      if (leaveTimer) clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => {
        leaveTimer = null;
        if (hoverPreviewPinnedRef.current) return;
        clearHoverPreview(false);
      }, 120);
    };

    /** Ctrl/Cmd + molette pendant l'aperçu figé : scroll éditeur au lieu du zoom webview. */
    const onWheelWhilePinned = (e: WheelEvent) => {
      if (!hoverPreviewPinnedRef.current) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const overPreview = (e.target as HTMLElement | null)?.closest?.(
        '.knit-floating-hover-preview'
      );
      if (overPreview) return;
      e.preventDefault();
      const scroller = viewRef.current?.scrollDOM;
      if (scroller) scroller.scrollTop += e.deltaY;
    };

    el.addEventListener('knit-navigate-link', onKnitNav);
    el.addEventListener('mouseleave', onEditorMouseLeave);
    window.addEventListener('wheel', onWheelWhilePinned, { passive: false, capture: true });

    return () => {
      if (leaveTimer) clearTimeout(leaveTimer);
      el.removeEventListener('knit-navigate-link', onKnitNav);
      el.removeEventListener('mouseleave', onEditorMouseLeave);
      window.removeEventListener('wheel', onWheelWhilePinned, true);
    };
  }, [editorRef, viewRef, enableSideEffects]);

  return {
    isPreviewPinnedRef: hoverPreviewPinnedRef,
    handleNavigateLinkRef,
    showHoverPreviewRef,
    hideHoverPreviewRef,
  };
}
