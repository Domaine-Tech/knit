import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Tab } from '../../types';
import { tabStore } from '../../stores/tabStore';
import { vaultStore } from '../../stores/vaultStore';
import { contextMenu } from '../../stores/contextMenuStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { useTabStripDrag } from '../../hooks';
import {
  buildCloseTabsMenuItems,
  buildConvertDocTypeMenuItem,
  buildCreateInFolderMenuItems,
  buildPathCopyMenuItem,
  docTypeToIconName,
  isMiddleButton,
  preventMiddleCompass,
} from '../../utils';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  groupId?: 1 | 2;
  isFocused?: boolean;
  isSplit?: boolean;
  onNewNote?: () => void;
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
  onToggleSplit,
  onCloseSplit,
}) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const activeTabElRef = useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = useState({ start: false, end: false });

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleReorder = useCallback(
    (fromIndex: number, toIndex: number) => {
      tabStore.reorderTabs(fromIndex, toIndex, groupId);
    },
    [groupId]
  );

  const handleActivate = useCallback(
    (tabId: string) => {
      tabStore.setActiveTab(tabId, groupId);
    },
    [groupId]
  );

  const { getTabTransform, isDraggingIndex, consumeDragClickGuard, onTabPointerDown } =
    useTabStripDrag({
      tabs,
      onReorder: handleReorder,
    });

  const updateOverflow = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setOverflow({
      start: scrollLeft > 2,
      end: scrollLeft + clientWidth < scrollWidth - 2,
    });
  }, []);

  useEffect(() => {
    updateOverflow();
    const el = stripRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateOverflow, { passive: true });
    const ro = new ResizeObserver(updateOverflow);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateOverflow);
      ro.disconnect();
    };
  }, [tabs.length, updateOverflow]);

  useEffect(() => {
    activeTabElRef.current?.scrollIntoView({
      behavior: 'smooth',
      inline: 'nearest',
      block: 'nearest',
    });
  }, [activeTabId]);

  const handleMouseDown = preventMiddleCompass;

  const getTabIcon = (tab: Tab) => {
    if (tab.isPinned) {
      return <DuotoneIcon name="pin" size={13} style={{ color: 'var(--knit-primary)' }} />;
    }
    const icon = docTypeToIconName(tab.docType);
    const colored =
      tab.docType !== 'note' && tab.docType !== 'image'
        ? ({ color: 'var(--knit-primary)' } as const)
        : undefined;
    return <DuotoneIcon name={icon} size={14} style={colored} />;
  };

  const openCreatedDoc = async (relPath: string, kind: string) => {
    if (kind === 'dir') return;
    try {
      const content = await vaultStore.readFile(relPath);
      tabStore.openTab(relPath, false, content);
    } catch {
      tabStore.openTab(relPath, false);
    }
  };

  const showCreateDocMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    contextMenu.show(
      e,
      buildCreateInFolderMenuItems({
        parentDir: '',
        includeFolder: false,
        noteShortcut: 'Ctrl+N',
        createNote: onNewNote,
        onCreated: (relPath, kind) => {
          void openCreatedDoc(relPath, kind);
        },
      })
    );
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
        onClick: () => tabStore.pinTab(tab.id, groupId),
      },
      { id: 'div-tab-pin', divider: true },
      ...buildCloseTabsMenuItems({
        tabId: tab.id,
        tabIndex: index,
        tabsCount: tabs.length,
        onClose: () => tabStore.closeTab(tab.id, groupId),
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

  const handleBarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    contextMenu.show(e, [
      ...buildCreateInFolderMenuItems({
        parentDir: '',
        includeFolder: false,
        noteShortcut: 'Ctrl+N',
        createNote: onNewNote,
        onCreated: (relPath, kind) => {
          void openCreatedDoc(relPath, kind);
        },
      }),
      { id: 'div-bar-create', divider: true },
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

  const stripClass = [
    'knit-tabbar-strip',
    overflow.start ? 'is-overflow-start' : '',
    overflow.end ? 'is-overflow-end' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const barClass = ['knit-tabbar', isSplit && isFocused ? 'is-split-focused' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={barClass}
      onContextMenu={handleBarContextMenu}
      onMouseDown={handleMouseDown}
      onClick={() => tabStore.setFocusedGroup(groupId)}
      onDoubleClick={(e) => {
        if (e.target === e.currentTarget && onNewNote) {
          onNewNote();
        }
      }}
    >
      <div
        ref={stripRef}
        className={stripClass}
        role="tablist"
        aria-label="Onglets ouverts"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;
          const isDragging = isDraggingIndex(index);
          const transform = getTabTransform(index);
          const tabClass = [
            'knit-tab',
            isActive ? 'is-active' : '',
            tab.isPreview ? 'is-preview' : '',
            tab.isPinned ? 'is-pinned' : '',
            tab.isDirty ? 'is-dirty' : '',
            isDragging ? 'is-dragging' : '',
            transform && !isDragging ? 'is-drag-shifting' : '',
          ]
            .filter(Boolean)
            .join(' ');

          const tooltipParts = [
            tab.path,
            tab.isPreview ? 'Mode aperçu — double-clic pour figer' : '',
            tab.isPinned ? 'Épinglé' : '',
          ].filter(Boolean);

          return (
            <div
              key={tab.id}
              ref={isActive ? (node) => { activeTabElRef.current = node; } : undefined}
              role="tab"
              aria-selected={isActive}
              aria-label={tab.title}
              className={tabClass}
              style={transform ? { transform } : undefined}
              onPointerDown={(e) => onTabPointerDown(e, index)}
              onMouseDown={handleMouseDown}
              onClick={() => {
                if (consumeDragClickGuard()) return;
                handleActivate(tab.id);
              }}
              onContextMenu={(e) => handleTabContextMenu(e, tab, index)}
              onAuxClick={(e) => {
                if (isMiddleButton(e)) {
                  e.preventDefault();
                  e.stopPropagation();
                  tabStore.closeTab(tab.id, groupId);
                }
              }}
              onDoubleClick={() => tabStore.pinTab(tab.id, groupId)}
              data-tooltip={tooltipParts.join(' · ')}
            >
              {getTabIcon(tab)}

              {!tab.isPinned && (
                <span className="knit-tab-title">{tab.title}</span>
              )}

              {!tab.isPinned && (
                <span className="knit-tab-trailing">
                  {tab.isDirty && (
                    <span
                      className="knit-tab-dirty"
                      data-tooltip="Modifications non sauvegardées"
                    />
                  )}
                  <button
                    type="button"
                    className="knit-tab-close"
                    data-tooltip="Fermer"
                    data-shortcut="Ctrl+W"
                    onClick={(e) => {
                      e.stopPropagation();
                      tabStore.closeTab(tab.id, groupId);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <DuotoneIcon name="close" size={12} />
                  </button>
                </span>
              )}
            </div>
          );
        })}

        <button
          type="button"
          className="knit-tabbar-add"
          onClick={showCreateDocMenu}
          onContextMenu={showCreateDocMenu}
          data-tooltip="Nouveau document (tous les types)"
        >
          <DuotoneIcon name="plus" size={14} />
        </button>
      </div>

      <div className="knit-tabbar-actions">
        {activeTab && activeTab.docType !== 'image' && (
          <button
            type="button"
            className={[
              'knit-tabbar-action',
              activeTab.viewMode === 'source' ? 'is-source-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => tabStore.toggleViewMode(activeTab.id, groupId)}
            data-tooltip={
              activeTab.viewMode === 'visual'
                ? 'Basculer vers le code Markdown brut'
                : 'Basculer vers la vue visuelle riche'
            }
            data-shortcut="Ctrl+E"
          >
            {activeTab.viewMode === 'visual' ? (
              <>
                <DuotoneIcon name="command" size={12} />
                <span>Source &lt;/&gt;</span>
              </>
            ) : (
              <>
                <DuotoneIcon name={docTypeToIconName(activeTab.docType)} size={12} />
                <span>Rendu</span>
              </>
            )}
          </button>
        )}

        {groupId === 2 ? (
          <button
            type="button"
            className="knit-tabbar-action-icon"
            onClick={() => {
              if (onCloseSplit) onCloseSplit();
              else tabStore.closeSplit();
            }}
            data-tooltip="Fermer ce panneau scindé"
            data-shortcut="Ctrl+\\"
          >
            <DuotoneIcon name="close" size={13} />
          </button>
        ) : (
          <button
            type="button"
            className={[
              'knit-tabbar-action-icon',
              isSplit ? 'is-split-active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => {
              if (onToggleSplit) onToggleSplit();
              else tabStore.toggleSplit();
            }}
            data-tooltip={
              isSplit
                ? 'Fermer le panneau scindé'
                : 'Scinder l’espace de travail en 2 panneaux'
            }
            data-shortcut="Ctrl+\\"
          >
            <DuotoneIcon name="split" size={13} />
          </button>
        )}
      </div>
    </div>
  );
};
