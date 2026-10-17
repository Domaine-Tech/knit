import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

interface KanbanDebugHUDProps {
  columnsCount: number;
  cardsCount: number;
  completedCount: number;
  filePath: string | null;
  onCopyJson: () => void;
  onDumpConsole: () => void;
  onClose: () => void;
}

export const KanbanDebugHUD: React.FC<KanbanDebugHUDProps> = ({
  columnsCount,
  cardsCount,
  completedCount,
  filePath,
  onCopyJson,
  onDumpConsole,
  onClose,
}) => {
  const percentCompleted = cardsCount > 0 ? Math.round((completedCount / cardsCount) * 100) : 0;

  return (
    <div className="knit-live-debug-hud">
      <div className="knit-debug-hud-header">
        <div className="knit-debug-hud-title">
          <DuotoneIcon name="bug" size={14} style={{ color: 'var(--knit-accent)' }} />
          <span style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>Inspecteur Kanban</span>

          <span className="knit-debug-hud-badge is-ok">
            <DuotoneIcon name="check" size={12} />
            <span>
              {columnsCount} colonnes | {cardsCount} cartes ({completedCount} terminées - {percentCompleted}%)
            </span>
          </span>

          {filePath && (
            <span style={{ fontSize: '11px', color: 'var(--knit-text-muted)', marginLeft: 4 }}>
              ({filePath})
            </span>
          )}
        </div>

        <div className="knit-debug-hud-actions">
          <button
            onClick={onCopyJson}
            className="knit-debug-btn"
            title="Copier la structure JSON complète du tableau"
          >
            <DuotoneIcon name="copy" size={12} />
            <span>Copier JSON</span>
          </button>

          <button
            onClick={onDumpConsole}
            className="knit-debug-btn"
            title="Inspecter les colonnes et cartes dans la console développeur"
          >
            <DuotoneIcon name="search" size={12} />
            <span>Console</span>
          </button>

          <button
            onClick={onClose}
            className="knit-debug-btn"
            title="Désactiver le mode debug (Ctrl+Alt+D)"
            style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
          >
            <DuotoneIcon name="close" size={12} />
            <span>Quitter Debug</span>
          </button>
        </div>
      </div>
    </div>
  );
};
