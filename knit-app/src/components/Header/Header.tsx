import React, { useState, useEffect } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import type { ThemeMode } from '../../types';
import { ColorPickerPopover } from './ColorPickerPopover';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultStore } from '../../stores/vaultStore';
import { networkStore } from '../../stores/networkStore';
import { COLLABORATIVE_PALETTE } from '../../theme/theme';
import { NetworkModal } from '../Network/NetworkModal';
import { ProfileModal } from '../Profile/ProfileModal';
import { SettingsModal } from '../Modal/SettingsModal';
import { VaultSwitcherModal } from '../Modal/VaultSwitcherModal';
import { WindowControls } from './WindowControls';
import { getAppVersion, APP_VERSION } from '../../utils';
import { debugStore } from '../../stores/debugStore';
import { useDebugMode } from '../../hooks';

interface HeaderProps {
  theme: ThemeMode;
  hue: number;
  onOpenQuickSwitcher: () => void;
  onOpenCommandPalette: () => void;
  /** Ferme le coffre et affiche le Wizard. */
  onRequestWizard?: () => void;
  onThemeToggle: () => void;
  onHueChange: (newHue: number) => void;
  onThemeChange?: (theme: ThemeMode) => void;
  onSave: () => void;
  canSave: boolean;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  onOpenGlobalAgenda?: () => void;
  isGlobalAgendaOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  hue,
  onOpenQuickSwitcher,
  onOpenCommandPalette,
  onRequestWizard,
  onThemeToggle,
  onHueChange,
  onThemeChange,
  onSave,
  canSave,
  isZenMode = false,
  onToggleZenMode,
  onOpenGlobalAgenda,
  isGlobalAgendaOpen = false,
}) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVaultSwitcherOpen, setIsVaultSwitcherOpen] = useState(false);
  const [appVersion, setAppVersion] = useState(APP_VERSION);
  const [, setTick] = useState(0);
  const { isDebugActive } = useDebugMode();

  const isAgendaActive = isGlobalAgendaOpen;

  const handleOpenAgenda = () => {
    onOpenGlobalAgenda?.();
  };

  useEffect(() => {
    getAppVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    return networkStore.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  useEffect(() => {
    return vaultStore.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  useEffect(() => {
    const openSwitcher = () => setIsVaultSwitcherOpen(true);
    window.addEventListener('knit-open-vault-switcher', openSwitcher);
    return () => window.removeEventListener('knit-open-vault-switcher', openSwitcher);
  }, []);

  const handleHeaderContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    contextMenu.show(e, [
      ...(canSave
        ? [
            {
              id: 'header-save',
              label: 'Sauvegarder la note active',
              icon: 'save' as const,
              shortcut: 'Ctrl+S',
              onClick: onSave,
            },
          ]
        : []),
      { id: 'div-header-1', divider: true },
      {
        id: 'header-theme',
        label: theme === 'dark' ? 'Basculer en thème clair' : 'Basculer en thème sombre',
        icon: theme === 'dark' ? 'sun' : 'moon',
        onClick: onThemeToggle,
      },
      {
        id: 'header-reset-color',
        label: 'Réinitialiser l’Ambre Knit par défaut (35°)',
        icon: 'slider',
        onClick: () => onHueChange(35),
      },
      { id: 'div-header-2', divider: true },
      {
        id: 'header-profile',
        label: 'Modifier mon profil collaborateur...',
        icon: 'user' as const,
        onClick: () => setIsProfileModalOpen(true),
      },
      {
        id: 'header-vault-switcher',
        label: 'Changer de coffre-fort…',
        icon: 'vault',
        onClick: () => setIsVaultSwitcherOpen(true),
      },
      {
        id: 'header-open-vault',
        label: 'Ouvrir un dossier…',
        icon: 'folder-open',
        onClick: () => {
          void vaultStore.pickAndOpenVaultSmart();
        },
      },
      {
        id: 'header-wizard',
        label: 'Créer / rejoindre un coffre…',
        icon: 'plus',
        onClick: () => {
          void vaultStore.openWizard().then(() => onRequestWizard?.());
        },
      },
    ]);
  };

  const vaultLabel = vaultStore.vaultName || 'Aucun coffre';

  return (
    <header
      data-tauri-drag-region
      onContextMenu={handleHeaderContextMenu}
      style={{
        height: 40,
        backgroundColor: 'var(--knit-bg)',
        borderBottom: '1px solid var(--knit-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 0 0 14px',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Contrôles de gauche : Marque Knit & sélecteur de coffre */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 700,
            fontSize: 13,
            color: 'var(--knit-text)',
            cursor: 'default',
          }}
        >
          <DuotoneIcon name="knit" size={18} style={{ color: 'var(--knit-primary)' }} />
          <span style={{ letterSpacing: '-0.01em' }}>Knit</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: 'var(--knit-text-muted)',
              backgroundColor: 'var(--knit-surface)',
              border: '1px solid var(--knit-border)',
              padding: '1px 5px',
              borderRadius: 'var(--knit-radius-xs)',
              letterSpacing: '0.02em',
              lineHeight: 1.2,
              userSelect: 'none',
              marginLeft: 2,
            }}
            data-tooltip={`Knit v${appVersion}`}
          >
            v{appVersion}
          </span>
        </div>
        <button
          type="button"
          className="knit-btn"
          data-tooltip="Changer de coffre-fort"
          data-shortcut="Ctrl+Shift+O"
          onClick={() => setIsVaultSwitcherOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            maxWidth: 220,
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--knit-text-secondary)',
            border: '1px solid var(--knit-border)',
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: 'transparent',
          }}
        >
          <DuotoneIcon name="vault" size={13} />
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {vaultLabel}
          </span>
          <DuotoneIcon name="chevron-down" size={11} />
        </button>
      </div>

      {/* Contrôles de droite : Outils et boutons de fenêtre */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', marginLeft: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 8 }}>
        {/* Quick Switcher & Palette de commandes */}
        <button
          onClick={onOpenQuickSwitcher}
          data-tooltip="Recherche rapide de notes"
          data-shortcut="Ctrl+O"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: 'transparent',
            border: '1px solid var(--knit-border)',
            color: 'var(--knit-text-secondary)',
            fontSize: 11,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <DuotoneIcon name="search" size={12} />
          <span>Sauter à...</span>
          <kbd style={{ fontSize: 9, padding: '1px 3px', border: '1px solid var(--knit-border)', borderRadius: 2 }}>Ctrl+O</kbd>
        </button>

        <button
          onClick={onOpenCommandPalette}
          data-tooltip="Palette de commandes"
          data-shortcut="Ctrl+P"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: 'transparent',
            border: '1px solid var(--knit-border)',
            color: 'var(--knit-text-secondary)',
            fontSize: 11,
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <DuotoneIcon name="command" size={12} />
          <kbd style={{ fontSize: 9, padding: '1px 3px', border: '1px solid var(--knit-border)', borderRadius: 2 }}>Ctrl+P</kbd>
        </button>

        {onToggleZenMode && (
          <button
            onClick={onToggleZenMode}
            data-tooltip={
              isZenMode
                ? 'Quitter le mode lecture (Ctrl+Shift+F)'
                : 'Mode lecture : focus + lecture seule, liens au clic simple (Ctrl+Shift+F)'
            }
            data-shortcut="Ctrl+Shift+F"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '3px 8px',
              borderRadius: 'var(--knit-radius-sm)',
              backgroundColor: isZenMode ? 'var(--knit-primary-alpha)' : 'transparent',
              border: '1px solid var(--knit-border)',
              color: isZenMode ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
              fontSize: 11,
              fontWeight: isZenMode ? 700 : 500,
              cursor: 'pointer',
            }}
          >
            <DuotoneIcon name="sun" size={12} />
            <span>Lecture</span>
          </button>
        )}

        {/* Bouton Agenda Global */}
        <button
          onClick={handleOpenAgenda}
          data-tooltip="Ouvrir l'Agenda Global du coffre (Ctrl+Shift+A)"
          data-shortcut="Ctrl+Shift+A"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: isAgendaActive ? 'var(--knit-primary-alpha)' : 'transparent',
            border: isAgendaActive ? '1px solid var(--knit-primary)' : '1px solid var(--knit-border)',
            color: isAgendaActive ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
            fontSize: 11,
            fontWeight: isAgendaActive ? 700 : 500,
            cursor: 'pointer',
            transition: 'all var(--knit-transition-fast)',
          }}
          onMouseEnter={(e) => {
            if (!isAgendaActive) e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)';
          }}
          onMouseLeave={(e) => {
            if (!isAgendaActive) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <DuotoneIcon
            name="calendar"
            size={12}
            style={{ color: isAgendaActive ? 'var(--knit-primary)' : 'currentColor' }}
          />
          <span>Agenda</span>
        </button>

        {/* Bouton Unique Global Debug (Ctrl+Alt+D) */}
        <button
          onClick={() => debugStore.toggle()}
          data-tooltip={
            isDebugActive
              ? 'Désactiver le Mode Debug Global (Ctrl+Alt+D)'
              : 'Activer le Mode Debug Global (Ctrl+Alt+D) — Inspecteur de géométrie, métriques et données'
          }
          data-shortcut="Ctrl+Alt+D"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: isDebugActive ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
            border: isDebugActive ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--knit-border)',
            color: isDebugActive ? '#EF4444' : 'var(--knit-text-secondary)',
            fontSize: 11,
            fontWeight: isDebugActive ? 700 : 500,
            cursor: 'pointer',
            transition: 'all var(--knit-transition-fast)',
          }}
          onMouseEnter={(e) => {
            if (!isDebugActive) e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)';
          }}
          onMouseLeave={(e) => {
            if (!isDebugActive) e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <DuotoneIcon name="bug" size={13} style={{ color: isDebugActive ? '#EF4444' : 'currentColor' }} />
          <span>Debug</span>
          {isDebugActive && (
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#EF4444',
                boxShadow: '0 0 6px #EF4444',
                marginLeft: 1,
              }}
            />
          )}
        </button>


        {/* Sélecteur de couleur d'accent (dot cliquable avec popover 3x3 + slider) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsColorPickerOpen((prev) => !prev)}
            title={`Couleur d'accent (${hue}°) — Cliquez pour ouvrir la palette`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              borderRadius: 'var(--knit-radius-sm)',
              backgroundColor: isColorPickerOpen ? 'var(--knit-surface-hover)' : 'transparent',
              border: '1px solid var(--knit-border)',
              cursor: 'pointer',
              transition: 'all var(--knit-transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
            onMouseLeave={(e) => {
              if (!isColorPickerOpen) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: 'var(--knit-primary)',
                border: '1px solid var(--knit-border)',
                flexShrink: 0,
              }}
            />
            <DuotoneIcon name="slider" size={13} style={{ color: 'var(--knit-text-secondary)' }} />
          </button>

          <ColorPickerPopover
            hue={hue}
            onHueChange={onHueChange}
            isOpen={isColorPickerOpen}
            onClose={() => setIsColorPickerOpen(false)}
          />
        </div>

        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          data-tooltip="Paramètres"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 6,
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: 'transparent',
            border: '1px solid var(--knit-border)',
            cursor: 'pointer',
            color: 'var(--knit-text-secondary)',
          }}
        >
          <DuotoneIcon name="slider" size={14} />
        </button>

        <button
          onClick={() => setIsNetworkModalOpen(true)}
          data-tooltip="Réseau P2P Iroh & Collaborateurs"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: networkStore.connectedPeers.length > 0 ? 'var(--knit-surface)' : 'transparent',
            border: '1px solid var(--knit-border)',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--knit-text)',
            cursor: 'pointer',
            transition: 'all var(--knit-transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = networkStore.connectedPeers.length > 0 ? 'var(--knit-surface)' : 'transparent';
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: networkStore.isNetworkActive ? '#10B981' : 'var(--knit-text-muted)',
              boxShadow: networkStore.isNetworkActive ? '0 0 6px #10B981' : 'none',
              flexShrink: 0,
            }}
          />
          <DuotoneIcon name="share" size={13} />
          <span>
            {networkStore.connectedPeers.length > 0
              ? `${networkStore.connectedPeers.length} pair${networkStore.connectedPeers.length > 1 ? 's' : ''}`
              : 'P2P Iroh'}
          </span>
        </button>

        {/* Badge Profil Utilisateur */}
        <button
          onClick={() => setIsProfileModalOpen(true)}
          title={`Mon profil : ${networkStore.currentProfile?.display_name || 'Moi'} — Cliquez pour éditer`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '2px 8px 2px 3px',
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: 'transparent',
            border: '1px solid var(--knit-border)',
            color: 'var(--knit-text)',
            cursor: 'pointer',
            transition: 'all var(--knit-transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          {networkStore.avatarDataUrl ? (
            <img
              src={networkStore.avatarDataUrl}
              alt="Avatar"
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid var(--knit-border)',
              }}
            />
          ) : (
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor:
                  COLLABORATIVE_PALETTE[
                    (networkStore.localIdentity?.color_index ?? 0) % COLLABORATIVE_PALETTE.length
                  ],
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 10,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {networkStore.localIdentity?.initials || 'MO'}
            </div>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              maxWidth: 90,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {networkStore.currentProfile?.display_name || 'Profil'}
          </span>
        </button>

        {/* Toggle Theme sombre / clair */}
        <button
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Basculer en thème clair' : 'Basculer en thème sombre'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: 'var(--knit-surface)',
            border: '1px solid var(--knit-border)',
            color: 'var(--knit-text)',
            transition: 'background var(--knit-transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface)')}
        >
          <DuotoneIcon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
        </button>
      </div>

      {/* Boutons de contrôle de fenêtre natifs intégrés (façon VS Code) */}
      <WindowControls />
    </div>

      <NetworkModal isOpen={isNetworkModalOpen} onClose={() => setIsNetworkModalOpen(false)} />
      <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        theme={theme}
        hue={hue}
        onThemeChange={(t) => {
          if (onThemeChange) onThemeChange(t);
          else onThemeToggle();
        }}
        onHueChange={onHueChange}
      />
      <VaultSwitcherModal
        isOpen={isVaultSwitcherOpen}
        onClose={() => setIsVaultSwitcherOpen(false)}
        onOpenWizard={() => {
          setIsVaultSwitcherOpen(false);
          // openWizard déjà appelé par le modal « Créer / Rejoindre » ;
          // garde-fou si d'autres actions ne font que demander le Wizard
          if (!vaultStore.needsWizard) {
            onRequestWizard?.();
          }
        }}
      />
    </header>
  );
};
