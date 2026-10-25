import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { updateStore } from '../../stores/updateStore';
import { updateProgressPercent } from '../../utils/updaterLogic';
import type { KnitUpdateInfo, UpdateProgress, UpdateStatus } from '../../types/updater';

export interface UpdateBannerProps {
  status: UpdateStatus;
  update: KnitUpdateInfo | null;
  progress: UpdateProgress;
}

/**
 * Bandeau discret Header — pas de modale bloquante au démarrage.
 */
export const UpdateBanner: React.FC<UpdateBannerProps> = ({ status, update, progress }) => {
  if (status !== 'available' && status !== 'downloading' && status !== 'ready') {
    return null;
  }
  if (!update) return null;

  const pct = updateProgressPercent(progress);
  const label =
    status === 'ready'
      ? `Knit ${update.version} prêt`
      : status === 'downloading'
        ? pct != null
          ? `Mise à jour… ${pct} %`
          : 'Téléchargement…'
        : `Knit ${update.version}`;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 'var(--knit-radius-sm)',
        border: '1px solid var(--knit-border)',
        background: 'var(--knit-surface)',
        fontSize: 11,
        color: 'var(--knit-text-secondary)',
        maxWidth: 220,
      }}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      <DuotoneIcon name="download" size={12} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      {status === 'ready' ? (
        <button
          type="button"
          className="knit-btn knit-btn-primary"
          style={{ padding: '1px 6px', fontSize: 10, marginLeft: 2 }}
          onClick={() => void updateStore.relaunch()}
          data-tooltip="Redémarrer pour appliquer"
        >
          Redémarrer
        </button>
      ) : status === 'available' ? (
        <button
          type="button"
          className="knit-btn"
          style={{ padding: '1px 6px', fontSize: 10, marginLeft: 2 }}
          onClick={() => updateStore.openModal()}
          data-tooltip="Voir les notes de version"
        >
          Détails
        </button>
      ) : null}
    </div>
  );
};
