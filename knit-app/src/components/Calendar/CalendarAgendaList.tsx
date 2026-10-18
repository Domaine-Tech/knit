import React from 'react';
import type { CalendarEvent, CalendarOpenFileOpts } from '../../types';
import { groupEventsByHorizon } from '../../utils';
import { CalendarEventRow } from './CalendarEventRow';

export interface CalendarAgendaListProps {
  filtered: CalendarEvent[];
  todayIso: string;
  onOpenFile: (path: string, line?: number, opts?: CalendarOpenFileOpts) => void;
  onToggleComplete: (ev: CalendarEvent) => void;
  onEventContextMenu: (e: React.MouseEvent, ev: CalendarEvent) => void;
  eventPointerHandlers: (ev: CalendarEvent) => {
    onMouseEnter: (e: React.MouseEvent) => void;
    onMouseLeave: () => void;
  };
}

export const CalendarAgendaList: React.FC<CalendarAgendaListProps> = ({
  filtered,
  todayIso,
  onOpenFile,
  onToggleComplete,
  onEventContextMenu,
  eventPointerHandlers,
}) => {
  if (filtered.length === 0) {
    return (
      <p style={{ color: 'var(--knit-text-muted)', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
        Aucun événement correspondant aux critères.
      </p>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {groupEventsByHorizon(filtered, todayIso).map((g) => (
        <div key={g.id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: g.color,
              }}
            />
            <strong style={{ fontSize: 12, color: g.color }}>
              {g.title} ({g.items.length})
            </strong>
          </div>
          {g.items.map((ev) => (
            <CalendarEventRow
              key={ev.id}
              ev={ev}
              todayIso={todayIso}
              onOpenFile={onOpenFile}
              onToggleComplete={onToggleComplete}
              onMouseEnter={(e, event) => eventPointerHandlers(event).onMouseEnter(e)}
              onMouseLeave={() => eventPointerHandlers(ev).onMouseLeave()}
              onContextMenu={onEventContextMenu}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
