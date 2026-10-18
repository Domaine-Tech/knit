import { WidgetType } from '@codemirror/view';

/**
 * 2. Widget de priorité inline (!p1, !p2, !p3)
 */
export class PriorityWidget extends WidgetType {
  private level: 'p1' | 'p2' | 'p3';
  private from: number;

  constructor(level: 'p1' | 'p2' | 'p3', from: number) {
    super();
    this.level = level;
    this.from = from;
  }

  eq(other: PriorityWidget) {
    return other.level === this.level && other.from === this.from;
  }

  toDOM(): HTMLElement {
    const badge = document.createElement('span');
    badge.className = `knit-priority-badge knit-priority-${this.level}`;

    if (this.level === 'p1') {
      badge.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
      badge.style.color = '#ef4444';
      badge.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      badge.textContent = '!p1 urgent';
    } else if (this.level === 'p2') {
      badge.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
      badge.style.color = '#f59e0b';
      badge.style.border = '1px solid rgba(245, 158, 11, 0.3)';
      badge.textContent = '!p2 haut';
    } else {
      badge.style.backgroundColor = 'var(--knit-surface-hover)';
      badge.style.color = 'var(--knit-text-muted)';
      badge.style.border = '1px solid var(--knit-border)';
      badge.textContent = '!p3 bas';
    }

    return badge;
  }
}
