import React from 'react';
import type { CalendarDropTarget, CalendarEvent, CalendarWeekDay } from '../../types';
import { CalendarDropIndicator } from './CalendarDropIndicator';

export interface CalendarWeekViewProps {
  weekDays: CalendarWeekDay[];
  eventsByDate: Map<string, CalendarEvent[]>;
  todayIso: string;
  dropTarget: CalendarDropTarget | null;
  setDropTarget: (target: CalendarDropTarget | null) => void;
  onDropOnDay: (iso: string, e: React.DragEvent) => void;
  onDayContextMenu: (e: React.MouseEvent, iso: string) => void;
  onQuickAdd: (iso: string) => void;
  renderEventChip: (ev: CalendarEvent, index?: number, date?: string) => React.ReactNode;
}

export const CalendarWeekView: React.FC<CalendarWeekViewProps> = ({
  weekDays,
  eventsByDate,
  todayIso,
  dropTarget,
  setDropTarget,
  onDropOnDay,
  onDayContextMenu,
  onQuickAdd,
  renderEventChip,
}) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
      gap: 6,
      flex: 1,
      minHeight: 0,
      height: '100%',
    }}
  >
    {weekDays.map((d) => {
      const dayEvents = eventsByDate.get(d.iso) || [];
      const isOver = dropTarget?.date === d.iso;
      const isToday = d.iso === todayIso;

      const allDayEvents = dayEvents.filter((e) => !e.startTime);
      const timedEvents = dayEvents.filter((e) => Boolean(e.startTime));

      return (
        <div
          key={d.iso}
          onDragEnter={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setDropTarget({ date: d.iso });
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            if (!dropTarget || dropTarget.date !== d.iso) {
              setDropTarget({ date: d.iso, index: dayEvents.length });
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              if (dropTarget?.date === d.iso) {
                setDropTarget(null);
              }
            }
          }}
          onDrop={(e) => void onDropOnDay(d.iso, e)}
          onContextMenu={(e) => onDayContextMenu(e, d.iso)}
          style={{
            minHeight: 0,
            minWidth: 0,
            overflow: 'auto',
            padding: 8,
            border: isOver
              ? '1px dashed var(--knit-primary)'
              : `1px solid ${isToday ? 'var(--knit-primary)' : 'var(--knit-border)'}`,
            borderRadius: 'var(--knit-radius-sm)',
            background: isOver ? 'var(--knit-surface-hover)' : 'var(--knit-surface)',
            boxShadow: isOver ? '0 0 12px var(--knit-primary-alpha)' : 'none',
            transition: 'all var(--knit-duration-fast)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
              borderBottom: '1px solid var(--knit-border)',
              paddingBottom: 4,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: isToday ? 'var(--knit-primary)' : 'inherit',
              }}
            >
              {d.date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}
            </span>
            <button
              type="button"
              className="knit-btn"
              onClick={() => onQuickAdd(d.iso)}
              style={{ padding: '1px 4px', fontSize: 11, background: 'transparent', border: 'none' }}
              title="Ajouter un événement"
            >
              +
            </button>
          </div>

          {allDayEvents.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--knit-text-muted)', fontWeight: 600 }}>
                Jalons & Tâches :
              </span>
              {allDayEvents.map((ev, idx) => (
                <React.Fragment key={ev.id}>
                  {isOver && dropTarget?.index === idx && <CalendarDropIndicator />}
                  {renderEventChip(ev, idx, d.iso)}
                </React.Fragment>
              ))}
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {timedEvents.length > 0 && (
              <span style={{ fontSize: 10, color: 'var(--knit-text-muted)', fontWeight: 600 }}>
                Horaires :
              </span>
            )}
            {timedEvents.map((ev, idx) => (
              <React.Fragment key={ev.id}>
                {isOver && dropTarget?.index === allDayEvents.length + idx && (
                  <CalendarDropIndicator />
                )}
                {renderEventChip(ev, allDayEvents.length + idx, d.iso)}
              </React.Fragment>
            ))}
          </div>

          {dayEvents.length === 0 && (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--knit-text-muted)',
                fontSize: 11,
                textAlign: 'center',
                border: '1px dashed var(--knit-border)',
                borderRadius: 'var(--knit-radius-xs)',
                padding: 8,
              }}
            >
              Aucun événement
            </div>
          )}
        </div>
      );
    })}
  </div>
);
