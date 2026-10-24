import React, { useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { contextMenu } from '../../stores/contextMenuStore';
import { copyTextWithToast } from '../../utils/clipboardUtils';
import {
  downloadAndInstallUpdate,
  relaunchApp,
  type KnitUpdateInfo,
} from '../../utils/updater';

export interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentVersion: string;
  update: KnitUpdateInfo;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  currentVersion,
  update,
}) => {
  const [installing, setInstalling] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [readyToRelaunch, setReadyToRelaunch] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    setProgressLabel('Téléchargement…');
    const ok = await downloadAndInstallUpdate((p) => {
      if (p.total != null && p.total > 0) {
        const pct = Math.min(100, Math.round((p.downloaded / p.total) * 100));
        setProgressLabel(`Téléchargement… ${pct} %`);
      } else {
        setProgressLabel('Téléchargement en cours…');
      }
    });
    setInstalling(false);
    if (ok) {
      setProgressLabel('Mise à jour prête');
      setReadyToRelaunch(true);
    } else {
      setError('Échec du téléchargement ou de la vérification de signature.');
      setProgressLabel(null);
    }
  };

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

        {progressLabel ? (
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--knit-text-muted)' }}>
            {progressLabel}
          </p>
        ) : null}
        {error ? (
          <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--knit-danger, #c44)' }}>
            {error}
          </p>
        ) : null}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="knit-btn" onClick={onClose} disabled={installing}>
            Plus tard
          </button>
          {readyToRelaunch ? (
            <button
              type="button"
              className="knit-btn knit-btn-primary"
              onClick={() => void relaunchApp()}
            >
              Redémarrer
            </button>
          ) : (
            <button
              type="button"
              className="knit-btn knit-btn-primary"
              onClick={() => void handleInstall()}
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
