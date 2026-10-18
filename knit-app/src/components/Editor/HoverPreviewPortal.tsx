import React from 'react';
import { createPortal } from 'react-dom';
import type { HoverPreviewData } from '../../types';
import { isMiddleButton, preventMiddleCompass } from '../../utils';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

export interface HoverPreviewPortalProps {
  hoverPreview: HoverPreviewData | null;
  nestedHoverPreview: HoverPreviewData | null;
  isPreviewPinned: boolean;
  setPreviewHovered: (hovered: boolean) => void;
  showNestedHoverPreview: (target: string, x: number, y: number) => void | Promise<void>;
  hideNestedHoverPreview: () => void;
  hideHoverPreview: (force?: boolean) => void;
  onNavigate: (target: string) => void;
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

/**
 * Portails flottants Hover Preview (US B-053) : aperçu principal (Ctrl/Cmd fige)
 * + aperçu secondaire non figé au survol d'un lien interne.
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
}) => {
  const navigateAndHide = (target: string, hideNested = false) => {
    if (hideNested) hideNestedHoverPreview();
    hideHoverPreview(true);
    onNavigate(target);
  };

  return (
    <>
      {hoverPreview &&
        createPortal(
          <div
            className={`knit-floating-hover-preview${isPreviewPinned ? ' is-pinned' : ''}`}
            onMouseEnter={() => setPreviewHovered(true)}
            onMouseLeave={() => setPreviewHovered(false)}
            onWheel={(e) => {
              if (isPreviewPinned) e.stopPropagation();
            }}
            style={{
              position: 'fixed',
              left: hoverPreview.x,
              top: hoverPreview.y,
              zIndex: 99999,
              width: 360,
              maxWidth: '90vw',
              padding: '12px 14px',
              backgroundColor: 'var(--knit-surface, #1e1e24)',
              border: isPreviewPinned
                ? '1px solid var(--knit-primary, #6366f1)'
                : '1px solid var(--knit-border, #333)',
              borderRadius: 'var(--knit-radius-md, 8px)',
              boxShadow: '0 8px 28px rgba(0, 0, 0, 0.5)',
              pointerEvents: isPreviewPinned ? 'auto' : 'none',
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--knit-text, #fff)',
            }}
          >
            <div
              role={isPreviewPinned ? 'link' : undefined}
              data-tooltip={isPreviewPinned ? 'Ouvrir la cible' : undefined}
              onClick={(e) => {
                if (!isPreviewPinned) return;
                e.preventDefault();
                e.stopPropagation();
                navigateAndHide(hoverPreview.target);
              }}
              onMouseDown={preventMiddleCompass}
              onAuxClick={(e) => {
                if (!isPreviewPinned || !isMiddleButton(e)) return;
                e.preventDefault();
                e.stopPropagation();
                navigateAndHide(hoverPreview.target);
              }}
              style={{
                fontWeight: 700,
                color: 'var(--knit-primary, #6366f1)',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                cursor: isPreviewPinned ? 'pointer' : 'default',
                borderRadius: 'var(--knit-radius-xs, 4px)',
              }}
            >
              <DuotoneIcon name={hoverPreview.icon || 'file-markdown'} size={14} />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 300,
                }}
              >
                {hoverPreview.target}
              </span>
            </div>
            <div
              className="knit-hover-preview-body"
              dangerouslySetInnerHTML={{ __html: hoverPreview.htmlSnippet }}
              onMouseMove={(e) => {
                if (!isPreviewPinned) return;
                const target = resolveDataTarget(e.target);
                if (target) {
                  void showNestedHoverPreview(target, e.clientX, e.clientY);
                } else {
                  hideNestedHoverPreview();
                }
              }}
              onMouseLeave={() => {
                hideNestedHoverPreview();
              }}
              onClick={(e) => {
                if (!isPreviewPinned) return;
                const target = resolveDataTarget(e.target);
                if (!target) return;
                e.preventDefault();
                e.stopPropagation();
                navigateAndHide(target, true);
              }}
              onMouseDown={preventMiddleCompass}
              onAuxClick={(e) => {
                if (!isPreviewPinned || !isMiddleButton(e)) return;
                const target = resolveDataTarget(e.target);
                if (!target) return;
                e.preventDefault();
                e.stopPropagation();
                navigateAndHide(target, true);
              }}
              style={{
                maxHeight: isPreviewPinned ? 280 : 140,
                overflowY: isPreviewPinned ? 'auto' : 'hidden',
                fontSize: 11.5,
                lineHeight: 1.45,
                color: 'var(--knit-text-secondary, #ccc)',
              }}
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
                  ? 'Maintenu — survol lien = aperçu, clic pour ouvrir'
                  : 'Maintenir pour figer et scroller'}
              </span>
            </div>
          </div>,
          document.body
        )}

      {nestedHoverPreview &&
        createPortal(
          <div
            className="knit-floating-hover-preview knit-nested-hover-preview"
            style={{
              position: 'fixed',
              left: nestedHoverPreview.x,
              top: nestedHoverPreview.y,
              zIndex: 100000,
              width: 320,
              maxWidth: '85vw',
              padding: '10px 12px',
              backgroundColor: 'var(--knit-surface, #1e1e24)',
              border: '1px solid var(--knit-border, #333)',
              borderRadius: 'var(--knit-radius-md, 8px)',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
              pointerEvents: 'none',
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--knit-text, #fff)',
            }}
          >
            <div
              style={{
                fontWeight: 700,
                color: 'var(--knit-primary, #6366f1)',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <DuotoneIcon name={nestedHoverPreview.icon || 'file-markdown'} size={13} />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 260,
                }}
              >
                {nestedHoverPreview.target}
              </span>
            </div>
            <div
              className="knit-hover-preview-body"
              dangerouslySetInnerHTML={{ __html: nestedHoverPreview.htmlSnippet }}
              style={{
                maxHeight: 160,
                overflowY: 'hidden',
                fontSize: 11,
                lineHeight: 1.4,
                color: 'var(--knit-text-secondary, #ccc)',
              }}
            />
          </div>,
          document.body
        )}
    </>
  );
};
