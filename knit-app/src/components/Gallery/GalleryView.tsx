import React, { useMemo } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import { resolveAssetUrl } from '../../utils/assetUrl';
import {
  copyDebugJson,
  dumpDebugConsole,
  fileStem,
  parseGalleryItems,
  parseSimpleFrontmatter,
} from '../../utils';
import { useDebugMode, useDelayedHoverPreview, useRegisterDebugStats } from '../../hooks';
import type { GalleryDebugReport } from '../../types';
import { GalleryDebugHUD } from './GalleryDebugHUD';
import { DocViewChrome } from '../Workspace/DocViewChrome';

interface GalleryViewProps {
  path: string;
  content: string;
  onOpenFile: (path: string) => void;
  onSwitchToEditor?: () => void;
  /** Mode lecture (Zen / Hover). */
  readOnly?: boolean;
  /** Hover Preview uniquement : masquer le header. */
  compactChrome?: boolean;
}

export const GalleryView: React.FC<GalleryViewProps> = ({
  path,
  content,
  onOpenFile,
  onSwitchToEditor,
  readOnly = false,
  compactChrome = false,
}) => {
  const { isDebugActive, toggleDebug } = useDebugMode();
  const hoverPreview = useDelayedHoverPreview(200);
  const { cards, source } = useMemo(
    () => parseGalleryItems(content, path, vaultStore.listIndexedFiles('', 'title', 50)),
    [content, path]
  );
  const fm = useMemo(() => parseSimpleFrontmatter(content).fields, [content]);
  const title = fm.title || fm.titre || fileStem(path) || 'Galerie';

  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) {
      for (const t of c.tags) set.add(t);
    }
    return set.size;
  }, [cards]);

  const galleryDebugReport = useMemo((): GalleryDebugReport => {
    return {
      path,
      cardsCount: cards.length,
      source,
      uniqueTags,
    };
  }, [path, cards.length, source, uniqueTags]);

  useRegisterDebugStats('gallery', galleryDebugReport);

  return (
    <div
      className={readOnly ? 'knit-view-readonly' : undefined}
      style={{
        position: 'relative',
        flex: readOnly ? 'none' : 1,
        display: 'flex',
        flexDirection: 'column',
        height: readOnly ? 'auto' : '100%',
        minHeight: 0,
        overflow: readOnly ? 'visible' : 'hidden',
      }}
    >
      <DocViewChrome
        icon="gallery"
        title={title}
        compactChrome={compactChrome}
        onSwitchToEditor={onSwitchToEditor}
        subtitle={
          <span style={{ fontSize: 11, color: 'var(--knit-text-muted)' }}>
            {cards.length} carte(s)
          </span>
        }
      />

      <div
        style={{
          flex: readOnly ? 'none' : 1,
          minHeight: readOnly ? undefined : 0,
          overflow: readOnly ? 'visible' : 'auto',
          padding: readOnly ? 8 : 16,
          display: 'grid',
          gridTemplateColumns: readOnly
            ? 'repeat(auto-fill, minmax(100px, 1fr))'
            : 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: readOnly ? 8 : 12,
          alignContent: 'start',
        }}
      >
        {cards.length === 0 && (
          <p style={{ color: 'var(--knit-text-muted)', fontSize: 13 }}>
            Ajoutez des WikiLinks, images <code>assets/</code> ou des notes indexées pour peupler la
            galerie.
          </p>
        )}
        {cards.map((card, i) => {
          const isImageCard = Boolean(card.banner && card.tags.includes('image'));
          const canHoverPreview = !isImageCard && card.path.endsWith('.md');
          return (
            <button
              key={`${card.path}-${i}`}
              type="button"
              onMouseEnter={(e) => {
                if (!canHoverPreview) return;
                hoverPreview.schedule(card.path, e.clientX, e.clientY);
              }}
              onMouseMove={(e) => {
                if (!canHoverPreview) return;
                hoverPreview.schedule(card.path, e.clientX, e.clientY);
              }}
              onMouseLeave={() => hoverPreview.cancel()}
              onClick={() => {
                hoverPreview.cancel(true);
                onOpenFile(card.path);
              }}
              style={{
                textAlign: 'left',
                border: '1px solid var(--knit-border)',
                borderRadius: 'var(--knit-radius-md)',
                background: 'var(--knit-surface)',
                boxShadow: 'var(--knit-shadow-xs)',
                padding: 0,
                overflow: 'hidden',
                cursor: 'pointer',
                color: 'inherit',
                transition:
                  'border-color var(--knit-duration-fast), box-shadow var(--knit-duration-fast)',
              }}
            >
              <div
                style={{
                  height: readOnly ? 56 : 100,
                  background: card.banner
                    ? `center/cover no-repeat url(${resolveAssetUrl(card.banner)})`
                    : 'linear-gradient(135deg, color-mix(in srgb, var(--knit-primary) 25%, transparent), var(--knit-surface-hover))',
                }}
              />
              <div style={{ padding: readOnly ? '6px 8px' : '10px 12px' }}>
                <div
                  style={{
                    fontSize: readOnly ? 11 : 13,
                    fontWeight: 600,
                    marginBottom: readOnly ? 4 : 6,
                  }}
                >
                  {card.title}
                  {isDebugActive && (
                    <span className="knit-debug-view-badge">#{i}</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {card.status && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 999,
                        background: 'var(--knit-primary-alpha)',
                        color: 'var(--knit-primary)',
                      }}
                    >
                      {card.status}
                    </span>
                  )}
                  {card.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 999,
                        background: 'var(--knit-surface-hover)',
                        color: 'var(--knit-text-secondary)',
                      }}
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {isDebugActive && (
        <GalleryDebugHUD
          report={galleryDebugReport}
          onCopyJson={() => {
            void copyDebugJson(
              { report: galleryDebugReport, cards },
              'Rapport Galerie copié',
              `${cards.length} carte(s).`
            );
          }}
          onDumpConsole={() => {
            dumpDebugConsole('GALLERY', galleryDebugReport, cards);
          }}
          onClose={toggleDebug}
        />
      )}
    </div>
  );
};
