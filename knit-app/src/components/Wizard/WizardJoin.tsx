import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { WizardHeader } from './WizardHeader';
import { DEMO_LAN_PIN } from '../../types';

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
}) => {
  if (step === 2) {
    return (
      <>
        <WizardHeader title="Connexion" step="2/2" onBack={() => onStepChange(1)} />
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <DuotoneIcon name="sync" size={28} style={{ color: 'var(--knit-primary)' }} />
          <p style={{ fontSize: 13, color: 'var(--knit-text-muted)' }}>{syncStatus}</p>
          <p style={{ fontSize: 11, color: 'var(--knit-text-muted)', marginTop: 8 }}>
            La connexion P2P est établie. Les notes se synchronisent à l’ouverture des fichiers.
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
        </div>
      </>
    );
  }

  return (
    <>
      <WizardHeader title="Rejoindre un coffre-fort" step="1/2" onBack={onBackHome} />
      <label className="knit-label">Code d’invitation ou PIN LAN</label>
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
