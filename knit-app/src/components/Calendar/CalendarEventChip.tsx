import React from 'react';
import type { CalendarEvent } from '../../types';
import { formatEventTime, priorityAccentColor } from '../../utils/calendarUtils';

export interface CalendarEventChipProps {
  ev: CalendarEvent;
  todayIso: string;
  readOnly?: boolean;
  isDragged?: boolean;
  date?: string;
  index?: number;
  onToggleComplete: (ev: CalendarEvent) => void;
  onDragStart: (ev: CalendarEvent, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver?: (e: React.DragEvent, date: string, index: number) => void;
  onContextMenu: (e: React.MouseEvent, ev: CalendarEvent) => void;
  pointerHandlers: (ev: CalendarEvent) => {
    onMouseEnter: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
    onMouseDown: (e: React.MouseEvent) => void;
    onClick: (e: React.MouseEvent) => void;
    onAuxClick: (e: React.MouseEvent) => void;
  };
}

/** Pastille événement pour grilles mois / semaine. */
export const CalendarEventChip: React.FC<CalendarEventChipProps> = ({
  ev,
  todayIso,
  readOnly = false,
  isDragged = false,
  date,
  index,
  onToggleComplete,
  onDragStart,
  onDragEnd,
  onDragOver,
  onContextMenu,
  pointerHandlers,
}) => {
  const isTask = ev.kind === 'task';
  const isOverdue = !ev.completed && ev.date < todayIso;

  let prioBg = 'color-mix(in srgb, var(--knit-primary) 16%, transparent)';
  let prioBorder = '1px solid color-mix(in srgb, var(--knit-primary) 35%, transparent)';
  const prioColor = 'var(--knit-text)';

  if (ev.priority === 'p1') {
    prioBg = 'rgba(239, 68, 68, 0.12)';
    prioBorder = '1px solid rgba(239, 68, 68, 0.4)';
  } else if (ev.priority === 'p3') {
    prioBg = 'rgba(59, 130, 246, 0.12)';
    prioBorder = '1px solid rgba(59, 130, 246, 0.35)';
  }

  if (isOverdue) {
    prioBorder = '1px dashed rgba(239, 68, 68, 0.7)';
  }

  return (
    <div
      draggable={!readOnly}
      onDragStart={(e) => onDragStart(ev, e)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        if (readOnly) return;
        if (date !== undefined && index !== undefined) {
          onDragOver?.(e, date, index);
        }
      }}
      {...pointerHandlers(ev)}
      onContextMenu={(e) => onContextMenu(e, ev)}
      style={{
        fontSize: 11,
        padding: '2px 6px',
        borderRadius: 'var(--knit-radius-xs)',
        background: prioBg,
        border: prioBorder,
        color: prioColor,
        cursor: isDragged ? 'grabbing' : 'grab',
        opacity: isDragged ? 0.35 : ev.completed ? 0.55 : 1,
        boxShadow: isDragged ? '0 0 8px var(--knit-primary-alpha)' : 'none',
        transition: 'all var(--knit-duration-fast)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        marginBottom: 2,
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        textDecoration: ev.completed ? 'line-through' : 'none',
      }}
    >
      {isTask ? (
        <input
          type="checkbox"
          className="knit-checkbox"
          checked={Boolean(ev.completed)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => void onToggleComplete(ev)}
          style={{
            width: 11,
            height: 11,
            margin: 0,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />
      ) : (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: priorityAccentColor(ev.priority),
            flexShrink: 0,
          }}
        />
      )}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
        {formatEventTime(ev) ? `${formatEventTime(ev)} ` : ''}
        {ev.title}
      </span>
    </div>
  );
};
