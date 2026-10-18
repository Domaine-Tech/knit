import React, { useState, useEffect } from 'react';
import type { FileNode } from '../../types';
import { vaultStore } from '../../stores/vaultStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { contextMenu } from '../../stores/contextMenuStore';
import { toast } from '../../stores/toastStore';
import { networkStore } from '../../stores/networkStore';
import { tabStore } from '../../stores/tabStore';
import {
  copyRelativePath,
  copyAbsolutePath,
  copyFileName,
  copyMarkdownLink,
} from '../../utils';

interface TreeNodeProps {
  node: FileNode;
  activePath: string | null;
  selectedPath?: string | null;
  onSelectTreeNode?: (path: string, isDir: boolean, name: string) => void;
  onSelectFile: (path: string, preview: boolean) => void;
  onMiddleClickFile: (path: string) => void;
  onRenameFile?: (path: string) => void;
  onDeletePath?: (path: string, isDir: boolean, name: string) => void;
  depth?: number;
  defaultExpanded?: boolean;
  searchQuery?: string;
}

// Surlignage discret et élégant des termes recherchés selon les tokens Knit
const HighlightedText: React.FC<{ text: string; query?: string }> = ({ text, query }) => {
  if (!query || !query.trim()) {
    return <>{text}</>;
  }

  const q = query.trim().toLowerCase();
  const lower = text.toLowerCase();
  const index = lower.indexOf(q);

  if (index === -1) {
    return <>{text}</>;
  }

  const before = text.slice(0, index);
  const match = text.slice(index, index + q.length);
  const after = text.slice(index + q.length);

  return (
    <>
      {before}
      <mark
        style={{
          backgroundColor: 'var(--knit-primary-alpha)',
          color: 'var(--knit-primary)',
          fontWeight: 700,
          borderRadius: 'var(--knit-radius-xs)',
          padding: '0 2px',
        }}
      >
        {match}
      </mark>
      <HighlightedText text={after} query={query} />
    </>
  );
};

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  activePath,
  selectedPath,
  onSelectTreeNode,
  onSelectFile,
  onMiddleClickFile,
  onRenameFile,
  onDeletePath,
  depth = 0,
  defaultExpanded = false,
  searchQuery = '',
}) => {
  // Par défaut sur les gros coffres, les dossiers commencent FERMÉS
  // Sauf si le fichier actif ou sélectionné se trouve dans ce sous-dossier,
  // ou si "Déplier tout" est actif, ou si une recherche est en cours
  const isAncestorOfActive = Boolean(
    (activePath && node.is_dir && (activePath === node.path || activePath.startsWith(node.path + '/'))) ||
    (selectedPath && node.is_dir && (selectedPath === node.path || selectedPath.startsWith(node.path + '/')))
  );

  const isSearchActive = Boolean(searchQuery && searchQuery.trim().length > 0);
  const [isManualOpen, setIsManualOpen] = useState<boolean | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    return networkStore.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  // Déplié si l'utilisateur a explicitement cliqué, sinon auto : recherche active, "Déplier tout" ou parent de la note active
  const isOpen = isManualOpen !== null
    ? isManualOpen
    : Boolean(defaultExpanded || isAncestorOfActive || isSearchActive);

  const isSelected = selectedPath
    ? node.path === selectedPath
    : (!node.is_dir && node.path === activePath);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      // Empêche l'icône de défilement automatique (compass scroll wheel) du navigateur
      e.preventDefault();
    }
  };

  const handleAuxClick = (e: React.MouseEvent) => {
    if (!node.is_dir && e.button === 1) {
      // Clic molette sur fichier -> ouvrir en nouvel onglet permanent en arrière-plan (une seule fois)
      e.preventDefault();
      e.stopPropagation();
      onMiddleClickFile(node.path);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectTreeNode?.(node.path, node.is_dir, node.name);
    if (node.is_dir) {
      setIsManualOpen(!isOpen);
    } else {
      // Simple clic -> aperçu
      onSelectFile(node.path, true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Si la touche Suppr / Delete (ou Cmd/Ctrl+Backspace) est pressée
    if (e.key === 'Delete' || ((e.metaKey || e.ctrlKey) && e.key === 'Backspace')) {
      e.preventDefault();
      e.stopPropagation();
      if (onDeletePath) {
        onDeletePath(node.path, node.is_dir, node.name);
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (node.is_dir) {
        setIsManualOpen(!isOpen);
      } else {
        onSelectFile(node.path, false);
      }
    } else if (e.key === 'F2') {
      e.preventDefault();
      e.stopPropagation();
      if (onRenameFile) {
        onRenameFile(node.path);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!node.is_dir) {
      // Double clic -> permanent
      onSelectFile(node.path, false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectTreeNode?.(node.path, node.is_dir, node.name);

    const absPath = vaultStore.getAbsolutePath(node.path);

    if (node.is_dir) {
      contextMenu.show(e, [
        {
          id: 'toggle-dir',
          label: isOpen ? 'Replier le dossier' : 'Déplier le dossier',
          icon: isOpen ? 'chevron-down' : 'chevron-right',
          onClick: () => setIsManualOpen(!isOpen),
        },
        { id: 'div-dir-1', divider: true },
        {
          id: 'new-file-in-dir',
          label: 'Nouveau fichier dans ce dossier...',
          icon: 'plus',
          onClick: () => {
            const fileName = window.prompt(`Nouveau fichier dans "${node.name}" :`, 'nouvelle-note.md');
            if (fileName && fileName.trim()) {
              const cleanName = fileName.trim().endsWith('.md') ? fileName.trim() : `${fileName.trim()}.md`;
              const relPath = `${node.path}/${cleanName}`;
              vaultStore.createFile(relPath, `# ${cleanName.replace(/\.md$/, '')}\n\n`).then(() => {
                onSelectFile(relPath, false);
                setIsManualOpen(true);
                toast.success('Note créée', relPath);
              });
            }
          },
        },
        {
          id: 'new-kanban-in-dir',
          label: 'Nouveau tableau Kanban...',
          icon: 'kanban' as const,
          onClick: () => {
            const kbName = window.prompt(`Nom du nouveau tableau Kanban dans "${node.name}" :`, 'kanban.md');
            if (kbName && kbName.trim()) {
              const cleanName = kbName.trim().endsWith('.md') ? kbName.trim() : `${kbName.trim()}.md`;
              const relPath = `${node.path}/${cleanName}`;
              vaultStore.createKanbanFile(relPath, cleanName.replace(/\.md$/, '')).then(() => {
                onSelectFile(relPath, false);
                setIsManualOpen(true);
                toast.success('Tableau Kanban créé', relPath);
              });
            }
          },
        },
        {
          id: 'new-dir-in-dir',
          label: 'Nouveau dossier...',
          icon: 'folder-plus',
          onClick: () => {
            const dirName = window.prompt(`Nouveau sous-dossier dans "${node.name}" :`, 'nouveau-dossier');
            if (dirName && dirName.trim()) {
              const relPath = `${node.path}/${dirName.trim()}`;
              vaultStore.createDir(relPath).then(() => {
                setIsManualOpen(true);
                toast.success('Dossier créé', relPath);
              });
            }
          },
        },
        { id: 'div-dir-2', divider: true },
        {
          id: 'rename-dir',
          label: 'Renommer / Déplacer le dossier...',
          icon: 'clipboard' as const,
          shortcut: 'F2',
          onClick: () => {
            if (onRenameFile) onRenameFile(node.path);
          },
        },
        {
          id: 'reveal-dir',
          label: "Révéler dans l'explorateur",
          icon: 'external-link',
          onClick: () => {
            vaultStore.revealInExplorer(node.path);
          },
        },
        { id: 'div-dir-3', divider: true },
        {
          id: 'copy-dir-rel-path',
          label: 'Copier le chemin relatif',
          icon: 'copy',
          onClick: () => {
            copyRelativePath(node.path);
          },
        },
        {
          id: 'copy-dir-abs-path',
          label: 'Copier le chemin absolu',
          icon: 'copy',
          onClick: () => {
            copyAbsolutePath(absPath);
          },
        },
        {
          id: 'copy-dir-name',
          label: 'Copier le nom du dossier',
          icon: 'clipboard',
          onClick: () => {
            copyFileName(node.name);
          },
        },
        { id: 'div-dir-delete', divider: true },
        {
          id: 'delete-dir',
          label: 'Supprimer le dossier...',
          icon: 'trash',
          shortcut: 'Suppr',
          danger: true,
          onClick: () => {
            if (onDeletePath) onDeletePath(node.path, true, node.name);
          },
        },
      ]);
    } else {
      contextMenu.show(e, [
        {
          id: 'open-file',
          label: 'Ouvrir',
          icon: 'file-markdown',
          onClick: () => onSelectFile(node.path, false),
        },
        {
          id: 'open-tab-bg',
          label: 'Ouvrir dans un nouvel onglet',
          icon: 'external-link',
          onClick: () => onMiddleClickFile(node.path),
        },
        {
          id: 'toggle-pin',
          label: vaultStore.isPinned(node.path) ? 'Détacher des favoris' : 'Épingler aux favoris',
          icon: 'pin',
          onClick: () => vaultStore.togglePinNote(node.path),
        },
        { id: 'div-file-1', divider: true },
        {
          id: 'convert-to-note',
          label: 'Changer le type : Note Markdown',
          icon: 'file-markdown',
          onClick: () => vaultStore.convertDocumentType(node.path, 'note'),
        },
        {
          id: 'convert-to-kanban',
          label: 'Changer le type : Tableau Kanban',
          icon: 'kanban',
          onClick: () => vaultStore.convertDocumentType(node.path, 'kanban'),
        },
        {
          id: 'convert-to-table',
          label: 'Changer le type : Vue Tableau',
          icon: 'table',
          onClick: () => vaultStore.convertDocumentType(node.path, 'table'),
        },
        { id: 'div-file-convert', divider: true },
        {
          id: 'rename-file',
          label: 'Renommer / Déplacer...',
          icon: 'clipboard' as const,
          shortcut: 'F2',
          onClick: () => {
            if (onRenameFile) onRenameFile(node.path);
          },
        },
        {
          id: 'reveal-file',
          label: "Révéler dans l'explorateur",
          icon: 'external-link',
          onClick: () => {
            vaultStore.revealInExplorer(node.path);
          },
        },
        { id: 'div-file-2', divider: true },
        {
          id: 'copy-rel-path',
          label: 'Copier le chemin relatif',
          icon: 'copy',
          onClick: () => {
            copyRelativePath(node.path);
          },
        },
        {
          id: 'copy-abs-path',
          label: 'Copier le chemin absolu',
          icon: 'copy',
          onClick: () => {
            copyAbsolutePath(absPath);
          },
        },
        {
          id: 'copy-name',
          label: 'Copier le nom du fichier',
          icon: 'clipboard',
          onClick: () => {
            copyFileName(node.name);
          },
        },
        {
          id: 'copy-md-link',
          label: 'Copier le lien Markdown',
          icon: 'link',
          onClick: () => {
            copyMarkdownLink(node.path, node.name);
          },
        },
        { id: 'div-file-delete', divider: true },
        {
          id: 'delete-file',
          label: 'Supprimer la note...',
          icon: 'trash',
          shortcut: 'Suppr',
          danger: true,
          onClick: () => {
            if (onDeletePath) onDeletePath(node.path, false, node.name);
          },
        },
      ]);
    }
  };

  return (
    <div>
      <div
        tabIndex={0}
        role="treeitem"
        data-tree-path={node.path}
        aria-selected={isSelected}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onAuxClick={handleAuxClick}
        onContextMenu={handleContextMenu}
        onKeyDown={handleKeyDown}
        onFocus={() => onSelectTreeNode?.(node.path, node.is_dir, node.name)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          paddingLeft: depth * 14 + 10,
          borderRadius: 'var(--knit-radius-sm)',
          cursor: 'pointer',
          outline: 'none',
          backgroundColor: isSelected
            ? 'var(--knit-primary-alpha)'
            : 'transparent',
          boxShadow: isSelected
            ? 'inset 0 0 0 1px var(--knit-primary-alpha)'
            : 'none',
          color: isSelected
            ? 'var(--knit-primary)'
            : 'var(--knit-text)',
          fontWeight: isSelected ? 600 : 400,
          fontSize: 13,
          transition: 'background var(--knit-transition-fast)',
          userSelect: 'none',
        }}
        onMouseEnter={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isSelected) {
            e.currentTarget.style.backgroundColor = 'transparent';
          }
        }}
      >
        {node.is_dir ? (
          <>
            <DuotoneIcon
              name={isOpen ? 'chevron-down' : 'chevron-right'}
              size={12}
              style={{ color: 'var(--knit-text-muted)' }}
            />
            <DuotoneIcon name={isOpen ? 'folder-open' : 'folder'} size={15} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <HighlightedText text={node.name} query={searchQuery} />
            </span>
          </>
        ) : (
          <>
            <span style={{ width: 12 }} />
            {(() => {
              const docType =
                tabStore.tabs.find((t) => t.path === node.path)?.docType ||
                (node.name.toLowerCase().includes('kanban')
                  ? 'kanban'
                  : node.name.toLowerCase().includes('tableau') || node.name.toLowerCase().includes('table')
                  ? 'table'
                  : 'note');

              if (docType === 'kanban') {
                return <DuotoneIcon name="kanban" size={14} style={{ color: 'var(--knit-primary)' }} />;
              }
              if (docType === 'table') {
                return <DuotoneIcon name="table" size={14} style={{ color: 'var(--knit-primary)' }} />;
              }
              return <DuotoneIcon name="file-markdown" size={14} />;
            })()}
            {vaultStore.isPinned(node.path) && (
              <span style={{ display: 'inline-flex', alignItems: 'center' }} title="Note épinglée aux favoris">
                <DuotoneIcon name="pin" size={11} style={{ color: 'var(--knit-primary)' }} />
              </span>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              <HighlightedText text={node.name} query={searchQuery} />
            </span>
            {(() => {
              const collaborators = networkStore.getCollaboratorsForFile(node.path);
              if (collaborators.length === 0) return null;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 'auto', flexShrink: 0 }}>
                  {collaborators.slice(0, 2).map((collab) => {
                    const avatarUrl = networkStore.peerAvatarDataUrls.get(collab.peer_id);
                    return avatarUrl ? (
                      <img
                        key={collab.peer_id}
                        src={avatarUrl}
                        alt={collab.display_name}
                        title={`${collab.display_name} — Cliquer pour rejoindre`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFile(node.path, false);
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '1px solid var(--knit-border)',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                        }}
                      />
                    ) : (
                      <div
                        key={collab.peer_id}
                        title={`${collab.display_name} — Cliquer pour rejoindre`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFile(node.path, false);
                        }}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          backgroundColor: collab.color_hex,
                          color: '#FFFFFF',
                          fontSize: 9,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                          cursor: 'pointer',
                        }}
                      >
                        {collab.initials}
                      </div>
                    );
                  })}
                  {collaborators.length > 2 && (
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        color: 'var(--knit-text-muted)',
                        backgroundColor: 'var(--knit-surface-hover)',
                        borderRadius: 'var(--knit-radius-xs)',
                        padding: '1px 4px',
                      }}
                    >
                      +{collaborators.length - 2}
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {node.is_dir && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              activePath={activePath}
              selectedPath={selectedPath}
              onSelectTreeNode={onSelectTreeNode}
              onSelectFile={onSelectFile}
              onMiddleClickFile={onMiddleClickFile}
              onRenameFile={onRenameFile}
              onDeletePath={onDeletePath}
              depth={depth + 1}
              defaultExpanded={defaultExpanded}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
};
