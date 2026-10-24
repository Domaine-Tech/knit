import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { FileNode } from '../../types';
import { flattenVisibleTree } from '../../utils/treeFlatten';
import { TreeNode } from './TreeNode';

const ROW_HEIGHT = 28;

export interface VirtualFileTreeProps {
  nodes: FileNode[];
  activePath: string | null;
  selectedPath: string | null;
  treeKey: number;
  defaultExpanded: boolean;
  searchQuery: string;
  onSelectTreeNode?: (path: string, isDir: boolean, name: string) => void;
  onSelectFile: (path: string, preview: boolean) => void;
  onMiddleClickFile: (path: string) => void;
  onRenameFile?: (path: string) => void;
  onDeletePath?: (path: string, isDir: boolean, name: string) => void;
}

/**
 * Arborescence virtualisée (fenêtrage) pour grands coffres.
 * La section épinglée reste hors de ce composant.
 */
export const VirtualFileTree: React.FC<VirtualFileTreeProps> = ({
  nodes,
  activePath,
  selectedPath,
  treeKey,
  defaultExpanded,
  searchQuery,
  onSelectTreeNode,
  onSelectFile,
  onMiddleClickFile,
  onRenameFile,
  onDeletePath,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  /** Chemins explicitement dépliés / repliés par l'utilisateur. */
  const [manualOpen, setManualOpen] = useState<Map<string, boolean>>(() => new Map());

  useEffect(() => {
    setManualOpen(new Map());
  }, [treeKey]);

  const isSearchActive = Boolean(searchQuery.trim());

  const isExpanded = useCallback(
    (path: string) => {
      const manual = manualOpen.get(path);
      if (manual !== undefined) return manual;
      if (defaultExpanded || isSearchActive) return true;
      if (activePath && activePath.startsWith(path + '/')) return true;
      if (selectedPath && selectedPath.startsWith(path + '/')) return true;
      return false;
    },
    [manualOpen, defaultExpanded, isSearchActive, activePath, selectedPath]
  );

  const flat = useMemo(
    () => flattenVisibleTree(nodes, isExpanded),
    [nodes, isExpanded]
  );

  const virtualizer = useVirtualizer({
    count: flat.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  const togglePath = (path: string, currentlyOpen: boolean) => {
    setManualOpen((prev) => {
      const next = new Map(prev);
      next.set(path, !currentlyOpen);
      return next;
    });
  };

  return (
    <div
      ref={parentRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        height: '100%',
        minHeight: 0,
      }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((vItem) => {
          const item = flat[vItem.index];
          if (!item) return null;
          const open = item.node.is_dir ? isExpanded(item.node.path) : false;
          return (
            <div
              key={`${item.node.id}-${treeKey}`}
              data-index={vItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${vItem.start}px)`,
              }}
            >
              <TreeNode
                node={item.node}
                activePath={activePath}
                selectedPath={selectedPath}
                onSelectTreeNode={onSelectTreeNode}
                onSelectFile={onSelectFile}
                onMiddleClickFile={onMiddleClickFile}
                onRenameFile={onRenameFile}
                onDeletePath={onDeletePath}
                depth={item.depth}
                defaultExpanded={false}
                searchQuery={searchQuery}
                leafMode
                controlledOpen={open}
                onToggleOpen={
                  item.node.is_dir
                    ? () => togglePath(item.node.path, open)
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
