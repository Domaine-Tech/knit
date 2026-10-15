import React, { useState } from 'react';
import type { FileNode } from '../../stores/vaultStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

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
    if (!node.is_dir && e.button === 1) {
      // Clic molette sur fichier -> ouvrir en nouvel onglet permanent en arrière-plan
      e.preventDefault();
      e.stopPropagation();
      onMiddleClickFile(node.path);
    }
  };

  const handleAuxClick = (e: React.MouseEvent) => {
    if (!node.is_dir && e.button === 1) {
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

  return (
    <div>
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onAuxClick={handleAuxClick}
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
