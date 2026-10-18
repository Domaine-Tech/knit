import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import type { CalendarDropTarget, CalendarEvent, MonthGridCell } from '../../types';
import { WEEKDAYS_LONG } from '../../utils';

export interface CalendarMonthGridProps {
  monthCells: MonthGridCell[];
  eventsByDate: Map<string, CalendarEvent[]>;
  todayIso: string;
  dropTarget: CalendarDropTarget | null;
  dragEventId: string | null;
  isDebugActive: boolean;
  setDropTarget: (target: CalendarDropTarget | null) => void;
  onDropOnDay: (iso: string, e: React.DragEvent) => void;
  onDayContextMenu: (e: React.MouseEvent, iso: string) => void;
  onSelectDay: (date: Date) => void;
  onQuickAdd: (iso: string) => void;
  onShowDayDetail: (iso: string) => void;
  renderEventChip: (ev: CalendarEvent) => React.ReactNode;
}

export const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = ({
  monthCells,
  eventsByDate,
  todayIso,
  dropTarget,
  dragEventId,
  isDebugActive,
  setDropTarget,
  onDropOnDay,
  onDayContextMenu,
  onSelectDay,
  onQuickAdd,
  onShowDayDetail,
  renderEventChip,
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
      gridTemplateRows: 'auto repeat(6, minmax(0, 1fr))',
      gap: 4,
      flex: 1,
      minHeight: 0,
      height: '100%',
    }}
  >
    {WEEKDAYS_LONG.map((d) => (
      <div
        key={d}
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--knit-text-muted)',
          textAlign: 'center',
          padding: 4,
        }}
      >
        {d}
      </div>
    ))}
    {monthCells.map((cell) => {
      const dayEvents = eventsByDate.get(cell.iso) || [];
      const isToday = cell.iso === todayIso;
      const isOver = dropTarget?.date === cell.iso;
      return (
        <div
          key={cell.iso}
          onDragEnter={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDropTarget({ date: cell.iso });
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (dropTarget?.date !== cell.iso) {
              setDropTarget({ date: cell.iso });
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              if (dropTarget?.date === cell.iso) {
                setDropTarget(null);
              }
            }
          }}
          onDrop={(e) => void onDropOnDay(cell.iso, e)}
          onContextMenu={(e) => onDayContextMenu(e, cell.iso)}
          onClick={() => onSelectDay(cell.d)}
          style={{
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
            padding: 4,
            borderRadius: 'var(--knit-radius-xs)',
            border: isOver
              ? '1px dashed var(--knit-primary)'
              : `1px solid ${isToday ? 'var(--knit-primary)' : 'var(--knit-border)'}`,
            background: isOver
              ? 'var(--knit-surface-hover)'
              : cell.inMonth
                ? 'var(--knit-surface)'
                : 'var(--knit-bg)',
            boxShadow: isOver ? '0 0 12px var(--knit-primary-alpha)' : 'none',
            opacity: cell.inMonth ? 1 : 0.55,
            cursor: 'pointer',
            transition: 'all var(--knit-duration-fast)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 2,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: isToday ? 700 : 500,
                color: isToday ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
              }}
            >
              {cell.d.getDate()}
              {isDebugActive && dayEvents.length > 0 && (
                <span className="knit-debug-view-badge">{dayEvents.length}</span>
              )}
            </span>
            <button
              type="button"
              className="knit-btn"
              onClick={(e) => {
                e.stopPropagation();
                onQuickAdd(cell.iso);
              }}
              style={{
                padding: '1px 3px',
                fontSize: 10,
                background: 'transparent',
                border: 'none',
                color: 'var(--knit-text-muted)',
              }}
              data-tooltip="Ajouter une tâche à ce jour"
            >
              +
            </button>
          </div>

          {dayEvents.length === 0 && isOver && Boolean(dragEventId) && (
            <div
              style={{
                padding: '6px 2px',
                border: '1px dashed var(--knit-primary)',
                borderRadius: 'var(--knit-radius-xs)',
                backgroundColor: 'rgba(234, 179, 8, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                color: 'var(--knit-primary)',
                fontSize: 10,
                fontWeight: 600,
                pointerEvents: 'none',
                margin: '2px 0',
              }}
            >
              <DuotoneIcon name="calendar" size={11} />
              <span>Déposer ici</span>
            </div>
          )}

          {dayEvents.slice(0, 3).map((ev) => renderEventChip(ev))}
          {dayEvents.length > 3 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShowDayDetail(cell.iso);
              }}
              style={{
                fontSize: 10,
                color: 'var(--knit-primary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                padding: '1px 2px',
                fontWeight: 600,
              }}
            >
              +{dayEvents.length - 3} autres…
            </button>
          )}
        </div>
      );
    })}
  </div>
);
