import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import type { CalendarEvent, CalendarOpenFileOpts } from '../../types';
import {
  formatEventTime,
  priorityAccentColor,
  priorityBadgeBackground,
} from '../../utils/calendarUtils';
import { isMiddleButton, preventMiddleCompass } from '../../utils';
import { useDelayedHoverPreview } from '../../hooks';

interface DayDetailPopoverProps {
  date: string;
  events: CalendarEvent[];
  onClose: () => void;
  onOpenFile: (path: string, line?: number, opts?: CalendarOpenFileOpts) => void;
  onToggleComplete: (ev: CalendarEvent) => void;
  onAddEvent: (date: string) => void;
}

export const DayDetailPopover: React.FC<DayDetailPopoverProps> = ({
  date,
  events,
  onClose,
  onOpenFile,
  onToggleComplete,
  onAddEvent,
}) => {
  const hoverPreview = useDelayedHoverPreview(200);

  const openEvent = (ev: CalendarEvent, opts?: CalendarOpenFileOpts) => {
    hoverPreview.cancel();
    onClose();
    onOpenFile(ev.relPath, ev.line || undefined, opts);
  };

  const formattedDate = new Date(`${date}T00:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(2px)',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 480,
          maxWidth: '92vw',
          maxHeight: '80vh',
          backgroundColor: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-md)',
          boxShadow: 'var(--knit-shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--knit-text)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <DuotoneIcon name="calendar" size={16} />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>
              {formattedDate}
            </h4>
            <span style={{ fontSize: 11, color: 'var(--knit-text-muted)' }}>
              {events.length} événement(s) planifié(s)
            </span>
          </div>
          <button
            type="button"
            className="knit-btn"
            onClick={() => {
              onClose();
              onAddEvent(date);
            }}
            style={{ fontSize: 11, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <DuotoneIcon name="plus" size={12} />
            <span>Ajouter</span>
          </button>
          <button
            type="button"
            className="knit-btn"
            onClick={onClose}
            style={{ padding: 4, background: 'transparent', border: 'none' }}
          >
            <DuotoneIcon name="close" size={14} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {events.length === 0 ? (
            <p style={{ color: 'var(--knit-text-muted)', fontSize: 13, textAlign: 'center', margin: '20px 0' }}>
              Aucun événement ce jour.
            </p>
          ) : (
            events.map((ev) => {
              const timeStr = formatEventTime(ev);
              const isTask = ev.kind === 'task';
              return (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 'var(--knit-radius-sm)',
                    backgroundColor: 'var(--knit-bg)',
                    border: '1px solid var(--knit-border)',
                    cursor: 'pointer',
                    opacity: ev.completed ? 0.6 : 1,
                    transition: 'all var(--knit-duration-fast)',
                  }}
                  onMouseEnter={(e) =>
                    hoverPreview.schedule(ev.relPath, e.clientX, e.clientY)
                  }
                  onMouseMove={(e) =>
                    hoverPreview.schedule(ev.relPath, e.clientX, e.clientY)
                  }
                  onMouseLeave={() => hoverPreview.cancel()}
                  onMouseDown={preventMiddleCompass}
                  onClick={(e) => openEvent(ev, { newTab: e.ctrlKey || e.metaKey })}
                  onAuxClick={(e) => {
                    if (!isMiddleButton(e)) return;
                    e.preventDefault();
                    openEvent(ev, { newTab: true });
                  }}
                >
                  {isTask ? (
                    <input
                      type="checkbox"
                      className="knit-checkbox"
                      checked={Boolean(ev.completed)}
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleComplete(ev);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: 'pointer', flexShrink: 0 }}
                    />
                  ) : (
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: 'var(--knit-primary)',
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
                      {timeStr && <span>{timeStr}</span>}
                      {ev.assignee && <span>@{ev.assignee}</span>}
                      <span style={{ fontFamily: 'var(--knit-font-mono)' }}>{ev.relPath}</span>
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
                        border: `1px solid ${priorityBadgeBackground(ev.priority)}`,
                      }}
                    >
                      !{ev.priority}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
