import { RangeSetBuilder, StateField, type EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  WidgetType,
  Decoration,
  type DecorationSet,
} from '@codemirror/view';
import type { TaskStatus } from '../../types';
import { splitTableRow, renderSimpleMarkdown } from '../../utils';

/* ==========================================================================
   WIDGETS DU LIVE PREVIEW (STYLE OBSIDIAN / LINEAR PREMIUM)
   ========================================================================== */

/**
 * 1. Widget de case à cocher interactive avec les 7 statuts reconnus (B-054)
 */
class CheckboxWidget extends WidgetType {
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

/**
 * 2. Widget de priorité inline (!p1, !p2, !p3)
 */
class PriorityWidget extends WidgetType {
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

/**
 * 3. Barre de progression projetée (B-054)
 */
class ProgressBarWidget extends WidgetType {
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

/**
 * 4. Séparateur horizontal (---)
 */
class DividerWidget extends WidgetType {
  eq(_other: DividerWidget) {
    return true;
  }

  get estimatedHeight(): number {
    return 28;
  }

  toDOM(): HTMLElement {
    const hr = document.createElement('div');
    hr.className = 'knit-preview-hr';
    return hr;
  }
}

/**
 * 5. Carte de Propriétés Frontmatter YAML (Style Obsidian Properties)
 */
class FrontmatterPropertiesWidget extends WidgetType {
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

/**
 * 6. Rendu immersif des Tableaux Markdown GFM (Table Card Widget)
 */
class TableCardWidget extends WidgetType {
  private tableText: string;
  private from: number;
  private to: number;
  private startLineNum: number;
  private ro?: ResizeObserver;

  constructor(tableText: string, from: number, to: number, startLineNum: number) {
    super();
    this.tableText = tableText;
    this.from = from;
    this.to = to;
    this.startLineNum = startLineNum;
  }

  eq(other: TableCardWidget) {
    return (
      other.tableText === this.tableText &&
      other.from === this.from &&
      other.to === this.to &&
      other.startLineNum === this.startLineNum
    );
  }

  get estimatedHeight(): number {
    const lines = this.tableText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const rowCount = Math.max(1, lines.length - 2);
    // En-tête (th) ~38px + lignes de données (td) * ~34px + padding & bordures ~24px
    return 38 + rowCount * 34 + 24;
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
    card.className = 'knit-rendered-table-card';

    this.ro = new ResizeObserver(() => {
      view.requestMeasure();
    });
    this.ro.observe(card);

    const wrapper = document.createElement('div');
    wrapper.className = 'knit-rendered-table-wrapper';

    const table = document.createElement('table');
    table.className = 'knit-rendered-table';

    const lines = this.tableText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length >= 2) {
      const headerCells = splitTableRow(lines[0]);
      const delimCells = splitTableRow(lines[1]);
      const alignments = delimCells.map((d) => {
        const left = d.startsWith(':');
        const right = d.endsWith(':');
        if (left && right) return 'center';
        if (right) return 'right';
        return 'left';
      });

      const thead = document.createElement('thead');
      const trHead = document.createElement('tr');
      trHead.dataset.lineOffset = '0';
      headerCells.forEach((h, idx) => {
        const th = document.createElement('th');
        th.style.textAlign = alignments[idx] || 'left';
        th.innerHTML = renderSimpleMarkdown(h);
        trHead.appendChild(th);
      });
      thead.appendChild(trHead);
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (let i = 2; i < lines.length; i++) {
        const rowLine = lines[i].trim();
        if (!rowLine.startsWith('|') || !rowLine.endsWith('|')) continue;
        const rowCells = splitTableRow(rowLine);
        const tr = document.createElement('tr');
        tr.dataset.lineOffset = String(i);
        rowCells.forEach((cell, idx) => {
          const td = document.createElement('td');
          td.style.textAlign = alignments[idx] || 'left';
          td.innerHTML = renderSimpleMarkdown(cell);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
    }

    wrapper.appendChild(table);
    card.appendChild(wrapper);

    card.onclick = (e) => {
      // 1. Si Ctrl+Clic (ou Clic) sur un lien interne du tableau
      const linkEl = (e.target as HTMLElement).closest('[data-target]') as HTMLElement | null;
      if (linkEl && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        const targetUrl = linkEl.getAttribute('data-target');
        if (targetUrl) {
          card.dispatchEvent(
            new CustomEvent('knit-navigate-link', {
              bubbles: true,
              detail: { url: targetUrl },
            })
          );
          return;
        }
      }

      // 2. Sinon : bascule vers la source du tableau à la ligne correspondante
      e.preventDefault();
      e.stopPropagation();

      const targetTr = (e.target as HTMLElement).closest('tr');
      const lineOffset = targetTr?.dataset.lineOffset ? parseInt(targetTr.dataset.lineOffset, 10) : 0;
      const targetLineNum = this.startLineNum + lineOffset;

      if (targetLineNum >= 1 && targetLineNum <= view.state.doc.lines) {
        const targetLine = view.state.doc.line(targetLineNum);
        view.dispatch({
          selection: { anchor: targetLine.from + 2 },
          scrollIntoView: true,
        });
      } else {
        view.dispatch({
          selection: { anchor: this.from + 2 },
          scrollIntoView: true,
        });
      }
      view.focus();
    };

    card.onmousemove = (e) => {
      const linkEl = (e.target as HTMLElement).closest('[data-target]') as HTMLElement | null;
      if (linkEl) {
        const targetUrl = linkEl.getAttribute('data-target');
        if (targetUrl) {
          card.dispatchEvent(
            new CustomEvent('knit-hover-link', {
              bubbles: true,
              detail: { target: targetUrl, x: e.clientX, y: e.clientY },
            })
          );
          return;
        }
      }
      card.dispatchEvent(
        new CustomEvent('knit-hover-link', {
          bubbles: true,
          detail: null,
        })
      );
    };

    card.onmouseleave = () => {
      card.dispatchEvent(
        new CustomEvent('knit-hover-link', {
          bubbles: true,
          detail: null,
        })
      );
    };

    return card;
  }

  ignoreEvent(_event: Event): boolean {
    return true;
  }
}

function formatLanguageName(raw: string): string {
  const lower = raw.trim().toLowerCase();
  switch (lower) {
    case 'powershell':
    case 'pwsh':
      return 'PowerShell';
    case 'bash':
    case 'sh':
    case 'zsh':
      return 'Bash';
    case 'cmd':
    case 'bat':
      return 'Command';
    case 'javascript':
    case 'js':
      return 'JavaScript';
    case 'typescript':
    case 'ts':
      return 'TypeScript';
    case 'jsx':
      return 'React JSX';
    case 'tsx':
      return 'React TSX';
    case 'python':
    case 'py':
      return 'Python';
    case 'rust':
    case 'rs':
      return 'Rust';
    case 'go':
    case 'golang':
      return 'Go';
    case 'csharp':
    case 'cs':
      return 'C#';
    case 'cpp':
    case 'c++':
      return 'C++';
    case 'c':
      return 'C';
    case 'java':
      return 'Java';
    case 'kotlin':
    case 'kt':
      return 'Kotlin';
    case 'swift':
      return 'Swift';
    case 'php':
      return 'PHP';
    case 'ruby':
    case 'rb':
      return 'Ruby';
    case 'sql':
      return 'SQL';
    case 'html':
      return 'HTML';
    case 'css':
      return 'CSS';
    case 'scss':
      return 'SCSS';
    case 'json':
      return 'JSON';
    case 'yaml':
    case 'yml':
      return 'YAML';
    case 'toml':
      return 'TOML';
    case 'xml':
      return 'XML';
    case 'markdown':
    case 'md':
      return 'Markdown';
    case 'dockerfile':
    case 'docker':
      return 'Docker';
    case 'diff':
      return 'Diff';
    case '':
      return 'Code';
    default:
      return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
}

/**
 * 7. Carte de bloc de code unifiée (style Tableau / Mermaid)
 */
class CodeBlockCardWidget extends WidgetType {
  private lang: string;
  private code: string;
  private from: number;
  private to: number;
  private ro?: ResizeObserver;

  constructor(lang: string, code: string, from: number, to: number) {
    super();
    this.lang = lang;
    this.code = code;
    this.from = from;
    this.to = to;
  }

  eq(other: CodeBlockCardWidget) {
    return (
      other.lang === this.lang &&
      other.code === this.code &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  get estimatedHeight(): number {
    const lineCount = Math.max(1, this.code.split('\n').length);
    return 36 + lineCount * 22 + 16;
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

  ignoreEvent(_event: Event): boolean {
    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const card = document.createElement('div');
    card.className = 'knit-rendered-code-card';
    card.title = 'Cliquer pour éditer le code en mode source';

    this.ro = new ResizeObserver(() => {
      view.requestMeasure();
    });
    this.ro.observe(card);

    // En-tête avec badge de langage et bouton copier
    const header = document.createElement('div');
    header.className = 'knit-code-block-header';

    const langContainer = document.createElement('div');
    langContainer.className = 'knit-code-lang-tag';

    const icon = document.createElement('span');
    icon.className = 'knit-code-lang-icon';
    icon.textContent = '>_';

    const langName = document.createElement('span');
    langName.className = 'knit-code-lang-name';
    langName.textContent = formatLanguageName(this.lang);

    langContainer.appendChild(icon);
    langContainer.appendChild(langName);

    const copyBtn = document.createElement('button');
    copyBtn.className = 'knit-code-copy-btn';
    copyBtn.type = 'button';
    copyBtn.title = 'Copier le code dans le presse-papier';
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
      </svg>
      <span>Copier</span>
    `;

    copyBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(this.code);
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Copié !</span>
        `;
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copier</span>
          `;
        }, 2000);
      } catch {
        // fallback
      }
    };

    header.appendChild(langContainer);
    header.appendChild(copyBtn);
    card.appendChild(header);

    // Contenu du code pré-formaté
    const pre = document.createElement('pre');
    pre.className = 'knit-code-pre';
    const codeEl = document.createElement('code');
    codeEl.className = `knit-code-content language-${this.lang}`;
    codeEl.textContent = this.code;
    pre.appendChild(codeEl);
    card.appendChild(pre);

    // Déclencher le mode source au mousedown et au click
    const activateSource = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.knit-code-copy-btn')) return;
      e.preventDefault();
      e.stopPropagation();

      const rect = card.getBoundingClientRect();
      const relativeY = Math.max(0, e.clientY - rect.top - 24);
      const lineIdx = Math.floor(relativeY / 20);

      const doc = view.state.doc;
      const firstLine = doc.lineAt(this.from);
      const codeLinesCount = Math.max(1, this.code.split(/\r?\n/).length);
      const targetLineNum = Math.min(
        doc.lines,
        firstLine.number + 1 + Math.min(lineIdx, codeLinesCount - 1)
      );
      const targetLine = doc.line(targetLineNum);

      view.dispatch({
        selection: { anchor: targetLine.from },
        scrollIntoView: true,
      });
      view.focus();
    };

    card.onmousedown = activateSource;
    card.onclick = activateSource;

    return card;
  }
}

/**
 * 7. Widget d'affichage immersif d'images Markdown (![alt](url))
 */
class ImageCardWidget extends WidgetType {
  private alt: string;
  private url: string;
  private from: number;
  private to: number;
  private ro?: ResizeObserver;

  constructor(alt: string, url: string, from: number, to: number) {
    super();
    this.alt = alt;
    this.url = url;
    this.from = from;
    this.to = to;
  }

  eq(other: ImageCardWidget) {
    return (
      other.alt === this.alt &&
      other.url === this.url &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  get estimatedHeight(): number {
    return 260;
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
    card.className = 'knit-preview-image-card';
    card.title = "Cliquer sur l'image pour modifier le lien Markdown";

    this.ro = new ResizeObserver(() => {
      view.requestMeasure();
    });
    this.ro.observe(card);

    const img = document.createElement('img');
    img.className = 'knit-preview-img';
    img.alt = this.alt;
    img.src = this.url;
    img.loading = 'lazy';

    img.onload = () => {
      view.requestMeasure();
    };

    img.onerror = () => {
      view.requestMeasure();
      card.innerHTML = `
        <div class="knit-image-fallback">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <div class="knit-image-fallback-text">
            <span class="knit-image-fallback-title">${this.alt || 'Image introuvable'}</span>
            <span class="knit-image-fallback-url">${this.url}</span>
          </div>
        </div>
      `;
    };

    card.appendChild(img);

    if (this.alt && this.alt.trim().length > 0) {
      const caption = document.createElement('div');
      caption.className = 'knit-preview-image-caption';
      caption.textContent = this.alt;
      card.appendChild(caption);
    }

    card.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: this.from },
        scrollIntoView: true,
      });
      view.focus();
    };

    return card;
  }
}

function getCalloutIcon(type: string): string {
  switch (type) {
    case 'tip':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
    case 'warning':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    case 'important':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    case 'caution':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    case 'note':
    default:
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }
}

class CalloutHeaderWidget extends WidgetType {
  private type: string;
  private title: string;
  private from: number;

  constructor(type: string, title: string, from: number) {
    super();
    this.type = type;
    this.title = title || type.charAt(0).toUpperCase() + type.slice(1);
    this.from = from;
  }

  eq(other: CalloutHeaderWidget) {
    return other.type === this.type && other.title === this.title && other.from === this.from;
  }

  toDOM(view: EditorView): HTMLElement {
    const header = document.createElement('div');
    header.className = 'knit-callout-header-content';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'knit-callout-icon';
    iconSpan.innerHTML = getCalloutIcon(this.type);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'knit-callout-title';
    titleSpan.textContent = this.title;

    header.appendChild(iconSpan);
    header.appendChild(titleSpan);

    header.onclick = () => {
      view.dispatch({ selection: { anchor: this.from } });
      view.focus();
    };

    return header;
  }
}

interface DecItem {
  from: number;
  to: number;
  deco: Decoration;
  isLine?: boolean;
}

// Remplacement vide standard CodeMirror 6 pour masquer les balises avec 100% de fidélité métrique
const emptyReplace = Decoration.replace({});

/**
 * Extension Obsidian-style Live Preview pour CodeMirror 6 :
 * - Mode visuel en lecture :
 *   - Remplacement du frontmatter YAML par la carte de propriétés
 *   - Remplacement des tableaux Markdown par de vraies tables HTML interactives
 *   - Masquage des marqueurs (#, **, *, `, ~~, [text](url), [[target|alias]])
 *   - Rendu des tâches sans tiret avec texte barré automatique
 *   - Pilles interactives pour mentions @user, dates @YYYY-MM-DD et tags #tag
 * - Mode édition au curseur : dès que le curseur est placé sur un bloc/ligne,
 *   la syntaxe Markdown brute réapparaît instantanément pour modification exacte.
 */
function buildLivePreviewDecorations(state: EditorState): DecorationSet {
  try {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = state.doc;
    const sel = state.selection.main;

    // 1. Détection du Frontmatter YAML (--- ... ---)
    let fmStart = -1;
    let fmEnd = -1;
    if (doc.lines >= 2 && doc.line(1).text.trim() === '---') {
      fmStart = 1;
      for (let i = 2; i <= doc.lines; i++) {
        if (doc.line(i).text.trim() === '---') {
          fmEnd = i;
          break;
        }
      }
    }

    // 2. Calcul du nombre de tâches pour la barre sous le premier H1
    let totalTasks = 0;
    let completedTasks = 0;
    let firstH1LineEnd = -1;

    for (let i = 1; i <= doc.lines; i++) {
      if (fmStart !== -1 && i >= fmStart && i <= fmEnd) continue;

      const line = doc.line(i);
      const text = line.text;
      const trimmed = text.trim();

      if (firstH1LineEnd === -1 && trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
        firstH1LineEnd = line.to;
      }

      const taskMatch = text.match(/^(\s*-\s*\[)([ xX/\-?>!])(\])\s*/);
      if (taskMatch) {
        totalTasks++;
        const st = taskMatch[2];
        if (st === 'x' || st === 'X') completedTasks++;
      }
    }

    const lineDecorations: DecItem[] = [];
    const rangeDecorations: DecItem[] = [];

    // Barre de progression sous le premier H1
    if (totalTasks > 0 && firstH1LineEnd !== -1) {
      rangeDecorations.push({
        from: firstH1LineEnd,
        to: firstH1LineEnd,
        deco: Decoration.widget({
          widget: new ProgressBarWidget(completedTasks, totalTasks),
          side: 1,
          block: true,
        }),
      });
    }

    // 3. Traitement du Frontmatter YAML -> Carte de Propriétés
    if (fmStart !== -1 && fmEnd !== -1) {
      const fmLineStart = doc.line(fmStart);
      const fmLineEnd = doc.line(fmEnd);
      const isCursorInFm = sel.from <= fmLineEnd.to && sel.to >= fmLineStart.from;

      if (!isCursorInFm) {
        const fmText = doc.sliceString(fmLineStart.from, fmLineEnd.to);
        rangeDecorations.push({
          from: fmLineStart.from,
          to: fmLineEnd.to,
          deco: Decoration.replace({
            widget: new FrontmatterPropertiesWidget(fmText, fmLineStart.from, fmLineEnd.to),
            block: true,
          }),
        });
      }
    }

    // 4. Décoration séquentielle des lignes du document
    let lineNum = 1;
    let activeCalloutType: string | null = null;

    while (lineNum <= doc.lines) {
      // Si la ligne fait partie du frontmatter YAML
      if (fmStart !== -1 && lineNum >= fmStart && lineNum <= fmEnd) {
        lineNum++;
        continue;
      }

      const line = doc.line(lineNum);
      const lineText = line.text;
      const isCursorOnLine = sel.from <= line.to && sel.to >= line.from;

      // A. Tableaux Markdown GFM -> Carte HTML Visuelle Interactive
      const isTableLine = /^\s*\|.*\|\s*$/.test(lineText.trim());
      if (isTableLine) {
        // Détecter l'ensemble des lignes consécutives du tableau
        let tableEndLine = lineNum;
        while (tableEndLine <= doc.lines && /^\s*\|.*\|\s*$/.test(doc.line(tableEndLine).text.trim())) {
          tableEndLine++;
        }
        tableEndLine--; // Dernière ligne du tableau

        const tableStartPos = line.from;
        const tableEndPos = doc.line(tableEndLine).to;
        const isCursorInTable = sel.from <= tableEndPos && sel.to >= tableStartPos;

        if (!isCursorInTable && tableEndLine >= lineNum + 1) {
          // Curseur hors du tableau : Remplacement par la carte Table HTML riche
          const fullTableText = doc.sliceString(tableStartPos, tableEndPos);
          rangeDecorations.push({
            from: tableStartPos,
            to: tableEndPos,
            deco: Decoration.replace({
              widget: new TableCardWidget(fullTableText, tableStartPos, tableEndPos, lineNum),
              block: true,
            }),
          });
          lineNum = tableEndLine + 1;
          continue;
        } else {
          // Curseur DANS le tableau : affichage de TOUTES les lignes en mode édition fluide
          for (let l = lineNum; l <= tableEndLine; l++) {
            const rowLine = doc.line(l);
            const isTableDelimiter = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(rowLine.text.trim());
            if (isTableDelimiter) {
              lineDecorations.push({
                from: rowLine.from,
                to: rowLine.from,
                deco: Decoration.line({ class: 'knit-table-delimiter-line' }),
                isLine: true,
              });
            } else {
              const isHeader = l === lineNum;
              lineDecorations.push({
                from: rowLine.from,
                to: rowLine.from,
                deco: Decoration.line({
                  class: isHeader ? 'knit-table-header-line' : 'knit-table-row-line',
                }),
                isLine: true,
              });
            }
          }
          lineNum = tableEndLine + 1;
          continue;
        }
      }

      // B. Blocs de code (```lang ... ```)
      const codeFenceMatch = lineText.match(/^```([a-zA-Z0-9_+#.-]*)\s*$/);
      if (codeFenceMatch) {
        const lang = codeFenceMatch[1].trim();
        // Laisser mermaidExtension gérer ```mermaid
        if (lang.toLowerCase() !== 'mermaid') {
          let endLine = lineNum + 1;
          while (endLine <= doc.lines && !doc.line(endLine).text.trim().startsWith('```')) {
            endLine++;
          }

          if (endLine <= doc.lines) {
            const codeLines: string[] = [];
            for (let l = lineNum + 1; l < endLine; l++) {
              codeLines.push(doc.line(l).text);
            }
            const fullCode = codeLines.join('\n');

            const codeStartPos = line.from;
            const codeEndPos = doc.line(endLine).to;
            const isCursorInCodeBlock = sel.from <= codeEndPos && sel.to >= codeStartPos;

            if (!isCursorInCodeBlock) {
              // Curseur hors du bloc : Remplacement complet par la carte CodeBlockCardWidget unifiée (comme les tableaux)
              rangeDecorations.push({
                from: codeStartPos,
                to: codeEndPos,
                deco: Decoration.replace({
                  widget: new CodeBlockCardWidget(lang, fullCode, codeStartPos, codeEndPos),
                  block: true,
                }),
              });
              lineNum = endLine + 1;
              continue;
            } else {
              // Curseur DANS le bloc : affichage de TOUTES les lignes en mode source fluide
              // 1. Ligne d'en-tête (```lang)
              lineDecorations.push({
                from: line.from,
                to: line.from,
                deco: Decoration.line({ class: 'knit-code-line knit-code-header-line' }),
                isLine: true,
              });

              // 2. Lignes internes de code avec styling propre
              for (let l = lineNum + 1; l < endLine; l++) {
                const codeLine = doc.line(l);
                lineDecorations.push({
                  from: codeLine.from,
                  to: codeLine.from,
                  deco: Decoration.line({ class: 'knit-code-line knit-code-body-line' }),
                  isLine: true,
                });
              }

              // 3. Ligne de fermeture (```)
              const closeLine = doc.line(endLine);
              lineDecorations.push({
                from: closeLine.from,
                to: closeLine.from,
                deco: Decoration.line({ class: 'knit-code-line knit-code-footer-line' }),
                isLine: true,
              });

              lineNum = endLine + 1;
              continue;
            }
          }
        }
      }

      // C. Callouts GFM (> [!NOTE]) et Citations (> texte)
      const calloutHeaderMatch = lineText.match(/^\s*>\s*\[!([a-zA-Z]+)\]\s*(.*)$/);
      if (calloutHeaderMatch) {
        const rawType = calloutHeaderMatch[1].toLowerCase();
        let normalizedType = 'note';
        if (['note', 'info'].includes(rawType)) normalizedType = 'note';
        else if (['tip', 'hint'].includes(rawType)) normalizedType = 'tip';
        else if (['warning', 'warn', 'attention'].includes(rawType)) normalizedType = 'warning';
        else if (['important'].includes(rawType)) normalizedType = 'important';
        else if (['caution', 'danger', 'error'].includes(rawType)) normalizedType = 'caution';
        else normalizedType = rawType;

        activeCalloutType = normalizedType;
        const customTitle = calloutHeaderMatch[2].trim();
        const isNextLineInCallout = lineNum < doc.lines && /^\s*>/.test(doc.line(lineNum + 1).text);

        lineDecorations.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({
            class: `knit-callout-line knit-callout-header knit-callout-${normalizedType}${!isNextLineInCallout ? ' knit-callout-end' : ''}`,
          }),
          isLine: true,
        });

        if (!isCursorOnLine && line.from < line.to) {
          rangeDecorations.push({
            from: line.from,
            to: line.to,
            deco: Decoration.replace({
              widget: new CalloutHeaderWidget(normalizedType, customTitle, line.from),
            }),
          });
        }

        if (!isNextLineInCallout) {
          activeCalloutType = null;
        }

        lineNum++;
        continue;
      }

      const quoteMatch = lineText.match(/^(\s*>\s?)(.*)$/);
      if (quoteMatch) {
        const prefixLen = quoteMatch[1].length;
        const isNextLineInQuote = lineNum < doc.lines && /^\s*>/.test(doc.line(lineNum + 1).text);

        if (activeCalloutType) {
          lineDecorations.push({
            from: line.from,
            to: line.from,
            deco: Decoration.line({
              class: `knit-callout-line knit-callout-body knit-callout-${activeCalloutType}${!isNextLineInQuote ? ' knit-callout-end' : ''}`,
            }),
            isLine: true,
          });
        } else {
          lineDecorations.push({
            from: line.from,
            to: line.from,
            deco: Decoration.line({
              class: `knit-blockquote-line${!isNextLineInQuote ? ' knit-blockquote-end' : ''}`,
            }),
            isLine: true,
          });
        }

        if (!isCursorOnLine && prefixLen > 0 && line.from + prefixLen <= line.to) {
          rangeDecorations.push({
            from: line.from,
            to: line.from + prefixLen,
            deco: emptyReplace,
          });
        }

        if (!isNextLineInQuote) {
          activeCalloutType = null;
        }
      } else {
        activeCalloutType = null;
      }

      // D. Séparateurs horizontaux (--- ou ***) hors curseur
      const hrMatch = lineText.match(/^(\s*[-*_]\s*){3,}$/);
      if (hrMatch && !isCursorOnLine && line.from < line.to) {
        rangeDecorations.push({
          from: line.from,
          to: line.to,
          deco: Decoration.replace({
            widget: new DividerWidget(),
          }),
        });
        lineNum++;
        continue;
      }

      // D2. Images Markdown standalone (![alt](url))
      const imageMatch = lineText.match(/^(\s*)!\[(.*?)\]\((.*?)\)\s*$/);
      if (imageMatch && !isCursorOnLine && line.from < line.to) {
        const altText = imageMatch[2];
        const imageUrl = imageMatch[3].trim().replace(/^<|>$/g, '');
        rangeDecorations.push({
          from: line.from,
          to: line.to,
          deco: Decoration.replace({
            widget: new ImageCardWidget(altText, imageUrl, line.from, line.to),
            block: true,
          }),
        });
        lineNum++;
        continue;
      }

      // E. Titres Markdown (#, ##, ###, ####, #####, ######)
      const headingMatch = lineText.match(/^(#{1,6})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        lineDecorations.push({
          from: line.from,
          to: line.from,
          deco: Decoration.line({ class: `knit-line-h${level}` }),
          isLine: true,
        });

        if (!isCursorOnLine) {
          const prefixLen = headingMatch[1].length + 1;
          if (prefixLen > 0 && line.from + prefixLen <= line.to) {
            rangeDecorations.push({
              from: line.from,
              to: line.from + prefixLen,
              deco: emptyReplace,
            });
          }
        }
      }

      // F. Cases à cocher étendues (- [ ]) avec masquage du tiret et texte barré
      const taskMatch = lineText.match(/^(\s*)(-\s*)(\[[ xX/\-?>!]\])(\s*)/);
      if (taskMatch && !isCursorOnLine) {
        const indentLen = taskMatch[1].length;
        const dashLen = taskMatch[2].length;
        const boxLen = taskMatch[3].length;
        const rawChar = taskMatch[3].charAt(1);
        const statusChar = (rawChar.toLowerCase() === 'x' ? 'x' : rawChar) as TaskStatus;

        // Masquer le tiret "- " pour un alignement épuré Obsidian
        if (dashLen > 0) {
          rangeDecorations.push({
            from: line.from + indentLen,
            to: line.from + indentLen + dashLen,
            deco: emptyReplace,
          });
        }

        const checkFrom = line.from + indentLen + dashLen;
        const checkTo = checkFrom + boxLen;

        if (checkFrom < checkTo) {
          rangeDecorations.push({
            from: checkFrom,
            to: checkTo,
            deco: Decoration.replace({
              widget: new CheckboxWidget(statusChar, checkFrom, checkTo),
            }),
          });
        }

        // Texte barré et estompé si tâche terminée (- [x]) ou annulée (- [-])
        const afterBox = checkTo + taskMatch[4].length;
        if (afterBox < line.to) {
          if (statusChar === 'x') {
            rangeDecorations.push({
              from: afterBox,
              to: line.to,
              deco: Decoration.mark({ class: 'knit-task-done-text' }),
            });
          } else if (statusChar === '-') {
            rangeDecorations.push({
              from: afterBox,
              to: line.to,
              deco: Decoration.mark({ class: 'knit-task-cancelled-text' }),
            });
          }
        }
      }

      // G. Priorités inline (!p1, !p2, !p3)
      const prioMatch = lineText.match(/!(p[1-3])\b/i);
      if (prioMatch && !isCursorOnLine) {
        const prioLevel = prioMatch[1].toLowerCase() as 'p1' | 'p2' | 'p3';
        const prioIdx = lineText.indexOf(prioMatch[0]);
        const prioFrom = line.from + prioIdx;
        const prioTo = prioFrom + prioMatch[0].length;

        if (prioFrom < prioTo) {
          rangeDecorations.push({
            from: prioFrom,
            to: prioTo,
            deco: Decoration.replace({
              widget: new PriorityWidget(prioLevel, prioFrom),
            }),
          });
        }
      }

      // H. Éléments inline en Live Preview (seulement si curseur hors de la ligne)
      if (!isCursorOnLine && !headingMatch) {
        const lineStart = line.from;
        const occupiedRanges: [number, number][] = [];

        const isOverlap = (s: number, e: number) => {
          return occupiedRanges.some(([os, oe]) => Math.max(s, os) < Math.min(e, oe));
        };

        // 1. Code inline `code`
        const codeRegex = /`([^`\n]+)`/g;
        let cm: RegExpExecArray | null;
        while ((cm = codeRegex.exec(lineText)) !== null) {
          const start = lineStart + cm.index;
          const end = start + cm[0].length;
          if (end - start > 2 && !isOverlap(start, end)) {
            occupiedRanges.push([start, end]);
            rangeDecorations.push({
              from: start,
              to: start + 1,
              deco: emptyReplace,
            });
            rangeDecorations.push({
              from: start + 1,
              to: end - 1,
              deco: Decoration.mark({ class: 'knit-preview-code' }),
            });
            rangeDecorations.push({
              from: end - 1,
              to: end,
              deco: emptyReplace,
            });
          }
        }

        // 2. Liens Markdown classiques [Label](url)
        const mdLinkRegex = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;
        let ml: RegExpExecArray | null;
        while ((ml = mdLinkRegex.exec(lineText)) !== null) {
          const label = ml[1];
          const start = lineStart + ml.index;
          const labelStart = start + 1;
          const labelEnd = labelStart + label.length;
          const end = start + ml[0].length;

          if (label.length > 0 && !isOverlap(start, end)) {
            occupiedRanges.push([start, end]);
            rangeDecorations.push({
              from: start,
              to: labelStart,
              deco: emptyReplace,
            });
            rangeDecorations.push({
              from: labelStart,
              to: labelEnd,
              deco: Decoration.mark({ class: 'knit-preview-link', attributes: { 'data-target': ml[2].trim() } }),
            });
            rangeDecorations.push({
              from: labelEnd,
              to: end,
              deco: emptyReplace,
            });
          }
        }

        // 3. Gras **texte** ou __texte__
        const boldRegex = /(\*\*|__)([^\n]+?)\1/g;
        let bm: RegExpExecArray | null;
        while ((bm = boldRegex.exec(lineText)) !== null) {
          const start = lineStart + bm.index;
          const end = start + bm[0].length;
          if (end - start > 4 && !isOverlap(start, end)) {
            occupiedRanges.push([start, end]);
            rangeDecorations.push({
              from: start,
              to: start + 2,
              deco: emptyReplace,
            });
            rangeDecorations.push({
              from: start + 2,
              to: end - 2,
              deco: Decoration.mark({ class: 'knit-preview-bold' }),
            });
            rangeDecorations.push({
              from: end - 2,
              to: end,
              deco: emptyReplace,
            });
          }
        }

        // 4. Italique *texte* ou _texte_
        const italicRegex = /(?:^|[^*])(\*([^*\n]+)\*)(?!\*)|(?:^|[^_])(_([^_\n]+)_)(?!_)/g;
        let im: RegExpExecArray | null;
        while ((im = italicRegex.exec(lineText)) !== null) {
          const fullMatch = im[1] || im[3];
          if (!fullMatch) continue;
          const matchOffset = im[0].indexOf(fullMatch);
          const start = lineStart + im.index + matchOffset;
          const end = start + fullMatch.length;
          if (end - start > 2 && !isOverlap(start, end)) {
            occupiedRanges.push([start, end]);
            rangeDecorations.push({
              from: start,
              to: start + 1,
              deco: emptyReplace,
            });
            rangeDecorations.push({
              from: start + 1,
              to: end - 1,
              deco: Decoration.mark({ class: 'knit-preview-italic' }),
            });
            rangeDecorations.push({
              from: end - 1,
              to: end,
              deco: emptyReplace,
            });
          }
        }

        // 5. Barré ~~texte~~
        const strikeRegex = /~~([^~\n]+?)~~/g;
        let sm: RegExpExecArray | null;
        while ((sm = strikeRegex.exec(lineText)) !== null) {
          const start = lineStart + sm.index;
          const end = start + sm[0].length;
          if (end - start > 4 && !isOverlap(start, end)) {
            occupiedRanges.push([start, end]);
            rangeDecorations.push({
              from: start,
              to: start + 2,
              deco: emptyReplace,
            });
            rangeDecorations.push({
              from: start + 2,
              to: end - 2,
              deco: Decoration.mark({ class: 'knit-preview-strikethrough' }),
            });
            rangeDecorations.push({
              from: end - 2,
              to: end,
              deco: emptyReplace,
            });
          }
        }

        // 6. WikiLinks [[Note]] ou [[Note|Alias]]
        const wikiRegex = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;
        let wm: RegExpExecArray | null;
        while ((wm = wikiRegex.exec(lineText)) !== null) {
          const start = lineStart + wm.index;
          const end = start + wm[0].length;
          const target = wm[1];
          const alias = wm[2];

          if (end - start > 4 && !isOverlap(start, end)) {
            occupiedRanges.push([start, end]);

            if (alias !== undefined) {
              const aliasStart = start + 2 + target.length + 1;
              const aliasEnd = aliasStart + alias.length;

              rangeDecorations.push({
                from: start,
                to: aliasStart,
                deco: emptyReplace,
              });
              rangeDecorations.push({
                from: aliasStart,
                to: aliasEnd,
                deco: Decoration.mark({ class: 'knit-preview-wikilink', attributes: { 'data-target': target } }),
              });
              rangeDecorations.push({
                from: aliasEnd,
                to: end,
                deco: emptyReplace,
              });
            } else {
              const targetStart = start + 2;
              const targetEnd = end - 2;

              rangeDecorations.push({
                from: start,
                to: targetStart,
                deco: emptyReplace,
              });
              rangeDecorations.push({
                from: targetStart,
                to: targetEnd,
                deco: Decoration.mark({ class: 'knit-preview-wikilink', attributes: { 'data-target': target } }),
              });
              rangeDecorations.push({
                from: targetEnd,
                to: end,
                deco: emptyReplace,
              });
            }
          }
        }

        // 7. Mentions collaborateurs @collaborateur et @vault
        const mentionRegex = /(?:^|\s)@([a-zA-Z0-9_.-/]+)/g;
        let mm: RegExpExecArray | null;
        while ((mm = mentionRegex.exec(lineText)) !== null) {
          const matchOffset = mm[0].indexOf('@');
          const start = lineStart + mm.index + matchOffset;
          const end = start + mm[1].length + 1;
          if (!isOverlap(start, end)) {
            occupiedRanges.push([start, end]);
            rangeDecorations.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'knit-preview-mention' }),
            });
          }
        }

        // 8. Dates et échéances @YYYY-MM-DD
        const dateRegex = /(?:^|\s)@(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}(?:-\d{2}:\d{2})?)?)/g;
        let dm: RegExpExecArray | null;
        while ((dm = dateRegex.exec(lineText)) !== null) {
          const matchOffset = dm[0].indexOf('@');
          const start = lineStart + dm.index + matchOffset;
          const end = start + dm[1].length + 1;
          if (!isOverlap(start, end)) {
            occupiedRanges.push([start, end]);
            rangeDecorations.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'knit-preview-date' }),
            });
          }
        }

        // 9. Tags #tag
        const tagRegex = /(?:^|\s)#([a-zA-Z0-9_/-]+)/g;
        let tm: RegExpExecArray | null;
        while ((tm = tagRegex.exec(lineText)) !== null) {
          const matchOffset = tm[0].indexOf('#');
          const start = lineStart + tm.index + matchOffset;
          const end = start + tm[1].length + 1;
          if (!isOverlap(start, end)) {
            occupiedRanges.push([start, end]);
            rangeDecorations.push({
              from: start,
              to: end,
              deco: Decoration.mark({ class: 'knit-preview-tag' }),
            });
          }
        }
      }

      lineNum++;
    }

    // Tri strict pour CodeMirror 6 RangeSetBuilder :
    const allDecorations = [...lineDecorations, ...rangeDecorations];
    allDecorations.sort((a, b) => {
      if (a.from !== b.from) return a.from - b.from;
      if (a.isLine && !b.isLine) return -1;
      if (!a.isLine && b.isLine) return 1;
      return a.to - b.to;
    });

    let lastFrom = -1;
    let lastTo = -1;

    for (const item of allDecorations) {
      if (item.from > item.to) continue;
      if (item.from < lastFrom) continue;
      if (item.from === lastFrom && item.to < lastTo) continue;

      try {
        builder.add(item.from, item.to, item.deco);
        lastFrom = item.from;
        lastTo = item.to;
      } catch {
        // Protection anti-collision
      }
    }

    return builder.finish();
  } catch (err) {
    console.warn('Erreur construction décorations LivePreview :', err);
    return Decoration.none;
  }
}

export function createLivePreviewPlugin(): Extension {
  const field = StateField.define<DecorationSet>({
    create(state) {
      return buildLivePreviewDecorations(state);
    },
    update(decorations, tr) {
      if (tr.docChanged || tr.selection) {
        return buildLivePreviewDecorations(tr.state);
      }
      return decorations.map(tr.changes);
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  const measureListener = EditorView.updateListener.of((update) => {
    if (update.docChanged || update.geometryChanged) {
      update.view.requestMeasure();
    }
  });

  return [field, measureListener];
}
