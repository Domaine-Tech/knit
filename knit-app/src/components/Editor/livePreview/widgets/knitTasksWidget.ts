import { WidgetType, type EditorView } from '@codemirror/view';
import { vaultStore } from '../../../../stores/vaultStore';
import { tabStore } from '../../../../stores/tabStore';
import type { IndexedInlineTask } from '../../../../types';
import {
  createDynamicBlockShell,
  focusBlockSource,
} from '../../../../utils/dynamicBlockUtils';
import { parseBlockOptions } from '../../../../utils/queryEngine';

function nextTaskStatus(current: string): string {
  if (current === ' ') return '/';
  if (current === '/') return 'x';
  if (current === 'x') return ' ';
  return ' ';
}

function statusLabel(status: string): string {
  switch (status) {
    case 'x':
      return 'Fait';
    case '/':
      return 'En cours';
    case '-':
      return 'Annulé';
    case '?':
      return 'Question';
    case '>':
      return 'Reporté';
    case '!':
      return 'Urgent';
    default:
      return 'À faire';
  }
}

/**
 * Bloc dynamique knit-tasks : agrégateur transversal de cases - [ ] (B-031i)
 * Charge les tâches de façon asynchrone puis rafraîchit le DOM.
 */
export class KnitTasksWidget extends WidgetType {
  private code: string;
  private from: number;
  private to: number;
  private indexVersion: number;

  constructor(code: string, from: number, to: number, indexVersion: number) {
    super();
    this.code = code;
    this.from = from;
    this.to = to;
    this.indexVersion = indexVersion;
  }

  eq(other: KnitTasksWidget): boolean {
    return (
      other.code === this.code &&
      other.from === this.from &&
      other.to === this.to &&
      other.indexVersion === this.indexVersion
    );
  }

  get estimatedHeight(): number {
    return 200;
  }

  toDOM(view: EditorView): HTMLElement {
    const options = parseBlockOptions(this.code);
    const fromFolder = typeof options.from === 'string' ? options.from : '';
    const statusFilter =
      typeof options.status === 'string' ? options.status : 'all';
    const groupBy =
      typeof options.group_by === 'string' ? options.group_by : 'file';

    const container = createDynamicBlockShell('knit-tasks', this.from, view);
    const body = document.createElement('div');
    body.className = 'knit-dynamic-body';

    const title = document.createElement('div');
    title.className = 'knit-dynamic-title';
    title.textContent = fromFolder
      ? `Tâches — ${fromFolder}`
      : 'Tâches du coffre';
    body.appendChild(title);

    const loading = document.createElement('p');
    loading.className = 'knit-dynamic-empty';
    loading.textContent = 'Chargement des tâches…';
    body.appendChild(loading);
    container.appendChild(body);

    void vaultStore
      .collectInlineTasks(fromFolder || undefined, statusFilter)
      .then((tasks) => {
        loading.remove();
        if (tasks.length === 0) {
          const empty = document.createElement('p');
          empty.className = 'knit-dynamic-empty';
          empty.textContent = 'Aucune tâche trouvée.';
          body.appendChild(empty);
          return;
        }

        // En-tête enrichi avec micro-jauge d'avancement feutrée (Sprint 6bis UX)
        const titleRow = document.createElement('div');
        titleRow.className = 'knit-dynamic-title-row';

        const titleText = document.createElement('div');
        titleText.className = 'knit-dynamic-title';
        titleText.textContent = fromFolder
          ? `Tâches — ${fromFolder}`
          : 'Tâches du coffre';

        const badge = document.createElement('span');
        badge.className = 'knit-tasks-progress-badge';

        titleRow.appendChild(titleText);
        titleRow.appendChild(badge);

        const progressTrack = document.createElement('div');
        progressTrack.className = 'knit-tasks-progress-track';

        const progressBar = document.createElement('div');
        progressBar.className = 'knit-tasks-progress-bar';
        progressTrack.appendChild(progressBar);

        const updateProgress = () => {
          const doneCount = tasks.filter(
            (t) => t.status.toLowerCase() === 'x'
          ).length;
          const pct = Math.round((doneCount / tasks.length) * 100);
          badge.textContent = `${doneCount}/${tasks.length} terminées (${pct}%)`;
          progressBar.style.width = `${pct}%`;
        };

        updateProgress();
        title.replaceWith(titleRow);
        body.insertBefore(progressTrack, titleRow.nextSibling);

        if (groupBy === 'file') {
          const groups = new Map<string, IndexedInlineTask[]>();
          for (const t of tasks) {
            const list = groups.get(t.path) || [];
            list.push(t);
            groups.set(t.path, list);
          }
          for (const [path, items] of groups) {
            const group = document.createElement('div');
            group.className = 'knit-tasks-group';

            const header = document.createElement('button');
            header.type = 'button';
            header.className = 'knit-tasks-file knit-btn';
            header.textContent = path;
            header.setAttribute('data-tooltip', `Ouvrir ${path}`);
            header.addEventListener('mousedown', (e) => {
              if (e.button === 1) e.preventDefault();
            });
            header.addEventListener('click', async (e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                const content = await vaultStore.readFile(path);
                tabStore.openTab(path, false, content);
              } catch {
                tabStore.openTab(path, false);
              }
            });
            group.appendChild(header);

            const ul = document.createElement('ul');
            ul.className = 'knit-tasks-list';
            for (const item of items) {
              ul.appendChild(this.renderTaskItem(item, view, updateProgress));
            }
            group.appendChild(ul);
            body.appendChild(group);
          }
        } else {
          const ul = document.createElement('ul');
          ul.className = 'knit-tasks-list';
          for (const item of tasks) {
            ul.appendChild(this.renderTaskItem(item, view, updateProgress));
          }
          body.appendChild(ul);
        }
        view.requestMeasure();
      });

    container.addEventListener('dblclick', (e) => {
      e.preventDefault();
      focusBlockSource(view, this.from);
    });
    return container;
  }

  private renderTaskItem(
    item: IndexedInlineTask,
    view: EditorView,
    onStatusChange?: () => void
  ): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'knit-tasks-item';

    const check = document.createElement('button');
    check.type = 'button';
    const statusClass =
      item.status === ' '
        ? 'todo'
        : item.status === '/'
          ? 'progress'
          : item.status === 'x'
            ? 'done'
            : 'other';
    check.className = `knit-task-checkbox knit-tasks-check status-${statusClass}`;
    check.setAttribute('data-tooltip', statusLabel(item.status));
    if (item.status === 'x') {
      check.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (item.status === '/') {
      check.innerHTML =
        '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20Z" fill="currentColor"/></svg>';
    } else {
      check.innerHTML = '';
    }

    check.addEventListener('mousedown', (e) => {
      if (e.button === 1) e.preventDefault();
    });
    check.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = nextTaskStatus(item.status);
      const ok = await vaultStore.toggleInlineTask(
        item.path,
        item.lineIndex,
        next
      );
      if (ok) {
        item.status = next;
        check.setAttribute('data-tooltip', statusLabel(next));
        if (next === 'x') {
          check.innerHTML =
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
          check.className =
            'knit-task-checkbox knit-tasks-check status-done';
        } else if (next === '/') {
          check.innerHTML =
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20Z" fill="currentColor"/></svg>';
          check.className =
            'knit-task-checkbox knit-tasks-check status-progress';
        } else {
          check.innerHTML = '';
          check.className =
            'knit-task-checkbox knit-tasks-check status-todo';
        }
        onStatusChange?.();
        view.requestMeasure();
      }
    });

    const text = document.createElement('span');
    text.className = 'knit-tasks-text';
    text.textContent = item.text;

    li.appendChild(check);
    li.appendChild(text);
    return li;
  }
}
