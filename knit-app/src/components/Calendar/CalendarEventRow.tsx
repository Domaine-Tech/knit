import React from 'react';
import type { CalendarEvent, CalendarOpenFileOpts } from '../../types';
import {
  formatEventTime,
  priorityAccentColor,
  priorityBadgeBackground,
} from '../../utils/calendarUtils';
import { isMiddleButton, preventMiddleCompass } from '../../utils';

export interface CalendarEventRowProps {
  ev: CalendarEvent;
  todayIso: string;
  onOpenFile: (path: string, line?: number, opts?: CalendarOpenFileOpts) => void;
  onToggleComplete: (ev: CalendarEvent) => void;
  onMouseEnter?: (e: React.MouseEvent, ev: CalendarEvent) => void;
  onMouseLeave?: () => void;
  onContextMenu?: (e: React.MouseEvent, ev: CalendarEvent) => void;
}

/** Ligne événement partagée (vue liste / jour). */
export const CalendarEventRow: React.FC<CalendarEventRowProps> = ({
  ev,
  todayIso,
  onOpenFile,
  onToggleComplete,
  onMouseEnter,
  onMouseLeave,
  onContextMenu,
}) => {
  const isTask = ev.kind === 'task';
  const isOverdue = !ev.completed && ev.date < todayIso;

  return (
    <div
      onMouseEnter={(e) => onMouseEnter?.(e, ev)}
      onMouseLeave={onMouseLeave}
      onMouseDown={(e) => {
        if (isMiddleButton(e)) preventMiddleCompass(e);
      }}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          onOpenFile(ev.relPath, ev.line, { newTab: true });
        } else {
          onOpenFile(ev.relPath, ev.line);
        }
      }}
      onAuxClick={(e) => {
        if (isMiddleButton(e)) {
          e.preventDefault();
          onOpenFile(ev.relPath, ev.line, { newTab: true });
        }
      }}
      onContextMenu={(e) => onContextMenu?.(e, ev)}
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        padding: '8px 10px',
        borderRadius: 'var(--knit-radius-sm)',
        border: isOverdue
          ? '1px dashed rgba(239, 68, 68, 0.5)'
          : '1px solid var(--knit-border)',
        background: 'var(--knit-surface)',
        cursor: 'pointer',
        opacity: ev.completed ? 0.6 : 1,
      }}
    >
      {isTask ? (
        <input
          type="checkbox"
          className="knit-checkbox"
          checked={Boolean(ev.completed)}
          onClick={(e) => e.stopPropagation()}
          onChange={() => void onToggleComplete(ev)}
          style={{ cursor: 'pointer', flexShrink: 0 }}
        />
      ) : (
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: priorityAccentColor(ev.priority),
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            textDecoration: ev.completed ? 'line-through' : 'none',
            color: ev.completed ? 'var(--knit-text-muted)' : 'var(--knit-text)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {ev.title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--knit-text-muted)',
            display: 'flex',
            gap: 8,
            marginTop: 2,
          }}
        >
          <span>{ev.date}</span>
          {formatEventTime(ev) && <span>{formatEventTime(ev)}</span>}
          {ev.assignee && <span>@{ev.assignee}</span>}
        </div>
      </div>
      {ev.priority && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 6px',
            borderRadius: 999,
            backgroundColor: priorityBadgeBackground(ev.priority),
            color: priorityAccentColor(ev.priority),
          }}
        >
          !{ev.priority}
        </span>
      )}
    </div>
  );
};
