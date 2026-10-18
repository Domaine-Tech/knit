import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { vaultStore } from '../../stores/vaultStore';
import { tabStore } from '../../stores/tabStore';
import { useDelayedHoverPreview } from '../../hooks';

export interface BacklinksPanelProps {
  backlinks: string[];
  unlinkedMentions: string[];
}

/**
 * Inspecteur déroulant des rétroliens et mentions non liées (US B-053).
 * Survol = Hover Preview (même bus `knit-hover-link` que l'éditeur / le graphe).
 */
export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  backlinks,
  unlinkedMentions,
}) => {
  const hoverPreview = useDelayedHoverPreview(0);

  const openNote = (relPath: string) => {
    hoverPreview.cancel(true);
    vaultStore.readFile(relPath).then((c) => tabStore.openTab(relPath, false, c));
  };

  const renderFileChip = (relPath: string, dashed: boolean) => (
    <button
      key={relPath}
      type="button"
      onClick={() => openNote(relPath)}
      onMouseEnter={(e) =>
        hoverPreview.schedule(relPath, e.clientX, e.clientY)
      }
      onMouseMove={(e) =>
        hoverPreview.schedule(relPath, e.clientX, e.clientY)
      }
      onMouseLeave={() => hoverPreview.cancel()}
      onMouseDown={(e) => {
        if (e.button === 1) e.preventDefault();
      }}
      onAuxClick={(e) => {
        if (e.button === 1) {
          e.preventDefault();
          openNote(relPath);
        }
      }}
      style={{
        padding: '2px 8px',
        borderRadius: 'var(--knit-radius-xs)',
        backgroundColor: 'var(--knit-surface-hover)',
        border: dashed ? '1px dashed var(--knit-border)' : '1px solid var(--knit-border)',
        color: dashed ? 'var(--knit-text-muted)' : 'var(--knit-primary)',
        cursor: 'pointer',
        fontSize: 11,
        fontFamily: 'var(--knit-font-mono)',
      }}
    >
      {relPath}
    </button>
  );

  return (
    <div
      style={{
        padding: '10px 24px',
        backgroundColor: 'var(--knit-surface)',
        borderBottom: '1px solid var(--knit-border)',
        display: 'flex',
        gap: 24,
        fontSize: '12px',
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 600,
            color: 'var(--knit-text-secondary)',
            marginBottom: 6,
          }}
        >
          <DuotoneIcon name="link" size={13} style={{ color: 'var(--knit-primary)' }} />
          <span>Mentions liées ({backlinks.length})</span>
        </div>
        {backlinks.length === 0 ? (
          <div style={{ color: 'var(--knit-text-muted)', fontSize: 11 }}>
            Aucune note ne lie ce document.
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {backlinks.map((bl) => renderFileChip(bl, false))}
          </div>
        )}
      </div>

      {unlinkedMentions.length > 0 && (
        <div style={{ flex: 1, borderLeft: '1px solid var(--knit-border)', paddingLeft: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600,
              color: 'var(--knit-text-secondary)',
              marginBottom: 6,
            }}
          >
            <DuotoneIcon name="search" size={13} style={{ color: 'var(--knit-text-muted)' }} />
            <span>Mentions non liées ({unlinkedMentions.length})</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {unlinkedMentions.map((m) => renderFileChip(m, true))}
          </div>
        </div>
      )}
    </div>
  );
};
