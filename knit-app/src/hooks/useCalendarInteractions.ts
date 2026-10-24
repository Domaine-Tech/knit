import React, { useCallback, useEffect, useRef, useState } from 'react';
import { vaultStore } from '../stores/vaultStore';
import { toast } from '../stores/toastStore';
import { contextMenu } from '../stores/contextMenuStore';
import type {
  CalendarDropTarget,
  CalendarEvent,
  CalendarEventPriority,
  UseCalendarInteractionsParams,
  UseCalendarInteractionsResult,
} from '../types';
import {
  buildPathCopyMenuItem,
  copyTextWithToast,
  fileNameFromPath,
  journalPathForDate,
  formatIsoDate,
} from '../utils';

/**
 * DnD, menus contextuels et mutations Agenda (toggle / priorité / date).
 */
export function useCalendarInteractions(
  params: UseCalendarInteractionsParams
): UseCalendarInteractionsResult {
  const {
    events,
    readOnly,
    reload,
    onOpenFile,
    openQuickAdd,
    setCursor,
    setViewMode,
    cancelHoverPreview,
  } = params;

  const [dragEventId, setDragEventId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<CalendarDropTarget | null>(null);
  const dropTargetRef = useRef<CalendarDropTarget | null>(null);

  useEffect(() => {
    const handleGlobalDragOver = (e: globalThis.DragEvent) => {
      if (
        dragEventId ||
        e.dataTransfer?.types.includes('application/knit-card') ||
        e.dataTransfer?.types.includes('application/knit-calendar-event')
      ) {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
        }
      }
    };

    const handleGlobalDragEnd = () => {
      setDragEventId(null);
      setDropTarget(null);
      dropTargetRef.current = null;
    };

    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('dragenter', handleGlobalDragOver);
    window.addEventListener('dragend', handleGlobalDragEnd);
    return () => {
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('dragenter', handleGlobalDragOver);
      window.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, [dragEventId]);

  const moveEventToDate = useCallback(
    async (ev: CalendarEvent, newDate: string) => {
      if (readOnly || ev.date === newDate) return;
      try {
        await vaultStore.updateCalendarEventDate(
          ev.relPath,
          ev.sourceSpan,
          newDate,
          ev.startTime,
          ev.endTime
        );
        toast.success('Date mise à jour', `${ev.title} → ${newDate}`);
        await reload();
      } catch (err) {
        toast.error('Agenda', String(err));
      }
    },
    [readOnly, reload]
  );

  const handleToggleComplete = useCallback(
    async (ev: CalendarEvent) => {
      if (readOnly) return;
      try {
        await vaultStore.toggleCalendarTask(ev.relPath, ev.line, ev.completed);
        toast.success(
          'Statut mis à jour',
          ev.completed ? 'Tâche réactivée' : 'Tâche terminée'
        );
        await reload();
      } catch (err) {
        toast.error('Agenda', String(err));
      }
    },
    [readOnly, reload]
  );

  const handleUpdatePriority = useCallback(
    async (ev: CalendarEvent, newPriority: CalendarEventPriority | null) => {
      if (readOnly) return;
      try {
        await vaultStore.updateCalendarEventPriority(ev.relPath, ev.line, newPriority);
        toast.success(
          'Priorité mise à jour',
          newPriority ? `Priorité !${newPriority}` : 'Priorité retirée'
        );
        await reload();
      } catch (err) {
        toast.error('Agenda', String(err));
      }
    },
    [readOnly, reload]
  );

  const handleDropOnDay = useCallback(
    async (iso: string, e?: React.DragEvent) => {
      e?.preventDefault();
      e?.stopPropagation();
      const currentEventId = dragEventId;
      setDragEventId(null);
      setDropTarget(null);
      dropTargetRef.current = null;
      if (readOnly) return;

      if (currentEventId) {
        const ev = events.find((item) => item.id === currentEventId);
        if (ev) {
          void moveEventToDate(ev, iso);
          return;
        }
      }

      if (e) {
        const cardData = e.dataTransfer.getData('application/knit-card');
        if (cardData) {
          try {
            const parsed: unknown = JSON.parse(cardData);
            const cardTitle =
              typeof parsed === 'object' &&
              parsed !== null &&
              'cardTitle' in parsed &&
              typeof (parsed as { cardTitle: unknown }).cardTitle === 'string'
                ? (parsed as { cardTitle: string }).cardTitle
                : undefined;
            const cardLabel = cardTitle ? ` "${cardTitle}"` : '';
            toast.info('Tâche Kanban glissée', `Tâche${cardLabel} déposée sur la date ${iso}`);
          } catch {
            /* ignore JSON invalide */
          }
        }
      }
    },
    [dragEventId, events, moveEventToDate, readOnly]
  );

  const handleChipDragOver = useCallback((e: React.DragEvent, date: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const targetIndex = e.clientY < midpoint ? index : index + 1;
    dropTargetRef.current = { date, index: targetIndex };
    setDropTarget({ date, index: targetIndex });
  }, []);

  const handleDayContextMenu = useCallback(
    (e: React.MouseEvent, iso: string) => {
      e.preventDefault();
      e.stopPropagation();

      const items = [
        ...(readOnly
          ? []
          : [
              {
                id: 'add-event-day',
                label: 'Ajouter une tâche / événement à cette date...',
                icon: 'plus' as const,
                onClick: () => openQuickAdd(iso),
              },
            ]),
        {
          id: 'open-journal-day',
          label: `Ouvrir la note de journal (${journalPathForDate(iso)})`,
          icon: 'file-markdown' as const,
          onClick: () => onOpenFile(journalPathForDate(iso)),
        },
        {
          id: 'switch-view-day',
          label: 'Voir la journée en grand format (Vue Jour)',
          icon: 'calendar' as const,
          onClick: () => {
            setCursor(new Date(`${iso}T00:00:00`));
            setViewMode('day');
          },
        },
        { id: 'div-day-1', divider: true as const },
        {
          id: 'copy-iso-date',
          label: `Copier la date (${iso})`,
          icon: 'copy' as const,
          onClick: () => copyTextWithToast(iso, 'Date copiée'),
        },
      ];
      contextMenu.show(e, items);
    },
    [onOpenFile, openQuickAdd, readOnly, setCursor, setViewMode]
  );

  const handleEventContextMenu = useCallback(
    (e: React.MouseEvent, ev: CalendarEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const abs = vaultStore.getAbsolutePath(ev.relPath);

      const now = new Date();
      const today = formatIsoDate(now);
      const tomorrowDate = new Date(now);
      tomorrowDate.setDate(now.getDate() + 1);
      const tomorrow = formatIsoDate(tomorrowDate);

      const nextWeekDate = new Date(now);
      nextWeekDate.setDate(now.getDate() + 7);
      const nextWeek = formatIsoDate(nextWeekDate);

      contextMenu.show(e, [
        {
          id: 'open-event-note',
          label: 'Ouvrir la note source',
          icon: 'file-markdown',
          onClick: () => onOpenFile(ev.relPath, ev.line || undefined),
        },
        ...(readOnly
          ? []
          : [
              ...(ev.kind === 'task'
                ? [
                    {
                      id: 'toggle-complete-event',
                      label: ev.completed
                        ? 'Marquer comme non terminée'
                        : 'Marquer comme terminée',
                      icon: 'check' as const,
                      onClick: () => void handleToggleComplete(ev),
                    },
                  ]
                : []),
              { id: 'div-ev-1', divider: true as const },
              {
                id: 'prio-p1',
                label: 'Priorité Haute (!p1)',
                icon: 'star' as const,
                onClick: () => void handleUpdatePriority(ev, 'p1'),
              },
              {
                id: 'prio-p2',
                label: 'Priorité Moyenne (!p2)',
                icon: 'star' as const,
                onClick: () => void handleUpdatePriority(ev, 'p2'),
              },
              {
                id: 'prio-p3',
                label: 'Priorité Normale (!p3)',
                icon: 'star' as const,
                onClick: () => void handleUpdatePriority(ev, 'p3'),
              },
              {
                id: 'prio-none',
                label: 'Retirer la priorité',
                icon: 'close' as const,
                onClick: () => void handleUpdatePriority(ev, null),
              },
              { id: 'div-ev-2', divider: true as const },
              {
                id: 'reschedule-today',
                label: "Reporter à Aujourd'hui",
                icon: 'calendar' as const,
                onClick: () => void moveEventToDate(ev, today),
              },
              {
                id: 'reschedule-tomorrow',
                label: 'Reporter à Demain',
                icon: 'calendar' as const,
                onClick: () => void moveEventToDate(ev, tomorrow),
              },
              {
                id: 'reschedule-next-week',
                label: 'Reporter à la Semaine prochaine',
                icon: 'calendar' as const,
                onClick: () => void moveEventToDate(ev, nextWeek),
              },
              { id: 'div-ev-3', divider: true as const },
            ]),
        buildPathCopyMenuItem({
          relPath: ev.relPath,
          absPath: abs,
          name: fileNameFromPath(ev.relPath),
        }),
      ]);
    },
    [
      handleToggleComplete,
      handleUpdatePriority,
      moveEventToDate,
      onOpenFile,
      readOnly,
    ]
  );

  const onChipDragStart = useCallback(
    (event: CalendarEvent, e: React.DragEvent) => {
      if (readOnly) {
        e.preventDefault();
        return;
      }
      cancelHoverPreview(true);
      setDragEventId(event.id);
      e.dataTransfer.setData('text/plain', event.id);
      e.dataTransfer.setData(
        'application/knit-calendar-event',
        JSON.stringify({ id: event.id, title: event.title, date: event.date })
      );
      e.dataTransfer.effectAllowed = 'move';
    },
    [cancelHoverPreview, readOnly]
  );

  const onChipDragEnd = useCallback(() => {
    setDragEventId(null);
    setDropTarget(null);
    dropTargetRef.current = null;
  }, []);

  return {
    dragEventId,
    setDragEventId,
    dropTarget,
    setDropTarget,
    dropTargetRef,
    moveEventToDate,
    handleToggleComplete,
    handleUpdatePriority,
    handleDropOnDay,
    handleChipDragOver,
    handleDayContextMenu,
    handleEventContextMenu,
    onChipDragStart,
    onChipDragEnd,
  };
}
