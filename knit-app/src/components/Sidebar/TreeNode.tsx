import React, { useState } from 'react';
import type { FileNode } from '../../stores/vaultStore';
import { vaultStore } from '../../stores/vaultStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { contextMenu } from '../../stores/contextMenuStore';
import { toast } from '../../stores/toastStore';

interface TreeNodeProps {
  node: FileNode;
  activePath: string | null;
  onSelectFile: (path: string, preview: boolean) => void;
  onMiddleClickFile: (path: string) => void;
  depth?: number;
  defaultExpanded?: boolean;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  activePath,
  onSelectFile,
  onMiddleClickFile,
  depth = 0,
  defaultExpanded = false,
}) => {
  // Par défaut sur les gros coffres, les dossiers commencent FERMÉS
  // Sauf si le fichier actif en cours d'édition se trouve dans ce sous-dossier ou si Déplier tout est actif
  const isAncestorOfActive = Boolean(
    activePath && node.is_dir && (activePath === node.path || activePath.startsWith(node.path + '/'))
  );

  const [isOpen, setIsOpen] = useState(() => defaultExpanded || isAncestorOfActive);

  const isSelected = !node.is_dir && node.path === activePath;

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
    if (node.is_dir) {
      setIsOpen(!isOpen);
    } else {
      // Simple clic -> aperçu
      onSelectFile(node.path, true);
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

    const absPath = vaultStore.getAbsolutePath(node.path);
    const mdLink = `[${node.name.replace(/\.md$/, '')}](${node.path})`;

    if (node.is_dir) {
      contextMenu.show(e, [
        {
          id: 'toggle-dir',
          label: isOpen ? 'Replier le dossier' : 'Déplier le dossier',
          icon: isOpen ? 'chevron-down' : 'chevron-right',
          onClick: () => setIsOpen(!isOpen),
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
                setIsOpen(true);
                toast.success('Note créée', relPath);
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
                setIsOpen(true);
                toast.success('Dossier créé', relPath);
              });
            }
          },
        },
        { id: 'div-dir-2', divider: true },
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
            navigator.clipboard.writeText(node.path);
            toast.info('Chemin relatif copié', node.path);
          },
        },
        {
          id: 'copy-dir-abs-path',
          label: 'Copier le chemin absolu',
          icon: 'copy',
          onClick: () => {
            navigator.clipboard.writeText(absPath);
            toast.info('Chemin absolu copié', absPath);
          },
        },
        {
          id: 'copy-dir-name',
          label: 'Copier le nom du dossier',
          icon: 'clipboard',
          onClick: () => {
            navigator.clipboard.writeText(node.name);
            toast.info('Nom copié', node.name);
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
        { id: 'div-file-1', divider: true },
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
            navigator.clipboard.writeText(node.path);
            toast.info('Chemin relatif copié', node.path);
          },
        },
        {
          id: 'copy-abs-path',
          label: 'Copier le chemin absolu',
          icon: 'copy',
          onClick: () => {
            navigator.clipboard.writeText(absPath);
            toast.info('Chemin absolu copié', absPath);
          },
        },
        {
          id: 'copy-name',
          label: 'Copier le nom du fichier',
          icon: 'clipboard',
          onClick: () => {
            navigator.clipboard.writeText(node.name);
            toast.info('Nom copié', node.name);
          },
        },
        {
          id: 'copy-md-link',
          label: 'Copier le lien Markdown',
          icon: 'link',
          onClick: () => {
            navigator.clipboard.writeText(mdLink);
            toast.info('Lien Markdown copié', mdLink);
          },
        },
      ]);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onAuxClick={handleAuxClick}
        onContextMenu={handleContextMenu}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 8px',
          paddingLeft: depth * 14 + 10,
          borderRadius: 'var(--knit-radius-sm)',
          cursor: 'pointer',
          backgroundColor: isSelected
            ? 'var(--knit-primary-alpha)'
            : 'transparent',
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
              {node.name}
            </span>
          </>
        ) : (
          <>
            <span style={{ width: 12 }} />
            <DuotoneIcon name="file-markdown" size={14} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {node.name}
            </span>
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
              onSelectFile={onSelectFile}
              onMiddleClickFile={onMiddleClickFile}
              depth={depth + 1}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
};
