import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import { toast } from '../../stores/toastStore';
import { networkStore } from '../../stores/networkStore';
import type {
  CalendarDebugReport,
  CalendarEvent,
  CalendarFilterMode,
  CalendarOpenFileOpts,
  CalendarPriorityFilter,
  CalendarScopeMode,
  CalendarStatusFilter,
  CalendarViewMode,
  KnitSelectOption,
} from '../../types';
import {
  applyCalendarFilters,
  buildMonthGridCells,
  copyDebugJson,
  dumpDebugConsole,
  filterCalendarEventsByScope,
  getParentFolder,
  isMiddleButton,
  journalPathForDate,
  preventMiddleCompass,
  startOfWeek,
  formatIsoDate,
} from '../../utils';
import {
  useCalendarIndex,
  useCalendarInteractions,
  useCalendarReminders,
  useDebugMode,
  useDelayedHoverPreview,
  useRegisterDebugStats,
} from '../../hooks';
import { CalendarEventChip } from './CalendarEventChip';
import { CalendarToolbar } from './CalendarToolbar';
import { CalendarViewBody } from './CalendarViewBody';
import { QuickAddEventModal } from './QuickAddEventModal';
import { DayDetailPopover } from './DayDetailPopover';
import { CalendarDebugHUD } from './CalendarDebugHUD';

interface CalendarViewProps {
  activeFilePath?: string | null;
  /** Date ISO (YYYY-MM-DD) pour positionner le curseur à l'ouverture (modale globale). */
  initialDate?: string;
  /** `modal` = chrome compact (titre déjà dans GlobalAgendaModal). */
  variant?: 'page' | 'modal';
  /** Mode lecture (Zen / Hover) : aucune mutation vault / DnD / quick-add. */
  readOnly?: boolean;
  /** Hover Preview uniquement : masquer la toolbar. */
  compactChrome?: boolean;
  onOpenFile: (path: string, line?: number, opts?: CalendarOpenFileOpts) => void;
  onSwitchToEditor?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  activeFilePath,
  initialDate,
  variant = 'page',
  readOnly = false,
  compactChrome = false,
  onOpenFile,
  onSwitchToEditor,
}) => {
  const isModal = variant === 'modal';
  const { events, loading, reload } = useCalendarIndex();
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [filterMode, setFilterMode] = useState<CalendarFilterMode>('all');
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<CalendarPriorityFilter>('all');
  const [collaborator, setCollaborator] = useState('');
  const [cursor, setCursor] = useState(() => new Date());
  const hoverPreview = useDelayedHoverPreview(200);

  const folderScope = useMemo(() => {
    if (!activeFilePath || activeFilePath.startsWith('knit://') || activeFilePath === 'agenda.md') {
      return '';
    }
    return getParentFolder(activeFilePath);
  }, [activeFilePath]);

  const [scopeMode, setScopeMode] = useState<CalendarScopeMode>(() =>
    folderScope ? 'scoped' : 'vault'
  );

  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [detailDate, setDetailDate] = useState<string | null>(null);

  const openQuickAdd = useCallback(
    (iso: string) => {
      if (readOnly) return;
      setQuickAddDate(iso);
    },
    [readOnly]
  );

  const [todayIso] = useState(() => formatIsoDate(new Date()));

  useEffect(() => {
    if (!initialDate || !/^\d{4}-\d{2}-\d{2}$/.test(initialDate)) return;
    const [y, m, d] = initialDate.split('-').map(Number);
    setCursor(new Date(y, m - 1, d));
    setViewMode('day');
  }, [initialDate]);

  const selfName =
    networkStore.localIdentity?.display_name ||
    networkStore.currentProfile?.display_name ||
    '';

  const interactions = useCalendarInteractions({
    events,
    readOnly,
    reload,
    onOpenFile,
    openQuickAdd,
    setCursor,
    setViewMode,
    cancelHoverPreview: hoverPreview.cancel,
  });

  const openEventFile = useCallback(
    (ev: CalendarEvent, opts?: CalendarOpenFileOpts) => {
      hoverPreview.cancel();
      onOpenFile(ev.relPath, ev.line || undefined, opts);
    },
    [hoverPreview, onOpenFile]
  );

  const pointerHandlers = useCallback(
    (ev: CalendarEvent) => ({
      onMouseEnter: (e: React.MouseEvent) => {
        if (readOnly || interactions.dragEventId) return;
        hoverPreview.schedule(ev.relPath, e.clientX, e.clientY);
      },
      onMouseMove: (e: React.MouseEvent) => {
        if (readOnly || interactions.dragEventId) return;
        hoverPreview.schedule(ev.relPath, e.clientX, e.clientY);
      },
      onMouseLeave: () => {
        if (readOnly) return;
        hoverPreview.cancel();
      },
      onMouseDown: preventMiddleCompass,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        openEventFile(ev, { newTab: e.ctrlKey || e.metaKey });
      },
      onAuxClick: (e: React.MouseEvent) => {
        if (!isMiddleButton(e)) return;
        e.preventDefault();
        e.stopPropagation();
        openEventFile(ev, { newTab: true });
      },
    }),
    [hoverPreview, interactions.dragEventId, openEventFile, readOnly]
  );

  useCalendarReminders(events);

  const filtered = useMemo(() => {
    const scoped = filterCalendarEventsByScope(events, activeFilePath, scopeMode);
    return applyCalendarFilters(scoped, {
      filterMode,
      selfName,
      collaborator,
      statusFilter,
      priorityFilter,
    });
  }, [
    events,
    activeFilePath,
    scopeMode,
    filterMode,
    selfName,
    collaborator,
    statusFilter,
    priorityFilter,
  ]);

  const { isDebugActive, toggleDebug } = useDebugMode();

  const calendarDebugReport = useMemo((): CalendarDebugReport => {
    return {
      path: activeFilePath ?? null,
      variant,
      viewMode,
      scopeMode,
      folderScope,
      cursorIso: formatIsoDate(cursor),
      eventsTotal: events.length,
      eventsFiltered: filtered.length,
      filterMode,
      statusFilter,
      priorityFilter,
      collaborator,
      loading,
    };
  }, [
    activeFilePath,
    variant,
    viewMode,
    scopeMode,
    folderScope,
    cursor,
    events.length,
    filtered.length,
    filterMode,
    statusFilter,
    priorityFilter,
    collaborator,
    loading,
  ]);

  useRegisterDebugStats('calendar', calendarDebugReport);

  const collaborators = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      if (e.assignee && e.assignee.toLowerCase() !== 'vault') set.add(e.assignee);
    }
    return Array.from(set).sort();
  }, [events]);

  const collaboratorOptions: KnitSelectOption[] = useMemo(
    () => [
      { value: '', label: 'Tous les collaborateurs' },
      ...collaborators.map((c) => ({ value: c, label: `@${c}` })),
    ],
    [collaborators]
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const monthCells = useMemo(
    () => buildMonthGridCells(year, month),
    [year, month]
  );

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { date: d, iso: formatIsoDate(d) };
    });
  }, [cursor]);

  const dayIso = formatIsoDate(cursor);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of filtered) {
      const list = map.get(e.date) || [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [filtered]);

  const renderEventChip = useCallback(
    (ev: CalendarEvent, index?: number, date?: string) => (
      <CalendarEventChip
        key={ev.id}
        ev={ev}
        todayIso={todayIso}
        readOnly={readOnly}
        isDragged={interactions.dragEventId === ev.id}
        date={date}
        index={index}
        onToggleComplete={interactions.handleToggleComplete}
        onDragStart={interactions.onChipDragStart}
        onDragEnd={interactions.onChipDragEnd}
        onDragOver={interactions.handleChipDragOver}
        onContextMenu={interactions.handleEventContextMenu}
        pointerHandlers={pointerHandlers}
      />
    ),
    [interactions, pointerHandlers, readOnly, todayIso]
  );

  const navLabel =
    viewMode === 'month'
      ? cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : viewMode === 'week'
        ? `Semaine du ${weekDays[0]?.iso}`
        : cursor.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });

  const shiftCursor = (delta: number) => {
    const next = new Date(cursor);
    if (viewMode === 'month') next.setMonth(next.getMonth() + delta);
    else if (viewMode === 'week') next.setDate(next.getDate() + delta * 7);
    else next.setDate(next.getDate() + delta);
    setCursor(next);
  };

  return (
    <div
      className={readOnly ? 'knit-view-readonly' : undefined}
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: 0,
        minWidth: 0,
        background: 'var(--knit-bg)',
        color: 'var(--knit-text)',
        overflow: 'hidden',
      }}
    >
      <CalendarToolbar
        isModal={isModal}
        compactChrome={compactChrome}
        folderScope={folderScope}
        scopeMode={scopeMode}
        setScopeMode={setScopeMode}
        viewMode={viewMode}
        setViewMode={setViewMode}
        filterMode={filterMode}
        setFilterMode={setFilterMode}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        collaborator={collaborator}
        setCollaborator={setCollaborator}
        collaboratorOptions={collaboratorOptions}
        navLabel={navLabel}
        loading={loading}
        filteredCount={filtered.length}
        todayIso={todayIso}
        onShiftCursor={shiftCursor}
        onGoToday={() => setCursor(new Date())}
        onQuickAdd={openQuickAdd}
        onSwitchToEditor={onSwitchToEditor}
      />

      <CalendarViewBody
        viewMode={viewMode}
        filtered={filtered}
        todayIso={todayIso}
        onOpenFile={onOpenFile}
        handleToggleComplete={interactions.handleToggleComplete}
        handleEventContextMenu={interactions.handleEventContextMenu}
        handleDayContextMenu={interactions.handleDayContextMenu}
        handleDropOnDay={interactions.handleDropOnDay}
        pointerHandlers={pointerHandlers}
        monthCells={monthCells}
        weekDays={weekDays}
        eventsByDate={eventsByDate}
        dropTarget={interactions.dropTarget}
        dragEventId={interactions.dragEventId}
        isDebugActive={isDebugActive}
        setDropTarget={interactions.setDropTarget}
        onSelectDay={(date) => {
          setCursor(date);
          setViewMode('day');
        }}
        onQuickAdd={openQuickAdd}
        onShowDayDetail={setDetailDate}
        renderEventChip={renderEventChip}
        cursor={cursor}
        dayIso={dayIso}
        openEventFile={openEventFile}
      />

      {quickAddDate && (
        <QuickAddEventModal
          initialDate={quickAddDate}
          defaultRelPath={activeFilePath || journalPathForDate(quickAddDate)}
          collaborators={collaborators}
          onClose={() => setQuickAddDate(null)}
          onCreated={async (newEvent) => {
            await vaultStore.addCalendarEvent(newEvent.targetPath, newEvent);
            toast.success('Événement créé', `Ajouté dans ${newEvent.targetPath}`);
            await reload();
          }}
        />
      )}

      {detailDate && (
        <DayDetailPopover
          date={detailDate}
          events={eventsByDate.get(detailDate) || []}
          onClose={() => setDetailDate(null)}
          onOpenFile={onOpenFile}
          onToggleComplete={(ev) => void interactions.handleToggleComplete(ev)}
          onAddEvent={(d) => openQuickAdd(d)}
        />
      )}

      {isDebugActive && (
        <CalendarDebugHUD
          report={calendarDebugReport}
          onCopyJson={() => {
            void copyDebugJson(
              calendarDebugReport,
              'Rapport Agenda copié',
              `${calendarDebugReport.eventsFiltered} événement(s) filtrés.`
            );
          }}
          onDumpConsole={() => {
            dumpDebugConsole('CALENDAR', calendarDebugReport, filtered);
          }}
          onClose={toggleDebug}
        />
      )}
    </div>
  );
};
