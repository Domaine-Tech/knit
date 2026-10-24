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
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    const id = ++requestIdRef.current;
    const pathAtStart = vaultStore.currentVaultPath;
    setLoading(true);
    try {
      const data = await vaultStore.getCalendarIndex();
      if (id !== requestIdRef.current) return;
      if (vaultStore.currentVaultPath !== pathAtStart) return;
      setEvents(data.events || []);
    } catch {
      /* ignore — UI légère ; CalendarView peut toaster au besoin */
    } finally {
      if (id === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const id = ++requestIdRef.current;
      const pathAtStart = vaultStore.currentVaultPath;
      setLoading(true);
      try {
        const data = await vaultStore.getCalendarIndex();
        if (!alive || id !== requestIdRef.current) return;
        if (vaultStore.currentVaultPath !== pathAtStart) return;
        setEvents(data.events || []);
      } catch {
        /* ignore */
      } finally {
        if (alive && id === requestIdRef.current) setLoading(false);
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
      requestIdRef.current += 1;
      unsub();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [debounceMs]);

  return { events, loading, reload };
}
