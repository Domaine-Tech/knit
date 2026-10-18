import { WidgetType, type EditorView } from '@codemirror/view';
import { vaultStore } from '../../../../stores/vaultStore';
import { tabStore } from '../../../../stores/tabStore';
import {
  createDynamicBlockShell,
  focusBlockSource,
} from '../../../../utils/dynamicBlockUtils';
import {
  blockOptionsToQueryFilter,
  parseBlockOptions,
} from '../../../../utils/queryEngine';
import { createKnitSelectDom } from '../../../../utils/knitSelect';
import { bindHoverPreviewTarget, clearHoverPreview } from '../../../../utils';

async function openPath(path: string): Promise<void> {
  try {
    const content = await vaultStore.readFile(path);
    tabStore.openTab(path, false, content);
  } catch {
    tabStore.openTab(path, false);
  }
}

/**
 * Bloc dynamique knit-query : tableau Dataview-like (B-031g)
 */
export class KnitQueryWidget extends WidgetType {
  private code: string;
  private from: number;
  private to: number;
  private indexVersion: number;
  private ro?: ResizeObserver;

  constructor(code: string, from: number, to: number, indexVersion: number) {
    super();
    this.code = code;
    this.from = from;
    this.to = to;
    this.indexVersion = indexVersion;
  }

  eq(other: KnitQueryWidget): boolean {
    return (
      other.code === this.code &&
      other.from === this.from &&
      other.to === this.to &&
      other.indexVersion === this.indexVersion
    );
  }

  get estimatedHeight(): number {
    return 180;
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
    const options = parseBlockOptions(this.code);
    const filter = blockOptionsToQueryFilter(options);
    const result = vaultStore.queryFiles(filter);

    const { container, resizeObserver } = createDynamicBlockShell(
      'knit-query',
      this.from,
      view
    );
    this.ro = resizeObserver;
    const body = document.createElement('div');
    body.className = 'knit-dynamic-body';

    const title = document.createElement('div');
    title.className = 'knit-dynamic-title';
    title.textContent = filter.from
      ? `Requête — ${filter.from}`
      : 'Requête Frontmatter';
    body.appendChild(title);

    if (result.rows.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'knit-dynamic-empty';
      empty.textContent = 'Aucun résultat.';
      body.appendChild(empty);
      container.appendChild(body);
      return container;
    }

    const table = document.createElement('table');
    table.className = 'knit-dynamic-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const col of result.columns) {
      const th = document.createElement('th');
      th.textContent = col;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const row of result.rows) {
      const tr = document.createElement('tr');
      for (const col of result.columns) {
        const td = document.createElement('td');
        const value = row.values[col] ?? '';

        if (col === 'titre' || col === 'title' || col === 'path') {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'knit-files-link knit-btn';
          btn.textContent = value || row.title;
          btn.setAttribute('data-tooltip', row.path);
          bindHoverPreviewTarget(btn, row.path);
          btn.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
          });
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            clearHoverPreview(true);
            void openPath(row.path);
          });
          td.appendChild(btn);
        } else if (col === 'statut' || col === 'status') {
          const statuses = [
            'a-faire',
            'en-cours',
            'termine',
            'bloque',
            'annule',
          ];
          const current = value || 'a-faire';
          if (!statuses.includes(current)) {
            statuses.unshift(current);
          }
          const select = createKnitSelectDom({
            value: current,
            options: statuses.map((s) => ({ value: s, label: s })),
            className: 'knit-query-status',
            minWidth: 110,
            stopEditorEvents: true,
            onChange: async (next) => {
              try {
                const content = await vaultStore.readFile(row.path);
                const updated = await vaultStore.updateFrontmatter(
                  content,
                  'statut',
                  next
                );
                await vaultStore.writeFile(row.path, updated);
              } catch (err) {
                console.warn('Impossible de mettre à jour le statut:', err);
              }
            },
          });
          td.appendChild(select);
        } else {
          td.textContent = value;
        }
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    body.appendChild(table);
    container.appendChild(body);

    container.addEventListener('dblclick', (e) => {
      e.preventDefault();
      focusBlockSource(view, this.from);
    });
    return container;
  }
}
