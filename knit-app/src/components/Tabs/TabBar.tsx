import React, { useState } from 'react';
import type { Tab } from '../../stores/tabStore';
import { tabStore } from '../../stores/tabStore';
import { vaultStore } from '../../stores/vaultStore';
import { toast } from '../../stores/toastStore';
import { contextMenu } from '../../stores/contextMenuStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onNewNote?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onNewNote }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Empêche l'icône de scroll compass sur clic molette (la fermeture est gérée par onAuxClick)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      tabStore.reorderTabs(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  const handleTabContextMenu = (e: React.MouseEvent, tab: Tab, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    const absPath = vaultStore.getAbsolutePath(tab.path);
    const mdLink = `[${tab.title.replace(/\.md$/, '')}](${tab.path})`;

    contextMenu.show(e, [
      {
        id: 'close',
        label: 'Fermer',
        icon: 'close',
        shortcut: 'Ctrl+W',
        onClick: () => tabStore.closeTab(tab.id),
      },
      ...(tabs.length > 1
        ? [
            {
              id: 'close-others',
              label: 'Fermer les autres onglets',
              onClick: () => tabStore.closeOtherTabs(tab.id),
            },
          ]
        : []),
      ...(index < tabs.length - 1
        ? [
            {
              id: 'close-to-right',
              label: 'Fermer les onglets à droite',
              onClick: () => tabStore.closeTabsToTheRight(tab.id),
            },
          ]
        : []),
      ...(tabs.length > 1
        ? [
            {
              id: 'close-all',
              label: 'Fermer tous les onglets',
              danger: true,
              onClick: () => tabStore.closeAllTabs(),
            },
          ]
        : []),
      { id: 'div-tab-1', divider: true },
      ...(tab.isPreview
        ? [
            {
              id: 'pin',
              label: "Figer l'onglet (Mode permanent)",
              icon: 'pin' as const,
              onClick: () => tabStore.pinTab(tab.id),
            },
            { id: 'div-tab-pin', divider: true },
          ]
        : []),
      {
        id: 'reveal-file',
        label: "Révéler dans l'explorateur",
        icon: 'external-link' as const,
        onClick: () => {
          vaultStore.revealInExplorer(tab.path);
        },
      },
      { id: 'div-tab-2', divider: true },
      {
        id: 'copy-rel-path',
        label: 'Copier le chemin relatif',
        icon: 'copy' as const,
        onClick: () => {
          navigator.clipboard.writeText(tab.path);
          toast.info('Chemin relatif copié', tab.path);
        },
      },
      {
        id: 'copy-abs-path',
        label: 'Copier le chemin absolu',
        icon: 'copy' as const,
        onClick: () => {
          navigator.clipboard.writeText(absPath);
          toast.info('Chemin absolu copié', absPath);
        },
      },
      {
        id: 'copy-name',
        label: 'Copier le nom du fichier',
        icon: 'clipboard' as const,
        onClick: () => {
          navigator.clipboard.writeText(tab.title);
          toast.info('Nom copié', tab.title);
        },
      },
      {
        id: 'copy-md-link',
        label: 'Copier le lien Markdown',
        icon: 'link' as const,
        onClick: () => {
          navigator.clipboard.writeText(mdLink);
          toast.info('Lien Markdown copié', mdLink);
        },
      },
      { id: 'div-tab-3', divider: true },
      {
        id: 'reopen-closed',
        label: 'Rouvrir le dernier onglet fermé',
        shortcut: 'Ctrl+Shift+T',
        onClick: () => tabStore.reopenLastClosed((p) => vaultStore.readFile(p)),
      },
    ]);
  };

  const handleBarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    contextMenu.show(e, [
      {
        id: 'new-note',
        label: 'Nouvelle note',
        icon: 'plus',
        shortcut: 'Ctrl+N',
        onClick: () => onNewNote?.(),
      },
      {
        id: 'reopen-closed',
        label: 'Rouvrir le dernier onglet fermé',
        shortcut: 'Ctrl+Shift+T',
        onClick: () => tabStore.reopenLastClosed((p) => vaultStore.readFile(p)),
      },
      ...(tabs.length > 0
        ? [
            { id: 'div-bar-1', divider: true },
            {
              id: 'close-all-tabs',
              label: 'Fermer tous les onglets',
              danger: true,
              onClick: () => tabStore.closeAllTabs(),
            },
          ]
        : []),
    ]);
  };

  return (
    <div
      onContextMenu={handleBarContextMenu}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 38,
        backgroundColor: 'var(--knit-bg)',
        borderBottom: '1px solid var(--knit-border)',
        overflowX: 'auto',
        overflowY: 'hidden',
        userSelect: 'none',
        paddingLeft: 4,
        paddingRight: 8,
      }}
      onDoubleClick={(e) => {
        // Double clic sur zone vide crée une nouvelle note
        if (e.target === e.currentTarget && onNewNote) {
          onNewNote();
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 2 }}>
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;

          return (
            <div
              key={tab.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              onMouseDown={handleMouseDown}
              onContextMenu={(e) => handleTabContextMenu(e, tab, index)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  tabStore.closeTab(tab.id);
                }
              }}
              onClick={() => tabStore.setActiveTab(tab.id)}
              onDoubleClick={() => tabStore.pinTab(tab.id)}
              title={`${tab.path}${tab.isPreview ? ' (Mode aperçu - Double-clic pour figer)' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 32,
                padding: '0 10px',
                borderRadius: 'var(--knit-radius-sm) var(--knit-radius-sm) 0 0',
                backgroundColor: isActive ? 'var(--knit-surface)' : 'transparent',
                borderLeft: '1px solid transparent',
                borderRight: '1px solid transparent',
                borderTop: isActive ? '2px solid var(--knit-primary)' : '2px solid transparent',
                borderBottom: isActive ? '1px solid var(--knit-surface)' : 'none',
                color: isActive ? 'var(--knit-text)' : 'var(--knit-text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background var(--knit-transition-fast), color var(--knit-transition-fast)',
                maxWidth: 220,
                minWidth: 100,
                position: 'relative',
                top: 1,
              }}
            >
              <DuotoneIcon name="file-markdown" size={14} />

              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  fontStyle: tab.isPreview ? 'italic' : 'normal',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.title}
              </span>

              {tab.isDirty && (
                <div
                  title="Modifications non sauvegardées"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: 'var(--knit-primary)',
                    flexShrink: 0,
                  }}
                />
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  tabStore.closeTab(tab.id);
                }}
                title="Fermer (Ctrl+W ou clic molette)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 2,
                  borderRadius: 'var(--knit-radius-xs)',
                  color: 'inherit',
                  opacity: isActive ? 0.8 : 0.4,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.opacity = isActive ? '0.8' : '0.4')
                }
              >
                <DuotoneIcon name="close" size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {onNewNote && (
        <button
          onClick={onNewNote}
          title="Nouvelle note (Ctrl+N ou double-clic sur la barre)"
          style={{
            marginLeft: 4,
            padding: 4,
            borderRadius: 'var(--knit-radius-xs)',
            color: 'var(--knit-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--knit-text)')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'var(--knit-text-secondary)')
          }
        >
          <DuotoneIcon name="plus" size={14} />
        </button>
      )}
    </div>
  );
};
