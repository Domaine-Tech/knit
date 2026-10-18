import { useState, useEffect, useCallback, useRef } from 'react';
import { vaultStore } from '../stores/vaultStore';
import type { KanbanFileInfo, KanbanBoard, UseKanbanBoardProps } from '../types';
import { parseKanbanMarkdown, serializeKanbanMarkdown } from '../utils';

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

  const computeBoard = useCallback((content: string, path: string | null): KanbanBoard => {
    const title = path ? path.split('/').pop()?.replace(/\.md$/, '') || 'Kanban' : 'Mon Kanban';
    return parseKanbanMarkdown(content, title);
  }, []);

  const [board, setBoard] = useState<KanbanBoard>(() => computeBoard(activeFileContent, currentPath));
  const boardRef = useRef<KanbanBoard>(board);
  const lastSerializedRef = useRef<string>(activeFileContent);

  // Historique des contenus sérialisés localement pour neutraliser l'écho du file watcher disque
  const internalSavedHashesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    boardRef.current = board;
  }, [board]);

  // Normalisation des fins de ligne pour éviter les faux rechargements Windows CRLF vs Unix LF
  const normalizeContent = (text: string) => text.replace(/\r\n/g, '\n').trim();

  // Synchronisation avec l'extérieur (ex: rechargement de fichier ou modification par un agent)
  useEffect(() => {
    const normalizedIncoming = normalizeContent(activeFileContent);
    const normalizedCurrent = normalizeContent(lastSerializedRef.current);

    if (normalizedIncoming !== normalizedCurrent) {
      // Si ce contenu entrant est un écho d'une sauvegarde locale récente, on l'ignore (anti-race condition lors de drags rapides)
      if (internalSavedHashesRef.current.has(normalizedIncoming)) {
        return;
      }

      lastSerializedRef.current = activeFileContent;
      const parsed = computeBoard(activeFileContent, currentPath);
      boardRef.current = parsed;
      setBoard(parsed);
    }
  }, [activeFileContent, currentPath, computeBoard]);

  const persistBoard = useCallback(
    (updatedBoard: KanbanBoard) => {
      // 1. Mise à jour instantanée et synchrone de la ref et de l'état local (aucun lag UI, zéro désynchronisation)
      boardRef.current = updatedBoard;
      setBoard(updatedBoard);
      if (!currentPath) return;

      // 2. Sérialisation et persistance dans le store et sur disque
      const newMarkdown = serializeKanbanMarkdown(updatedBoard);
      const normalizedNew = normalizeContent(newMarkdown);

      // Enregistrement dans l'historique des sauvegardes locales pour neutraliser l'écho du file watcher
      internalSavedHashesRef.current.add(normalizedNew);
      if (internalSavedHashesRef.current.size > 30) {
        const first = internalSavedHashesRef.current.values().next().value;
        if (first) internalSavedHashesRef.current.delete(first);
      }

      lastSerializedRef.current = newMarkdown;
      onUpdateContent(currentPath, newMarkdown);
    },
    [currentPath, onUpdateContent]
  );

  return {
    availableKanbans,
    currentPath,
    board,
    boardRef,
    persistBoard,
  };
}
