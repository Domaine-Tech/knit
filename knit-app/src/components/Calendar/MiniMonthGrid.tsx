import React, { useMemo } from 'react';
import {
  WEEKDAYS_SHORT,
  buildMonthGridCells,
  collectDatesWithEvents,
  pad2,
} from '../../utils/calendarUtils';
import { formatIsoDate } from '../../utils/dateUtils';
import type { CalendarEvent } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

export interface MiniMonthGridProps {
  cursor: Date;
  events: CalendarEvent[];
  selectedDate?: string;
  onCursorChange: (next: Date) => void;
  onDayClick: (iso: string) => void;
  onDayContextMenu?: (e: React.MouseEvent, iso: string) => void;
  /** Clic sur le titre (ex: ouvrir agenda global). */
  onTitleClick?: () => void;
  titleMode?: 'short' | 'long';
  showTodayButton?: boolean;
  dayTooltip?: (iso: string, eventCount: number) => string;
}

/**
 * Mini-grille mensuelle partagée (widget bas de sidebar + panneau Agenda).
 */
export const MiniMonthGrid: React.FC<MiniMonthGridProps> = ({
  cursor,
  events,
  selectedDate,
  onCursorChange,
  onDayClick,
  onDayContextMenu,
  onTitleClick,
  titleMode = 'short',
  showTodayButton = false,
  dayTooltip,
}) => {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const todayIso = useMemo(() => formatIsoDate(new Date()), []);
  const datesWithEvents = useMemo(() => collectDatesWithEvents(events), [events]);
  const cells = useMemo(() => buildMonthGridCells(year, month), [year, month]);

  const title =
    titleMode === 'long'
      ? cursor.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      : `${pad2(month + 1)}/${year}`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: titleMode === 'long' ? 8 : 6 }}>
        {onTitleClick ? (
          <button
            type="button"
            onClick={onTitleClick}
            data-tooltip="Ouvrir l'Agenda global"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: 'inherit',
              flex: 1,
              textAlign: 'left',
            }}
          >
            <DuotoneIcon name="calendar" size={13} />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: titleMode === 'long' ? 'capitalize' : undefined,
              }}
            >
              {title}
            </span>
          </button>
        ) : (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              flex: 1,
              textTransform: titleMode === 'long' ? 'capitalize' : undefined,
            }}
          >
            {title}
          </span>
        )}
        <button
          type="button"
          className="knit-btn"
          onClick={() => onCursorChange(new Date(year, month - 1, 1))}
          style={{ padding: titleMode === 'long' ? '2px 4px' : 2 }}
          data-tooltip="Mois précédent"
        >
          <DuotoneIcon name="chevron-left" size={11} />
        </button>
        {showTodayButton && (
          <button
            type="button"
            className="knit-btn"
            onClick={() => {
              const now = new Date();
              onCursorChange(now);
              onDayClick(formatIsoDate(now));
            }}
            style={{ padding: '2px 6px', fontSize: 10 }}
          >
            Ce jour
          </button>
        )}
        <button
          type="button"
          className="knit-btn"
          onClick={() => onCursorChange(new Date(year, month + 1, 1))}
          style={{ padding: titleMode === 'long' ? '2px 4px' : 2 }}
          data-tooltip="Mois suivant"
        >
          <DuotoneIcon name="chevron-right" size={11} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {WEEKDAYS_SHORT.map((d, i) => (
          <div
            key={`${d}-${i}`}
            style={{
              textAlign: 'center',
              fontSize: 9,
              color: 'var(--knit-text-muted)',
              paddingBottom: titleMode === 'long' ? 2 : 0,
            }}
          >
            {d}
          </div>
        ))}
        {cells.map((c) => {
          const has = datesWithEvents.has(c.iso);
          const isToday = c.iso === todayIso;
          const isSelected = selectedDate != null && c.iso === selectedDate;
          const dayEventsCount = events.filter((e) => e.date === c.iso).length;
          const tooltip =
            dayTooltip?.(c.iso, dayEventsCount) ??
            (dayEventsCount > 0
              ? `${c.iso} (${dayEventsCount} tâche(s)/événement(s))`
              : c.iso);

          return (
            <button
              key={c.iso}
              type="button"
              onClick={() => onDayClick(c.iso)}
              onContextMenu={
                onDayContextMenu ? (e) => onDayContextMenu(e, c.iso) : undefined
              }
              data-tooltip={tooltip}
              style={{
                border: isSelected
                  ? '1px solid var(--knit-primary)'
                  : isToday
                    ? '1px solid var(--knit-primary)'
                    : 'none',
                background: isSelected
                  ? 'var(--knit-primary-alpha)'
                  : isToday
                    ? 'var(--knit-primary-alpha)'
                    : 'transparent',
                color: c.inMonth ? 'var(--knit-text)' : 'var(--knit-text-muted)',
                fontSize: 10,
                padding: '3px 0',
                borderRadius: 4,
                cursor: 'pointer',
                position: 'relative',
                fontWeight: isToday || isSelected ? 600 : 400,
              }}
            >
              {c.d.getDate()}
              {has && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: 1,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: 'var(--knit-primary)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
