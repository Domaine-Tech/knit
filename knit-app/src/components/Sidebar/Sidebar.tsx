import React, { useState } from 'react';
import type { FileNode } from '../../stores/vaultStore';
import { vaultStore } from '../../stores/vaultStore';
import { TreeNode } from './TreeNode';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { toast } from '../../stores/toastStore';
import { contextMenu } from '../../stores/contextMenuStore';

interface SidebarProps {
  files: FileNode[];
  activePath: string | null;
  onSelectFile: (path: string, preview: boolean) => void;
  onMiddleClickFile: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  activePath,
  onSelectFile,
  onMiddleClickFile,
}) => {
  const [filterText, setFilterText] = useState('');
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [treeKey, setTreeKey] = useState(0);

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
          if (matchingChildren.length > 0 || node.name.toLowerCase().includes(lower)) {
            return { ...node, children: matchingChildren };
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
        width: 250,
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
          <DuotoneIcon name="vault" size={16} />
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
            <DuotoneIcon name={isAllExpanded ? 'collapse-all' : 'expand-all'} size={13} />
          </button>
          <button
            onClick={() => setIsCreatingFile(true)}
            title="Nouveau fichier .md"
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
            <DuotoneIcon name="sync" size={13} />
          </button>
        </div>
      </div>

      {/* Barre de filtre rapide */}
      <div style={{ padding: '0 12px 8px 12px' }}>
        <div className="knit-input-group">
          <DuotoneIcon name="search" size={12} style={{ color: 'var(--knit-text-muted)' }} />
          <input
            type="text"
            className="knit-input-seamless"
            placeholder="Filtrer les notes..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{
              width: '100%',
              fontSize: 12,
              color: 'var(--knit-text)',
            }}
          />
          {filterText && (
            <button onClick={() => setFilterText('')} style={{ color: 'var(--knit-text-muted)' }}>
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
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '4px 6px',
        }}
      >
        {filtered.length === 0 ? (
          <div
            style={{
              padding: 16,
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--knit-text-muted)',
            }}
          >
            {filterText ? 'Aucun résultat' : 'Coffre vide'}
          </div>
        ) : (
          filtered.map((node) => (
            <TreeNode
              key={`${node.id}-${treeKey}`}
              node={node}
              activePath={activePath}
              onSelectFile={onSelectFile}
              onMiddleClickFile={onMiddleClickFile}
              defaultExpanded={isAllExpanded}
            />
          ))
        )}
      </div>

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
    </aside>
  );
};
