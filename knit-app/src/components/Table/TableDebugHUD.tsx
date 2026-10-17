import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

interface TableDebugHUDProps {
  rowsCount: number;
  filteredCount: number;
  columns: string[];
  sortField: string;
  sortOrder: string;
  filePath: string | null;
  onCopyJson: () => void;
  onDumpConsole: () => void;
  onClose: () => void;
}

export const TableDebugHUD: React.FC<TableDebugHUDProps> = ({
  rowsCount,
  filteredCount,
  columns,
  sortField,
  sortOrder,
  filePath,
  onCopyJson,
  onDumpConsole,
  onClose,
}) => {
  return (
    <div className="knit-live-debug-hud">
      <div className="knit-debug-hud-header">
        <div className="knit-debug-hud-title">
          <span style={{ fontSize: '14px' }}>🐞</span>
          <span style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>Inspecteur Table & Données</span>

          <span className="knit-debug-hud-badge is-ok">
            <span style={{ fontSize: '11px' }}>✓</span>
            <span>
              {filteredCount} / {rowsCount} lignes affichées | {columns.length} colonnes
            </span>
          </span>

          <span style={{ fontSize: '11px', color: 'var(--knit-text-muted)', marginLeft: 4 }}>
            (Tri : {sortField} {sortOrder === 'asc' ? '▲' : '▼'})
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
            title="Copier les lignes au format JSON"
          >
            <DuotoneIcon name="copy" size={12} />
            <span>Copier JSON</span>
          </button>

          <button
            onClick={onDumpConsole}
            className="knit-debug-btn"
            title="Inspecter les données tabulaires dans la console développeur"
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
