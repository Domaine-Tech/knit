import { useCallback, useEffect, useRef, useState, type DragEvent as ReactDragEvent } from 'react';
import type {
  KanbanDragInfo,
  KanbanDropSlot,
  KanbanDragLog,
  UseKanbanDnDOptions,
} from '../types';
import { toast } from '../stores/toastStore';

export function useKanbanDnD({ boardRef, moveCard }: UseKanbanDnDOptions) {
  const [draggedCard, setDraggedCard] = useState<KanbanDragInfo | null>(null);
  const [dropTarget, setDropTarget] = useState<KanbanDropSlot | null>(null);
  const draggedCardRef = useRef<KanbanDragInfo | null>(null);
  const dropTargetRef = useRef<KanbanDropSlot | null>(null);

  const [dragLogs, setDragLogs] = useState<KanbanDragLog[]>([]);
  const dragLogsRef = useRef<KanbanDragLog[]>([]);

  const logDnD = useCallback((entry: KanbanDragLog) => {
    dragLogsRef.current = [entry, ...dragLogsRef.current].slice(0, 30);
    setDragLogs([...dragLogsRef.current]);

    const color =
      entry.action === 'reorder'
        ? '#10B981'
        : entry.action === 'move'
        ? '#3B82F6'
        : entry.action === 'no-op'
        ? '#F59E0B'
        : '#EF4444';

    console.log(
      `%c[Kanban D&D ${entry.time}] ${entry.action.toUpperCase()}%c ${entry.detail} (cardId: ${entry.cardId})`,
      `background: ${color}; color: #000; font-weight: bold; padding: 2px 5px; border-radius: 3px;`,
      'color: inherit; font-weight: normal;'
    );
  }, []);

  useEffect(() => {
    const handleGlobalDragOver = (e: globalThis.DragEvent) => {
      if (draggedCardRef.current || e.dataTransfer?.types.includes('application/knit-card')) {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
        }
      }
    };

    const handleGlobalDragEnd = () => {
      draggedCardRef.current = null;
      dropTargetRef.current = null;
      setDraggedCard(null);
      setDropTarget(null);
    };

    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('dragenter', handleGlobalDragOver);
    window.addEventListener('dragend', handleGlobalDragEnd);
    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('dragenter', handleGlobalDragOver);
      window.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, []);

  const handleDragStart = (e: ReactDragEvent, columnId: string, cardId: string) => {
    const info = { cardId, sourceColumnId: columnId };
    draggedCardRef.current = info;
    setDraggedCard(info);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.setData('application/knit-card', JSON.stringify(info));
  };

  const handleDragOverColumn = (e: ReactDragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const col = boardRef.current.columns.find((c) => c.id === columnId);
    if (!col || col.cards.length === 0) {
      dropTargetRef.current = { columnId, index: 0 };
      if (!dropTarget || dropTarget.columnId !== columnId || dropTarget.index !== 0) {
        setDropTarget({ columnId, index: 0 });
      }
      return;
    }

    const colElement = e.currentTarget;
    const cardElements = colElement.querySelectorAll<HTMLElement>('[data-knit-card]');
    if (cardElements.length === 0) {
      dropTargetRef.current = { columnId, index: 0 };
      if (!dropTarget || dropTarget.columnId !== columnId || dropTarget.index !== 0) {
        setDropTarget({ columnId, index: 0 });
      }
      return;
    }

    let targetIndex = cardElements.length;
    for (let i = 0; i < cardElements.length; i++) {
      const cardEl = cardElements[i];
      const rect = cardEl.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (e.clientY < midpoint) {
        targetIndex = i;
        break;
      }
    }

    dropTargetRef.current = { columnId, index: targetIndex };
    if (!dropTarget || dropTarget.columnId !== columnId || dropTarget.index !== targetIndex) {
      setDropTarget({ columnId, index: targetIndex });
    }
  };

  const handleCardDragOver = (e: ReactDragEvent, columnId: string, cardIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const targetIndex = e.clientY < midpoint ? cardIndex : cardIndex + 1;

    dropTargetRef.current = { columnId, index: targetIndex };
    if (!dropTarget || dropTarget.columnId !== columnId || dropTarget.index !== targetIndex) {
      setDropTarget({ columnId, index: targetIndex });
    }
  };

  const handleDragEnd = () => {
    draggedCardRef.current = null;
    dropTargetRef.current = null;
    setDraggedCard(null);
    setDropTarget(null);
  };

  const executeCardDrop = useCallback(
    (targetColumnId: string, targetSlotIndex: number) => {
      const info = draggedCardRef.current || draggedCard;
      draggedCardRef.current = null;
      dropTargetRef.current = null;
      setDraggedCard(null);
      setDropTarget(null);

      const now = new Date();
      const timeStr = `${now.toTimeString().split(' ')[0]}.${now.getMilliseconds().toString().padStart(3, '0')}`;

      if (!info) {
        logDnD({
          id: `log-${Date.now()}`,
          time: timeStr,
          action: 'abort',
          cardTitle: 'Inconnue',
          cardId: 'none',
          fromColumn: '?',
          toColumn: targetColumnId,
          fromIndex: -1,
          toIndex: targetSlotIndex,
          detail: 'Échec : métadonnées de carte introuvables lors du drop.',
        });
        return;
      }

      const { cardId, sourceColumnId } = info;
      const result = moveCard({
        cardId,
        sourceColumnId,
        targetColumnId,
        insertIndex: targetSlotIndex,
      });

      if (result.outcome === 'missing-source') {
        logDnD({
          id: `log-${Date.now()}`,
          time: timeStr,
          action: 'abort',
          cardTitle: result.cardTitle,
          cardId,
          fromColumn: result.fromColumn,
          toColumn: targetColumnId,
          fromIndex: -1,
          toIndex: targetSlotIndex,
          detail: `Échec : colonne source "${sourceColumnId}" introuvable.`,
        });
        return;
      }

      if (result.outcome === 'missing-card') {
        logDnD({
          id: `log-${Date.now()}`,
          time: timeStr,
          action: 'abort',
          cardTitle: cardId,
          cardId,
          fromColumn: result.fromColumn,
          toColumn: targetColumnId,
          fromIndex: -1,
          toIndex: targetSlotIndex,
          detail: `Échec : carte "${cardId}" introuvable dans "${result.fromColumn}".`,
        });
        return;
      }

      if (result.outcome === 'missing-target') {
        logDnD({
          id: `log-${Date.now()}`,
          time: timeStr,
          action: 'abort',
          cardTitle: result.cardTitle,
          cardId,
          fromColumn: result.fromColumn,
          toColumn: targetColumnId,
          fromIndex: result.fromIndex,
          toIndex: targetSlotIndex,
          detail: `Échec : colonne cible "${targetColumnId}" introuvable.`,
        });
        return;
      }

      if (result.outcome === 'noop') {
        logDnD({
          id: `log-${Date.now()}`,
          time: timeStr,
          action: 'no-op',
          cardTitle: result.cardTitle,
          cardId,
          fromColumn: result.fromColumn,
          toColumn: result.toColumn,
          fromIndex: result.fromIndex,
          toIndex: targetSlotIndex,
          detail: `Aucun changement : position identique (index ${result.fromIndex} ➔ slot ${targetSlotIndex}).`,
        });
        return;
      }

      if (result.outcome === 'reordered') {
        logDnD({
          id: `log-${Date.now()}`,
          time: timeStr,
          action: 'reorder',
          cardTitle: result.cardTitle,
          cardId,
          fromColumn: result.fromColumn,
          toColumn: result.toColumn,
          fromIndex: result.fromIndex,
          toIndex: result.toIndex,
          detail: `Réorganisation intra-colonne réussie : [${result.fromIndex}] ➔ [${result.toIndex}] dans "${result.fromColumn}".`,
        });
        toast.success('Tâche réordonnée', result.cardTitle);
        return;
      }

      logDnD({
        id: `log-${Date.now()}`,
        time: timeStr,
        action: 'move',
        cardTitle: result.cardTitle,
        cardId,
        fromColumn: result.fromColumn,
        toColumn: result.toColumn,
        fromIndex: result.fromIndex,
        toIndex: result.toIndex,
        detail: `Déplacement inter-colonnes réussi : "${result.fromColumn}" [${result.fromIndex}] ➔ "${result.toColumn}" slot [${result.toIndex}].`,
      });
      toast.success('Tâche déplacée', `Déplacée vers "${result.toColumn || 'nouvelle colonne'}"`);
    },
    [draggedCard, moveCard, logDnD]
  );

  const handleDropOnCard = (e: ReactDragEvent, columnId: string, cardIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const targetIndex = e.clientY < midpoint ? cardIndex : cardIndex + 1;
    executeCardDrop(columnId, targetIndex);
  };

  const handleDropOnColumn = (e: ReactDragEvent, targetColumnId: string) => {
    e.preventDefault();
    e.stopPropagation();

    let targetIndex: number;
    if (dropTargetRef.current && dropTargetRef.current.columnId === targetColumnId) {
      targetIndex = dropTargetRef.current.index;
    } else {
      const cardElements = e.currentTarget.querySelectorAll<HTMLElement>('[data-knit-card]');
      targetIndex = cardElements.length;
      for (let i = 0; i < cardElements.length; i++) {
        const rect = cardElements[i].getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (e.clientY < midpoint) {
          targetIndex = i;
          break;
        }
      }
    }

    executeCardDrop(targetColumnId, targetIndex);
  };

  return {
    draggedCard,
    dropTarget,
    setDropTarget,
    dragLogs,
    dragLogsRef,
    setDragLogs,
    handleDragStart,
    handleDragOverColumn,
    handleCardDragOver,
    handleDragEnd,
    handleDropOnCard,
    handleDropOnColumn,
  };
}
