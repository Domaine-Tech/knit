import React, { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { contextMenu } from '../../stores/contextMenuStore';
import { applyHue, applyTheme, DEFAULT_HUE } from '../../theme/theme';
import { isTauriEnvironment } from '../../utils/env';
import { vaultStore } from '../../stores/vaultStore';
import { networkStore } from '../../stores/networkStore';
import { vaultConfigStore } from '../../stores/vaultConfigStore';
import { vaultNameFromPath, vaultRegistry } from '../../stores/vaultRegistry';
import { pickVaultFolderPath } from '../../stores/vaultIo';
import { toast } from '../../stores/toastStore';
import {
  DEMO_LAN_PIN,
  type InitVaultOptions,
  type InitVaultResult,
  type ThemeMode,
  type ThemePreference,
} from '../../types';
import { WizardHome } from './WizardHome';
import { WizardCreate, type CreateStep } from './WizardCreate';
import { WizardJoin, type JoinStep } from './WizardJoin';

type WizardFlow = 'home' | 'create' | 'join';

export interface WizardProps {
  onVaultOpened: () => void;
  /** Dossier déjà choisi mais jamais initialisé (pas de `.knitshare`). */
  pendingInitPath?: string | null;
}

export const Wizard: React.FC<WizardProps> = ({ onVaultOpened, pendingInitPath }) => {
  const [flow, setFlow] = useState<WizardFlow>(pendingInitPath ? 'create' : 'home');
  const [createStep, setCreateStep] = useState<CreateStep>(1);
  const [joinStep, setJoinStep] = useState<JoinStep>(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [folderPath, setFolderPath] = useState(pendingInitPath || '');
  const [vaultName, setVaultName] = useState(() =>
    pendingInitPath ? vaultNameFromPath(pendingInitPath) || 'Mon Projet' : 'Mon Projet'
  );
  const [createStructure, setCreateStructure] = useState(true);
  const [installAiKit, setInstallAiKit] = useState(true);
  const [initGit, setInitGit] = useState(false);
  const [hue, setHue] = useState(DEFAULT_HUE);
  const [themePref, setThemePref] = useState<ThemePreference>('auto');

  const [invitationCode, setInvitationCode] = useState('');
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatus, setSyncStatus] = useState('');

  const [joinCode, setJoinCode] = useState('');
  const [joinFolder, setJoinFolder] = useState('');

  useEffect(() => {
    if (!pendingInitPath) return;
    setFolderPath(pendingInitPath);
    setVaultName(vaultNameFromPath(pendingInitPath) || 'Mon Projet');
    setFlow('create');
    setCreateStep(1);
    setError(null);
  }, [pendingInitPath]);

  const pickFolder = useCallback(
    async (setter: (p: string) => void) => {
      if (!isTauriEnvironment()) {
        setter(`D:/KnitVaults/${vaultName.replace(/\s+/g, '-')}`);
        return;
      }
      const selected = await pickVaultFolderPath();
      if (selected) setter(selected);
    },
    [vaultName]
  );

  const openExisting = useCallback(
    async (path: string) => {
      setBusy(true);
      setError(null);
      try {
        const result = await vaultStore.openOrInitVault(path);
        if (result === 'needs_init') {
          setFolderPath(path);
          setFlow('create');
          setCreateStep(1);
          return;
        }
        onVaultOpened();
      } catch (e: unknown) {
        setError(String(e));
      } finally {
        setBusy(false);
      }
    },
    [onVaultOpened]
  );

  const finishCreate = useCallback(async () => {
    if (!folderPath.trim()) {
      setError('Choisissez un dossier pour le coffre');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const options: InitVaultOptions = {
        vault_name: vaultName.trim() || 'Mon Projet',
        create_default_structure: createStructure,
        install_ai_kit: installAiKit,
        init_git: initGit,
        hue,
        theme: themePref,
      };

      if (isTauriEnvironment()) {
        await invoke<InitVaultResult>('init_vault', {
          vaultPath: folderPath,
          options,
        });
      }

      applyHue(hue);
      const resolvedTheme: ThemeMode =
        themePref === 'auto'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : themePref;
      applyTheme(resolvedTheme);

      if (!isTauriEnvironment()) {
        vaultRegistry.touch(folderPath, vaultName.trim() || 'Mon Projet');
        await vaultStore.openVault(folderPath);
      } else {
        await vaultStore.openVault(folderPath);
        await vaultConfigStore.load(folderPath);
        vaultRegistry.touch(folderPath, vaultName.trim() || undefined);
      }
      vaultStore.clearPendingInit();

      setInvitationCode(networkStore.invitationCode || '');
      setPinCode(networkStore.pinCode);
      if (!isTauriEnvironment() && !networkStore.invitationCode) {
        setInvitationCode('knit://join/demo-ticket');
        setPinCode(networkStore.pinCode || DEMO_LAN_PIN);
      }

      setCreateStep(3);
      toast.success(pendingInitPath ? 'Coffre initialisé' : 'Coffre créé', vaultName);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [
    folderPath,
    vaultName,
    createStructure,
    installAiKit,
    initGit,
    hue,
    themePref,
    pendingInitPath,
  ]);

  const finishJoin = useCallback(async () => {
    if (!joinFolder.trim()) {
      setError('Choisissez où stocker le coffre local');
      return;
    }
    if (!joinCode.trim()) {
      setError('Collez un code d’invitation ou un PIN à 6 chiffres');
      return;
    }
    setBusy(true);
    setError(null);
    setJoinStep(2);
    setSyncProgress(10);
    setSyncStatus('Préparation du dossier local…');
    try {
      const nameGuess = 'Coffre partagé';
      if (isTauriEnvironment()) {
        await invoke<InitVaultResult>('prepare_join_vault', {
          vaultPath: joinFolder,
          vaultName: nameGuess,
        });
      }
      setSyncProgress(35);
      setSyncStatus('Ouverture du coffre…');
      await vaultStore.openVault(joinFolder);
      await vaultConfigStore.load(joinFolder);

      setSyncProgress(70);
      setSyncStatus('Connexion au pair…');
      await networkStore.connectPeer(joinCode.trim());
      setSyncProgress(100);
      setSyncStatus('Connecté au pair');
      vaultRegistry.touch(joinFolder, nameGuess);
      vaultStore.clearPendingInit();
      toast.success('Coffre rejoint', joinFolder);
      setTimeout(() => onVaultOpened(), 400);
    } catch (e: unknown) {
      setError(String(e));
      setSyncStatus('Échec de la connexion');
      setJoinStep(1);
    } finally {
      setBusy(false);
    }
  }, [joinFolder, joinCode, onVaultOpened]);

  const showContext = (e: React.MouseEvent) => {
    e.preventDefault();
    contextMenu.show(e, [
      {
        id: 'copy-path',
        label: 'Copier le chemin du dossier',
        icon: 'copy',
        onClick: () => {
          const p = flow === 'join' ? joinFolder : folderPath;
          if (p) void navigator.clipboard.writeText(p);
        },
      },
      {
        id: 'copy-invite',
        label: 'Copier le code d’invitation',
        icon: 'share',
        disabled: !invitationCode,
        onClick: () => {
          if (invitationCode) void navigator.clipboard.writeText(invitationCode);
        },
      },
      {
        id: 'copy-pin',
        label: 'Copier le PIN LAN',
        icon: 'copy',
        disabled: !pinCode,
        onClick: () => {
          if (pinCode) void navigator.clipboard.writeText(pinCode);
        },
      },
      {
        id: 'refresh-pin',
        label: 'Rafraîchir le PIN',
        icon: 'sync',
        disabled: !pinCode,
        onClick: () => {
          void networkStore.refreshPinCode().then((pin) => {
            if (pin) setPinCode(pin);
          });
        },
      },
    ]);
  };

  return (
    <div
      className="knit-wizard"
      onContextMenu={showContext}
      onMouseDown={(e) => {
        if (e.button === 1) e.preventDefault();
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--knit-bg)',
        color: 'var(--knit-text)',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          backgroundColor: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-lg)',
          padding: 0,
          boxShadow: 'var(--knit-shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'min(88vh, 640px)',
        }}
      >
        {flow === 'home' && (
          <WizardHome
            busy={busy}
            pendingInitPath={pendingInitPath}
            onCreate={() => {
              setFlow('create');
              setCreateStep(1);
              setError(null);
            }}
            onJoin={() => {
              setFlow('join');
              setJoinStep(1);
              setError(null);
            }}
            onVaultOpened={onVaultOpened}
            onOpenExisting={(path) => void openExisting(path)}
          />
        )}

        {flow !== 'home' && (
          <div style={{ padding: '20px 22px 24px', overflow: 'auto' }}>
            {flow === 'create' && (
              <WizardCreate
                step={createStep}
                busy={busy}
                pendingInitPath={pendingInitPath}
                folderPath={folderPath}
                vaultName={vaultName}
                createStructure={createStructure}
                installAiKit={installAiKit}
                initGit={initGit}
                hue={hue}
                themePref={themePref}
                invitationCode={invitationCode}
                pinCode={pinCode}
                onBackHome={() => setFlow('home')}
                onStepChange={setCreateStep}
                onFolderPathChange={setFolderPath}
                onVaultNameChange={setVaultName}
                onCreateStructureChange={setCreateStructure}
                onInstallAiKitChange={setInstallAiKit}
                onInitGitChange={setInitGit}
                onHueChange={setHue}
                onThemePrefChange={setThemePref}
                onPickFolder={() => void pickFolder(setFolderPath)}
                onFinishCreate={() => void finishCreate()}
                onPinCodeChange={setPinCode}
                onVaultOpened={onVaultOpened}
              />
            )}

            {flow === 'join' && (
              <WizardJoin
                step={joinStep}
                busy={busy}
                joinCode={joinCode}
                joinFolder={joinFolder}
                syncProgress={syncProgress}
                syncStatus={syncStatus}
                onBackHome={() => setFlow('home')}
                onStepChange={setJoinStep}
                onJoinCodeChange={setJoinCode}
                onJoinFolderChange={setJoinFolder}
                onPickFolder={() => void pickFolder(setJoinFolder)}
                onFinishJoin={() => void finishJoin()}
              />
            )}

            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: '8px 10px',
                  borderRadius: 'var(--knit-radius-sm)',
                  border: '1px solid var(--knit-border)',
                  background: 'hsla(0, 70%, 50%, 0.08)',
                  color: 'var(--knit-text)',
                  fontSize: 12,
                }}
              >
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
