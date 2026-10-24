import React, { useEffect, useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { RecentVaultList } from '../Vault/RecentVaultList';
import { vaultStore } from '../../stores/vaultStore';
import { vaultRegistry } from '../../stores/vaultRegistry';
import { isTauriEnvironment } from '../../utils/env';
import type { RegisteredVault } from '../../types';

export interface WizardHomeProps {
  busy: boolean;
  pendingInitPath?: string | null;
  onCreate: () => void;
  onJoin: () => void;
  onVaultOpened: () => void;
  onOpenExisting: (path: string) => void;
}

const cardBtnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 8,
  padding: '14px 14px',
  minHeight: 108,
  textAlign: 'left',
  height: 'auto',
};

const cardIconWrap: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 'var(--knit-radius-sm)',
  backgroundColor: 'var(--knit-bg)',
  border: '1px solid var(--knit-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const linkBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: 0,
  border: 'none',
  background: 'transparent',
  color: 'var(--knit-text-secondary)',
  fontSize: 12,
  cursor: 'pointer',
};

export const WizardHome: React.FC<WizardHomeProps> = ({
  busy,
  pendingInitPath,
  onCreate,
  onJoin,
  onVaultOpened,
  onOpenExisting,
}) => {
  const [registryTick, setRegistryTick] = useState(0);
  useEffect(() => vaultRegistry.subscribe(() => setRegistryTick((t) => t + 1)), []);
  void registryTick;
  const recent = vaultRegistry.list();

  const handleOpen = (entry: RegisteredVault) => {
    if (entry.isDemo) {
      void vaultStore.openDemoVault().then(onVaultOpened);
    } else {
      onOpenExisting(entry.path);
    }
  };

  return (
    <>
      <div
        style={{
          textAlign: 'center',
          padding: '28px 24px 20px',
          borderBottom: '1px solid var(--knit-border)',
        }}
      >
        <DuotoneIcon name="vault" size={32} style={{ color: 'var(--knit-primary)' }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '10px 0 6px' }}>Knit</h1>
        <p
          style={{
            color: 'var(--knit-text-secondary)',
            fontSize: 13,
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          Espace collaboratif local-first & peer-to-peer
        </p>
      </div>

      <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--knit-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button type="button" className="knit-btn" onClick={onCreate} style={cardBtnStyle}>
            <div style={cardIconWrap}>
              <DuotoneIcon name="plus" size={16} style={{ color: 'var(--knit-primary)' }} />
            </div>
            <strong style={{ fontSize: 13 }}>Créer</strong>
            <span style={{ fontSize: 11, color: 'var(--knit-text-secondary)', lineHeight: 1.35 }}>
              Nouveau coffre depuis zéro
            </span>
          </button>
          <button type="button" className="knit-btn" onClick={onJoin} style={cardBtnStyle}>
            <div style={cardIconWrap}>
              <DuotoneIcon name="link" size={16} style={{ color: 'var(--knit-primary)' }} />
            </div>
            <strong style={{ fontSize: 13 }}>Rejoindre</strong>
            <span style={{ fontSize: 11, color: 'var(--knit-text-secondary)', lineHeight: 1.35 }}>
              Ticket ou PIN LAN
            </span>
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 12,
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => void vaultStore.openDemoVault().then(onVaultOpened)}
            style={linkBtnStyle}
            data-tooltip="Banc d’essai en mémoire"
          >
            <DuotoneIcon name="knit" size={13} />
            <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Coffre démo
            </span>
          </button>
          {isTauriEnvironment() && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void vaultStore.pickAndOpenVaultSmart().then((r) => {
                  if (r === 'opened') onVaultOpened();
                });
              }}
              style={linkBtnStyle}
            >
              <DuotoneIcon name="folder-open" size={13} />
              <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
                Ouvrir un dossier…
              </span>
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '12px 12px 16px' }}>
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
          Coffres récents
        </div>

        <RecentVaultList vaults={recent} busy={busy} onOpen={handleOpen} />

        {pendingInitPath && (
          <div
            style={{
              marginTop: 12,
              marginInline: 6,
              padding: '10px 12px',
              borderRadius: 'var(--knit-radius-md)',
              border:
                '1px solid color-mix(in srgb, var(--knit-primary) 35%, var(--knit-border))',
              background: 'color-mix(in srgb, var(--knit-primary) 8%, var(--knit-bg))',
              fontSize: 12,
              color: 'var(--knit-text-secondary)',
              lineHeight: 1.4,
            }}
          >
            Ce dossier n’est pas encore un coffre Knit. Choisissez{' '}
            <strong style={{ color: 'var(--knit-text)' }}>Créer</strong> pour l’initialiser.
          </div>
        )}
      </div>
    </>
  );
};
