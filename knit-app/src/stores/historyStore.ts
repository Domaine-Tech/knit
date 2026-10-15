export interface UndoableAction {
  id: string;
  description: string;
  undo: () => Promise<void> | void;
  createdAt: number;
}

type HistoryListener = () => void;

class HistoryStore {
  private undoStack: UndoableAction[] = [];
  private listeners: Set<HistoryListener> = new Set();

  public subscribe(listener: HistoryListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public push(action: Omit<UndoableAction, 'createdAt'>): void {
    this.undoStack.push({
      ...action,
      createdAt: Date.now(),
    });
    // On conserve au maximum les 10 dernières actions annulables
    if (this.undoStack.length > 10) {
      this.undoStack.shift();
    }
    this.notify();
  }

  public remove(id: string): void {
    const prevLen = this.undoStack.length;
    this.undoStack = this.undoStack.filter((a) => a.id !== id);
    if (this.undoStack.length !== prevLen) {
      this.notify();
    }
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public async undo(): Promise<boolean> {
    const action = this.undoStack.pop();
    if (!action) return false;
    this.notify();
    try {
      await action.undo();
      return true;
    } catch (err: unknown) {
      console.error('Erreur lors de l\'annulation de l\'action :', err);
      return false;
    }
  }

  public async triggerUndo(id: string): Promise<boolean> {
    const index = this.undoStack.findIndex((a) => a.id === id);
    if (index === -1) return false;
    const [action] = this.undoStack.splice(index, 1);
    this.notify();
    try {
      await action.undo();
      return true;
    } catch (err: unknown) {
      console.error('Erreur lors de l\'annulation de l\'action :', err);
      return false;
    }
  }
}

export const historyStore = new HistoryStore();
