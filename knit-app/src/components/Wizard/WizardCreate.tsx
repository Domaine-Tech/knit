import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { PinQrBlock } from '../Network/PinQrBlock';
import { WizardHeader } from './WizardHeader';
import { applyHue } from '../../theme/theme';
import { toast } from '../../stores/toastStore';
import { networkStore } from '../../stores/networkStore';
import type { ThemePreference } from '../../types';

export type CreateStep = 1 | 2 | 3;

export interface WizardCreateProps {
  step: CreateStep;
  busy: boolean;
  pendingInitPath?: string | null;
  folderPath: string;
  vaultName: string;
  createStructure: boolean;
  installAiKit: boolean;
  initGit: boolean;
  hue: number;
  themePref: ThemePreference;
  invitationCode: string;
  pinCode: string | null;
  onBackHome: () => void;
  onStepChange: (step: CreateStep) => void;
  onFolderPathChange: (v: string) => void;
  onVaultNameChange: (v: string) => void;
  onCreateStructureChange: (v: boolean) => void;
  onInstallAiKitChange: (v: boolean) => void;
  onInitGitChange: (v: boolean) => void;
  onHueChange: (v: number) => void;
  onThemePrefChange: (v: ThemePreference) => void;
  onPickFolder: () => void;
  onFinishCreate: () => void;
  onPinCodeChange: (pin: string) => void;
  onVaultOpened: () => void;
}

export const WizardCreate: React.FC<WizardCreateProps> = ({
  step,
  busy,
  pendingInitPath,
  folderPath,
  vaultName,
  createStructure,
  installAiKit,
  initGit,
  hue,
  themePref,
  invitationCode,
  pinCode,
  onBackHome,
  onStepChange,
  onFolderPathChange,
  onVaultNameChange,
  onCreateStructureChange,
  onInstallAiKitChange,
  onInitGitChange,
  onHueChange,
  onThemePrefChange,
  onPickFolder,
  onFinishCreate,
  onPinCodeChange,
  onVaultOpened,
}) => {
  if (step === 1) {
    return (
      <>
        <WizardHeader
          title={pendingInitPath ? 'Initialiser ce dossier' : 'Créer un coffre-fort'}
          step="1/3"
          onBack={onBackHome}
        />
        <label className="knit-label">Emplacement</label>
        <div className="knit-input-group" style={{ marginBottom: 14, width: '100%' }}>
          <input
            className="knit-input-seamless"
            value={folderPath}
            onChange={(e) => onFolderPathChange(e.target.value)}
            placeholder="Chemin du dossier"
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
        <label className="knit-label">Nom du coffre-fort</label>
        <input
          className="knit-input"
          value={vaultName}
          onChange={(e) => onVaultNameChange(e.target.value)}
          style={{ width: '100%', marginBottom: 14 }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 18 }}>
          <label
            className="knit-label"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: 0 }}
          >
            <input
              type="checkbox"
              className="knit-checkbox"
              checked={createStructure}
              onChange={(e) => onCreateStructureChange(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>Créer la structure par défaut (wiki/, projet/taches/, assets/)</span>
          </label>
          <label
            className="knit-label"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: 0 }}
          >
            <input
              type="checkbox"
              className="knit-checkbox"
              checked={installAiKit}
              onChange={(e) => onInstallAiKitChange(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>Configurer les règles pour agents IA (kit + GUIDE_IA.md)</span>
          </label>
          <label
            className="knit-label"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: 0 }}
          >
            <input
              type="checkbox"
              className="knit-checkbox"
              checked={initGit}
              onChange={(e) => onInitGitChange(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>Initialiser un dépôt Git (.knit/ dans .gitignore)</span>
          </label>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="knit-btn knit-btn-primary"
            disabled={!folderPath.trim() || busy}
            onClick={() => onStepChange(2)}
          >
            Suivant
          </button>
        </div>
      </>
    );
  }

  if (step === 2) {
    return (
      <>
        <WizardHeader title="Créer un coffre-fort" step="2/3" onBack={() => onStepChange(1)} />
        <label className="knit-label">Couleur du thème ({hue}°)</label>
        <input
          type="range"
          min={0}
          max={360}
          value={hue}
          onChange={(e) => {
            const v = Number(e.target.value);
            onHueChange(v);
            applyHue(v);
          }}
          style={{ width: '100%', marginBottom: 16 }}
        />
        <div
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 16,
            padding: 12,
            borderRadius: 'var(--knit-radius-sm)',
            border: '1px solid var(--knit-border)',
            background: 'var(--knit-bg)',
          }}
        >
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: 'var(--knit-primary)',
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--knit-text-muted)' }}>
            Aperçu de la couleur primaire
          </span>
        </div>
        <label className="knit-label">Mode</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          {(['light', 'dark', 'auto'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className="knit-btn"
              onClick={() => onThemePrefChange(mode)}
              style={{
                flex: 1,
                borderColor: themePref === mode ? 'var(--knit-primary)' : 'var(--knit-border)',
              }}
            >
              {mode === 'light' ? 'Clair' : mode === 'dark' ? 'Sombre' : 'Auto'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="knit-btn knit-btn-primary"
            disabled={busy}
            onClick={onFinishCreate}
          >
            {busy ? 'Création…' : 'Créer le coffre'}
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <WizardHeader title="Coffre créé" step="3/3" onBack={onBackHome} />
      <p style={{ fontSize: 13, marginTop: 0 }}>
        Coffre-fort « {vaultName} » prêt. Partagez une invitation pour collaborer.
      </p>
      <label className="knit-label">Code d’invitation</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          className="knit-input"
          readOnly
          value={invitationCode}
          style={{ flex: 1, fontFamily: 'var(--knit-font-mono)', fontSize: 11 }}
        />
        <button
          type="button"
          className="knit-btn"
          onClick={() => {
            void navigator.clipboard.writeText(invitationCode);
            toast.success('Code copié');
          }}
        >
          <DuotoneIcon name="copy" size={13} />
          Copier
        </button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <PinQrBlock
          pinCode={pinCode}
          qrSize={148}
          pinFontSize={28}
          letterSpacing={6}
          qrFallbackPayload="knit"
          showQrCaption
          onCopyPin={() => {
            if (pinCode) {
              void navigator.clipboard.writeText(pinCode);
              toast.success('PIN copié');
            }
          }}
          onRefreshPin={() => {
            void networkStore.refreshPinCode().then((pin) => {
              if (pin) {
                onPinCodeChange(pin);
                toast.success('PIN régénéré');
              }
            });
          }}
        />
      </div>
      <button
        type="button"
        className="knit-btn knit-btn-primary"
        style={{ width: '100%' }}
        onClick={onVaultOpened}
      >
        <DuotoneIcon name="vault" size={14} />
        Ouvrir le coffre-fort
      </button>
    </>
  );
};
