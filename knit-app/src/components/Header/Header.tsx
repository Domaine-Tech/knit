import React, { useState, useEffect } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import type { ThemeMode } from '../../theme/theme';
import { ColorPickerPopover } from './ColorPickerPopover';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultStore } from '../../stores/vaultStore';
import { networkStore, COLLABORATIVE_PALETTE } from '../../stores/networkStore';
import { NetworkModal } from '../Network/NetworkModal';
import { ProfileModal } from '../Profile/ProfileModal';
import { WindowControls } from './WindowControls';
import { getAppVersion, APP_VERSION } from '../../utils/version';

export type AppViewMode = 'editor' | 'kanban' | 'table';

interface HeaderProps {
  theme: ThemeMode;
  hue: number;
  currentView: AppViewMode;
  onViewChange: (view: AppViewMode) => void;
  onOpenQuickSwitcher: () => void;
  onOpenCommandPalette: () => void;
  onThemeToggle: () => void;
  onHueChange: (newHue: number) => void;
  onSave: () => void;
  canSave: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  hue,
  currentView,
  onViewChange,
  onOpenQuickSwitcher,
  onOpenCommandPalette,
  onThemeToggle,
  onHueChange,
  onSave,
  canSave,
}) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const [isNetworkModalOpen, setIsNetworkModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [appVersion, setAppVersion] = useState(APP_VERSION);
  const [, setTick] = useState(0);

  useEffect(() => {
    getAppVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    return networkStore.subscribe(() => {
      setTick((t) => t + 1);
    });
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
        id: 'header-open-vault',
        label: 'Ouvrir un coffre-fort...',
        icon: 'folder-open',
        onClick: () => vaultStore.pickAndOpenVault(),
      },
    ]);
  };

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
      {/* Contrôles de gauche : Marque Knit & Coffre-fort */}
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
          title={`Knit — Éditeur Markdown Local-First P2P${vaultStore.vaultPath ? ` (${vaultStore.vaultPath})` : ''}`}
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
            title={`Knit v${appVersion} — Sprint 1 & Sprint 2`}
          >
            v{appVersion}
          </span>
        </div>
      </div>

      {/* Sélecteur de vue centralisé (Éditeur, Kanban, Tableau) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-sm)',
          padding: 2,
          gap: 2,
        }}
      >
        <button
          onClick={() => onViewChange('editor')}
          data-tooltip="Éditeur de note Markdown"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 'var(--knit-radius-xs)',
            backgroundColor: currentView === 'editor' ? 'var(--knit-surface-hover)' : 'transparent',
            border: 'none',
            color: currentView === 'editor' ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
            fontSize: 11,
            fontWeight: currentView === 'editor' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all var(--knit-duration-fast)',
          }}
        >
          <DuotoneIcon name="file-markdown" size={12} />
          <span>Éditeur</span>
        </button>

        <button
          onClick={() => onViewChange('kanban')}
          data-tooltip="Tableau Kanban des tâches"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 'var(--knit-radius-xs)',
            backgroundColor: currentView === 'kanban' ? 'var(--knit-surface-hover)' : 'transparent',
            border: 'none',
            color: currentView === 'kanban' ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
            fontSize: 11,
            fontWeight: currentView === 'kanban' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all var(--knit-duration-fast)',
          }}
        >
          <DuotoneIcon name="kanban" size={12} />
          <span>Kanban</span>
        </button>

        <button
          onClick={() => onViewChange('table')}
          data-tooltip="Vue Tableau filtrable et triable"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 10px',
            borderRadius: 'var(--knit-radius-xs)',
            backgroundColor: currentView === 'table' ? 'var(--knit-surface-hover)' : 'transparent',
            border: 'none',
            color: currentView === 'table' ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
            fontSize: 11,
            fontWeight: currentView === 'table' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all var(--knit-duration-fast)',
          }}
        >
          <DuotoneIcon name="table" size={12} />
          <span>Tableau</span>
        </button>
      </div>

      {/* Contrôles de droite : Outils et boutons de fenêtre */}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
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
          onClick={() => setIsNetworkModalOpen(true)}
          title="Réseau P2P Iroh & Collaborateurs — Cliquez pour afficher les pairs et votre invitation"
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
    </header>
  );
};
