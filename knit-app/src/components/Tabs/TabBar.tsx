import React, { useState } from 'react';
import type { Tab } from '../../types';
import { tabStore } from '../../stores/tabStore';
import { vaultStore } from '../../stores/vaultStore';
import { contextMenu } from '../../stores/contextMenuStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import {
  buildCloseTabsMenuItems,
  buildConvertDocTypeMenuItem,
  buildPathCopyMenuItem,
} from '../../utils';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  groupId?: 1 | 2;
  isFocused?: boolean;
  isSplit?: boolean;
  onNewNote?: () => void;
  onNewKanban?: () => void;
  onToggleSplit?: () => void;
  onCloseSplit?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  groupId = 1,
  isFocused = false,
  isSplit = false,
  onNewNote,
  onNewKanban,
  onToggleSplit,
  onCloseSplit,
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

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
      tabStore.reorderTabs(draggedIndex, targetIndex, groupId);
    }
    setDraggedIndex(null);
  };

  const getTabIcon = (tab: Tab) => {
    if (tab.docType === 'kanban') {
      return <DuotoneIcon name="kanban" size={14} style={{ color: 'var(--knit-primary)' }} />;
    }
    if (tab.docType === 'table') {
      return <DuotoneIcon name="table" size={14} style={{ color: 'var(--knit-primary)' }} />;
    }
    if (tab.docType === 'image') {
      return <DuotoneIcon name="image" size={14} style={{ color: 'var(--knit-primary)' }} />;
    }
    return <DuotoneIcon name="file-markdown" size={14} />;
  };

  const handleTabContextMenu = (e: React.MouseEvent, tab: Tab, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    const absPath = vaultStore.getAbsolutePath(tab.path);
    const isImageTab = tab.docType === 'image';

    contextMenu.show(e, [
      ...(!isImageTab
        ? [
            {
              id: 'toggle-view-mode',
              label: tab.viewMode === 'visual' ? 'Basculer en Code Source brut' : 'Basculer en Rendu Visuel',
              icon: 'command' as const,
              shortcut: 'Ctrl+E',
              onClick: () => tabStore.toggleViewMode(tab.id),
            },
            { id: 'div-tab-mode', divider: true },
            buildConvertDocTypeMenuItem(tab.path, tab.docType),
            { id: 'div-tab-convert', divider: true },
          ]
        : []),
      {
        id: 'split-view',
        label: 'Scinder la vue côte à côte',
        icon: 'split',
        shortcut: 'Ctrl+\\',
        onClick: () => tabStore.toggleSplit(tab.id),
      },
      {
        id: 'pin',
        label: tab.isPinned ? "Détacher l'onglet (Non épinglé)" : "Épingler l'onglet",
        icon: 'pin' as const,
        onClick: () => tabStore.pinTab(tab.id),
      },
      { id: 'div-tab-pin', divider: true },
      ...buildCloseTabsMenuItems({
        tabId: tab.id,
        tabIndex: index,
        tabsCount: tabs.length,
        onClose: () => tabStore.closeTab(tab.id),
        onCloseOthers: () => tabStore.closeOtherTabs(tab.id),
        onCloseToRight: () => tabStore.closeTabsToTheRight(tab.id),
        onCloseAll: () => tabStore.closeAllTabs(),
      }),
      { id: 'div-tab-1', divider: true },
      {
        id: 'reveal-file',
        label: "Révéler dans l'explorateur",
        icon: 'external-link' as const,
        onClick: () => {
          vaultStore.revealInExplorer(tab.path);
        },
      },
      { id: 'div-tab-2', divider: true },
      buildPathCopyMenuItem({
        relPath: tab.path,
        absPath,
        name: tab.title,
        nameChildLabel: 'Nom du fichier',
        markdownAlias: tab.title,
        markdownAsImage: isImageTab,
      }),
      { id: 'div-tab-3', divider: true },
      {
        id: 'reopen-closed',
        label: 'Rouvrir le dernier onglet fermé',
        shortcut: 'Ctrl+Shift+T',
        onClick: () => tabStore.reopenLastClosed((p) => vaultStore.readFile(p)),
      },
    ]);
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    contextMenu.show(e, [
      {
        id: 'new-note',
        label: 'Nouvelle Note Markdown',
        icon: 'file-markdown',
        shortcut: 'Ctrl+N',
        onClick: () => onNewNote?.(),
      },
      {
        id: 'new-kanban',
        label: 'Nouveau Tableau Kanban...',
        icon: 'kanban',
        onClick: () => onNewKanban?.(),
      },
      {
        id: 'new-table',
        label: 'Nouvelle Vue Tableau...',
        icon: 'table',
        onClick: async () => {
          const name = window.prompt('Nom du nouveau tableau :', 'tableau.md');
          if (name && name.trim()) {
            const clean = name.trim().endsWith('.md') ? name.trim() : `${name.trim()}.md`;
            await vaultStore.createFile(
              clean,
              `---\ntype: table\ntitle: "${clean.replace(/\.md$/, '')}"\n---\n\n# ${clean.replace(/\.md$/, '')}\n\n## À faire\n- [ ] Première ligne de données\n`
            );
            const content = await vaultStore.readFile(clean);
            tabStore.openTab(clean, false, content);
          }
        },
      },
    ]);
  };

  const handleBarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    contextMenu.show(e, [
      {
        id: 'new-note',
        label: 'Nouvelle Note Markdown',
        icon: 'file-markdown',
        shortcut: 'Ctrl+N',
        onClick: () => onNewNote?.(),
      },
      {
        id: 'new-kanban',
        label: 'Nouveau Tableau Kanban...',
        icon: 'kanban',
        onClick: () => onNewKanban?.(),
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
      onMouseDown={handleMouseDown}
      onClick={() => tabStore.setFocusedGroup(groupId)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 38,
        backgroundColor: 'var(--knit-bg)',
        borderBottom: '1px solid var(--knit-border)',
        borderTop: (isSplit && isFocused) ? '1.5px solid var(--knit-primary)' : '1.5px solid transparent',
        userSelect: 'none',
        paddingLeft: 4,
        paddingRight: 8,
        flexShrink: 0,
        transition: 'border-top 0.15s ease',
      }}
      onDoubleClick={(e) => {
        // Double clic sur zone vide crée une nouvelle note
        if (e.target === e.currentTarget && onNewNote) {
          onNewNote();
        }
      }}
    >
      {/* Zone gauche : Onglets et bouton + */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '100%',
          gap: 2,
          overflowX: 'auto',
          overflowY: 'hidden',
          flex: 1,
          minWidth: 0,
        }}
      >
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
                  tabStore.closeTab(tab.id, groupId);
                }
              }}
              onClick={() => tabStore.setActiveTab(tab.id, groupId)}
              onDoubleClick={() => tabStore.pinTab(tab.id, groupId)}
              title={`${tab.path}${tab.isPreview ? ' (Mode aperçu - Double-clic pour figer)' : ''}${tab.isPinned ? ' (Épinglé)' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                height: 32,
                padding: '0 10px',
                borderRadius: 'var(--knit-radius-sm) var(--knit-radius-sm) 0 0',
                backgroundColor: isActive ? 'var(--knit-surface)' : 'transparent',
                borderLeft: '1px solid transparent',
                borderRight: '1px solid transparent',
                borderTop: isActive ? '1.5px solid var(--knit-primary)' : '1.5px solid transparent',
                borderBottom: isActive ? '1px solid var(--knit-surface)' : 'none',
                color: isActive ? 'var(--knit-text)' : 'var(--knit-text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background var(--knit-transition-fast), color var(--knit-transition-fast)',
                maxWidth: 220,
                minWidth: 90,
                position: 'relative',
                top: 1,
                flexShrink: 0,
              }}
            >
              {tab.isPinned ? (
                <DuotoneIcon name="pin" size={13} style={{ color: 'var(--knit-primary)' }} />
              ) : (
                getTabIcon(tab)
              )}

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
                  tabStore.closeTab(tab.id, groupId);
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

        <button
          onClick={handlePlusClick}
          onContextMenu={handlePlusClick}
          title="Nouveau document (+ menu de sélection)"
          style={{
            marginLeft: 4,
            padding: '4px 6px',
            borderRadius: 'var(--knit-radius-xs)',
            color: 'var(--knit-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--knit-text)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--knit-text-secondary)')}
        >
          <DuotoneIcon name="plus" size={14} />
        </button>
      </div>

      {/* Zone droite : Bouton universel Source </> ↔ Rendu et Split View */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {activeTab && activeTab.docType !== 'image' && (
          <button
            onClick={() => tabStore.toggleViewMode(activeTab.id, groupId)}
            data-tooltip={
              activeTab.viewMode === 'visual'
                ? 'Basculer vers le code Markdown brut (Ctrl+E)'
                : 'Basculer vers la vue visuelle riche (Ctrl+E)'
            }
            data-shortcut="Ctrl+E"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 8px',
              borderRadius: 'var(--knit-radius-xs)',
              border: '1px solid var(--knit-border)',
              backgroundColor:
                activeTab.viewMode === 'source' ? 'var(--knit-primary-alpha)' : 'var(--knit-surface)',
              color:
                activeTab.viewMode === 'source' ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all var(--knit-transition-fast)',
            }}
          >
            {activeTab.viewMode === 'visual' ? (
              <>
                <DuotoneIcon name="command" size={12} />
                <span>Source &lt;/&gt;</span>
              </>
            ) : (
              <>
                <DuotoneIcon
                  name={
                    activeTab.docType === 'kanban'
                      ? 'kanban'
                      : activeTab.docType === 'table'
                      ? 'table'
                      : 'file-markdown'
                  }
                  size={12}
                />
                <span>Rendu</span>
              </>
            )}
          </button>
        )}

        {groupId === 2 ? (
          <button
            onClick={() => {
              if (onCloseSplit) onCloseSplit();
              else tabStore.closeSplit();
            }}
            data-tooltip="Fermer ce panneau scindé (Ctrl+\)"
            data-shortcut="Ctrl+\"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 6px',
              borderRadius: 'var(--knit-radius-xs)',
              border: '1px solid var(--knit-border)',
              backgroundColor: 'transparent',
              color: 'var(--knit-text-muted)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--knit-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--knit-text-muted)')}
          >
            <DuotoneIcon name="close" size={13} />
          </button>
        ) : (
          <button
            onClick={() => {
              if (onToggleSplit) onToggleSplit();
              else tabStore.toggleSplit();
            }}
            data-tooltip={
              isSplit
                ? 'Fermer le panneau scindé (Ctrl+\\)'
                : 'Scinder l’espace de travail en 2 panneaux (Ctrl+\\)'
            }
            data-shortcut="Ctrl+\"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3px 6px',
              borderRadius: 'var(--knit-radius-xs)',
              border: '1px solid var(--knit-border)',
              backgroundColor: isSplit ? 'var(--knit-primary-alpha)' : 'transparent',
              color: isSplit ? 'var(--knit-primary)' : 'var(--knit-text-muted)',
              cursor: 'pointer',
            }}
          >
            <DuotoneIcon name="split" size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
