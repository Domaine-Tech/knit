import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import type { ViewDebugHUDBadge } from '../../types';

export type { ViewDebugHUDBadge };

interface ViewDebugHUDShellProps {
  title: string;
  badges?: ViewDebugHUDBadge[];
  meta?: React.ReactNode;
  filePath?: string | null;
  children?: React.ReactNode;
  onCopyJson?: () => void;
  onDumpConsole?: () => void;
  onClose: () => void;
  extraActions?: React.ReactNode;
}

/**
 * Coquille partagée des inspecteurs de vue (Mode Debug Global B-056).
 * Pas de bouton debug local : Fermer = toggle global.
 */
export const ViewDebugHUDShell: React.FC<ViewDebugHUDShellProps> = ({
  title,
  badges = [],
  meta,
  filePath,
  children,
  onCopyJson,
  onDumpConsole,
  onClose,
  extraActions,
}) => {
  return (
    <div className="knit-live-debug-hud" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div className="knit-debug-hud-header">
        <div
          className="knit-debug-hud-title"
          style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
        >
          <DuotoneIcon name="bug" size={14} style={{ color: 'var(--knit-accent)' }} />
          <span style={{ fontWeight: 700, letterSpacing: '-0.01em' }}>{title}</span>

          {badges.map((b, i) => (
            <span
              key={`${i}-${b.label}`}
              className={`knit-debug-hud-badge${
                b.tone === 'error' ? ' is-error' : b.tone === 'ok' ? ' is-ok' : ''
              }`}
            >
              {b.tone === 'ok' && <DuotoneIcon name="check" size={12} />}
              {b.tone === 'error' && <DuotoneIcon name="warning" size={12} />}
              <span>{b.label}</span>
            </span>
          ))}

          {meta}

          {filePath && (
            <span
              style={{
                fontSize: 11,
                color: 'var(--knit-text-muted)',
                maxWidth: 260,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              data-tooltip={filePath}
            >
              {filePath}
            </span>
          )}
        </div>

        <div className="knit-debug-hud-actions" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {extraActions}
          {onCopyJson && (
            <button
              type="button"
              onClick={onCopyJson}
              className="knit-debug-btn"
              data-tooltip="Copier le rapport JSON"
            >
              <DuotoneIcon name="copy" size={12} />
              <span>Copier JSON</span>
            </button>
          )}
          {onDumpConsole && (
            <button
              type="button"
              onClick={onDumpConsole}
              className="knit-debug-btn"
              data-tooltip="Inspecter dans la console (F12)"
            >
              <DuotoneIcon name="search" size={12} />
              <span>Console</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="knit-debug-btn"
            data-tooltip="Désactiver le mode debug"
            data-shortcut="Ctrl+Alt+D"
            style={{ color: '#EF4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
          >
            <DuotoneIcon name="close" size={12} />
            <span>Quitter Debug</span>
          </button>
        </div>
      </div>
      {children}
    </div>
  );
};
