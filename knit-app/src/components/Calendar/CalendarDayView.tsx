import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import type { CalendarEvent, CalendarOpenFileOpts } from '../../types';
import { formatEventTime, priorityAccentColor, priorityBadgeBackground } from '../../utils';
import type { CalendarDropTarget } from '../../types';
import { CalendarDropIndicator } from './CalendarDropIndicator';

export interface CalendarDayViewProps {
  cursor: Date;
  dayIso: string;
  dayEvents: CalendarEvent[];
  dropTarget: CalendarDropTarget | null;
  setDropTarget: (target: CalendarDropTarget | null) => void;
  onDropOnDay: (iso: string, e: React.DragEvent) => void;
  onDayContextMenu: (e: React.MouseEvent, iso: string) => void;
  onQuickAdd: (iso: string) => void;
  onToggleComplete: (ev: CalendarEvent) => void;
  onEventContextMenu: (e: React.MouseEvent, ev: CalendarEvent) => void;
  openEventFile: (ev: CalendarEvent, opts?: CalendarOpenFileOpts) => void;
  eventPointerHandlers: (ev: CalendarEvent) => React.HTMLAttributes<HTMLDivElement>;
}

export const CalendarDayView: React.FC<CalendarDayViewProps> = ({
  cursor,
  dayIso,
  dayEvents,
  dropTarget,
  setDropTarget,
  onDropOnDay,
  onDayContextMenu,
  onQuickAdd,
  onToggleComplete,
  onEventContextMenu,
  openEventFile,
  eventPointerHandlers,
}) => {
  const isDayOver = dropTarget?.date === dayIso;

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDropTarget({ date: dayIso });
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!dropTarget || dropTarget.date !== dayIso) {
          setDropTarget({ date: dayIso, index: dayEvents.length });
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          if (dropTarget?.date === dayIso) {
            setDropTarget(null);
          }
        }
      }}
      onDrop={(e) => void onDropOnDay(dayIso, e)}
      onContextMenu={(e) => onDayContextMenu(e, dayIso)}
      style={{
        border: isDayOver ? '1px dashed var(--knit-primary)' : '1px solid var(--knit-border)',
        borderRadius: 'var(--knit-radius-md)',
        background: isDayOver ? 'var(--knit-surface-hover)' : 'var(--knit-surface)',
        boxShadow: isDayOver ? '0 0 12px var(--knit-primary-alpha)' : 'none',
        padding: 16,
        minHeight: 0,
        transition: 'all var(--knit-duration-fast)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <h3 style={{ margin: 0, fontSize: 16 }}>
          {cursor.toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </h3>
        <button
          type="button"
          className="knit-btn knit-btn-primary"
          onClick={() => onQuickAdd(dayIso)}
          style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <DuotoneIcon name="plus" size={13} />
          <span>Ajouter à ce jour</span>
        </button>
      </div>

      {dayEvents.length === 0 && (
        <div
          style={{
            padding: 24,
            border: '1px dashed var(--knit-border)',
            borderRadius: 'var(--knit-radius-sm)',
            color: 'var(--knit-text-muted)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            textAlign: 'center',
            fontSize: 13,
          }}
        >
          <DuotoneIcon name="calendar" size={20} />
          <span>Aucun événement ce jour. Glissez une tâche ici ou cliquez sur &quot;Ajouter&quot;.</span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {dayEvents.map((ev, idx) => (
          <React.Fragment key={ev.id}>
            {isDayOver && dropTarget?.index === idx && <CalendarDropIndicator />}
            <div
              style={{
                padding: 10,
                borderRadius: 'var(--knit-radius-sm)',
                border: '1px solid var(--knit-border)',
                backgroundColor: 'var(--knit-bg)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                cursor: 'pointer',
              }}
              {...eventPointerHandlers(ev)}
              onContextMenu={(e) => onEventContextMenu(e, ev)}
            >
              {ev.kind === 'task' ? (
                <input
                  type="checkbox"
                  checked={Boolean(ev.completed)}
                  onChange={() => void onToggleComplete(ev)}
                  style={{ cursor: 'pointer', accentColor: 'var(--knit-primary)' }}
                />
              ) : (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: 'var(--knit-primary)',
                  }}
                />
              )}
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: ev.completed ? 'line-through' : 'none',
                  }}
                >
                  {ev.title}
                </span>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--knit-text-muted)',
                    display: 'flex',
                    gap: 8,
                    marginTop: 2,
                  }}
                >
                  {formatEventTime(ev) && <span>{formatEventTime(ev)}</span>}
                  <span>{ev.relPath}</span>
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

              <button
                type="button"
                className="knit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  openEventFile(ev, { newTab: e.ctrlKey || e.metaKey });
                }}
                style={{ fontSize: 11, padding: '2px 8px' }}
              >
                Ouvrir la note
              </button>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
