import { WidgetType, type EditorView } from '@codemirror/view';

/**
 * 5. Carte de Propriétés Frontmatter YAML (Style Obsidian Properties)
 */
export class FrontmatterPropertiesWidget extends WidgetType {
  private fmText: string;
  private from: number;
  private to: number;
  private ro?: ResizeObserver;

  constructor(fmText: string, from: number, to: number) {
    super();
    this.fmText = fmText;
    this.from = from;
    this.to = to;
  }

  eq(other: FrontmatterPropertiesWidget) {
    return other.fmText === this.fmText && other.from === this.from && other.to === this.to;
  }

  get estimatedHeight(): number {
    const propCount = this.fmText.split(/\r?\n/).filter((l) => l.includes(':')).length;
    return Math.max(50, 36 + propCount * 28 + 24);
  }

  coordsAt(dom: HTMLElement): DOMRect | null {
    return dom.getBoundingClientRect();
  }

  destroy() {
    if (this.ro) {
      this.ro.disconnect();
      this.ro = undefined;
    }
  }

  toDOM(view: EditorView): HTMLElement {
    const card = document.createElement('div');
    card.className = 'knit-properties-card';
    card.title = 'Propriétés de la note (cliquer pour éditer le YAML)';

    this.ro = new ResizeObserver(() => {
      view.requestMeasure();
    });
    this.ro.observe(card);

    const lines = this.fmText.split(/\r?\n/);
    const properties: { key: string; val: string }[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === '---') continue;
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx !== -1) {
        const key = trimmed.slice(0, colonIdx).trim();
        const val = trimmed.slice(colonIdx + 1).trim();
        properties.push({ key, val });
      }
    }

    const header = document.createElement('div');
    header.className = 'knit-properties-header';
    header.innerHTML = `
      <div class="knit-properties-title-group">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="21" x2="4" y2="14"></line>
          <line x1="4" y1="10" x2="4" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12" y2="3"></line>
          <line x1="20" y1="21" x2="20" y2="16"></line>
          <line x1="20" y1="12" x2="20" y2="3"></line>
          <line x1="1" y1="14" x2="7" y2="14"></line>
          <line x1="9" y1="8" x2="15" y2="8"></line>
          <line x1="17" y1="16" x2="23" y2="16"></line>
        </svg>
        <span>Propriétés</span>
        <span class="knit-properties-count-badge">${properties.length}</span>
      </div>
      <div class="knit-properties-edit-hint">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
        <span>YAML</span>
      </div>
    `;

    const grid = document.createElement('div');
    grid.className = 'knit-properties-grid';

    for (const prop of properties) {
      const row = document.createElement('div');
      row.className = 'knit-property-row';

      const keyEl = document.createElement('span');
      keyEl.className = 'knit-property-key';
      keyEl.textContent = prop.key;

      const valEl = document.createElement('span');
      valEl.className = 'knit-property-val';

      const lowerKey = prop.key.toLowerCase();
      const rawVal = prop.val;

      if (lowerKey === 'type') {
        valEl.innerHTML = `<span class="knit-property-pill pill-primary">${rawVal.replace(/['"]/g, '')}</span>`;
      } else if (lowerKey === 'statut' || lowerKey === 'status') {
        valEl.innerHTML = `<span class="knit-property-pill pill-status"><span style="width:5px;height:5px;border-radius:50%;background-color:currentColor;"></span>${rawVal.replace(/['"]/g, '')}</span>`;
      } else if (lowerKey === 'priorite' || lowerKey === 'priority') {
        const pClass = rawVal.includes('haut') || rawVal.includes('critique') ? 'p1' : rawVal.includes('moyen') ? 'p2' : 'p3';
        valEl.innerHTML = `<span class="knit-priority-badge knit-priority-${pClass}">${rawVal.replace(/['"]/g, '')}</span>`;
      } else if (lowerKey === 'tags') {
        const clean = rawVal.replace(/^\[|\]$/g, '');
        const tags = clean.split(',').map((t) => t.trim().replace(/['"]/g, '')).filter(Boolean);
        valEl.innerHTML = tags.map((t) => `<span class="knit-preview-tag">#${t}</span>`).join('');
      } else if (lowerKey === 'assigne' || lowerKey === 'assignee') {
        valEl.innerHTML = `<span class="knit-preview-mention">@${rawVal.replace(/['"]/g, '')}</span>`;
      } else if (lowerKey === 'echeance' || lowerKey === 'due' || lowerKey === 'date') {
        valEl.innerHTML = `<span class="knit-preview-date"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>${rawVal.replace(/['"]/g, '')}</span>`;
      } else if (lowerKey === 'id') {
        valEl.innerHTML = `<code class="knit-preview-code">${rawVal.replace(/['"]/g, '')}</code>`;
      } else {
        valEl.textContent = rawVal.replace(/^["']|["']$/g, '');
      }

      row.appendChild(keyEl);
      row.appendChild(valEl);
      grid.appendChild(row);
    }

    card.appendChild(header);
    card.appendChild(grid);

    const activateYaml = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: Math.min(this.from + 4, this.to) },
        scrollIntoView: true,
      });
      view.focus();
    };

    card.onmousedown = activateYaml;
    card.onclick = activateYaml;

    return card;
  }

  ignoreEvent(_event: Event): boolean {
    return true;
  }
}
