import React, { useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { ViewDebugHUDShell } from '../Debug/ViewDebugHUDShell';
import type { KanbanDragLog } from '../../types';

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
    <ViewDebugHUDShell
      title="Inspecteur Kanban"
      badges={[
        {
          label: `${columnsCount} cols | ${cardsCount} cartes (${completedCount} · ${percentCompleted}%)`,
          tone: 'ok',
        },
      ]}
      meta={
        latestLog ? (
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
            data-tooltip={latestLog.detail}
          >
            Dernier D&D ({latestLog.time}) : {latestLog.detail}
          </span>
        ) : undefined
      }
      filePath={filePath}
      onCopyJson={onCopyJson}
      onDumpConsole={onDumpConsole}
      onClose={onClose}
      extraActions={
        dragLogs.length > 0 ? (
          <>
            <button
              type="button"
              onClick={() => setIsLogsExpanded((prev) => !prev)}
              className="knit-debug-btn"
              style={{
                backgroundColor: isLogsExpanded ? 'var(--knit-primary-alpha)' : undefined,
                color: isLogsExpanded ? 'var(--knit-primary)' : undefined,
              }}
              data-tooltip="Afficher/masquer le journal D&D"
            >
              <DuotoneIcon name={isLogsExpanded ? 'chevron-down' : 'chevron-right'} size={12} />
              <span>Journal D&D ({dragLogs.length})</span>
            </button>
            {onCopyLogs && (
              <button
                type="button"
                onClick={onCopyLogs}
                className="knit-debug-btn"
                data-tooltip="Copier les logs D&D"
              >
                <DuotoneIcon name="copy" size={12} />
                <span>Copier Logs</span>
              </button>
            )}
          </>
        ) : undefined
      }
    >
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
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 4,
            }}
          >
            <span style={{ fontWeight: 600, color: 'var(--knit-text)' }}>
              Historique D&D ({dragLogs.length})
            </span>
            {onClearLogs && (
              <button
                type="button"
                onClick={onClearLogs}
                className="knit-debug-btn"
                style={{ fontSize: 10 }}
              >
                Vider
              </button>
            )}
          </div>
          {dragLogs.length === 0 ? (
            <div style={{ color: 'var(--knit-text-muted)', fontStyle: 'italic' }}>
              Aucun déplacement depuis l&apos;activation du mode debug.
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
                <span
                  style={{
                    color: 'var(--knit-text)',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {log.detail}
                </span>
                <span style={{ color: 'var(--knit-text-muted)', fontSize: 10 }}>({log.cardId})</span>
              </div>
            ))
          )}
        </div>
      )}
    </ViewDebugHUDShell>
  );
};
