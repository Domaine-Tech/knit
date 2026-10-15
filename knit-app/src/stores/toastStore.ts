export type ToastType = 'info' | 'warning' | 'error' | 'success' | 'sync';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  count?: number;
  duration?: number;
  createdAt: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class ToastStore {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private maxVisible = 4;
  private syncDebounceTimer: number | null = null;
  private pendingSyncCount = 0;

  public subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.toasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.toasts]));
  }

  public show(toast: Omit<ToastItem, 'id' | 'createdAt'>): string {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newItem: ToastItem = {
      ...toast,
      id,
      createdAt: Date.now(),
    };

    // Si on dépasse le max, on retire le plus ancien
    if (this.toasts.length >= this.maxVisible) {
      this.toasts.shift();
    }

    this.toasts.push(newItem);
    this.notify();

    // Auto dismiss
    const duration = toast.duration ?? (
      toast.type === 'success' ? 3000 :
      toast.type === 'info' ? 4000 :
      toast.type === 'warning' ? 6000 :
      toast.type === 'sync' ? 4000 : 8000
    );

    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(id);
      }, duration);
    }

    return id;
  }

  public dismiss(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  public success(title: string, message?: string) {
    return this.show({ type: 'success', title, message });
  }

  public info(title: string, message?: string) {
    return this.show({ type: 'info', title, message });
  }

  public warning(title: string, message?: string) {
    return this.show({ type: 'warning', title, message });
  }

  public error(title: string, message?: string) {
    return this.show({ type: 'error', title, message });
  }

  /// Toast de synchronisation avec debounce et incrément dynamique
  public sync(author: string = 'Node Distant', changesCount: number = 1) {
    this.pendingSyncCount += changesCount;

    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = window.setTimeout(() => {
      const existingSync = this.toasts.find((t) => t.type === 'sync');
      const total = this.pendingSyncCount;
      this.pendingSyncCount = 0;

      if (existingSync) {
        existingSync.count = (existingSync.count || 1) + total;
        existingSync.message = `${existingSync.count} modifications synchronisées (${author})`;
        this.notify();
      } else {
        this.show({
          type: 'sync',
          title: 'Synchronisation P2P',
          message: `${total} modification(s) reçue(s) (${author})`,
          count: total,
          duration: 3500,
        });
      }
    }, 150);
  }
}

export const toast = new ToastStore();
