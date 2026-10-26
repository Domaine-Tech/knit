import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { WizardHeader } from './WizardHeader';
import { DEMO_LAN_PIN } from '../../utils';

export type JoinStep = 1 | 2;

export interface WizardJoinProps {
  step: JoinStep;
  busy: boolean;
  joinCode: string;
  joinFolder: string;
  syncProgress: number;
  syncStatus: string;
  onBackHome: () => void;
  onStepChange: (step: JoinStep) => void;
  onJoinCodeChange: (v: string) => void;
  onJoinFolderChange: (v: string) => void;
  onPickFolder: () => void;
  onFinishJoin: () => void;
  firstName: string;
  lastName: string;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  joinHostName: string;
  joinVaultName: string;
  onConfirmCopy: () => void;
}

export const WizardJoin: React.FC<WizardJoinProps> = ({
  step,
  busy,
  joinCode,
  joinFolder,
  syncProgress,
  syncStatus,
  onBackHome,
  onStepChange,
  onJoinCodeChange,
  onJoinFolderChange,
  onPickFolder,
  onFinishJoin,
  firstName,
  lastName,
  onFirstNameChange,
  onLastNameChange,
  joinHostName,
  joinVaultName,
  onConfirmCopy,
}) => {
  if (step === 2) {
    return (
      <>
        <WizardHeader title="Connexion" step="2/2" onBack={() => onStepChange(1)} />
        <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
          <DuotoneIcon name="sync" size={28} style={{ color: 'var(--knit-primary)' }} />
          <p style={{ fontSize: 13, color: 'var(--knit-text-muted)' }}>{syncStatus}</p>
          {joinVaultName && (
            <p style={{ fontSize: 13, margin: '8px 0 0' }}>
              Coffre « {joinVaultName} »
              {joinHostName ? ` — hôte ${joinHostName}` : ''}
            </p>
          )}
          <p style={{ fontSize: 11, color: 'var(--knit-text-muted)', marginTop: 8 }}>
            La copie n’écrase pas un dossier qui contient déjà un autre coffre.
          </p>
          <div
            style={{
              height: 8,
              borderRadius: 4,
              background: 'var(--knit-border)',
              overflow: 'hidden',
              marginTop: 12,
            }}
          >
            <div
              style={{
                width: `${syncProgress}%`,
                height: '100%',
                background: 'var(--knit-primary)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
          {syncProgress < 100 && (
            <button
              type="button"
              className="knit-btn knit-btn-primary"
              disabled={busy || !joinVaultName}
              onClick={onConfirmCopy}
              style={{ marginTop: 16 }}
            >
              {busy ? 'Copie…' : 'Récupérer les notes'}
            </button>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <WizardHeader title="Rejoindre un coffre-fort" step="1/2" onBack={onBackHome} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <label className="knit-label" htmlFor="knit-join-first" style={{ marginBottom: 4 }}>
            Prénom
          </label>
          <input
            id="knit-join-first"
            className="knit-input"
            value={firstName}
            onChange={(e) => onFirstNameChange(e.target.value)}
            placeholder="Alice"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label className="knit-label" htmlFor="knit-join-last" style={{ marginBottom: 4 }}>
            Nom
          </label>
          <input
            id="knit-join-last"
            className="knit-input"
            value={lastName}
            onChange={(e) => onLastNameChange(e.target.value)}
            placeholder="Martin"
            style={{ width: '100%' }}
          />
        </div>
      </div>
      <label className="knit-label">Code d’invitation ou PIN LAN</label>
      <p style={{ fontSize: 11, color: 'var(--knit-text-muted)', marginTop: 0 }}>
        Choisissez un dossier vide. Knit y recopiera le coffre distant, sans toucher à un autre travail.
      </p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          className="knit-input"
          value={joinCode}
          onChange={(e) => onJoinCodeChange(e.target.value)}
          placeholder={`knit://join/… ou ${DEMO_LAN_PIN}`}
          style={{ flex: 1, fontFamily: 'var(--knit-font-mono)', fontSize: 12 }}
        />
        <button
          type="button"
          className="knit-btn"
          onClick={async () => {
            try {
              const text = await navigator.clipboard.readText();
              if (text) onJoinCodeChange(text.trim());
            } catch {
              /* ignore */
            }
          }}
        >
          Coller
        </button>
      </div>
      <label className="knit-label">Stocker dans</label>
      <div className="knit-input-group" style={{ marginBottom: 18, width: '100%' }}>
        <input
          className="knit-input-seamless"
          value={joinFolder}
          onChange={(e) => onJoinFolderChange(e.target.value)}
          style={{ flex: 1, width: '100%', fontFamily: 'var(--knit-font-mono)', fontSize: 12 }}
        />
        <button
          type="button"
          onClick={onPickFolder}
          data-tooltip="Choisir un dossier"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: 'var(--knit-text-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <DuotoneIcon name="folder" size={14} />
        </button>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="knit-btn knit-btn-primary"
          disabled={busy}
          onClick={onFinishJoin}
        >
          Rejoindre
        </button>
      </div>
    </>
  );
};
