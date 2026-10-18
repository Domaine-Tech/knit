import { useState, useEffect, useCallback, useRef } from 'react';
import { vaultStore } from '../stores/vaultStore';
import type {
  KanbanFileInfo,
  KanbanBoard,
  KanbanCard,
  UseKanbanBoardProps,
  MoveCardOptions,
  MoveCardResult,
  TaskStatus,
} from '../types';
import { adaptCardStatusToColumn, parseKanbanMarkdown, serializeKanbanMarkdown } from '../utils';

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

  const toggleCard = useCallback((columnId: string, cardId: string) => {
    const current = boardRef.current;
    const columns = current.columns.map((col) => {
      if (col.id !== columnId) return col;
      return {
        ...col,
        cards: col.cards.map((c) => {
          if (c.id !== cardId) return c;
          const nextCompleted = !c.completed;
          return {
            ...c,
            completed: nextCompleted,
            status: (nextCompleted ? 'x' : ' ') as TaskStatus,
          };
        }),
      };
    });
    persistBoard({ ...current, columns });
  }, [persistBoard]);

  const deleteCard = useCallback((columnId: string, cardId: string) => {
    const current = boardRef.current;
    const columns = current.columns.map((col) => {
      if (col.id !== columnId) return col;
      return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
    });
    persistBoard({ ...current, columns });
  }, [persistBoard]);

  const updateCardTitle = useCallback((columnId: string, cardId: string, title: string) => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    const current = boardRef.current;
    const columns = current.columns.map((col) => {
      if (col.id !== columnId) return col;
      return {
        ...col,
        cards: col.cards.map((c) => (c.id === cardId ? { ...c, title: nextTitle } : c)),
      };
    });
    persistBoard({ ...current, columns });
  }, [persistBoard]);

  const addCard = useCallback((columnId: string, card: KanbanCard) => {
    const current = boardRef.current;
    const columns = current.columns.map((col) =>
      col.id === columnId ? { ...col, cards: [...col.cards, card] } : col
    );
    persistBoard({ ...current, columns });
  }, [persistBoard]);

  const moveCard = useCallback((options: MoveCardOptions): MoveCardResult => {
    const { cardId, sourceColumnId, targetColumnId } = options;
    const currentBoard = boardRef.current;

    const fail = (
      outcome: MoveCardResult['outcome'],
      partial: Partial<MoveCardResult> = {}
    ): MoveCardResult => ({
      outcome,
      cardTitle: partial.cardTitle ?? cardId,
      cardId,
      fromColumn: partial.fromColumn ?? sourceColumnId,
      toColumn: partial.toColumn ?? targetColumnId,
      fromIndex: partial.fromIndex ?? -1,
      toIndex: partial.toIndex ?? options.insertIndex ?? -1,
    });

    const sourceCol = currentBoard.columns.find((c) => c.id === sourceColumnId);
    if (!sourceCol) return fail('missing-source');

    const sourceIndex = sourceCol.cards.findIndex((c) => c.id === cardId);
    const cardToMove = sourceIndex >= 0 ? sourceCol.cards[sourceIndex] : undefined;
    if (!cardToMove) {
      return fail('missing-card', { fromColumn: sourceCol.title });
    }

    const targetCol = currentBoard.columns.find((c) => c.id === targetColumnId);
    if (!targetCol) {
      return fail('missing-target', {
        cardTitle: cardToMove.title,
        fromColumn: sourceCol.title,
        fromIndex: sourceIndex,
      });
    }

    if (sourceColumnId === targetColumnId) {
      if (options.insertIndex === undefined) {
        return fail('noop', {
          cardTitle: cardToMove.title,
          fromColumn: sourceCol.title,
          toColumn: targetCol.title,
          fromIndex: sourceIndex,
          toIndex: sourceIndex,
        });
      }

      let insertIndex = options.insertIndex;
      if (insertIndex === sourceIndex || insertIndex === sourceIndex + 1) {
        return fail('noop', {
          cardTitle: cardToMove.title,
          fromColumn: sourceCol.title,
          toColumn: targetCol.title,
          fromIndex: sourceIndex,
          toIndex: options.insertIndex,
        });
      }

      const cards = [...sourceCol.cards];
      const [moved] = cards.splice(sourceIndex, 1);
      if (sourceIndex < insertIndex) {
        insertIndex -= 1;
      }
      cards.splice(insertIndex, 0, moved);

      persistBoard({
        ...currentBoard,
        columns: currentBoard.columns.map((col) =>
          col.id === sourceColumnId ? { ...col, cards } : col
        ),
      });

      return {
        outcome: 'reordered',
        cardTitle: moved.title,
        cardId,
        fromColumn: sourceCol.title,
        toColumn: targetCol.title,
        fromIndex: sourceIndex,
        toIndex: insertIndex,
      };
    }

    const updatedCard = adaptCardStatusToColumn(cardToMove, targetCol.title || '');
    const insertIndex = options.insertIndex === undefined
      ? targetCol.cards.length
      : Math.max(0, Math.min(options.insertIndex, targetCol.cards.length));

    const columns = currentBoard.columns.map((col) => {
      if (col.id === sourceColumnId) {
        return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
      }
      if (col.id === targetColumnId) {
        const cards = [...col.cards];
        cards.splice(insertIndex, 0, updatedCard);
        return { ...col, cards };
      }
      return col;
    });

    persistBoard({ ...currentBoard, columns });

    return {
      outcome: 'moved',
      cardTitle: cardToMove.title,
      cardId,
      fromColumn: sourceCol.title,
      toColumn: targetCol.title,
      fromIndex: sourceIndex,
      toIndex: insertIndex,
    };
  }, [persistBoard]);

  return {
    availableKanbans,
    currentPath,
    board,
    boardRef,
    persistBoard,
    toggleCard,
    deleteCard,
    updateCardTitle,
    addCard,
    moveCard,
  };
}
