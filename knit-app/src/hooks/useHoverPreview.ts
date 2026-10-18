import { useState, useRef, useCallback, useEffect } from 'react';
import type { HoverPreviewData } from '../types';
import {
  hoverPreviewPinnedRef,
  navigateKnitLink,
  placeHoverPreviewData,
  resolveHoverPreviewPayload,
  type KnitHoverLinkDetail,
} from '../utils/hoverPreviewUtils';
import { tabStore } from '../stores/tabStore';

/**
 * État global Hover Preview (B-053). Monté une seule fois via HoverPreviewHost.
 */
export function useHoverPreview() {
  const [hoverPreview, setHoverPreview] = useState<HoverPreviewData | null>(null);
  const [nestedHoverPreview, setNestedHoverPreview] = useState<HoverPreviewData | null>(null);
  const [isPreviewPinned, setIsPreviewPinned] = useState(false);
  const hoverTargetRef = useRef<string | null>(null);
  const nestedTargetRef = useRef<string | null>(null);
  const isPreviewPinnedLocalRef = useRef(false);
  const previewHoveredRef = useRef(false);
  const hoverPreviewVisibleRef = useRef(false);
  const modKeyHeldRef = useRef(false);

  useEffect(() => {
    isPreviewPinnedLocalRef.current = isPreviewPinned;
    hoverPreviewPinnedRef.current = isPreviewPinned;
  }, [isPreviewPinned]);

  useEffect(() => {
    hoverPreviewVisibleRef.current = hoverPreview !== null;
  }, [hoverPreview]);

  const hideNestedHoverPreview = useCallback(() => {
    nestedTargetRef.current = null;
    setNestedHoverPreview(null);
  }, []);

  const hideHoverPreview = useCallback((force = false) => {
    if (isPreviewPinnedLocalRef.current && !force) return;
    hoverTargetRef.current = null;
    previewHoveredRef.current = false;
    setIsPreviewPinned(false);
    isPreviewPinnedLocalRef.current = false;
    hoverPreviewPinnedRef.current = false;
    setHoverPreview(null);
    nestedTargetRef.current = null;
    setNestedHoverPreview(null);
  }, []);

  const hideHoverPreviewRef = useRef(hideHoverPreview);
  useEffect(() => {
    hideHoverPreviewRef.current = hideHoverPreview;
  }, [hideHoverPreview]);

  const setPreviewHovered = useCallback((hovered: boolean) => {
    previewHoveredRef.current = hovered;
    if (hovered) return;
    if (modKeyHeldRef.current) return;
    hideHoverPreviewRef.current(true);
  }, []);

  const pinPreview = useCallback(() => {
    if (!hoverPreviewVisibleRef.current) return;
    isPreviewPinnedLocalRef.current = true;
    hoverPreviewPinnedRef.current = true;
    setIsPreviewPinned(true);
  }, []);

  const unpinPreview = useCallback(() => {
    if (!isPreviewPinnedLocalRef.current) return;
    if (previewHoveredRef.current) return;
    isPreviewPinnedLocalRef.current = false;
    hoverPreviewPinnedRef.current = false;
    setIsPreviewPinned(false);
    nestedTargetRef.current = null;
    setNestedHoverPreview(null);
    hideHoverPreviewRef.current(true);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideHoverPreviewRef.current(true);
        return;
      }
      if (e.ctrlKey || e.metaKey) {
        modKeyHeldRef.current = true;
        if (hoverPreviewVisibleRef.current) {
          pinPreview();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        modKeyHeldRef.current = false;
        unpinPreview();
      } else if (!e.ctrlKey && !e.metaKey) {
        modKeyHeldRef.current = false;
      }
    };

    const onBlur = () => {
      modKeyHeldRef.current = false;
      unpinPreview();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [pinPreview, unpinPreview]);

  const publishHoverPreview = useCallback((data: HoverPreviewData) => {
    hoverPreviewVisibleRef.current = true;
    setHoverPreview(data);
    if (modKeyHeldRef.current) {
      isPreviewPinnedLocalRef.current = true;
      hoverPreviewPinnedRef.current = true;
      setIsPreviewPinned(true);
    }
  }, []);

  const showNestedHoverPreview = useCallback(
    async (rawTarget: string, clientX: number, clientY: number) => {
      if (!isPreviewPinnedLocalRef.current) return;

      const cleanTarget = rawTarget.trim();
      if (!cleanTarget) {
        hideNestedHoverPreview();
        return;
      }

      if (hoverTargetRef.current && cleanTarget === hoverTargetRef.current) {
        hideNestedHoverPreview();
        return;
      }

      if (nestedTargetRef.current === cleanTarget) {
        setNestedHoverPreview((prev) =>
          prev ? placeHoverPreviewData(prev, clientX, clientY) : prev
        );
        return;
      }

      nestedTargetRef.current = cleanTarget;
      // Même payload DocType que le primary (mise en page identique, non figable côté UI)
      const payload = await resolveHoverPreviewPayload(cleanTarget);
      if (!payload || nestedTargetRef.current !== cleanTarget) return;
      setNestedHoverPreview(placeHoverPreviewData(payload, clientX, clientY));
    },
    [hideNestedHoverPreview]
  );

  const showNestedHoverPreviewRef = useRef(showNestedHoverPreview);
  useEffect(() => {
    showNestedHoverPreviewRef.current = showNestedHoverPreview;
  }, [showNestedHoverPreview]);

  const showHoverPreview = useCallback(
    async (rawTarget: string, clientX: number, clientY: number) => {
      // Preview figé : re-router vers nested au lieu d'ignorer (widgets / bus)
      if (isPreviewPinnedLocalRef.current) {
        void showNestedHoverPreviewRef.current(rawTarget, clientX, clientY);
        return;
      }

      const cleanTarget = rawTarget.trim();
      if (!cleanTarget) {
        hideHoverPreview();
        return;
      }

      hoverTargetRef.current = cleanTarget;
      const payload = await resolveHoverPreviewPayload(cleanTarget);
      if (!payload || hoverTargetRef.current !== cleanTarget) return;
      publishHoverPreview(placeHoverPreviewData(payload, clientX, clientY));
    },
    [hideHoverPreview, publishHoverPreview]
  );

  const showHoverPreviewRef = useRef(showHoverPreview);
  useEffect(() => {
    showHoverPreviewRef.current = showHoverPreview;
  }, [showHoverPreview]);

  // Bus window unique
  useEffect(() => {
    const onKnitHover = (e: Event) => {
      const custom = e as CustomEvent<KnitHoverLinkDetail>;
      const detail = custom.detail;
      if (detail && typeof detail === 'object' && 'force' in detail && detail.force) {
        hideHoverPreviewRef.current(true);
        return;
      }
      if (detail && typeof detail === 'object' && 'target' in detail && detail.target) {
        void showHoverPreviewRef.current(detail.target, detail.x, detail.y);
      } else {
        hideHoverPreviewRef.current();
      }
    };

    window.addEventListener('knit-hover-link', onKnitHover);
    return () => {
      window.removeEventListener('knit-hover-link', onKnitHover);
    };
  }, []);

  const handleNavigate = useCallback((target: string) => {
    const activePath =
      tabStore.activeGroupId === 2 && tabStore.isSplit
        ? tabStore.activeGroup2TabId || ''
        : tabStore.activeTabId || '';
    void navigateKnitLink(target, activePath);
  }, []);

  return {
    hoverPreview,
    nestedHoverPreview,
    isPreviewPinned,
    setPreviewHovered,
    pinPreview,
    showNestedHoverPreview,
    hideNestedHoverPreview,
    hideHoverPreview,
    handleNavigate,
  };
}
