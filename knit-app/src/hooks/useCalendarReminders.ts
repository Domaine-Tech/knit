import { useEffect } from 'react';
import type { CalendarEvent } from '../types';
import { toast } from '../stores/toastStore';
import { toIsoDate } from '../utils';

/**
 * Toast discret 15 min avant une échéance horodatée (une fois / événement / session).
 */
export function useCalendarReminders(events: CalendarEvent[]): void {
  useEffect(() => {
    const notified = new Set<string>();
    const tick = () => {
      const now = new Date();
      const today = toIsoDate(now);
      const mins = now.getHours() * 60 + now.getMinutes();
      for (const ev of events) {
        if (ev.date !== today || !ev.startTime || ev.completed) continue;
        if (notified.has(ev.id)) continue;
        const [h, m] = ev.startTime.split(':').map(Number);
        const startMins = (h || 0) * 60 + (m || 0);
        const delta = startMins - mins;
        if (delta >= 0 && delta <= 15) {
          notified.add(ev.id);
          toast.info('Échéance proche', `${ev.title} dans ${delta} min`);
        }
      }
    };
    const id = window.setInterval(tick, 60_000);
    tick();
    return () => window.clearInterval(id);
  }, [events]);
}
