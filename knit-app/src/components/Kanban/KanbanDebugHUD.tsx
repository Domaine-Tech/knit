import React, { useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

export interface KanbanDragLog {
  id: string;
  time: string;
  action: 'reorder' | 'move' | 'no-op' | 'abort';
  cardTitle: string;
  cardId: string;
  fromColumn: string;
  toColumn: string;
  fromIndex: number;
  toIndex: number;
  detail: string;
}

interface KanbanDebugHUDProps {
  columnsCount: number;
  cardsCount: number;
  completedCount: number;
  filePath: string | null;
  dragLogs?: KanbanDragLog[];
  onClearLogs?: () => void;
  onCopyLogs?: () => void;
  onCopyJson: () => void;
  onDumpConsole: () => void;
  onClose: () => void;
}

export const KanbanDebugHUD: React.FC<KanbanDebugHUDProps> = ({
  columnsCount,
  cardsCount,
  completedCount,
  filePath,
  dragLogs = [],
  onClearLogs,
  onCopyLogs,
  onCopyJson,
  onDumpConsole,
  onClose,
}) => {
  const [isLogsExpanded, setIsLogsExpanded] = useState(false);
  const percentCompleted = cardsCount > 0 ? Math.round((completedCount / cardsCount) * 100) : 0;
  const latestLog = dragLogs.length > 0 ? dragLogs[0] : null;

  return (
    <div className="knit-live-debug-hud" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="knit-debug-hud-header">
        <div className="knit-debug-hud-title" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <DuotoneIcon name="bug" size={14} style={{ color: 'var(--knit-accent)' }} />
          <span style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>Inspecteur Kanban</span>
          {filePath && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--knit-text-muted)',
                maxWidth: 220,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={filePath}
            >
              ({filePath})
            </span>
          )}

          <span className="knit-debug-hud-badge is-ok">
            <DuotoneIcon name="check" size={12} />
            <span>
              {columnsCount} cols | {cardsCount} cartes ({completedCount} terminées - {percentCompleted}%)
            </span>
          </span>

          {latestLog && (
            <span
              className="knit-debug-hud-badge"
              style={{
                backgroundColor:
                  latestLog.action === 'reorder'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : latestLog.action === 'move'
                    ? 'rgba(59, 130, 246, 0.15)'
                    : 'rgba(245, 158, 11, 0.15)',
                color:
                  latestLog.action === 'reorder'
                    ? '#10B981'
                    : latestLog.action === 'move'
                    ? '#3B82F6'
                    : '#F59E0B',
                border: '1px solid currentColor',
                fontSize: 11,
              }}
              title={latestLog.detail}
            >
              <span>Dernier D&D ({latestLog.time}) : {latestLog.detail}</span>
            </span>
          )}
        </div>

        <div className="knit-debug-hud-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {dragLogs.length > 0 && (
            <>
              <button
                onClick={() => setIsLogsExpanded((prev) => !prev)}
                className="knit-debug-btn"
                style={{
                  backgroundColor: isLogsExpanded ? 'var(--knit-primary-alpha)' : undefined,
                  color: isLogsExpanded ? 'var(--knit-primary)' : undefined,
                }}
                title="Afficher/masquer le journal détaillé des déplacements D&D"
              >
                <DuotoneIcon name={isLogsExpanded ? 'chevron-down' : 'chevron-right'} size={12} />
                <span>Journal D&D ({dragLogs.length})</span>
              </button>

              <button
                onClick={onCopyLogs}
                className="knit-debug-btn"
                title="Copier les logs de glisser-déposer pour le diagnostic"
              >
                <DuotoneIcon name="copy" size={12} />
                <span>Copier Logs D&D</span>
              </button>
            </>
          )}

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
            <span>Quitter</span>
          </button>
        </div>
      </div>

      {/* Tiroir d'historique D&D */}
      {isLogsExpanded && (
        <div
          style={{
            maxHeight: 180,
            overflowY: 'auto',
            borderTop: '1px solid var(--knit-border)',
            padding: '8px 14px',
            backgroundColor: 'var(--knit-surface-hover)',
            fontSize: 11,
            fontFamily: 'monospace',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: 'var(--knit-text)' }}>
              Historique des événements D&D récents ({dragLogs.length}) :
            </span>
            {onClearLogs && (
              <button
                onClick={onClearLogs}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--knit-text-muted)',
                  cursor: 'pointer',
                  fontSize: 10,
                  textDecoration: 'underline',
                }}
              >
                Vider
              </button>
            )}
          </div>
          {dragLogs.length === 0 ? (
            <div style={{ color: 'var(--knit-text-muted)', fontStyle: 'italic' }}>
              Aucun déplacement effectué depuis l'activation du mode debug.
            </div>
          ) : (
            dragLogs.map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '3px 8px',
                  borderRadius: 3,
                  backgroundColor: 'var(--knit-bg)',
                  border: '1px solid var(--knit-border)',
                }}
              >
                <span style={{ color: 'var(--knit-text-muted)', fontSize: 10 }}>[{log.time}]</span>
                <span
                  style={{
                    padding: '0 4px',
                    borderRadius: 2,
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor:
                      log.action === 'reorder'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : log.action === 'move'
                        ? 'rgba(59, 130, 246, 0.2)'
                        : 'rgba(245, 158, 11, 0.2)',
                    color:
                      log.action === 'reorder'
                        ? '#10B981'
                        : log.action === 'move'
                        ? '#3B82F6'
                        : '#F59E0B',
                  }}
                >
                  {log.action}
                </span>
                <span style={{ color: 'var(--knit-text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {log.detail}
                </span>
                <span style={{ color: 'var(--knit-text-muted)', fontSize: 10 }}>
                  ({log.cardId})
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
