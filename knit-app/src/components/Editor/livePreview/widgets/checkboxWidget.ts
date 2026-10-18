import { WidgetType, type EditorView } from '@codemirror/view';
import type { TaskStatus } from '../../../../types';

/**
 * 1. Widget de case à cocher interactive avec les 7 statuts reconnus (B-054)
 */
export class CheckboxWidget extends WidgetType {
  private status: TaskStatus;
  private from: number;
  private to: number;

  constructor(status: TaskStatus, from: number, to: number) {
    super();
    this.status = status;
    this.from = from;
    this.to = to;
  }

  eq(other: CheckboxWidget) {
    return other.status === this.status && other.from === this.from && other.to === this.to;
  }

  toDOM(view: EditorView): HTMLElement {
    const span = document.createElement('span');
    span.className = 'knit-task-checkbox';

    if (this.status === 'x') {
      span.style.backgroundColor = 'var(--knit-primary)';
      span.style.borderColor = 'var(--knit-primary)';
      span.style.color = '#FFFFFF';
      span.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      span.title = 'Tâche terminée (cliquer pour basculer)';
    } else if (this.status === '/') {
      span.style.borderColor = 'var(--knit-primary)';
      span.style.color = 'var(--knit-primary)';
      span.style.backgroundColor = 'var(--knit-primary-alpha)';
      span.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20Z" fill="currentColor"/></svg>';
      span.title = 'Tâche en cours';
    } else if (this.status === '-') {
      span.style.color = 'var(--knit-text-muted)';
      span.style.borderColor = 'var(--knit-border)';
      span.innerHTML = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
      span.title = 'Tâche annulée';
    } else if (this.status === '?') {
      span.style.color = '#F59E0B';
      span.style.borderColor = '#F59E0B';
      span.style.backgroundColor = 'rgba(245, 158, 11, 0.12)';
      span.innerHTML = '?';
      span.title = 'Tâche en questionnement';
    } else if (this.status === '>') {
      span.style.color = '#3B82F6';
      span.style.borderColor = '#3B82F6';
      span.style.backgroundColor = 'rgba(59, 130, 246, 0.12)';
      span.innerHTML = '→';
      span.title = 'Tâche reportée';
    } else if (this.status === '!') {
      span.style.color = '#EF4444';
      span.style.borderColor = '#EF4444';
      span.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
      span.innerHTML = '!';
      span.title = 'Tâche urgente';
    } else {
      span.innerHTML = '';
      span.title = 'Tâche à faire (cliquer pour valider)';
    }

    span.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      let nextStatus: TaskStatus = ' ';
      if (this.status === ' ') nextStatus = '/';
      else if (this.status === '/') nextStatus = 'x';
      else if (this.status === 'x') nextStatus = ' ';
      else nextStatus = ' ';

      view.dispatch({
        changes: { from: this.from, to: this.to, insert: `[${nextStatus}]` },
      });
    };

    return span;
  }
}
