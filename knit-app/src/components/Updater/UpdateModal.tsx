import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { contextMenu } from '../../stores/contextMenuStore';
import { updateStore } from '../../stores/updateStore';
import { copyTextWithToast } from '../../utils/clipboardUtils';
import { updateProgressPercent } from '../../utils/updaterLogic';
import type { KnitUpdateInfo, UpdateProgress, UpdateStatus } from '../../types/updater';

export interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
  update: KnitUpdateInfo;
  status: UpdateStatus;
  progress: UpdateProgress;
  error: string | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  currentVersion,
  update,
  status,
  progress,
  error,
}) => {
  if (!isOpen) return null;

  const installing = status === 'downloading';
  const ready = status === 'ready';
  const pct = updateProgressPercent(progress);

  const progressLabel = (() => {
    if (ready) return 'Mise à jour prête';
    if (!installing) return null;
    if (pct != null) return `Téléchargement… ${pct} %`;
    return 'Téléchargement en cours…';
  })();

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.button === 1) e.preventDefault();
        if (e.target === e.currentTarget && !installing) onClose();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        contextMenu.show(e, [
          {
            id: 'copy-version',
            label: 'Copier la version',
            icon: 'copy',
            onClick: () => void copyTextWithToast(update.version, 'Version copiée'),
          },
          {
            id: 'copy-notes',
            label: 'Copier les notes de version',
            icon: 'copy',
            onClick: () =>
              void copyTextWithToast(update.body ?? '', 'Notes de version copiées'),
          },
          {
            id: 'close',
            label: 'Fermer',
            icon: 'close',
            onClick: onClose,
          },
        ]);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9200,
      }}
    >
      <div
        style={{
          width: 'min(480px, 94vw)',
          maxHeight: '80vh',
          overflow: 'auto',
          background: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-md)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <DuotoneIcon name="download" size={16} />
            Mise à jour disponible
          </h2>
          <button
            type="button"
            className="knit-btn"
            onClick={onClose}
            disabled={installing}
            data-tooltip="Fermer"
          >
            <DuotoneIcon name="close" size={14} />
          </button>
        </div>

        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--knit-text-muted)' }}>
          Version actuelle : {currentVersion}
          <br />
          Nouvelle version : <strong style={{ color: 'var(--knit-text)' }}>{update.version}</strong>
          {update.date ? (
            <>
              <br />
              Date : {update.date}
            </>
          ) : null}
        </p>

        {update.body ? (
          <pre
            style={{
              margin: '0 0 16px',
              padding: 12,
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              background: 'var(--knit-bg)',
              border: '1px solid var(--knit-border)',
              borderRadius: 'var(--knit-radius-sm)',
              maxHeight: 200,
              overflow: 'auto',
            }}
          >
            {update.body}
          </pre>
        ) : null}

        {(installing || ready) && (
          <div style={{ margin: '0 0 12px' }}>
            {progressLabel ? (
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--knit-text-muted)' }}>
                {progressLabel}
              </p>
            ) : null}
            <div
              role="progressbar"
              aria-valuenow={pct ?? undefined}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{
                height: 6,
                borderRadius: 3,
                background: 'var(--knit-border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: ready ? '100%' : pct != null ? `${pct}%` : '30%',
                  background: 'var(--knit-primary)',
                  borderRadius: 3,
                  transition: 'width 120ms linear',
                  opacity: pct == null && !ready ? 0.7 : 1,
                }}
              />
            </div>
          </div>
        )}

        {error ? (
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--knit-danger, #c44)' }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          {!ready && (
            <>
              <button
                type="button"
                className="knit-btn"
                onClick={() => updateStore.dismissForSession()}
                disabled={installing}
                data-tooltip="Reporter jusqu’au prochain lancement"
              >
                Plus tard
              </button>
              <button
                type="button"
                className="knit-btn"
                onClick={() => updateStore.skipCurrentVersion()}
                disabled={installing}
                data-tooltip="Ne plus proposer cette version"
              >
                Ignorer
              </button>
            </>
          )}
          {ready ? (
            <button
              type="button"
              className="knit-btn knit-btn-primary"
              onClick={() => void updateStore.relaunch()}
            >
              Redémarrer
            </button>
          ) : (
            <button
              type="button"
              className="knit-btn knit-btn-primary"
              onClick={() => void updateStore.install()}
              disabled={installing}
            >
              {installing ? 'Installation…' : 'Installer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
