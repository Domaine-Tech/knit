import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { countSlideSeparators, renderSlideHtml, splitSlides } from '../../utils/slidesUtils';
import { copyDebugJson, dumpDebugConsole } from '../../utils';
import { useDebugMode, useRegisterDebugStats } from '../../hooks';
import type { SlidesDebugReport } from '../../types';
import { DocViewChrome } from '../Workspace/DocViewChrome';
import { SlidesDebugHUD } from './SlidesDebugHUD';

interface SlidesViewProps {
  content: string;
  onSwitchToEditor?: () => void;
  /** Mode lecture (Zen / Hover) : lecture seule (navigation slides OK). */
  readOnly?: boolean;
  /** Hover Preview uniquement : masquer la toolbar. */
  compactChrome?: boolean;
}

export const SlidesView: React.FC<SlidesViewProps> = ({
  content,
  onSwitchToEditor,
  readOnly = false,
  compactChrome = false,
}) => {
  const slides = useMemo(() => splitSlides(content), [content]);
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const { isDebugActive, toggleDebug } = useDebugMode();

  const go = useCallback(
    (delta: number) => {
      setIndex((i) => Math.max(0, Math.min(slides.length - 1, i + delta)));
    },
    [slides.length]
  );

  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        go(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Escape' && fullscreen) {
        setFullscreen(false);
      } else if (e.key === 'f' || e.key === 'F') {
        setFullscreen((f) => !f);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, fullscreen, readOnly]);

  const [prevContent, setPrevContent] = useState(content);
  if (prevContent !== content) {
    setPrevContent(content);
    setIndex(0);
  }

  const current = slides[index] || '';
  const separatorsCount = useMemo(() => countSlideSeparators(content), [content]);

  const slidesDebugReport = useMemo((): SlidesDebugReport => {
    return {
      slidesCount: slides.length,
      index,
      currentChars: current.length,
      fullscreen,
      separatorsCount,
    };
  }, [slides.length, index, current.length, fullscreen, separatorsCount]);

  useRegisterDebugStats('slides', slidesDebugReport);

  return (
    <div
      className={readOnly ? 'knit-view-readonly' : undefined}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: fullscreen ? '#111' : 'var(--knit-bg)',
        color: fullscreen ? '#f5f5f5' : 'var(--knit-text)',
        position: fullscreen ? 'fixed' : 'relative',
        inset: fullscreen ? 0 : undefined,
        zIndex: fullscreen ? 9999 : undefined,
      }}
    >
      <DocViewChrome
        icon="slides"
        title="Diaporama"
        compactChrome={compactChrome}
        onSwitchToEditor={onSwitchToEditor}
        subtitle={
          <span style={{ fontSize: 12, color: 'var(--knit-text-muted)' }}>
            {slides.length === 0 ? '0' : index + 1} / {slides.length}
            {isDebugActive && (
              <span className="knit-debug-view-badge" style={{ marginLeft: 6 }}>
                {current.length} car.
              </span>
            )}
          </span>
        }
        trailing={
          <>
            <button type="button" className="knit-btn" onClick={() => go(-1)} data-tooltip="Précédent">
              <DuotoneIcon name="chevron-left" size={14} />
            </button>
            <button type="button" className="knit-btn" onClick={() => go(1)} data-tooltip="Suivant">
              <DuotoneIcon name="chevron-right" size={14} />
            </button>
            <button
              type="button"
              className="knit-btn"
              onClick={() => setFullscreen((f) => !f)}
              data-tooltip="Plein écran (F)"
              style={{ fontSize: 11 }}
            >
              {fullscreen ? 'Quitter' : 'Plein écran'}
            </button>
          </>
        }
      />

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: fullscreen ? 48 : 32,
          overflow: 'auto',
        }}
        onClick={() => go(1)}
      >
        {slides.length === 0 ? (
          <p style={{ color: 'var(--knit-text-muted)' }}>
            Aucune diapositive. Séparez le contenu par des lignes <code>---</code>.
          </p>
        ) : (
          <div
            style={{
              maxWidth: 880,
              width: '100%',
              fontSize: fullscreen ? 28 : 20,
              lineHeight: 1.45,
            }}
            dangerouslySetInnerHTML={{ __html: renderSlideHtml(current) }}
          />
        )}
      </div>

      {isDebugActive && (
        <SlidesDebugHUD
          report={slidesDebugReport}
          onCopyJson={() => {
            void copyDebugJson(
              slidesDebugReport,
              'Rapport Diaporama copié',
              `${slides.length} diapo(s).`
            );
          }}
          onDumpConsole={() => {
            dumpDebugConsole('SLIDES', slidesDebugReport, current);
          }}
          onClose={toggleDebug}
        />
      )}
    </div>
  );
};
