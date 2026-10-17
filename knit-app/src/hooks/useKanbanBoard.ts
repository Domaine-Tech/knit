import { useState, useEffect, useCallback, useMemo } from 'react';
import { vaultStore } from '../stores/vaultStore';
import type { KanbanFileInfo, KanbanBoard } from '../types';
import { parseKanbanMarkdown, serializeKanbanMarkdown } from '../utils/kanbanParser';

interface UseKanbanBoardProps {
  activeFilePath?: string | null;
  activeFileContent?: string;
  onUpdateContent: (path: string, content: string) => void;
}

export function useKanbanBoard({
  activeFilePath,
  activeFileContent = '',
  onUpdateContent,
}: UseKanbanBoardProps) {
  const [availableKanbans, setAvailableKanbans] = useState<KanbanFileInfo[]>([]);

  useEffect(() => {
    let isMounted = true;
    void vaultStore.getKanbanFiles().then((list) => {
      if (isMounted) setAvailableKanbans(list);
    });
    const unsub = vaultStore.subscribe(() => {
      void vaultStore.getKanbanFiles().then((list) => {
        if (isMounted) setAvailableKanbans(list);
      });
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const currentPath = activeFilePath || (availableKanbans.length > 0 ? availableKanbans[0].path : null);

  const board: KanbanBoard = useMemo(() => {
    const title = currentPath ? currentPath.split('/').pop()?.replace(/\.md$/, '') || 'Kanban' : 'Mon Kanban';
    return parseKanbanMarkdown(activeFileContent, title);
  }, [activeFileContent, currentPath]);

  const persistBoard = useCallback(
    (updatedBoard: KanbanBoard) => {
      if (!currentPath) return;
      const newMarkdown = serializeKanbanMarkdown(updatedBoard);
      onUpdateContent(currentPath, newMarkdown);
    },
    [currentPath, onUpdateContent]
  );

  return {
    availableKanbans,
    currentPath,
    board,
    persistBoard,
  };
}
