import { WidgetType, type EditorView } from '@codemirror/view';
import { splitTableRow, renderSimpleMarkdown } from '../../../../utils';

/**
 * 6. Rendu immersif des Tableaux Markdown GFM (Table Card Widget)
 */
export class TableCardWidget extends WidgetType {
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
