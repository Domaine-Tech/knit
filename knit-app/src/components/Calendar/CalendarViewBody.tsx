import React from 'react';
import type {
  CalendarDropTarget,
  CalendarEvent,
  CalendarOpenFileOpts,
  CalendarViewMode,
  CalendarWeekDay,
  MonthGridCell,
} from '../../types';
import { CalendarAgendaList } from './CalendarAgendaList';
import { CalendarMonthGrid } from './CalendarMonthGrid';
import { CalendarWeekView } from './CalendarWeekView';
import { CalendarDayView } from './CalendarDayView';

export interface CalendarViewBodyProps {
  viewMode: CalendarViewMode;
  filtered: CalendarEvent[];
  todayIso: string;
  onOpenFile: (path: string, line?: number, opts?: CalendarOpenFileOpts) => void;
  handleToggleComplete: (ev: CalendarEvent) => void;
  handleEventContextMenu: (e: React.MouseEvent, ev: CalendarEvent) => void;
  handleDayContextMenu: (e: React.MouseEvent, iso: string) => void;
  handleDropOnDay: (iso: string, e: React.DragEvent) => void;
  pointerHandlers: (ev: CalendarEvent) => {
    onMouseEnter: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onClick: (e: React.MouseEvent) => void;
    onAuxClick: (e: React.MouseEvent) => void;
  };
  monthCells: MonthGridCell[];
  weekDays: CalendarWeekDay[];
  eventsByDate: Map<string, CalendarEvent[]>;
  dropTarget: CalendarDropTarget | null;
  dragEventId: string | null;
  isDebugActive: boolean;
  setDropTarget: (target: CalendarDropTarget | null) => void;
  onSelectDay: (date: Date) => void;
  onQuickAdd: (iso: string) => void;
  onShowDayDetail: (iso: string) => void;
  renderEventChip: (ev: CalendarEvent, index?: number, date?: string) => React.ReactNode;
  cursor: Date;
  dayIso: string;
  openEventFile: (ev: CalendarEvent, opts?: CalendarOpenFileOpts) => void;
}

export const CalendarViewBody: React.FC<CalendarViewBodyProps> = ({
  viewMode,
  filtered,
  todayIso,
  onOpenFile,
  handleToggleComplete,
  handleEventContextMenu,
  handleDayContextMenu,
  handleDropOnDay,
  pointerHandlers,
  monthCells,
  weekDays,
  eventsByDate,
  dropTarget,
  dragEventId,
  isDebugActive,
  setDropTarget,
  onSelectDay,
  onQuickAdd,
  onShowDayDetail,
  renderEventChip,
  cursor,
  dayIso,
  openEventFile,
}) => {
  const fillGrid = viewMode === 'month' || viewMode === 'week';

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        overflow: fillGrid ? 'hidden' : 'auto',
        padding: fillGrid ? 8 : 12,
        display: fillGrid ? 'flex' : 'block',
        flexDirection: 'column',
      }}
    >
      {viewMode === 'list' && (
        <CalendarAgendaList
          filtered={filtered}
          todayIso={todayIso}
          onOpenFile={onOpenFile}
          onToggleComplete={handleToggleComplete}
          onEventContextMenu={handleEventContextMenu}
          eventPointerHandlers={pointerHandlers}
        />
      )}

      {viewMode === 'month' && (
        <CalendarMonthGrid
          monthCells={monthCells}
          eventsByDate={eventsByDate}
          todayIso={todayIso}
          dropTarget={dropTarget}
          dragEventId={dragEventId}
          isDebugActive={isDebugActive}
          setDropTarget={setDropTarget}
          onDropOnDay={handleDropOnDay}
          onDayContextMenu={handleDayContextMenu}
          onSelectDay={onSelectDay}
          onQuickAdd={onQuickAdd}
          onShowDayDetail={onShowDayDetail}
          renderEventChip={(ev) => renderEventChip(ev)}
        />
      )}

      {viewMode === 'week' && (
        <CalendarWeekView
          weekDays={weekDays}
          eventsByDate={eventsByDate}
          todayIso={todayIso}
          dropTarget={dropTarget}
          setDropTarget={setDropTarget}
          onDropOnDay={handleDropOnDay}
          onDayContextMenu={handleDayContextMenu}
          onQuickAdd={onQuickAdd}
          renderEventChip={renderEventChip}
        />
      )}

      {viewMode === 'day' && (
        <CalendarDayView
          cursor={cursor}
          dayIso={dayIso}
          dayEvents={eventsByDate.get(dayIso) || []}
          dropTarget={dropTarget}
          setDropTarget={setDropTarget}
          onDropOnDay={handleDropOnDay}
          onDayContextMenu={handleDayContextMenu}
          onQuickAdd={onQuickAdd}
          onToggleComplete={handleToggleComplete}
          onEventContextMenu={handleEventContextMenu}
          openEventFile={openEventFile}
          eventPointerHandlers={pointerHandlers}
        />
      )}
    </div>
  );
};
