import React, { useEffect, useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { RecentVaultList } from '../Vault/RecentVaultList';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultStore } from '../../stores/vaultStore';
import { vaultRegistry, DEMO_VAULT_PATH } from '../../stores/vaultRegistry';
import { toast } from '../../stores/toastStore';
import { isTauriEnvironment } from '../../utils/env';
import type { RegisteredVault } from '../../types';

export interface VaultSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Demande d'afficher le Wizard (créer / rejoindre / init). */
  onOpenWizard: () => void;
}

export const VaultSwitcherModal: React.FC<VaultSwitcherModalProps> = ({
  isOpen,
  onClose,
  onOpenWizard,
}) => {
  const [, setTick] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return vaultRegistry.subscribe(() => setTick((t) => t + 1));
  }, []);

  if (!isOpen) return null;

  const vaults = vaultRegistry.list();
  const current = vaultStore.currentVaultPath;

  const openVault = async (entry: RegisteredVault) => {
    if (entry.path === current) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      if (entry.isDemo || entry.path === DEMO_VAULT_PATH) {
        await vaultStore.openDemoVault();
      } else {
        const result = await vaultStore.openOrInitVault(entry.path);
        if (result === 'needs_init') {
          onClose();
          onOpenWizard();
          return;
        }
      }
      onClose();
    } catch (e: unknown) {
      toast.error('Impossible d’ouvrir le coffre', String(e));
    } finally {
      setBusy(false);
    }
  };

  const openFolder = async () => {
    setBusy(true);
    try {
      if (!isTauriEnvironment()) {
        toast.info('Mode Vite', 'Utilisez le coffre démo ou créez un coffre via le Wizard.');
        onClose();
        onOpenWizard();
        return;
      }
      const result = await vaultStore.pickAndOpenVaultSmart();
      if (result === 'needs_init') {
        onClose();
        onOpenWizard();
        return;
      }
      if (result === 'opened') onClose();
    } finally {
      setBusy(false);
    }
  };

  const showRootContext = (e: React.MouseEvent) => {
    e.preventDefault();
    contextMenu.show(e, [
      {
        id: 'wizard',
        label: 'Créer ou rejoindre un coffre…',
        icon: 'plus',
        onClick: () => {
          void vaultStore.openWizard().finally(() => {
            onClose();
            onOpenWizard();
          });
        },
      },
      {
        id: 'open-folder',
        label: 'Ouvrir un dossier…',
        icon: 'folder-open',
        onClick: () => void openFolder(),
      },
      {
        id: 'demo',
        label: 'Ouvrir le coffre démo',
        icon: 'vault',
        onClick: () => void vaultStore.openDemoVault().then(onClose),
      },
      {
        id: 'close-vault',
        label: 'Fermer le coffre actuel',
        icon: 'x',
        disabled: !current,
        onClick: () => void vaultStore.closeVault().then(onClose),
      },
    ]);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Changer de coffre-fort"
        onClick={(e) => e.stopPropagation()}
        onContextMenu={showRootContext}
        style={{
          width: 480,
          maxHeight: 'min(72vh, 560px)',
          backgroundColor: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-lg)',
          boxShadow: 'var(--knit-shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 18px 14px',
            borderBottom: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontWeight: 650,
                fontSize: 15,
                color: 'var(--knit-text)',
              }}
            >
              <DuotoneIcon name="vault" size={17} style={{ color: 'var(--knit-primary)' }} />
              Coffres-forts
            </div>
            <p
              style={{
                margin: '6px 0 0',
                fontSize: 12,
                lineHeight: 1.4,
                color: 'var(--knit-text-secondary)',
              }}
            >
              Ouvrir, créer ou basculer rapidement entre vos espaces.
            </p>
          </div>
          <button
            type="button"
            className="knit-btn"
            onClick={onClose}
            data-tooltip="Fermer"
            style={{ flexShrink: 0, width: 28, height: 28, padding: 0 }}
          >
            <DuotoneIcon name="x" size={14} />
          </button>
        </div>

        <div
          style={{
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            borderBottom: '1px solid var(--knit-border)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button
              type="button"
              className="knit-btn knit-btn-primary"
              disabled={busy}
              onClick={() => {
                setBusy(true);
                void vaultStore.openWizard().finally(() => {
                  setBusy(false);
                  onClose();
                  onOpenWizard();
                });
              }}
              style={{
                justifyContent: 'center',
                gap: 8,
                height: 34,
                fontWeight: 600,
              }}
            >
              <DuotoneIcon name="plus" size={14} />
              Créer / Rejoindre
            </button>
            <button
              type="button"
              className="knit-btn"
              disabled={busy}
              onClick={() => void openFolder()}
              style={{
                justifyContent: 'center',
                gap: 8,
                height: 34,
                fontWeight: 600,
              }}
            >
              <DuotoneIcon name="folder-open" size={14} />
              Ouvrir un dossier
            </button>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void vaultStore.openDemoVault().then(onClose)}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '2px 2px',
              border: 'none',
              background: 'transparent',
              color: 'var(--knit-text-secondary)',
              fontSize: 12,
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy ? 0.6 : 1,
            }}
            data-tooltip="Banc d’essai en mémoire (Vite)"
          >
            <DuotoneIcon name="knit" size={13} />
            <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Ouvrir le coffre démo
            </span>
          </button>
        </div>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            padding: '12px 12px 8px',
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: 'var(--knit-text-muted)',
              padding: '0 6px 8px',
            }}
          >
            Récents
          </div>

          <RecentVaultList
            vaults={vaults}
            busy={busy}
            currentPath={current}
            emptyLabel={
              <>
                Aucun coffre enregistré.
                <br />
                Créez-en un ou ouvrez un dossier.
              </>
            }
            onOpen={(entry) => void openVault(entry)}
          />
        </div>

        {current && (
          <div
            style={{
              padding: '10px 18px 14px',
              borderTop: '1px solid var(--knit-border)',
            }}
          >
            <button
              type="button"
              className="knit-btn"
              disabled={busy}
              onClick={() => void vaultStore.closeVault().then(onClose)}
              style={{
                width: '100%',
                justifyContent: 'center',
                gap: 8,
                height: 32,
                color: 'var(--knit-text-secondary)',
              }}
            >
              <DuotoneIcon name="x" size={13} />
              Fermer le coffre actuel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
