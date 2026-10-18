import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { vaultStore } from '../../stores/vaultStore';
import { tabStore } from '../../stores/tabStore';

export interface BacklinksPanelProps {
  backlinks: string[];
  unlinkedMentions: string[];
}

/**
 * Inspecteur déroulant des rétroliens et mentions non liées (US B-053).
 */
export const BacklinksPanel: React.FC<BacklinksPanelProps> = ({
  backlinks,
  unlinkedMentions,
}) => {
  const openNote = (relPath: string) => {
    vaultStore.readFile(relPath).then((c) => tabStore.openTab(relPath, false, c));
  };

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
            {backlinks.map((bl) => (
              <button
                key={bl}
                type="button"
                onClick={() => openNote(bl)}
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--knit-radius-xs)',
                  backgroundColor: 'var(--knit-surface-hover)',
                  border: '1px solid var(--knit-border)',
                  color: 'var(--knit-primary)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'var(--knit-font-mono)',
                }}
              >
                {bl}
              </button>
            ))}
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
            {unlinkedMentions.map((um) => (
              <button
                key={um}
                type="button"
                onClick={() => openNote(um)}
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--knit-radius-xs)',
                  backgroundColor: 'var(--knit-surface-hover)',
                  border: '1px dashed var(--knit-border)',
                  color: 'var(--knit-text-muted)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontFamily: 'var(--knit-font-mono)',
                }}
              >
                {um}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
