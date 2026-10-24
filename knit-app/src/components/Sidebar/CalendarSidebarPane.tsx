import React, { useMemo, useState } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import { formatIsoDate } from '../../utils/dateUtils';
import { priorityAccentColor } from '../../utils/calendarUtils';
import { useCalendarIndex } from '../../hooks/useCalendarIndex';
import type { CalendarEvent } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { MiniMonthGrid } from '../Calendar/MiniMonthGrid';

interface CalendarSidebarPaneProps {
  onSelectFile: (path: string, preview: boolean) => void;
  onOpenFileAtLine?: (path: string, line: number) => void;
  onOpenGlobalAgenda?: (iso?: string) => void;
}

export const CalendarSidebarPane: React.FC<CalendarSidebarPaneProps> = ({
  onSelectFile,
  onOpenFileAtLine,
  onOpenGlobalAgenda,
}) => {
  const [cursor, setCursor] = useState(() => new Date());
  const { events, reload } = useCalendarIndex();
  const [selectedDate, setSelectedDate] = useState<string>(() => formatIsoDate(new Date()));
  const [todayIso] = useState(() => formatIsoDate(new Date()));

  const selectedDateEvents = useMemo(() => {
    return events.filter((e) => e.date === selectedDate);
  }, [events, selectedDate]);

  const upcomingEvents = useMemo(() => {
    return events
      .filter((e) => !e.completed && e.date >= todayIso)
      .slice(0, 10);
  }, [events, todayIso]);

  const handleOpenEvent = (ev: CalendarEvent) => {
    if (onOpenFileAtLine && ev.line) {
      onOpenFileAtLine(ev.relPath, ev.line);
    } else {
      onSelectFile(ev.relPath, false);
    }
  };

  const handleToggleTask = async (ev: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await vaultStore.toggleCalendarTask(ev.relPath, ev.line, ev.completed);
      await reload();
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        background: 'var(--knit-bg)',
        color: 'var(--knit-text)',
        fontSize: 12,
      }}
    >
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--knit-border)', flexShrink: 0 }}>
        <button
          type="button"
          className="knit-btn knit-btn-primary"
          onClick={() => onOpenGlobalAgenda?.(selectedDate)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '5px 8px',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <DuotoneIcon name="calendar" size={13} />
          <span>Ouvrir l'Agenda global</span>
        </button>
      </div>

      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--knit-border)', flexShrink: 0 }}>
        <MiniMonthGrid
          cursor={cursor}
          events={events}
          selectedDate={selectedDate}
          onCursorChange={setCursor}
          onDayClick={setSelectedDate}
          titleMode="long"
          showTodayButton
        />
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 10px' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <strong style={{ fontSize: 11, color: 'var(--knit-text)' }}>
              {selectedDate === todayIso
                ? 'Aujourd\'hui'
                : new Date(`${selectedDate}T00:00:00`).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
            </strong>
            <span style={{ fontSize: 10, color: 'var(--knit-text-muted)' }}>
              {selectedDateEvents.length} tâche(s)
            </span>
          </div>

          {selectedDateEvents.length === 0 ? (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--knit-text-muted)', fontStyle: 'italic' }}>
              Aucune tâche prévue ce jour.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selectedDateEvents.map((ev) => (
                <div
                  key={ev.id}
                  onClick={() => handleOpenEvent(ev)}
                  style={{
                    padding: '4px 6px',
                    borderRadius: 'var(--knit-radius-xs)',
                    background: 'var(--knit-surface)',
                    border: '1px solid var(--knit-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 11,
                    opacity: ev.completed ? 0.6 : 1,
                  }}
                >
                  {ev.kind === 'task' && (
                    <input
                      type="checkbox"
                      className="knit-checkbox"
                      checked={Boolean(ev.completed)}
                      onClick={(e) => void handleToggleTask(ev, e)}
                      onChange={() => {}}
                      style={{ cursor: 'pointer', margin: 0, flexShrink: 0 }}
                    />
                  )}
                  <span
                    style={{
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textDecoration: ev.completed ? 'line-through' : 'none',
                    }}
                  >
                    {ev.title}
                  </span>
                  {ev.priority && (
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: priorityAccentColor(ev.priority),
                      }}
                    >
                      !{ev.priority}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <strong style={{ fontSize: 11, color: 'var(--knit-text-muted)', display: 'block', marginBottom: 6 }}>
            Prochaines échéances du coffre
          </strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {upcomingEvents.map((ev) => (
              <div
                key={ev.id}
                onClick={() => handleOpenEvent(ev)}
                style={{
                  padding: '4px 6px',
                  borderRadius: 'var(--knit-radius-xs)',
                  background: 'var(--knit-surface)',
                  border: '1px solid var(--knit-border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--knit-font-mono)',
                    fontSize: 10,
                    color: 'var(--knit-primary)',
                    minWidth: 64,
                  }}
                >
                  {ev.date.slice(5)}
                </span>
                <span
                  style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {ev.title}
                </span>
                {ev.priority && (
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: priorityAccentColor(ev.priority),
                    }}
                  >
                    !{ev.priority}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
