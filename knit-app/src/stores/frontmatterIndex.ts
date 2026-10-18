/**
 * Index Frontmatter local en mémoire (B-031e).
 * Alimenté au chargement du coffre et invalidé sur write / reload.
 */

import type { FrontmatterIndexEntry, QueryFilter, QueryResult } from '../types';
import { findFileMtimeMs, getFlatFiles } from '../utils';
import { runQuery, listFolderEntries } from '../utils/queryEngine';
import type { VaultOps } from './vaultOps';

const TASK_LINE_RE = /^(\s*[-*]\s*)\[([ xX/\-?>!])\](\s+)(.*)$/;

function parseFieldMtime(fields: Record<string, string>): number | undefined {
  for (const key of ['updated', 'mtime', 'modified', 'date']) {
    const raw = fields[key];
    if (!raw) continue;
    const parsed = Date.parse(raw);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

/**
 * Résout un mtime : FS (arbre) > champs FM > entrée précédente > maintenant.
 */
function resolveEntryMtime(
  ops: VaultOps,
  path: string,
  fields: Record<string, string>,
  previous?: FrontmatterIndexEntry
): number {
  const fromTree = findFileMtimeMs(ops.files, path);
  if (typeof fromTree === 'number' && Number.isFinite(fromTree)) return fromTree;

  const fromFields = parseFieldMtime(fields);
  if (typeof fromFields === 'number') return fromFields;

  if (previous && Number.isFinite(previous.mtime)) return previous.mtime;

  return Date.now();
}

export interface IndexedInlineTask {
  path: string;
  lineIndex: number;
  status: string;
  text: string;
  rawLine: string;
}

class FrontmatterIndex {
  private entries = new Map<string, FrontmatterIndexEntry>();
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

  public markDirty(): void {
    this.dirty = true;
  }

  public getAll(): FrontmatterIndexEntry[] {
    return Array.from(this.entries.values());
  }

  public get(path: string): FrontmatterIndexEntry | undefined {
    return this.entries.get(path.replace(/\\/g, '/'));
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

  public remove(path: string): void {
    const key = path.replace(/\\/g, '/');
    if (this.entries.delete(key)) {
      this.notify();
    }
  }

  public async upsert(ops: VaultOps, relPath: string): Promise<void> {
    const key = relPath.replace(/\\/g, '/');
    if (!key.endsWith('.md') && !key.endsWith('KNIT.md')) {
      this.remove(key);
      return;
    }

    try {
      const content = await ops.readFile(key);
      const fm = await ops.parseFrontmatter(content);
      const name = key.split('/').pop() || key;
      const title =
        fm.fields.titre ||
        fm.fields.title ||
        name.replace(/\.md$/i, '');
      const docType = fm.fields.type || 'note';
      const fields = { ...fm.fields };
      // Upsert (write / reload) : FS > champ FM > maintenant (écriture fraîche).
      const mtime =
        findFileMtimeMs(ops.files, key) ?? parseFieldMtime(fields) ?? Date.now();

      this.entries.set(key, {
        path: key,
        name,
        title,
        docType,
        mtime,
        fields,
      });
      this.notify();
    } catch {
      this.remove(key);
    }
  }

  /**
   * Reconstruction complète (non bloquante pour l'UI : lots asynchrones).
   */
  public async rebuild(ops: VaultOps): Promise<void> {
    if (this.building) {
      this.dirty = true;
      return;
    }
    this.building = true;
    this.dirty = false;

    try {
      const paths = getFlatFiles(ops.files);
      const next = new Map<string, FrontmatterIndexEntry>();
      const BATCH = 24;

      for (let i = 0; i < paths.length; i += BATCH) {
        const batch = paths.slice(i, i + BATCH);
        await Promise.all(
          batch.map(async (path) => {
            try {
              const content = await ops.readFile(path);
              const fm = await ops.parseFrontmatter(content);
              const name = path.split('/').pop() || path;
              const title =
                fm.fields.titre ||
                fm.fields.title ||
                name.replace(/\.md$/i, '');
              const fields = { ...fm.fields };
              const previous = this.entries.get(path);
              next.set(path, {
                path,
                name,
                title,
                docType: fm.fields.type || 'note',
                mtime: resolveEntryMtime(ops, path, fields, previous),
                fields,
              });
            } catch {
              // Fichier inaccessible : ignorer
            }
          })
        );
        // Yield to event loop between batches
        await new Promise((r) => setTimeout(r, 0));
      }

      this.entries = next;
      this.notify();
    } finally {
      this.building = false;
      if (this.dirty) {
        void this.rebuild(ops);
      }
    }
  }

  /**
   * Collecte les cases à cocher Markdown `- [ ]` dans un sous-ensemble de chemins.
   */
  public async collectInlineTasks(
    ops: VaultOps,
    fromFolder?: string,
    statusFilter?: string
  ): Promise<IndexedInlineTask[]> {
    const prefix = (fromFolder || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const paths = getFlatFiles(ops.files).filter((p) => {
      if (!prefix) return true;
      return p === prefix || p.startsWith(`${prefix}/`);
    });

    const tasks: IndexedInlineTask[] = [];
    const BATCH = 16;

    for (let i = 0; i < paths.length; i += BATCH) {
      const batch = paths.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (path) => {
          try {
            const content = await ops.readFile(path);
            const lines = content.split(/\r?\n/);
            lines.forEach((rawLine, lineIndex) => {
              const m = rawLine.match(TASK_LINE_RE);
              if (!m) return;
              const status = m[2] === 'X' ? 'x' : m[2];
              if (statusFilter && statusFilter !== 'all') {
                if (statusFilter === 'todo' && status !== ' ') return;
                if (statusFilter === 'done' && status !== 'x') return;
                if (statusFilter !== 'todo' && statusFilter !== 'done' && status !== statusFilter) {
                  return;
                }
              }
              tasks.push({
                path,
                lineIndex,
                status,
                text: m[4],
                rawLine,
              });
            });
          } catch {
            // ignore
          }
        })
      );
      await new Promise((r) => setTimeout(r, 0));
    }

    return tasks;
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
