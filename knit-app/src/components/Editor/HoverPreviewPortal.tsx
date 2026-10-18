import React, { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import type { HoverPreviewData } from '../../types';
import {
  clampPreviewPosition,
  hoverPreviewWidthForDocType,
  isMiddleButton,
  preventMiddleCompass,
} from '../../utils';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { DocTypeViewRouter } from '../Workspace/DocTypeViewRouter';
import { ErrorBoundary } from '../Common/ErrorBoundary';

export interface HoverPreviewPortalProps {
  hoverPreview: HoverPreviewData | null;
  nestedHoverPreview: HoverPreviewData | null;
  isPreviewPinned: boolean;
  setPreviewHovered: (hovered: boolean) => void;
  showNestedHoverPreview: (target: string, x: number, y: number) => void | Promise<void>;
  hideNestedHoverPreview: () => void;
  hideHoverPreview: (force?: boolean) => void;
  onNavigate: (target: string) => void;
  /** Fige l'aperçu (survol de la fenêtre ou Ctrl/Cmd). */
  onPinPreview?: () => void;
}

function modKeyLabel(): string {
  return typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    ? 'Cmd'
    : 'Ctrl';
}

function resolveDataTarget(eventTarget: EventTarget | null): string | null {
  const linkEl = (eventTarget as HTMLElement | null)?.closest(
    '[data-target]'
  ) as HTMLElement | null;
  return linkEl?.getAttribute('data-target') ?? null;
}

/** Styles panneau partagés primary / nested (largeur DocType unique). */
function hoverPanelStyle(opts: {
  left: number;
  top: number;
  width: number;
  zIndex: number;
  pointerEvents: 'auto' | 'none';
  border: string;
  boxShadow?: string;
}): CSSProperties {
  return {
    position: 'fixed',
    left: opts.left,
    top: opts.top,
    zIndex: opts.zIndex,
    width: opts.width,
    maxWidth: 'min(94vw, 620px)',
    padding: '8px 10px',
    backgroundColor: 'var(--knit-surface, #1e1e24)',
    border: opts.border,
    borderRadius: 'var(--knit-radius-md, 8px)',
    boxShadow: opts.boxShadow ?? '0 8px 28px rgba(0, 0, 0, 0.5)',
    pointerEvents: opts.pointerEvents,
    fontSize: 12,
    lineHeight: 1.5,
    color: 'var(--knit-text, #fff)',
  };
}

function PreviewTitle({
  target,
  icon,
  panelWidth,
  interactive,
  onOpen,
}: {
  target: string;
  icon?: import('../../types').IconName;
  panelWidth: number;
  interactive?: boolean;
  onOpen?: () => void;
}): React.ReactElement {
  return (
    <div
      role={interactive ? 'link' : undefined}
      data-tooltip={interactive ? 'Ouvrir la cible' : undefined}
      onClick={(e) => {
        if (!interactive || !onOpen) return;
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }}
      onMouseDown={interactive ? preventMiddleCompass : undefined}
      onAuxClick={(e) => {
        if (!interactive || !onOpen || !isMiddleButton(e)) return;
        e.preventDefault();
        e.stopPropagation();
        onOpen();
      }}
      style={{
        fontWeight: 700,
        color: 'var(--knit-primary, #6366f1)',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        cursor: interactive ? 'pointer' : 'default',
        borderRadius: 'var(--knit-radius-xs, 4px)',
      }}
    >
      <DuotoneIcon name={icon || 'file-markdown'} size={14} />
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: panelWidth - 40,
        }}
      >
        {target}
      </span>
    </div>
  );
}

/** Handlers nested / clic partagés (HTML stubs et vues DocType). */
function useHoverBodyPointerProps(
  isPinned: boolean,
  showNestedHoverPreview: ((target: string, x: number, y: number) => void | Promise<void>) | undefined,
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

function PreviewBody({
  preview,
  isPinned,
  bodyRef,
  showNestedHoverPreview,
  hideNestedHoverPreview,
  navigateAndHide,
}: {
  preview: HoverPreviewData;
  isPinned: boolean;
  bodyRef?: React.RefObject<HTMLDivElement | null>;
  showNestedHoverPreview?: (target: string, x: number, y: number) => void | Promise<void>;
  hideNestedHoverPreview?: () => void;
  navigateAndHide: (target: string, hideNested?: boolean) => void;
}): React.ReactElement {
  const useDocView = Boolean(preview.docType && preview.target);
  const pointerProps = useHoverBodyPointerProps(
    isPinned,
    showNestedHoverPreview,
    hideNestedHoverPreview,
    navigateAndHide
  );

  if (useDocView && preview.docType) {
    return (
      <div
        ref={bodyRef}
        className={`knit-hover-preview-body is-doctype-view is-doctype-${preview.docType}`}
        {...pointerProps}
      >
        <ErrorBoundary fallbackTitle="Aperçu indisponible">
          <DocTypeViewRouter
            key={`hover-${preview.target}-${preview.docType}`}
            path={preview.target}
            content={preview.content ?? ''}
            docType={preview.docType}
            mode="preview"
            onOpenFile={(path) => {
              navigateAndHide(path);
            }}
            onNavigateFile={(path) => {
              navigateAndHide(path);
            }}
          />
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <div
      ref={bodyRef}
      className="knit-hover-preview-body"
      dangerouslySetInnerHTML={{ __html: preview.htmlSnippet ?? '' }}
      {...pointerProps}
    />
  );
}

function useClampedHoverPos(
  preview: HoverPreviewData | null,
  rootRef: React.RefObject<HTMLDivElement | null>,
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

/**
 * Portails flottants Hover Preview (US B-053) : vues Doc-Driven React ou stubs HTML.
 * Nested = même PreviewBody / largeur DocType ; non figable (pointer-events: none).
 */
export const HoverPreviewPortal: React.FC<HoverPreviewPortalProps> = ({
  hoverPreview,
  nestedHoverPreview,
  isPreviewPinned,
  setPreviewHovered,
  showNestedHoverPreview,
  hideNestedHoverPreview,
  hideHoverPreview,
  onNavigate,
  onPinPreview,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const nestedRootRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const previewVisible = hoverPreview !== null;

  const panelWidth = hoverPreviewWidthForDocType(hoverPreview?.docType);
  const nestedPanelWidth = hoverPreviewWidthForDocType(nestedHoverPreview?.docType);

  const navigateAndHide = (target: string, hideNested = false) => {
    if (hideNested) hideNestedHoverPreview();
    hideHoverPreview(true);
    onNavigate(target);
  };

  const noopNavigate = (_target: string) => {
    /* nested non interactif */
  };

  const { x: posX, y: posY } = useClampedHoverPos(
    hoverPreview,
    rootRef,
    panelWidth,
    isPreviewPinned
  );
  const { x: nestedPosX, y: nestedPosY } = useClampedHoverPos(
    nestedHoverPreview,
    nestedRootRef,
    nestedPanelWidth
  );

  useEffect(() => {
    if (!previewVisible) return;
    const root = rootRef.current;
    if (!root) return;

    const isScrollableY = (el: HTMLElement): boolean => {
      const { overflowY } = window.getComputedStyle(el);
      if (overflowY !== 'auto' && overflowY !== 'scroll' && overflowY !== 'overlay') {
        return false;
      }
      return el.scrollHeight > el.clientHeight + 1;
    };

    const isScrollableX = (el: HTMLElement): boolean => {
      const { overflowX } = window.getComputedStyle(el);
      if (overflowX !== 'auto' && overflowX !== 'scroll' && overflowX !== 'overlay') {
        return false;
      }
      return el.scrollWidth > el.clientWidth + 1;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const body = bodyRef.current;
      if (!body) return;

      const deltaY =
        e.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? e.deltaY * 16
          : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? e.deltaY * 100
            : e.deltaY;

      const deltaX =
        e.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? e.deltaX * 16
          : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? e.deltaX * 100
            : e.deltaX;

      // 1. Direct horizontal scroll (trackpad deltaX or Shift+wheel)
      if (deltaX !== 0 || e.shiftKey) {
        const xDelta = deltaX !== 0 ? deltaX : deltaY;
        let targetX: HTMLElement | null = null;
        for (const node of e.composedPath()) {
          if (!(node instanceof HTMLElement)) continue;
          if (node === root) break;
          if (isScrollableX(node)) {
            targetX = node;
            break;
          }
        }
        if (targetX) {
          const maxScrollX = Math.max(0, targetX.scrollWidth - targetX.clientWidth);
          targetX.scrollLeft = Math.max(0, Math.min(maxScrollX, targetX.scrollLeft + xDelta));
          return;
        }
      }

      // 2. Locate vertical scroll target & potential horizontal container
      let targetY: HTMLElement | null = null;
      let targetXFallback: HTMLElement | null = null;
      let isOverHeader = false;

      for (const node of e.composedPath()) {
        if (!(node instanceof HTMLElement)) continue;
        if (node === root) break;
        if (!isOverHeader && (node.tagName === 'THEAD' || node.tagName === 'TH')) {
          isOverHeader = true;
        }
        if (!targetY && isScrollableY(node)) {
          targetY = node;
        }
        if (!targetXFallback && isScrollableX(node)) {
          targetXFallback = node;
        }
      }

      // Si le curseur est sur l'en-tête de tableau, scroller horizontalement en priorité
      if (isOverHeader && targetXFallback) {
        const maxScrollX = Math.max(0, targetXFallback.scrollWidth - targetXFallback.clientWidth);
        targetXFallback.scrollLeft = Math.max(0, Math.min(maxScrollX, targetXFallback.scrollLeft + deltaY));
        return;
      }

      if (targetY) {
        const maxScrollY = Math.max(0, targetY.scrollHeight - targetY.clientHeight);
        const atTop = targetY.scrollTop <= 0 && deltaY < 0;
        const atBottom = targetY.scrollTop >= maxScrollY && deltaY > 0;

        // If inner vertical scroller hit boundary, translate to horizontal container if available
        if ((atTop || atBottom) && targetXFallback) {
          const maxScrollX = Math.max(0, targetXFallback.scrollWidth - targetXFallback.clientWidth);
          targetXFallback.scrollLeft = Math.max(0, Math.min(maxScrollX, targetXFallback.scrollLeft + deltaY));
          return;
        }

        targetY.scrollTop = Math.max(0, Math.min(maxScrollY, targetY.scrollTop + deltaY));
        return;
      }

      // 3. Fallback to horizontal container (e.g. board column row or table)
      if (targetXFallback) {
        const maxScrollX = Math.max(0, targetXFallback.scrollWidth - targetXFallback.clientWidth);
        targetXFallback.scrollLeft = Math.max(0, Math.min(maxScrollX, targetXFallback.scrollLeft + deltaY));
        return;
      }

      // 4. Default vertical scroll on body or editor scroller
      if (isScrollableY(body)) {
        const maxScroll = Math.max(0, body.scrollHeight - body.clientHeight);
        body.scrollTop = Math.max(0, Math.min(maxScroll, body.scrollTop + deltaY));
      } else {
        const fallback =
          body.querySelector<HTMLElement>('.cm-scroller') ||
          body.querySelector<HTMLElement>('[style*="overflow"]');
        if (fallback && isScrollableY(fallback)) {
          const maxScroll = Math.max(0, fallback.scrollHeight - fallback.clientHeight);
          fallback.scrollTop = Math.max(0, Math.min(maxScroll, fallback.scrollTop + deltaY));
        } else if (fallback && isScrollableX(fallback)) {
          const maxScroll = Math.max(0, fallback.scrollWidth - fallback.clientWidth);
          fallback.scrollLeft = Math.max(0, Math.min(maxScroll, fallback.scrollLeft + deltaY));
        }
      }
    };

    root.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => root.removeEventListener('wheel', onWheel, true);
  }, [previewVisible]);

  const handlePreviewEnter = () => {
    setPreviewHovered(true);
    onPinPreview?.();
  };

  return (
    <>
      {hoverPreview &&
        createPortal(
          <div
            ref={rootRef}
            className={`knit-floating-hover-preview${isPreviewPinned ? ' is-pinned' : ''}${
              hoverPreview.docType ? ' has-doctype-view' : ''
            }`}
            onMouseEnter={handlePreviewEnter}
            onMouseLeave={() => setPreviewHovered(false)}
            style={hoverPanelStyle({
              left: posX,
              top: posY,
              width: panelWidth,
              zIndex: 99999,
              pointerEvents: 'auto',
              border: isPreviewPinned
                ? '1px solid var(--knit-primary, #6366f1)'
                : '1px solid var(--knit-border, #333)',
            })}
          >
            <PreviewTitle
              target={hoverPreview.target}
              icon={hoverPreview.icon}
              panelWidth={panelWidth}
              interactive={isPreviewPinned}
              onOpen={() => navigateAndHide(hoverPreview.target)}
            />
            <PreviewBody
              preview={hoverPreview}
              isPinned={isPreviewPinned}
              bodyRef={bodyRef}
              showNestedHoverPreview={showNestedHoverPreview}
              hideNestedHoverPreview={hideNestedHoverPreview}
              navigateAndHide={navigateAndHide}
            />
            <div
              style={{
                marginTop: 8,
                paddingTop: 6,
                borderTop: '1px solid var(--knit-border, #333)',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontSize: 10,
                color: 'var(--knit-text-muted, #888)',
                lineHeight: 1.3,
                userSelect: 'none',
              }}
            >
              <kbd
                style={{
                  display: 'inline-block',
                  padding: '1px 5px',
                  borderRadius: 'var(--knit-radius-xs, 4px)',
                  border: '1px solid var(--knit-border, #444)',
                  background: 'var(--knit-bg, #18181c)',
                  fontSize: 9.5,
                  fontFamily: 'inherit',
                  color: 'var(--knit-text-secondary, #aaa)',
                  lineHeight: 1.4,
                }}
              >
                {modKeyLabel()}
              </kbd>
              <span>
                {isPreviewPinned
                  ? hoverPreview.docType === 'table' || hoverPreview.docType === 'kanban'
                    ? 'Molette (Shift pour horizontal) — clic titre/lien pour ouvrir'
                    : 'Molette pour lire la suite — clic titre/lien pour ouvrir'
                  : 'Entrer dans la fenêtre pour scroller et lire'}
              </span>
            </div>
          </div>,
          document.body
        )}

      {nestedHoverPreview &&
        createPortal(
          <div
            ref={nestedRootRef}
            className={`knit-floating-hover-preview knit-nested-hover-preview${
              nestedHoverPreview.docType ? ' has-doctype-view' : ''
            }`}
            style={hoverPanelStyle({
              left: nestedPosX,
              top: nestedPosY,
              width: nestedPanelWidth,
              zIndex: 100000,
              pointerEvents: 'none',
              border: '1px solid var(--knit-border, #333)',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
            })}
          >
            <PreviewTitle
              target={nestedHoverPreview.target}
              icon={nestedHoverPreview.icon}
              panelWidth={nestedPanelWidth}
            />
            <PreviewBody
              preview={nestedHoverPreview}
              isPinned={false}
              navigateAndHide={noopNavigate}
            />
          </div>,
          document.body
        )}
    </>
  );
};
