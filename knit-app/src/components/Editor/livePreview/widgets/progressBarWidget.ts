import { WidgetType, type EditorView } from '@codemirror/view';

/**
 * 3. Barre de progression projetée (B-054)
 */
export class ProgressBarWidget extends WidgetType {
  private completed: number;
  private total: number;
  private ro?: ResizeObserver;

  constructor(completed: number, total: number) {
    super();
    this.completed = completed;
    this.total = total;
  }

  eq(other: ProgressBarWidget) {
    return other.completed === this.completed && other.total === this.total;
  }

  get estimatedHeight(): number {
    return 42;
  }

  destroy() {
    if (this.ro) {
      this.ro.disconnect();
      this.ro = undefined;
    }
  }

  toDOM(view: EditorView): HTMLElement {
    const container = document.createElement('div');
    container.className = 'knit-doc-progress-bar';

    this.ro = new ResizeObserver(() => {
      view.requestMeasure();
    });
    this.ro.observe(container);

    const pct = this.total > 0 ? Math.round((this.completed / this.total) * 100) : 0;

    const label = document.createElement('div');
    label.className = 'knit-progress-bar-label';
    label.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--knit-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
          <path d="m9 12 2 2 4-4"/>
        </svg>
        <span>Progression des tâches : <strong>${this.completed} / ${this.total}</strong></span>
      </div>
      <span style="font-weight:700;color:var(--knit-primary);">${pct}%</span>
    `;

    const barBg = document.createElement('div');
    barBg.className = 'knit-progress-bar-bg';

    const barFill = document.createElement('div');
    barFill.className = 'knit-progress-bar-fill';
    barFill.style.width = `${pct}%`;

    barBg.appendChild(barFill);
    container.appendChild(label);
    container.appendChild(barBg);
    return container;
  }
}
