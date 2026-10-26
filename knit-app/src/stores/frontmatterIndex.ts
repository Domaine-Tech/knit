/**
 * Index coffre unifié en mémoire (B-031e + B-057).
 * Hydraté par un seul scan Rust (`get_vault_index`) ou une passe locale (démo Vite).
 * `queryFiles()` reste synchrone sur la Map Frontmatter.
 */

import { invoke } from '@tauri-apps/api/core';
import type {
  FrontmatterIndexEntry,
  IndexedInlineTask,
  IndexedMarkdownSlice,
  RawIndexedMarkdownSlice,
  QueryFilter,
  QueryResult,
  SuggestIndexData,
  VaultIndexData,
  VaultOps,
  CalendarIndexData,
} from '../types';
import {
  findFileMtimeMs,
  getFlatFiles,
  isTauriEnvironment,
  normalizeTaskStatus,
  buildLocalVaultIndex,
  indexMarkdownContentLocal,
  normalizeIndexedMarkdownSlice,
  normalizeVaultIndexData,
} from '../utils';
import { runQuery, listFolderEntries } from '../utils/queryEngine';
import { isDemoVaultPath } from './vaultRegistry';

const TASK_LINE_RE = /^(\s*[-*]\s*)\[([ xX/\-?>!])\](\s+)(.*)$/;

class FrontmatterIndex {
  private entries = new Map<string, FrontmatterIndexEntry>();
  private tasks: IndexedInlineTask[] = [];
  private suggest: SuggestIndexData = { docs: [], headings: [], tags: [] };
  private calendar: CalendarIndexData = { events: [] };
  private generation = 0;
  private building = false;
  private dirty = true;
  private version = 0;
  private listeners = new Set<() => void>();

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.version += 1;
    this.listeners.forEach((l) => l());
  }

  public getVersion(): number {
    return this.version;
  }

  public getGeneration(): number {
    return this.generation;
  }

  public markDirty(): void {
    this.dirty = true;
  }

  public getAll(): FrontmatterIndexEntry[] {
    return Array.from(this.entries.values());
  }

  public get(path: string): FrontmatterIndexEntry | undefined {
    return this.entries.get(path.replace(/\\/g, '/'));
  }

  public getSuggestData(): SuggestIndexData {
    return this.suggest;
  }

  public getCalendarData(): CalendarIndexData {
    return this.calendar;
  }

  public queryFiles(filter: QueryFilter): QueryResult {
    return runQuery(this.entries.values(), filter);
  }

  public listFiles(
    folder: string,
    sort?: string,
    limit?: number
  ): FrontmatterIndexEntry[] {
    return listFolderEntries(this.entries.values(), folder, sort, limit);
  }

  /** Remise à zéro lors d'un changement de coffre (évite fuites d'index). */
  public clear(): void {
    this.entries = new Map();
    this.tasks = [];
    this.suggest = { docs: [], headings: [], tags: [] };
    this.calendar = { events: [] };
    this.generation = 0;
    this.building = false;
    this.dirty = true;
    this.notify();
  }

  public hydrate(data: VaultIndexData): void {
    const next = new Map<string, FrontmatterIndexEntry>();
    for (const entry of data.files) {
      next.set(entry.path.replace(/\\/g, '/'), entry);
    }
    this.entries = next;
    this.tasks = data.tasks;
    this.suggest = data.suggest;
    this.calendar = data.calendar;
    this.generation = data.generation;
    this.dirty = false;
    this.notify();
  }

  private applySlice(slice: IndexedMarkdownSlice): void {
    const key = slice.file.path.replace(/\\/g, '/');
    this.entries.set(key, slice.file);
    this.tasks = [...this.tasks.filter((t) => t.path !== key), ...slice.tasks];
    this.calendar = {
      events: [
        ...this.calendar.events.filter((e) => e.relPath !== key),
        ...slice.calendarEvents,
      ],
    };

    const docs = [
      ...this.suggest.docs.filter((d) => d.rel_path !== key),
      {
        rel_path: key,
        title: slice.file.title,
        doc_type: slice.file.docType,
      },
    ].sort((a, b) => a.rel_path.localeCompare(b.rel_path));

    const headings = [
      ...this.suggest.headings.filter((h) => h.file_rel !== key),
      ...slice.headings,
    ].sort((a, b) => a.file_rel.localeCompare(b.file_rel));

    // Recalcul tags simplifié : retire les anciennes occurrences du fichier via rebuild suggest tags
    // depuis les fileTags du slice + conservation des autres fichiers (approx. via docs).
    const tagCounts: Record<string, number> = {};
    for (const t of this.suggest.tags) {
      tagCounts[t.tag] = t.count;
    }
    // Approximation : on ne décrémente pas précisément ; un rebuild complet corrige.
    for (const tag of slice.fileTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    const tags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

    this.suggest = { docs, headings, tags };
    this.notify();
  }

  public remove(path: string): void {
    const key = path.replace(/\\/g, '/');
    let changed = false;
    if (this.entries.delete(key)) changed = true;
    const nextTasks = this.tasks.filter((t) => t.path !== key);
    if (nextTasks.length !== this.tasks.length) {
      this.tasks = nextTasks;
      changed = true;
    }
    const nextEvents = this.calendar.events.filter((e) => e.relPath !== key);
    if (nextEvents.length !== this.calendar.events.length) {
      this.calendar = { events: nextEvents };
      changed = true;
    }
    const docs = this.suggest.docs.filter((d) => d.rel_path !== key);
    const headings = this.suggest.headings.filter((h) => h.file_rel !== key);
    if (docs.length !== this.suggest.docs.length || headings.length !== this.suggest.headings.length) {
      this.suggest = { ...this.suggest, docs, headings };
      changed = true;
    }
    if (changed) this.notify();
  }

  public async upsert(ops: VaultOps, relPath: string): Promise<void> {
    const key = relPath.replace(/\\/g, '/');
    if (!key.endsWith('.md') && !key.endsWith('KNIT.md') && !key.toLowerCase().endsWith('.markdown')) {
      this.remove(key);
      return;
    }

    try {
      const content = await ops.readFile(key);
      const mtime =
        findFileMtimeMs(ops.files, key) ?? Date.now();

      // Coffre démo = contenus mémoire ; IPC Rust inutile (chemin fictif)
      if (isTauriEnvironment() && ops.currentVaultPath && !isDemoVaultPath(ops.currentVaultPath)) {
        try {
          await invoke<number>('invalidate_vault_index');
          const raw = await invoke<RawIndexedMarkdownSlice>('index_markdown_content', {
            relPath: key,
            content,
            mtime,
          });
          this.applySlice(normalizeIndexedMarkdownSlice(raw));
          return;
        } catch (err: unknown) {
          console.debug('Fallback local pour index_markdown_content :', err);
        }
      }

      this.applySlice(indexMarkdownContentLocal(key, content, mtime));
    } catch {
      this.remove(key);
    }
  }

  /**
   * Reconstruction complète via scan unique Rust (ou passe locale démo).
   */
  public async rebuild(ops: VaultOps): Promise<void> {
    if (this.building) {
      this.dirty = true;
      return;
    }
    this.building = true;
    this.dirty = false;

    try {
      if (
        isTauriEnvironment() &&
        ops.currentVaultPath &&
        !isDemoVaultPath(ops.currentVaultPath)
      ) {
        try {
          await invoke<number>('invalidate_vault_index');
          const raw = await invoke<VaultIndexData>('get_vault_index', {
            vaultPath: ops.currentVaultPath,
          });
          this.hydrate(normalizeVaultIndexData(raw));
          return;
        } catch (err: unknown) {
          console.debug('Fallback local pour get_vault_index :', err);
        }
      }

      // Démo Vite / fallback : une seule passe sur les contenus connus.
      const paths = getFlatFiles(ops.files);
      const contents: Record<string, string> = {};
      const mtimes: Record<string, number> = {};
      const BATCH = 24;

      for (let i = 0; i < paths.length; i += BATCH) {
        const batch = paths.slice(i, i + BATCH);
        await Promise.all(
          batch.map(async (path) => {
            try {
              const content =
                ops.localContents[path] !== undefined
                  ? ops.localContents[path]
                  : await ops.readFile(path);
              contents[path] = content;
              const mt = findFileMtimeMs(ops.files, path);
              if (typeof mt === 'number') mtimes[path] = mt;
            } catch {
              // ignorer
            }
          })
        );
        await new Promise((r) => setTimeout(r, 0));
      }

      // Compléter avec localContents hors arbre (démo)
      for (const [path, content] of Object.entries(ops.localContents)) {
        if (!(path in contents) && path.endsWith('.md')) {
          contents[path] = content;
        }
      }

      this.hydrate(buildLocalVaultIndex(contents, mtimes, this.generation + 1));
    } finally {
      this.building = false;
      if (this.dirty) {
        void this.rebuild(ops);
      }
    }
  }

  /**
   * Filtre les tâches inline déjà indexées (zéro relecture disque).
   */
  public async collectInlineTasks(
    _ops: VaultOps,
    fromFolder?: string,
    statusFilter?: string
  ): Promise<IndexedInlineTask[]> {
    const prefix = (fromFolder || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const filtered = this.tasks.filter((task) => {
      if (prefix && task.path !== prefix && !task.path.startsWith(`${prefix}/`)) {
        return false;
      }
      if (!statusFilter || statusFilter === 'all') return true;
      const status = normalizeTaskStatus(task.status);
      if (statusFilter === 'todo' && status !== ' ') return false;
      if (statusFilter === 'done' && status !== 'x') return false;
      if (
        statusFilter !== 'todo' &&
        statusFilter !== 'done' &&
        status !== statusFilter
      ) {
        return false;
      }
      return true;
    });
    // Ordre déterministe : évite qu'un upsert replace ne place le fichier en bas
    return filtered.sort((a, b) => {
      const byPath = a.path.localeCompare(b.path, 'fr', { sensitivity: 'base' });
      if (byPath !== 0) return byPath;
      return a.lineIndex - b.lineIndex;
    });
  }

  /**
   * Bascule le statut d'une case à cocher dans un fichier (retourne le nouveau contenu).
   */
  public toggleTaskInContent(
    content: string,
    lineIndex: number,
    nextStatus: string
  ): string | null {
    const lines = content.split(/\r?\n/);
    if (lineIndex < 0 || lineIndex >= lines.length) return null;
    const line = lines[lineIndex];
    const m = line.match(TASK_LINE_RE);
    if (!m) return null;
    lines[lineIndex] = `${m[1]}[${nextStatus}]${m[3]}${m[4]}`;
    return lines.join('\n');
  }
}

export const frontmatterIndex = new FrontmatterIndex();
