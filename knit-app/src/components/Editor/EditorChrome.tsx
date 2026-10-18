import React from 'react';
import { packageContextForAI } from '../../utils';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { BacklinksPanel } from './BacklinksPanel';

export interface EditorChromeProps {
  path: string;
  content: string;
  backlinks: string[];
  unlinkedMentions: string[];
  isBacklinksPanelOpen: boolean;
  onToggleBacklinksPanel: () => void;
  isFullWidth: boolean;
  onToggleFullWidth: () => void;
}

/**
 * Chrome lecture de l'éditeur : barre rétroliens / largeur / Packager IA + panneau backlinks.
 */
export const EditorChrome: React.FC<EditorChromeProps> = ({
  path,
  content,
  backlinks,
  unlinkedMentions,
  isBacklinksPanelOpen,
  onToggleBacklinksPanel,
  isFullWidth,
  onToggleFullWidth,
}) => {
  const hasChrome = backlinks.length > 0 || unlinkedMentions.length > 0;

  return (
    <>
      {hasChrome && (
        <div
          style={{
            padding: '4px 20px',
            backgroundColor: 'var(--knit-surface)',
            borderBottom: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '12px',
            userSelect: 'none',
          }}
        >
          <button
            onClick={onToggleBacklinksPanel}
            data-tooltip="Afficher l'inspecteur des rétroliens"
            style={{
              background: isBacklinksPanelOpen ? 'var(--knit-primary-alpha)' : 'none',
              border: '1px solid var(--knit-border)',
              padding: '2px 8px',
              borderRadius: 'var(--knit-radius-xs)',
              color: isBacklinksPanelOpen ? 'var(--knit-primary)' : 'var(--knit-text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <DuotoneIcon name="link" size={12} />
            <span>
              {backlinks.length} lié{backlinks.length > 1 ? 's' : ''}
              {unlinkedMentions.length > 0 ? ` • ${unlinkedMentions.length} non lié(s)` : ''}
            </span>
          </button>

          <button
            onClick={onToggleFullWidth}
            data-tooltip={isFullWidth ? 'Basculer en centré (760px)' : 'Basculer en pleine largeur'}
            style={{
              background: 'none',
              border: '1px solid var(--knit-border)',
              padding: '2px 7px',
              borderRadius: 'var(--knit-radius-xs)',
              color: 'var(--knit-text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <DuotoneIcon name="slider" size={12} />
            <span>{isFullWidth ? 'Pleine largeur' : '760px'}</span>
          </button>

          <button
            onClick={() => packageContextForAI(path, content)}
            data-tooltip="Copier le contexte IA au format <document>"
            data-shortcut="Ctrl+Shift+C"
            style={{
              background: 'none',
              border: '1px solid var(--knit-border)',
              padding: '2px 8px',
              borderRadius: 'var(--knit-radius-xs)',
              color: 'var(--knit-primary)',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <DuotoneIcon name="command" size={12} />
            <span>Packager IA</span>
          </button>
        </div>
      )}

      {isBacklinksPanelOpen && (
        <BacklinksPanel backlinks={backlinks} unlinkedMentions={unlinkedMentions} />
      )}
    </>
  );
};
