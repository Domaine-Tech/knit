import { useCallback, useEffect, useRef, useState } from 'react';
import { vaultStore } from '../stores/vaultStore';
import type { CalendarEvent } from '../types';

/**
 * Charge et maintient l'index agenda du coffre (debounce sur mutations vault).
 * Partagé par MiniCalendarWidget, CalendarSidebarPane et CalendarView.
 */
export function useCalendarIndex(debounceMs = 400): {
  events: CalendarEvent[];
  loading: boolean;
  reload: () => Promise<void>;
} {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);

  const reload = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const data = await vaultStore.getCalendarIndex();
      setEvents(data.events || []);
    } catch {
      /* ignore — UI légère ; CalendarView peut toaster au besoin */
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const data = await vaultStore.getCalendarIndex();
        if (alive) setEvents(data.events || []);
      } catch {
        /* ignore */
      } finally {
        loadingRef.current = false;
        if (alive) setLoading(false);
      }
    };

    const scheduleLoad = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        void load();
      }, debounceMs);
    };

    void load();
    const unsub = vaultStore.subscribe(scheduleLoad);

    return () => {
      alive = false;
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [debounceMs]);

  return { events, loading, reload };
}
