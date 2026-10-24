import React from 'react';
import type { FileNode, SidebarTab } from '../../types';
import { useSidebarTree } from '../../hooks/useSidebarTree';
import { useDelayedHoverPreview } from '../../hooks';
import { TreeNode } from './TreeNode';
import { SidebarPinnedSection } from './SidebarPinnedSection';
import { SidebarCreateForm, SidebarRenameModal } from './SidebarCreateRenameForms';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { contextMenu } from '../../stores/contextMenuStore';

import { GlobalSearchPane } from './GlobalSearchPane';
import { TagExplorerPane } from './TagExplorerPane';
import { MiniCalendarWidget } from '../Calendar/MiniCalendarWidget';
import { CalendarSidebarPane } from './CalendarSidebarPane';
import { TrashPane } from './TrashPane';
import { HistoryPane } from './HistoryPane';
import {
  buildCreateInFolderMenuItem,
  buildCreateInFolderMenuItems,
  copyTextWithToast,
} from '../../utils';

interface SidebarProps {
  files: FileNode[];
  activePath: string | null;
  sidebarTab?: SidebarTab;
  width?: number;
  onSidebarTabChange?: (tab: SidebarTab) => void;
  onSelectFile: (path: string, preview: boolean) => void;
  onMiddleClickFile: (path: string) => void;
  onOpenFileAtLine?: (path: string, line: number) => void;
  onOpenGlobalAgenda?: (iso?: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  activePath,
  sidebarTab: controlledSidebarTab,
  width,
  onSidebarTabChange,
  onSelectFile,
  onMiddleClickFile,
  onOpenFileAtLine,
  onOpenGlobalAgenda,
}) => {
  const pinnedHoverPreview = useDelayedHoverPreview(120);
  const {
    activeTab,
    setSidebarTab,
    filterText,
    setFilterText,
    filtered,
    showHiddenFiles,
    toggleShowHiddenFiles,
    isCreatingFile,
    setIsCreatingFile,
    newFileName,
    setNewFileName,
    startCreatingFile,
    handleCreateFileSubmit,
    renameTarget,
    setRenameTarget,
    startRename,
    handleRenameSubmit,
    selectedNode,
    selectTreeNode,
    isAllExpanded,
    treeKey,
    handleToggleExpandAll,
    isPinnedExpanded,
    setIsPinnedExpanded,
    pinnedNotes,
    togglePinNote,
    handleDelete,
    vaultRoot,
    vaultDisplayName,
    reloadTree,
    pickAndOpenVault,
    revealVaultInExplorer,
  } = useSidebarTree({
    files,
    onSelectFile,
    onMiddleClickFile,
    controlledSidebarTab,
    onSidebarTabChange,
  });

  const handleSidebarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    contextMenu.show(e, [
      buildCreateInFolderMenuItem({
        parentDir: '',
        noteShortcut: 'Ctrl+N',
        createNote: startCreatingFile,
        onCreated: (relPath, kind) => {
          if (kind !== 'dir') {
            onSelectFile(relPath, false);
          }
        },
      }),
      { id: 'div-sidebar-1', divider: true },
      {
        id: 'toggle-all',
        label: isAllExpanded ? 'Replier tous les dossiers' : 'Déplier tous les dossiers',
        icon: isAllExpanded ? 'collapse-all' : 'expand-all',
        onClick: handleToggleExpandAll,
      },
      {
        id: 'reload-tree',
        label: "Actualiser l'arborescence",
        icon: 'sync',
        onClick: reloadTree,
      },
      {
        id: 'toggle-hidden',
        label: showHiddenFiles
          ? 'Masquer les fichiers système'
          : 'Afficher les fichiers masqués',
        icon: showHiddenFiles ? 'eye-off' : 'eye',
        onClick: toggleShowHiddenFiles,
      },
      { id: 'div-sidebar-2', divider: true },
      ...(vaultRoot
        ? [
            {
              id: 'reveal-vault',
              label: "Révéler le coffre dans l'explorateur",
              icon: 'external-link' as const,
              onClick: revealVaultInExplorer,
            },
            {
              id: 'copy-vault-path',
              label: 'Copier le chemin du coffre',
              icon: 'copy' as const,
              onClick: () => {
                void copyTextWithToast(vaultRoot, 'Chemin du coffre copié', vaultRoot);
              },
            },
            { id: 'div-sidebar-3', divider: true },
          ]
        : []),
      {
        id: 'open-vault',
        label: 'Ouvrir un coffre-fort...',
        icon: 'folder-open',
        onClick: pickAndOpenVault,
      },
    ]);
  };

  return (
    <aside
      onContextMenu={handleSidebarContextMenu}
      style={{
        width: width || 250,
        height: '100%',
        backgroundColor: 'var(--knit-bg)',
        borderRight: '1px solid var(--knit-border)',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* En-tête Sidebar */}
      <div
        style={{
          padding: '12px 14px 8px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
          <DuotoneIcon name="vault" size={17} style={{ color: 'var(--knit-primary)' }} />
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--knit-text-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {vaultDisplayName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={handleToggleExpandAll}
            title={isAllExpanded ? "Replier tous les dossiers" : "Déplier tous les dossiers"}
            style={{
              padding: 4,
              borderRadius: 'var(--knit-radius-xs)',
              color: 'var(--knit-text-secondary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--knit-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--knit-text-secondary)')}
          >
            <DuotoneIcon name={isAllExpanded ? 'collapse-all' : 'expand-all'} size={14} />
          </button>
          <button
            onClick={(e) => {
              contextMenu.show(
                e,
                buildCreateInFolderMenuItems({
                  parentDir: '',
                  noteShortcut: 'Ctrl+N',
                  createNote: startCreatingFile,
                  onCreated: (relPath, kind) => {
                    if (kind !== 'dir') {
                      onSelectFile(relPath, false);
                    }
                  },
                })
              );
            }}
            data-tooltip="Créer un document (note, kanban, agenda, canvas…)"
            style={{
              padding: 4,
              borderRadius: 'var(--knit-radius-xs)',
              color: 'var(--knit-text-secondary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--knit-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--knit-text-secondary)')}
          >
            <DuotoneIcon name="plus" size={14} />
          </button>
          <button
            onClick={toggleShowHiddenFiles}
            data-tooltip={
              showHiddenFiles
                ? 'Masquer les fichiers système (kit IA, dotfiles)'
                : 'Afficher les fichiers masqués (kit IA, dotfiles)'
            }
            style={{
              padding: 4,
              borderRadius: 'var(--knit-radius-xs)',
              color: showHiddenFiles ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
            }}
            onMouseEnter={(e) => {
              if (!showHiddenFiles) e.currentTarget.style.color = 'var(--knit-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = showHiddenFiles
                ? 'var(--knit-primary)'
                : 'var(--knit-text-secondary)';
            }}
          >
            <DuotoneIcon name={showHiddenFiles ? 'eye' : 'eye-off'} size={14} />
          </button>
          <button
            onClick={reloadTree}
            data-tooltip="Actualiser l'arborescence"
            style={{
              padding: 4,
              borderRadius: 'var(--knit-radius-xs)',
              color: 'var(--knit-text-secondary)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--knit-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--knit-text-secondary)')}
          >
            <DuotoneIcon name="sync" size={14} />
          </button>
        </div>
      </div>

      {/* Sélecteur d'onglets Sidebar (Notes, Recherche Globale, Tags) */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--knit-border)',
          backgroundColor: 'var(--knit-bg)',
          padding: '0 8px',
          gap: 4,
          marginBottom: 6,
        }}
      >
        <button
          onClick={() => setSidebarTab('files')}
          title="Explorateur de notes"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 0',
            border: 'none',
            borderBottom: activeTab === 'files' ? '2px solid var(--knit-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'files' ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
            fontSize: 11,
            fontWeight: activeTab === 'files' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all var(--knit-duration-fast)',
          }}
        >
          <DuotoneIcon name="folder" size={13} />
          <span>Notes</span>
        </button>

        <button
          onClick={() => setSidebarTab('search')}
          title="Recherche globale dans tout le coffre (Ctrl+Shift+F)"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 0',
            border: 'none',
            borderBottom: activeTab === 'search' ? '2px solid var(--knit-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'search' ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
            fontSize: 11,
            fontWeight: activeTab === 'search' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all var(--knit-duration-fast)',
          }}
        >
          <DuotoneIcon name="search" size={13} />
          <span>Recherche</span>
        </button>

        <button
          onClick={() => setSidebarTab('tags')}
          title="Explorateur de tags"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            padding: '7px 0',
            border: 'none',
            borderBottom: activeTab === 'tags' ? '2px solid var(--knit-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'tags' ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
            fontSize: 11,
            fontWeight: activeTab === 'tags' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all var(--knit-duration-fast)',
          }}
        >
          <DuotoneIcon name="tag" size={13} />
          <span>Tags</span>
        </button>

        <button
          onClick={() => setSidebarTab('calendar')}
          title="Agenda & Échéances"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '7px 0',
            border: 'none',
            borderBottom: activeTab === 'calendar' ? '2px solid var(--knit-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'calendar' ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
            fontSize: 11,
            fontWeight: activeTab === 'calendar' ? 600 : 500,
            cursor: 'pointer',
            transition: 'all var(--knit-duration-fast)',
          }}
        >
          <DuotoneIcon name="calendar" size={13} />
          <span>Agenda</span>
        </button>

        <button
          onClick={() => setSidebarTab('trash')}
          data-tooltip="Corbeille du coffre"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '7px 6px',
            border: 'none',
            borderBottom: activeTab === 'trash' ? '2px solid var(--knit-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'trash' ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
            cursor: 'pointer',
          }}
        >
          <DuotoneIcon name="trash" size={13} />
        </button>

        <button
          onClick={() => setSidebarTab('history')}
          data-tooltip="Historique de versions"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '7px 6px',
            border: 'none',
            borderBottom: activeTab === 'history' ? '2px solid var(--knit-primary)' : '2px solid transparent',
            backgroundColor: 'transparent',
            color: activeTab === 'history' ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
            cursor: 'pointer',
          }}
        >
          <DuotoneIcon name="sync" size={13} />
        </button>
      </div>

      {activeTab === 'files' && (
        <>
          {/* Barre de filtre rapide */}
          <div style={{ padding: '0 12px 8px 12px' }}>
            <div className="knit-input-group">
              <DuotoneIcon name="search" size={13} style={{ color: 'var(--knit-text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                className="knit-input-seamless"
                placeholder="Filtrer les notes..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setFilterText('');
                }}
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                style={{
                  flex: 1,
                  width: '100%',
                  minWidth: 0,
                  fontSize: 12,
                  color: 'var(--knit-text)',
                }}
              />
              {filterText && (
                <button
                  onClick={() => setFilterText('')}
                  title="Effacer la recherche (Échap)"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 16,
                    height: 16,
                    padding: 0,
                    color: 'var(--knit-text-muted)',
                    flexShrink: 0,
                    borderRadius: 'var(--knit-radius-xs)',
                  }}
                >
                  <DuotoneIcon name="close" size={10} />
                </button>
              )}
            </div>
          </div>

          <SidebarCreateForm
            isCreatingFile={isCreatingFile}
            newFileName={newFileName}
            setNewFileName={setNewFileName}
            setIsCreatingFile={setIsCreatingFile}
            onSubmit={handleCreateFileSubmit}
          />

          {/* Liste de l'arborescence */}
          <div
            tabIndex={-1}
            onKeyDown={(e) => {
              if (e.key === 'Delete' || ((e.metaKey || e.ctrlKey) && e.key === 'Backspace')) {
                const activeEl = document.activeElement;
                const isInput = ['INPUT', 'TEXTAREA'].includes(activeEl?.tagName || '') || activeEl?.closest('.cm-editor');
                if (isInput) return;

                const target = selectedNode || (activePath ? { path: activePath, isDir: false, name: activePath.split('/').pop() || activePath } : null);
                if (target) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete(target.path, target.isDir, target.name);
                }
              }
            }}
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '4px 6px',
              outline: 'none',
            }}
          >
            <SidebarPinnedSection
              pinnedNotes={pinnedNotes}
              isPinnedExpanded={isPinnedExpanded}
              setIsPinnedExpanded={setIsPinnedExpanded}
              activePath={activePath}
              filterText={filterText}
              onSelectFile={onSelectFile}
              onMiddleClickFile={onMiddleClickFile}
              togglePinNote={togglePinNote}
              scheduleHover={pinnedHoverPreview.schedule}
              cancelHover={pinnedHoverPreview.cancel}
            />

            {filtered.length === 0 ? (
              <div
                style={{
                  padding: 16,
                  textAlign: 'center',
                  fontSize: 12,
                  color: 'var(--knit-text-muted)',
                }}
              >
                {filterText ? `Aucun résultat pour "${filterText}"` : 'Coffre vide'}
              </div>
            ) : (
              filtered.map((node) => (
                <TreeNode
                  key={`${node.id}-${treeKey}-${Boolean(filterText.trim())}`}
                  node={node}
                  activePath={activePath}
                  selectedPath={selectedNode?.path ?? activePath}
                  onSelectTreeNode={selectTreeNode}
                  onSelectFile={onSelectFile}
                  onMiddleClickFile={onMiddleClickFile}
                  onRenameFile={startRename}
                  onDeletePath={handleDelete}
                  defaultExpanded={isAllExpanded || Boolean(filterText.trim())}
                  searchQuery={filterText.trim()}
                />
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'search' && (
        <GlobalSearchPane
          onOpenFileAtLine={(p, line) => {
            if (onOpenFileAtLine) {
              onOpenFileAtLine(p, line);
            } else {
              onSelectFile(p, false);
            }
          }}
        />
      )}

      {activeTab === 'tags' && (
        <TagExplorerPane onSelectFile={(p) => onSelectFile(p, false)} />
      )}

      {activeTab === 'calendar' && (
        <CalendarSidebarPane
          onSelectFile={onSelectFile}
          onOpenFileAtLine={onOpenFileAtLine}
          onOpenGlobalAgenda={onOpenGlobalAgenda}
        />
      )}

      {activeTab === 'trash' && <TrashPane />}

      {activeTab === 'history' && <HistoryPane />}

      {activeTab === 'files' && (
        <MiniCalendarWidget
          onSelectFile={onSelectFile}
          onOpenGlobalAgenda={onOpenGlobalAgenda}
        />
      )}

      <SidebarRenameModal
        renameTarget={renameTarget}
        setRenameTarget={setRenameTarget}
        onSubmit={handleRenameSubmit}
      />
    </aside>
  );
};
