import React, { useState } from 'react';
import { packageContextForAI } from '../../utils';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { BacklinksPanel } from './BacklinksPanel';
import { GraphView } from '../Graph/GraphView';

export interface EditorChromeProps {
  path: string;
  content: string;
  backlinks: string[];
  unlinkedMentions: string[];
  isBacklinksPanelOpen: boolean;
  onToggleBacklinksPanel: () => void;
  isFullWidth: boolean;
  onToggleFullWidth: () => void;
  onNavigateFile?: (path: string) => void;
}

/**
 * Chrome lecture de l'éditeur : barre rétroliens / graphe / largeur / Packager IA.
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
  onNavigateFile,
}) => {
  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const hasChrome = true;

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
            onClick={() => setIsGraphOpen((v) => !v)}
            data-tooltip="Vue graphe local (WikiLinks & rétroliens)"
            style={{
              background: isGraphOpen ? 'var(--knit-primary-alpha)' : 'none',
              border: '1px solid var(--knit-border)',
              padding: '2px 8px',
              borderRadius: 'var(--knit-radius-xs)',
              color: isGraphOpen ? 'var(--knit-primary)' : 'var(--knit-text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <DuotoneIcon name="graph" size={12} />
            <span>Graphe</span>
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

      {(isBacklinksPanelOpen || isGraphOpen) && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--knit-border)', width: '100%' }}>
          {isBacklinksPanelOpen && (
            <div style={{ flex: isGraphOpen ? '0 0 320px' : 1, minWidth: 0, borderRight: isGraphOpen ? '1px solid var(--knit-border)' : 'none' }}>
              <BacklinksPanel backlinks={backlinks} unlinkedMentions={unlinkedMentions} />
            </div>
          )}
          {isGraphOpen && (
            <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
              <GraphView
                centerPath={path}
                onOpenFile={(p) => onNavigateFile?.(p)}
                onClose={() => setIsGraphOpen(false)}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
};
