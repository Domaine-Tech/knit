import React, { useState, useEffect } from 'react';
import type { FileNode } from '../../types';
import { vaultStore } from '../../stores/vaultStore';
import { TreeNode } from './TreeNode';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { toast } from '../../stores/toastStore';
import { contextMenu } from '../../stores/contextMenuStore';
import { tabStore } from '../../stores/tabStore';
import { historyStore } from '../../stores/historyStore';

import { GlobalSearchPane } from './GlobalSearchPane';
import { TagExplorerPane } from './TagExplorerPane';

interface SidebarProps {
  files: FileNode[];
  activePath: string | null;
  sidebarTab?: 'files' | 'search' | 'tags';
  width?: number;
  onSidebarTabChange?: (tab: 'files' | 'search' | 'tags') => void;
  onSelectFile: (path: string, preview: boolean) => void;
  onMiddleClickFile: (path: string) => void;
  onOpenFileAtLine?: (path: string, line: number) => void;
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
}) => {
  const [internalSidebarTab, setInternalSidebarTab] = useState<'files' | 'search' | 'tags'>('files');
  const activeTab = controlledSidebarTab || internalSidebarTab;

  const handleSetSidebarTab = (tab: 'files' | 'search' | 'tags') => {
    setInternalSidebarTab(tab);
    if (onSidebarTabChange) onSidebarTabChange(tab);
  };
  const [filterText, setFilterText] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renameTarget, setRenameTarget] = useState<{ oldPath: string; newPath: string } | null>(null);
  const [selectedNode, setSelectedNode] = useState<{ path: string; isDir: boolean; name: string } | null>(null);
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
  const [treeKey, setTreeKey] = useState(0);

  useEffect(() => {
    const onReveal = (e: Event) => {
      const custom = e as CustomEvent<{ path: string; isDir: boolean }>;
      if (custom.detail?.path) {
        setInternalSidebarTab('files');
        setSelectedNode({
          path: custom.detail.path,
          isDir: custom.detail.isDir,
          name: custom.detail.path.split('/').pop() || custom.detail.path,
        });
        setTimeout(() => {
          const el = document.querySelector(`[data-tree-path="${custom.detail.path}"]`);
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 120);
      }
    };
    window.addEventListener('knit-reveal-in-tree', onReveal);
    return () => {
      window.removeEventListener('knit-reveal-in-tree', onReveal);
    };
  }, []);

  const handleToggleExpandAll = () => {
    setIsAllExpanded((prev) => !prev);
    setTreeKey((k) => k + 1);
  };

  const filterNodes = (nodes: FileNode[], query: string): FileNode[] => {
    if (!query.trim()) return nodes;
    const lower = query.toLowerCase();

    return nodes
      .map((node) => {
        if (node.is_dir) {
          const matchingChildren = filterNodes(node.children, query);
          if (matchingChildren.length > 0) {
            return { ...node, children: matchingChildren };
          }
          if (node.name.toLowerCase().includes(lower)) {
            return node;
          }
          return null;
        } else {
          return node.name.toLowerCase().includes(lower) ? node : null;
        }
      })
      .filter((n): n is FileNode => n !== null);
  };

  const handleCreateFileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFileName.trim();
    if (!name) {
      setIsCreatingFile(false);
      return;
    }

    const relPath = name.endsWith('.md') ? name : `${name}.md`;
    try {
      await vaultStore.createFile(relPath, `# ${name.replace('.md', '')}\n\n`);
      setNewFileName('');
      setIsCreatingFile(false);
      onSelectFile(relPath, false);
      toast.success('Fichier créé', relPath);
    } catch (err: unknown) {
      toast.error('Erreur de création', String(err));
    }
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameTarget) return;
    const { oldPath, newPath } = renameTarget;
    const cleanNew = newPath.trim();
    if (!cleanNew || cleanNew === oldPath) {
      setRenameTarget(null);
      return;
    }

    try {
      const report = await vaultStore.renameFile(oldPath, cleanNew);
      tabStore.renameTab(oldPath, cleanNew);
      setRenameTarget(null);
      toast.success(
        'Fichier renommé & liens refactorisés',
        `${report.links_updated} lien(s) mis à jour dans ${report.files_modified} fichier(s)`
      );
    } catch (err: unknown) {
      toast.error('Erreur lors du renommage', String(err));
    }
  };

  const handleDelete = async (path: string, isDir: boolean, name: string) => {
    try {
      const trashRecord = await vaultStore.trashPath(path);
      tabStore.closeTabsForPath(path);

      let commitTimer: number | null = window.setTimeout(async () => {
        commitTimer = null;
        historyStore.remove(`trash-${trashRecord.trash_id}`);
        await vaultStore.commitTrash(trashRecord.trash_id);
      }, 8000);

      const doUndo = async () => {
        if (commitTimer) {
          clearTimeout(commitTimer);
          commitTimer = null;
        }
        historyStore.remove(`trash-${trashRecord.trash_id}`);
        await vaultStore.restoreTrash(trashRecord.trash_id);
        if (!isDir) {
          tabStore.openTab(path, false);
        }
        toast.success(
          isDir ? 'Dossier restauré' : 'Note restaurée',
          `"${name}" a été restauré`
        );
      };

      historyStore.push({
        id: `trash-${trashRecord.trash_id}`,
        description: `Suppression de ${name}`,
        undo: doUndo,
      });

      toast.undoable(
        isDir ? 'Dossier supprimé' : 'Note supprimée',
        `"${name}" déplacé vers la corbeille`,
        () => {
          doUndo();
        },
        8000
      );
    } catch (err: unknown) {
      toast.error('Erreur de suppression', String(err));
    }
  };


  const handleSidebarContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const vaultRoot = vaultStore.currentVaultPath || '';

    contextMenu.show(e, [
      {
        id: 'new-file',
        label: 'Nouvelle note .md',
        icon: 'plus',
        shortcut: 'Ctrl+N',
        onClick: () => setIsCreatingFile(true),
      },
      {
        id: 'new-kanban',
        label: 'Nouveau tableau Kanban...',
        icon: 'kanban' as const,
        onClick: () => {
          const kbName = window.prompt('Nom du nouveau tableau Kanban :', 'kanban.md');
          if (kbName && kbName.trim()) {
            const clean = kbName.trim().endsWith('.md') ? kbName.trim() : `${kbName.trim()}.md`;
            vaultStore.createKanbanFile(clean, clean.replace(/\.md$/, '')).then((path) => {
              onSelectFile(path, false);
              toast.success('Tableau Kanban créé', path);
            });
          }
        },
      },
      {
        id: 'new-root-folder',
        label: 'Nouveau dossier...',
        icon: 'folder-plus',
        onClick: () => {
          const dirName = window.prompt('Nom du nouveau dossier :', 'nouveau-dossier');
          if (dirName && dirName.trim()) {
            vaultStore.createDir(dirName.trim()).then(() => {
              toast.success('Dossier créé', dirName.trim());
            });
          }
        },
      },
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
        onClick: () => vaultStore.reloadTree(),
      },
      { id: 'div-sidebar-2', divider: true },
      ...(vaultRoot
        ? [
            {
              id: 'reveal-vault',
              label: "Révéler le coffre dans l'explorateur",
              icon: 'external-link' as const,
              onClick: () => {
                vaultStore.revealInExplorer('');
              },
            },
            {
              id: 'copy-vault-path',
              label: 'Copier le chemin du coffre',
              icon: 'copy' as const,
              onClick: () => {
                navigator.clipboard.writeText(vaultRoot);
                toast.info('Chemin du coffre copié', vaultRoot);
              },
            },
            { id: 'div-sidebar-3', divider: true },
          ]
        : []),
      {
        id: 'open-vault',
        label: 'Ouvrir un coffre-fort...',
        icon: 'folder-open',
        onClick: () => vaultStore.pickAndOpenVault(),
      },
    ]);
  };

  const filtered = filterNodes(files, filterText);

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
            {vaultStore.currentVaultPath?.split(/[/\\]/).pop() || 'Coffre-fort'}
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
              contextMenu.show(e, [
                {
                  id: 'new-md-note',
                  label: 'Nouvelle note Markdown',
                  icon: 'file-markdown' as const,
                  shortcut: 'Ctrl+N',
                  onClick: () => setIsCreatingFile(true),
                },
                {
                  id: 'new-kb-note',
                  label: 'Nouveau tableau Kanban...',
                  icon: 'kanban' as const,
                  onClick: () => {
                    const kbName = window.prompt('Nom du nouveau tableau Kanban :', 'kanban.md');
                    if (kbName && kbName.trim()) {
                      const clean = kbName.trim().endsWith('.md') ? kbName.trim() : `${kbName.trim()}.md`;
                      vaultStore.createKanbanFile(clean, clean.replace(/\.md$/, '')).then((path) => {
                        onSelectFile(path, false);
                        toast.success('Tableau Kanban créé', path);
                      });
                    }
                  },
                },
              ]);
            }}
            title="Créer un nouveau document (Note, Kanban...)"
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
            onClick={() => vaultStore.reloadTree()}
            title="Actualiser l'arborescence"
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
          onClick={() => handleSetSidebarTab('files')}
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
          onClick={() => handleSetSidebarTab('search')}
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
          onClick={() => handleSetSidebarTab('tags')}
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

          {/* Formulaire de création rapide */}
          {isCreatingFile && (
            <form onSubmit={handleCreateFileSubmit} style={{ padding: '0 12px 8px 12px' }}>
              <input
                autoFocus
                type="text"
                className="knit-input"
                placeholder="nom-note.md..."
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsCreatingFile(false);
                }}
                style={{
                  width: '100%',
                }}
              />
            </form>
          )}

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
            {/* Groupe Favoris / Épinglés */}
            {(() => {
              const pinnedNotes = vaultStore.getPinnedNotes();
              if (pinnedNotes.length === 0 || filterText.trim().length > 0) return null;

              return (
                <div style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--knit-border)' }}>
                  <div
                    onClick={() => setIsPinnedExpanded((prev) => !prev)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '3px 8px',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--knit-text-muted)',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <DuotoneIcon name={isPinnedExpanded ? 'chevron-down' : 'chevron-right'} size={11} />
                    <DuotoneIcon name="pin" size={11} style={{ color: 'var(--knit-primary)' }} />
                    <span>FAVORIS ({pinnedNotes.length})</span>
                  </div>

                  {isPinnedExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 2 }}>
                      {pinnedNotes.map((path) => {
                        const name = path.split('/').pop() || path;
                        const isNodeActive = path === activePath;
                        return (
                          <div
                            key={`pinned-${path}`}
                            onClick={() => onSelectFile(path, false)}
                            onAuxClick={(e) => {
                              if (e.button === 1) {
                                e.preventDefault();
                                onMiddleClickFile(path);
                              }
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '4px 8px 4px 18px',
                              borderRadius: 'var(--knit-radius-sm)',
                              backgroundColor: isNodeActive ? 'var(--knit-primary-alpha)' : 'transparent',
                              color: isNodeActive ? 'var(--knit-primary)' : 'var(--knit-text)',
                              cursor: 'pointer',
                              fontSize: 13,
                              fontWeight: isNodeActive ? 600 : 400,
                              userSelect: 'none',
                            }}
                            onMouseEnter={(e) => {
                              if (!isNodeActive) e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)';
                            }}
                            onMouseLeave={(e) => {
                              if (!isNodeActive) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <DuotoneIcon name="file-markdown" size={13} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {name}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                vaultStore.togglePinNote(path);
                              }}
                              title="Retirer des favoris"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--knit-text-muted)',
                                cursor: 'pointer',
                                padding: 2,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 'var(--knit-radius-xs)',
                              }}
                            >
                              <DuotoneIcon name="close" size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

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
                  onSelectTreeNode={(path, isDir, name) => setSelectedNode({ path, isDir, name })}
                  onSelectFile={onSelectFile}
                  onMiddleClickFile={onMiddleClickFile}
                  onRenameFile={(path) => setRenameTarget({ oldPath: path, newPath: path })}
                  onDeletePath={(path, isDir, name) => handleDelete(path, isDir, name)}
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

      {/* Pied de sidebar : bouton ouvrir dossier */}
      <div
        style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--knit-border)',
        }}
      >
        <button
          onClick={() => vaultStore.pickAndOpenVault()}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '6px 10px',
            backgroundColor: 'var(--knit-surface)',
            border: '1px solid var(--knit-border)',
            borderRadius: 'var(--knit-radius-sm)',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--knit-text)',
            transition: 'background var(--knit-transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface)')}
        >
          <DuotoneIcon name="folder-open" size={14} />
          <span>Ouvrir un coffre...</span>
        </button>
      </div>

      {/* Boîte de dialogue modale de renommage avec refactoring de liens */}
      {renameTarget && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setRenameTarget(null)}
        >
          <div
            style={{
              backgroundColor: 'var(--knit-surface)',
              border: '1px solid var(--knit-border)',
              borderRadius: 'var(--knit-radius-md)',
              padding: '20px 24px',
              width: '440px',
              maxWidth: '90vw',
              boxShadow: 'var(--knit-shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: 'var(--knit-text)' }}>
              Renommer ou déplacer la note
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--knit-text-muted)', lineHeight: '1.5' }}>
              Tous les liens Markdown et WikiLinks pointant vers cette note dans l'ensemble du coffre seront automatiquement recalculés et mis à jour.
            </p>
            <form onSubmit={handleRenameSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label className="knit-label" style={{ marginBottom: 6, display: 'block' }}>
                  Nouveau chemin / nom du fichier :
                </label>
                <input
                  className="knit-input"
                  autoFocus
                  type="text"
                  value={renameTarget.newPath}
                  onChange={(e) => setRenameTarget({ ...renameTarget, newPath: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setRenameTarget(null);
                  }}
                  style={{ width: '100%', fontFamily: 'var(--knit-font-mono)', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="knit-btn"
                  onClick={() => setRenameTarget(null)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="knit-btn knit-btn-primary"
                >
                  Refactoriser & Renommer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};
