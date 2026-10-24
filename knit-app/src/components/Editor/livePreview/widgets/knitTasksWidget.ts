import { WidgetType, type EditorView } from '@codemirror/view';
import { vaultStore } from '../../../../stores/vaultStore';
import { tabStore } from '../../../../stores/tabStore';
import type { IndexedInlineTask, TaskStatus } from '../../../../types';
import {
  createDynamicBlockShell,
  focusBlockSource,
  shieldWidgetInteraction,
} from '../../../../utils/dynamicBlockUtils';
import { cycleTaskStatus, taskStatusLabel } from '../../../../utils/kanbanParser';
import { parseBlockOptions } from '../../../../utils/queryEngine';
import { bindHoverPreviewTarget, clearHoverPreview } from '../../../../utils';

/** Ordre stable : chemin A→Z puis n° de ligne (un fichier ne « saute » plus après une coche). */
function sortInlineTasks(tasks: IndexedInlineTask[]): IndexedInlineTask[] {
  return [...tasks].sort((a, b) => {
    const byPath = a.path.localeCompare(b.path, 'fr', { sensitivity: 'base' });
    if (byPath !== 0) return byPath;
    return a.lineIndex - b.lineIndex;
  });
}

function statusMatchesFilter(status: string, statusFilter: string): boolean {
  if (!statusFilter || statusFilter === 'all') return true;
  const s = status === 'x' || status.toLowerCase() === 'x' ? 'x' : status;
  if (statusFilter === 'todo') return s === ' ' || s === '';
  if (statusFilter === 'done') return s === 'x';
  return s === statusFilter;
}

function filterHint(statusFilter: string, fromFolder: string): string {
  const scope = fromFolder ? `dans « ${fromFolder} »` : 'du coffre';
  if (statusFilter === 'todo') {
    return `Filtre : à faire ${scope}. Cocher retire la tâche ici (fichier source mis à jour). Ordre : fichiers A→Z, puis ligne.`;
  }
  if (statusFilter === 'done') {
    return `Filtre : terminées ${scope}. Décocher retire la tâche de cette liste.`;
  }
  return `Toutes les tâches ${scope}. Ordre fixe (fichiers A→Z) — cocher ne réordonne pas les groupes.`;
}

/**
 * Bloc dynamique knit-tasks : agrégateur transversal de cases - [ ] (B-031i)
 */
export class KnitTasksWidget extends WidgetType {
  private code: string;
  private from: number;
  private to: number;
  private ro?: ResizeObserver;
  private unsubIndex?: () => void;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressIndexRefreshUntil = 0;

  constructor(code: string, from: number, to: number, _indexVersion?: number) {
    super();
    this.code = code;
    this.from = from;
    this.to = to;
  }

  eq(other: KnitTasksWidget): boolean {
    return (
      other.code === this.code &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  get estimatedHeight(): number {
    return 200;
  }

  coordsAt(dom: HTMLElement): DOMRect | null {
    return dom.getBoundingClientRect();
  }

  destroy() {
    if (this.ro) {
      this.ro.disconnect();
      this.ro = undefined;
    }
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.unsubIndex?.();
    this.unsubIndex = undefined;
  }

  toDOM(view: EditorView): HTMLElement {
    const options = parseBlockOptions(this.code);
    const fromFolder = typeof options.from === 'string' ? options.from : '';
    const statusFilter =
      typeof options.status === 'string' ? options.status : 'all';
    const groupBy =
      typeof options.group_by === 'string' ? options.group_by : 'file';

    const { container, resizeObserver } = createDynamicBlockShell(
      'knit-tasks',
      this.from,
      view
    );
    this.ro = resizeObserver;

    const body = document.createElement('div');
    body.className = 'knit-dynamic-body';
    container.appendChild(body);

    let visibleTasks: IndexedInlineTask[] = [];

    const paint = async (quiet: boolean) => {
      const scrollTop = quiet ? view.scrollDOM.scrollTop : null;
      const target =
        (container.querySelector('.knit-dynamic-body') as HTMLElement) || body;

      if (!quiet) {
        target.replaceChildren();
        const loading = document.createElement('p');
        loading.className = 'knit-dynamic-empty';
        loading.textContent = 'Chargement des tâches…';
        target.appendChild(loading);
      }

      try {
        const raw = await vaultStore.collectInlineTasks(
          fromFolder || undefined,
          statusFilter
        );
        visibleTasks = sortInlineTasks(raw);

        const next = document.createElement('div');
        next.className = 'knit-dynamic-body';
        this.fillBody(next, {
          tasks: visibleTasks,
          fromFolder,
          statusFilter,
          groupBy,
          view,
          getVisible: () => visibleTasks,
          setVisible: (t) => {
            visibleTasks = t;
          },
          onAfterLocalToggle: () => {
            this.suppressIndexRefreshUntil = Date.now() + 700;
          },
        });

        target.replaceWith(next);
        view.requestMeasure();
        if (scrollTop !== null) view.scrollDOM.scrollTop = scrollTop;
      } catch {
        if (!quiet) {
          target.replaceChildren();
          const err = document.createElement('p');
          err.className = 'knit-dynamic-empty';
          err.textContent = 'Impossible de charger les tâches.';
          target.appendChild(err);
        }
      }
    };

    void paint(false);

    this.unsubIndex = vaultStore.subscribeFrontmatterIndex(() => {
      if (Date.now() < this.suppressIndexRefreshUntil) return;
      if (this.refreshTimer) clearTimeout(this.refreshTimer);
      this.refreshTimer = setTimeout(() => {
        this.refreshTimer = null;
        void paint(true);
      }, 120);
    });

    container.addEventListener('dblclick', (e) => {
      e.preventDefault();
      focusBlockSource(view, this.from);
    });
    return container;
  }

  private fillBody(
    body: HTMLElement,
    ctx: {
      tasks: IndexedInlineTask[];
      fromFolder: string;
      statusFilter: string;
      groupBy: string;
      view: EditorView;
      getVisible: () => IndexedInlineTask[];
      setVisible: (t: IndexedInlineTask[]) => void;
      onAfterLocalToggle: () => void;
    }
  ): void {
    const { tasks, fromFolder, statusFilter, groupBy, view } = ctx;

    if (tasks.length === 0) {
      const title = document.createElement('div');
      title.className = 'knit-dynamic-title';
      title.textContent = fromFolder
        ? `Tâches — ${fromFolder}`
        : 'Tâches du coffre';
      body.appendChild(title);

      const hint = document.createElement('p');
      hint.className = 'knit-tasks-hint';
      hint.textContent = filterHint(statusFilter, fromFolder);
      body.appendChild(hint);

      const empty = document.createElement('p');
      empty.className = 'knit-dynamic-empty';
      empty.textContent =
        statusFilter === 'todo'
          ? 'Aucune tâche à faire.'
          : 'Aucune tâche trouvée.';
      body.appendChild(empty);
      return;
    }

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

    const hint = document.createElement('p');
    hint.className = 'knit-tasks-hint';
    hint.textContent = filterHint(statusFilter, fromFolder);

    const progressTrack = document.createElement('div');
    progressTrack.className = 'knit-tasks-progress-track';
    const progressBar = document.createElement('div');
    progressBar.className = 'knit-tasks-progress-bar';
    progressTrack.appendChild(progressBar);

    const updateProgress = () => {
      const list = ctx.getVisible();
      if (statusFilter === 'todo') {
        badge.textContent = `${list.length} à faire`;
        progressBar.style.width = '0%';
        return;
      }
      if (list.length === 0) {
        badge.textContent = '0';
        progressBar.style.width = '0%';
        return;
      }
      const doneCount = list.filter((t) => t.status.toLowerCase() === 'x').length;
      const pct = Math.round((doneCount / list.length) * 100);
      badge.textContent = `${doneCount}/${list.length} terminées (${pct}%)`;
      progressBar.style.width = `${pct}%`;
    };
    updateProgress();

    body.appendChild(titleRow);
    body.appendChild(hint);
    body.appendChild(progressTrack);

    const removeItemFromDom = (item: IndexedInlineTask) => {
      const key = `${item.path}:${item.lineIndex}`;
      const found = Array.from(body.querySelectorAll('.knit-tasks-item')).find(
        (el) => (el as HTMLElement).dataset.taskKey === key
      );
      if (!found) return;
      const group = found.closest('.knit-tasks-group');
      found.remove();
      ctx.setVisible(
        ctx
          .getVisible()
          .filter((t) => !(t.path === item.path && t.lineIndex === item.lineIndex))
      );
      if (group && !group.querySelector('.knit-tasks-item')) {
        group.remove();
      }
      updateProgress();
    };

    const bindItem = (item: IndexedInlineTask) =>
      this.renderTaskItem(item, view, {
        statusFilter,
        onToggled: (next) => {
          ctx.onAfterLocalToggle();
          item.status = next;
          updateProgress();
          if (!statusMatchesFilter(next, statusFilter)) {
            removeItemFromDom(item);
          }
          view.requestMeasure();
        },
      });

    if (groupBy === 'file') {
      const groups = new Map<string, IndexedInlineTask[]>();
      for (const t of tasks) {
        const list = groups.get(t.path) || [];
        list.push(t);
        groups.set(t.path, list);
      }
      const paths = [...groups.keys()].sort((a, b) =>
        a.localeCompare(b, 'fr', { sensitivity: 'base' })
      );
      for (const path of paths) {
        const items = groups.get(path);
        if (!items) continue;
        const group = document.createElement('div');
        group.className = 'knit-tasks-group';

        const header = document.createElement('button');
        header.type = 'button';
        header.className = 'knit-tasks-file knit-btn';
        header.textContent = path;
        header.setAttribute('data-tooltip', `Ouvrir ${path}`);
        bindHoverPreviewTarget(header, path);
        shieldWidgetInteraction(header);
        header.addEventListener('click', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          clearHoverPreview(true);
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
          ul.appendChild(bindItem(item));
        }
        group.appendChild(ul);
        body.appendChild(group);
      }
    } else {
      const ul = document.createElement('ul');
      ul.className = 'knit-tasks-list';
      for (const item of tasks) {
        ul.appendChild(bindItem(item));
      }
      body.appendChild(ul);
    }
  }

  private renderTaskItem(
    item: IndexedInlineTask,
    _view: EditorView,
    opts: {
      statusFilter: string;
      onToggled: (next: TaskStatus) => void;
    }
  ): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'knit-tasks-item';
    li.dataset.taskKey = `${item.path}:${item.lineIndex}`;

    const check = document.createElement('button');
    check.type = 'button';

    const applyStatusVisual = (status: string) => {
      const statusClass =
        status === ' '
          ? 'todo'
          : status === '/'
            ? 'progress'
            : status === 'x'
              ? 'done'
              : 'other';
      check.className = `knit-task-checkbox knit-tasks-check status-${statusClass}`;
      check.setAttribute('data-tooltip', taskStatusLabel(status));
      li.classList.toggle('is-done', status === 'x');
      if (status === 'x') {
        check.innerHTML =
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      } else if (status === '/') {
        check.innerHTML =
          '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20Z" fill="currentColor"/></svg>';
      } else {
        check.innerHTML = '';
      }
    };
    applyStatusVisual(item.status);

    shieldWidgetInteraction(check);
    check.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const next = cycleTaskStatus(item.status);
      const ok = await vaultStore.toggleInlineTask(
        item.path,
        item.lineIndex,
        next
      );
      if (ok) {
        applyStatusVisual(next);
        opts.onToggled(next);
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
