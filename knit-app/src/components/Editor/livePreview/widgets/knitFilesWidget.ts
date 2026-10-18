import { WidgetType, type EditorView } from '@codemirror/view';
import { vaultStore } from '../../../../stores/vaultStore';
import { tabStore } from '../../../../stores/tabStore';
import type { FrontmatterIndexEntry } from '../../../../types';
import {
  createDocTypeIconSvg,
  createDynamicBlockShell,
  focusBlockSource,
  formatRelativeMtime,
} from '../../../../utils/dynamicBlockUtils';
import { parseBlockOptions } from '../../../../utils/queryEngine';
import { bindHoverPreviewTarget, clearHoverPreview } from '../../../../utils';

async function openIndexedFile(path: string): Promise<void> {
  try {
    const content = await vaultStore.readFile(path);
    tabStore.openTab(path, false, content);
  } catch {
    tabStore.openTab(path, false);
  }
}

function bindFileOpenButton(btn: HTMLButtonElement, path: string): void {
  btn.setAttribute('data-tooltip', path);
  bindHoverPreviewTarget(btn, path);
  btn.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault();
  });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearHoverPreview(true);
    void openIndexedFile(path);
  });
  btn.addEventListener('auxclick', (e) => {
    if (e.button === 1) {
      e.preventDefault();
      clearHoverPreview(true);
      void openIndexedFile(path);
    }
  });
}

function createTitleButton(entry: FrontmatterIndexEntry): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'knit-files-link knit-btn';

  const iconWrap = document.createElement('span');
  iconWrap.className = 'knit-files-icon-wrap';
  iconWrap.appendChild(createDocTypeIconSvg(entry.docType, 14));

  const label = document.createElement('span');
  label.className = 'knit-files-title';
  label.textContent = entry.title;

  btn.appendChild(iconWrap);
  btn.appendChild(label);
  bindFileOpenButton(btn, entry.path);
  return btn;
}

/**
 * Bloc dynamique knit-files : index automatique d'un dossier (B-031f)
 */
export class KnitFilesWidget extends WidgetType {
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

  eq(other: KnitFilesWidget): boolean {
    return (
      other.code === this.code &&
      other.from === this.from &&
      other.to === this.to &&
      other.indexVersion === this.indexVersion
    );
  }

  get estimatedHeight(): number {
    return 160;
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
    const folder = typeof options.folder === 'string' ? options.folder : '';
    const sort = typeof options.sort === 'string' ? options.sort : 'updated desc';
    const limit =
      typeof options.limit === 'number'
        ? options.limit
        : typeof options.limit === 'string'
          ? Number(options.limit) || 20
          : 20;
    const layout = typeof options.layout === 'string' ? options.layout : 'table';

    const entries = vaultStore.listIndexedFiles(folder, sort, limit);
    const { container, resizeObserver } = createDynamicBlockShell(
      'knit-files',
      this.from,
      view
    );
    this.ro = resizeObserver;
    const body = document.createElement('div');
    body.className = 'knit-dynamic-body';

    const title = document.createElement('div');
    title.className = 'knit-dynamic-title';
    title.textContent = folder ? `Fichiers — ${folder}` : 'Fichiers du coffre';
    body.appendChild(title);

    if (entries.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'knit-dynamic-empty';
      empty.textContent = 'Aucun fichier dans ce dossier.';
      body.appendChild(empty);
    } else if (layout === 'list') {
      const ul = document.createElement('ul');
      ul.className = 'knit-files-list';
      for (const entry of entries) {
        const li = document.createElement('li');
        li.appendChild(createTitleButton(entry));
        const meta = document.createElement('span');
        meta.className = 'knit-files-meta';
        meta.textContent = formatRelativeMtime(entry.mtime);
        li.appendChild(meta);
        ul.appendChild(li);
      }
      body.appendChild(ul);
    } else {
      const table = document.createElement('table');
      table.className = 'knit-dynamic-table';
      const thead = document.createElement('thead');
      thead.innerHTML =
        '<tr><th>Titre</th><th>Type</th><th>Mis à jour</th></tr>';
      table.appendChild(thead);
      const tbody = document.createElement('tbody');
      for (const entry of entries) {
        const tr = document.createElement('tr');
        const tdTitle = document.createElement('td');
        tdTitle.appendChild(createTitleButton(entry));

        const tdType = document.createElement('td');
        const typeCell = document.createElement('span');
        typeCell.className = 'knit-files-type';
        typeCell.appendChild(createDocTypeIconSvg(entry.docType, 12));
        const typeLabel = document.createElement('span');
        typeLabel.textContent = entry.docType;
        typeCell.appendChild(typeLabel);
        tdType.appendChild(typeCell);

        const tdMtime = document.createElement('td');
        tdMtime.textContent = formatRelativeMtime(entry.mtime);

        tr.appendChild(tdTitle);
        tr.appendChild(tdType);
        tr.appendChild(tdMtime);
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      body.appendChild(table);
    }

    container.appendChild(body);
    container.addEventListener('dblclick', (e) => {
      e.preventDefault();
      focusBlockSource(view, this.from);
    });
    return container;
  }
}
