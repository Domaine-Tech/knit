import type { IconName } from '../components/Icons/DuotoneIcon';

export interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: IconName;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}

type ContextMenuListener = (state: ContextMenuState) => void;

class ContextMenuStore {
  public state: ContextMenuState = {
    isOpen: false,
    x: 0,
    y: 0,
    items: [],
  };

  private listeners: Set<ContextMenuListener> = new Set();

  public subscribe(listener: ContextMenuListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l({ ...this.state }));
  }

  public show(
    e: React.MouseEvent | MouseEvent,
    items: ContextMenuItem[]
  ) {
    e.preventDefault();
    e.stopPropagation();

    const menuWidth = 220;
    const itemHeight = 32;
    const estimatedHeight = items.length * itemHeight + 16;

    let x = e.clientX;
    let y = e.clientY;

    // Évite que le menu déborde hors de la fenêtre
    if (x + menuWidth > window.innerWidth) {
      x = Math.max(10, window.innerWidth - menuWidth - 12);
    }

    if (y + estimatedHeight > window.innerHeight) {
      y = Math.max(10, window.innerHeight - estimatedHeight - 12);
    }

    this.state = {
      isOpen: true,
      x,
      y,
      items,
    };
    this.notify();
  }

  public close() {
    if (this.state.isOpen) {
      this.state = {
        ...this.state,
        isOpen: false,
      };
      this.notify();
    }
  }
}

export const contextMenu = new ContextMenuStore();
