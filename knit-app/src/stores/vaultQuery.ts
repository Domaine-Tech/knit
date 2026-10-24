import { invoke } from '@tauri-apps/api/core';
import { toast } from './toastStore';
import { historyStore } from './historyStore';
import { tabStore } from './tabStore';
import {
  detectDocType,
  docTypeLabel,
  extractKanbanFiles,
  createDefaultKanbanMarkdown,
  fileStem,
  isTauriEnvironment,
  normalizeRelPath,
  normalizeSuggestIndexData,
  normalizeTaskCard,
  copyTextWithToast,
  type RawSuggestDocItem,
  type RawTaskCard,
} from '../utils';
import type {
  HeadingItem,
  SuggestIndexData,
  FrontmatterDoc,
  SearchSnippet,
  FileSearchResult,
  TaskCard,
  TagInfo,
  KanbanFileInfo,
  VaultOps,
  DocType,
} from '../types';

export {
  getCalendarIndex,
  updateCalendarEventDate,
  toggleCalendarTask,
  updateCalendarEventPriority,
  addCalendarEvent,
} from './vaultCalendarOps';

export async function parseFrontmatter(_ops: VaultOps, content: string): Promise<FrontmatterDoc> {
    if (!isTauriEnvironment()) {
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match) {
        return {
          has_frontmatter: false,
          fields: {},
          ordered_keys: [],
          body: content,
        };
      }
      const raw = match[1];
      const fields: Record<string, string> = {};
      const ordered_keys: string[] = [];
      for (const line of raw.split(/\r?\n/)) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const k = parts[0].trim();
          const v = parts.slice(1).join(':').trim();
          fields[k] = v;
          ordered_keys.push(k);
        }
      }
      return {
        has_frontmatter: true,
        raw_frontmatter: raw,
        fields,
        ordered_keys,
        body: content.slice(match[0].length).trimStart(),
      };
    }

    return await invoke<FrontmatterDoc>('parse_frontmatter', { content });
  }

export async function updateFrontmatter(_ops: VaultOps, content: string, key: string, value: string): Promise<string> {
    if (!isTauriEnvironment()) {
      if (content.startsWith('---')) {
        const regex = new RegExp(`(${key}\\s*:\\s*)([^\\r\\n]+)`);
        if (regex.test(content)) {
          return content.replace(regex, `$1${value}`);
        }
        // Clé non existante dans le frontmatter : insérer avant le --- fermant
        const parts = content.split('\n');
        let secondDashIdx = -1;
        for (let i = 1; i < parts.length; i++) {
          if (parts[i].trim() === '---') {
            secondDashIdx = i;
            break;
          }
        }
        if (secondDashIdx !== -1) {
          parts.splice(secondDashIdx, 0, `${key}: ${value}`);
          return parts.join('\n');
        }
      }
      return `---\n${key}: ${value}\n---\n\n${content}`;
    }

    return await invoke<string>('update_frontmatter', { content, key, value });
  }

export async function getBacklinks(ops: VaultOps, relPath: string): Promise<string[]> {
    if (!ops.currentVaultPath) return [];

    if (!isTauriEnvironment()) {
      const targetStem = fileStem(relPath);
      const backlinks: string[] = [];
      for (const [p, c] of Object.entries(ops.localContents)) {
        if (p === relPath) continue;
        if (
          c.includes(`(${relPath})`) ||
          c.includes(`[[${targetStem}]]`) ||
          c.includes(`[[${relPath}]]`) ||
          c.includes(`[[${targetStem}|`)
        ) {
          backlinks.push(p);
        }
      }
      return backlinks;
    }

    try {
      return await invoke<string[]>('get_file_backlinks', {
        vaultPath: ops.currentVaultPath,
        relPath,
      });
    } catch (err: unknown) {
      console.warn('Erreur récupération backlinks :', err);
      return [];
    }
  }

export function getAbsolutePath(ops: VaultOps, relPath: string = ''): string {
    if (!ops.currentVaultPath) return relPath;
    const cleanRel = normalizeRelPath(relPath);
    const cleanVault = normalizeRelPath(ops.currentVaultPath).replace(/\/+$/, '');
    return cleanRel ? `${cleanVault}/${cleanRel}` : cleanVault;
  }

export async function revealInExplorer(ops: VaultOps, relPath: string = ''): Promise<void> {
    if (!ops.currentVaultPath) return;

    const fullPath = ops.getAbsolutePath(relPath);

    if (!isTauriEnvironment()) {
      await copyTextWithToast(fullPath, 'Chemin copié (mode démo web)', fullPath);
      return;
    }

    try {
      await invoke<void>('reveal_in_explorer', {
        vaultPath: ops.currentVaultPath,
        relPath,
      });
    } catch (err: unknown) {
      toast.error('Impossible d’ouvrir l’explorateur', String(err));
    }
  }

export async function searchVault(ops: VaultOps, query: string): Promise<FileSearchResult[]> {
    if (!ops.currentVaultPath || !query.trim()) return [];

    if (!isTauriEnvironment()) {
      const q = query.toLowerCase();
      const results: FileSearchResult[] = [];
      for (const [relPath, content] of Object.entries(ops.localContents)) {
        const lines = content.split('\n');
        const snippets: SearchSnippet[] = [];
        let total = 0;
        lines.forEach((line, idx) => {
          const lower = line.toLowerCase();
          const pos = lower.indexOf(q);
          if (pos !== -1) {
            total++;
            if (snippets.length < 5) {
              snippets.push({
                line_number: idx + 1,
                line_content: line,
                match_start: pos,
                match_end: pos + q.length,
              });
            }
          }
        });
        if (total > 0) {
          results.push({
            rel_path: relPath,
            file_name: relPath.split('/').pop() || relPath,
            total_matches: total,
            snippets,
          });
        }
      }
      return results.sort((a, b) => b.total_matches - a.total_matches);
    }

    try {
      return await invoke<FileSearchResult[]>('search_vault', {
        vaultPath: ops.currentVaultPath,
        query,
      });
    } catch (err: unknown) {
      console.warn('Erreur recherche coffre-fort :', err);
      return [];
    }
  }

export async function getVaultTasks(ops: VaultOps): Promise<TaskCard[]> {
    if (!ops.currentVaultPath) return [];

    if (!isTauriEnvironment()) {
      const tasks: TaskCard[] = [];
      for (const [relPath, content] of Object.entries(ops.localContents)) {
        if (!relPath.endsWith('.md')) continue;
        const fm = await ops.parseFrontmatter(content);
        if (fm.fields['statut'] || relPath.includes('taches/')) {
          const id = fm.fields['id'] || fileStem(relPath) || 'task';
          const titre = fm.fields['titre'] || fm.body.split('\n')[0].replace(/^#+\s*/, '') || id;
          const tags = fm.fields['tags']
            ? fm.fields['tags'].replace(/[[\]]/g, '').split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean)
            : [];
          tasks.push(
            normalizeTaskCard({
              rel_path: relPath,
              id,
              titre,
              statut: fm.fields['statut'] || 'a-faire',
              priorite: fm.fields['priorite'],
              assigne: fm.fields['assigne'],
              sprint: fm.fields['sprint'],
              echeance: fm.fields['echeance'],
              tags,
              snippet: fm.body.slice(0, 100),
            })
          );
        }
      }
      return tasks.sort((a, b) => a.id.localeCompare(b.id));
    }

    try {
      const raw = await invoke<RawTaskCard[]>('get_vault_tasks', {
        vaultPath: ops.currentVaultPath,
      });
      return raw.map(normalizeTaskCard);
    } catch (err: unknown) {
      console.warn('Erreur récupération des tâches :', err);
      return [];
    }
  }

export async function updateTaskStatus(ops: VaultOps, relPath: string, newStatus: string): Promise<void> {
    if (!ops.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      const content = ops.localContents[relPath] || '';
      const updated = await ops.updateFrontmatter(content, 'statut', newStatus);
      await ops.writeFile(relPath, updated);
      ops.notify();
      return;
    }

    await invoke<void>('update_task_status', {
      vaultPath: ops.currentVaultPath,
      relPath,
      newStatus,
    });

    const updatedContent = await ops.readFile(relPath);
    const tab = tabStore.tabs.find((t) => t.path === relPath);
    if (tab) {
      tab.content = updatedContent;
      tab.isDirty = false;
    }
    ops.notify();
  }

export async function getVaultTags(ops: VaultOps): Promise<TagInfo[]> {
    if (!ops.currentVaultPath) return [];

    if (isTauriEnvironment()) {
      try {
        return await invoke<TagInfo[]>('get_vault_tags', {
          vaultPath: ops.currentVaultPath,
        });
      } catch (err: unknown) {
        console.debug('Fallback local pour get_vault_tags :', err);
      }
    }

    const tagMap: Record<string, Set<string>> = {};
    for (const [relPath, content] of Object.entries(ops.localContents)) {
      const fm = await ops.parseFrontmatter(content);
      if (fm.fields['tags']) {
        const raw = fm.fields['tags'].replace(/[[\]]/g, '');
        raw.split(',').forEach((t) => {
          const clean = t.trim().replace(/^#/, '').toLowerCase();
          if (clean) {
            if (!tagMap[clean]) tagMap[clean] = new Set();
            tagMap[clean].add(relPath);
          }
        });
      }
      const inlineMatches = content.matchAll(/(?:^|[\s(])#([a-zA-Z0-9_\-/]+)/g);
      for (const m of inlineMatches) {
        const tag = m[1].toLowerCase();
        if (tag && isNaN(Number(tag))) {
          if (!tagMap[tag]) tagMap[tag] = new Set();
          tagMap[tag].add(relPath);
        }
      }
    }
    const list: TagInfo[] = Object.entries(tagMap).map(([tag, fileSet]) => ({
      tag,
      count: fileSet.size,
      files: Array.from(fileSet).sort(),
    }));
    return list.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

export async function getKanbanFiles(ops: VaultOps): Promise<KanbanFileInfo[]> {
    return extractKanbanFiles(ops.files);
  }

export async function createKanbanFile(ops: VaultOps, 
    relPath: string,
    title?: string,
    columns?: string[]
  ): Promise<string> {
    const cleanPath = relPath.endsWith('.md') ? relPath : `${relPath}.md`;
    const defaultTitle = title || fileStem(cleanPath) || 'Kanban';
    const content = createDefaultKanbanMarkdown(defaultTitle, columns);
    await ops.createFile(cleanPath, content);
    return cleanPath;
  }

function parsePinnedNotesJson(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

export function getPinnedNotes(_ops: VaultOps): string[] {
  return parsePinnedNotesJson(localStorage.getItem('knit-pinned-notes'));
}

export function togglePinNote(ops: VaultOps, relPath: string): void {
    const pinned = ops.getPinnedNotes();
    const index = pinned.indexOf(relPath);
    if (index >= 0) {
      pinned.splice(index, 1);
      toast.info('Note retirée des favoris', relPath);
    } else {
      pinned.push(relPath);
      toast.success('Note épinglée aux favoris', relPath);
    }
    localStorage.setItem('knit-pinned-notes', JSON.stringify(pinned));
    ops.notify();
  }

export function isPinned(ops: VaultOps, relPath: string): boolean {
    return ops.getPinnedNotes().includes(relPath);
  }

export async function getSuggestIndex(ops: VaultOps): Promise<SuggestIndexData> {
    // B-057 : projection mémoire de l'index unifié (hydraté par frontmatterIndex.rebuild).
    const { frontmatterIndex } = await import('./frontmatterIndex');
    const cached = frontmatterIndex.getSuggestData();
    if (cached.docs.length > 0 || frontmatterIndex.getVersion() > 0) {
      return cached;
    }

    if (!ops.currentVaultPath) return { docs: [], headings: [], tags: [] };

    if (isTauriEnvironment()) {
      try {
        // Vue cache process sur get_vault_index — pas de second scan disque.
        const raw = await invoke<{
          docs: RawSuggestDocItem[];
          headings: HeadingItem[];
          tags: SuggestIndexData['tags'];
        }>('get_suggest_index', {
          vaultPath: ops.currentVaultPath,
        });
        return normalizeSuggestIndexData(raw);
      } catch (err: unknown) {
        console.debug('Fallback local pour get_suggest_index :', err);
      }
    }

    await frontmatterIndex.rebuild(ops);
    return frontmatterIndex.getSuggestData();
  }

export async function convertDocumentType(
  ops: VaultOps,
  relPath: string,
  targetType: DocType
): Promise<void> {
    if (targetType === 'image') return;

    const originalContent = await ops.readFile(relPath);
    let newContent = originalContent;

    if (targetType === 'kanban') {
      newContent = await ops.updateFrontmatter(newContent, 'type', 'kanban');
      const hasH2 = /^##\s+/m.test(newContent);
      if (!hasH2) {
        const fmMatch = newContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
        const fmPart = fmMatch ? fmMatch[0] : '';
        const bodyPart = fmMatch ? newContent.slice(fmMatch[0].length).trim() : newContent.trim();

        let h1Title = fileStem(relPath) || 'Kanban';
        let remainingBody = bodyPart;
        const h1Match = bodyPart.match(/^#\s+(.+)$/m);
        if (h1Match) {
          h1Title = h1Match[1].trim();
          remainingBody = bodyPart.replace(/^#\s+.+$/m, '').trim();
        }

        const lines = remainingBody.split('\n').filter((l) => l.trim().length > 0);
        let cardsText = '';
        if (lines.length > 0) {
          for (const line of lines) {
            const trimmed = line.trim();
            if (/^-\s*\[[ xX/?!>-]\]/.test(trimmed)) {
              cardsText += `${trimmed}\n`;
            } else {
              cardsText += `- [ ] ${trimmed}\n`;
            }
          }
        } else {
          cardsText = '- [ ] Première tâche\n';
        }

        newContent = `${fmPart}\n# ${h1Title}\n\n## À faire\n${cardsText}\n## En cours\n\n## Terminé\n`;
      }
    } else if (targetType === 'table') {
      newContent = await ops.updateFrontmatter(newContent, 'type', 'table');
    } else if (
      targetType === 'calendar' ||
      targetType === 'canvas' ||
      targetType === 'slides' ||
      targetType === 'gallery'
    ) {
      newContent = await ops.updateFrontmatter(newContent, 'type', targetType);
    } else {
      newContent = await ops.updateFrontmatter(newContent, 'type', 'note');
    }

    await ops.writeFile(relPath, newContent);

    const tab = tabStore.tabs.find((t) => t.path === relPath);
    if (tab) {
      tab.content = newContent;
      tab.docType = targetType;
      tab.viewMode = 'visual';
      tabStore.notify();
    }

    historyStore.push({
      id: `convert-${Date.now()}`,
      description: `Conversion en ${docTypeLabel(targetType)}`,
      undo: async () => {
        await ops.writeFile(relPath, originalContent);
        if (tab) {
          tab.content = originalContent;
          tab.docType = detectDocType(originalContent, relPath);
          tabStore.notify();
        }
      },
    });

    toast.undoable(
      'Type de document converti',
      `Fichier configuré en ${docTypeLabel(targetType)}`,
      async () => {
        await ops.writeFile(relPath, originalContent);
        if (tab) {
          tab.content = originalContent;
          tab.docType = detectDocType(originalContent, relPath);
          tabStore.notify();
        }
      }
    );
  }

export async function openExternalPath(_ops: VaultOps, pathOrUrl: string): Promise<void> {
    const clean = pathOrUrl.trim();
    if (!clean) return;

    if (isTauriEnvironment()) {
      try {
        await invoke<void>('open_external_path', { pathOrUrl: clean });
        return;
      } catch (err: unknown) {
        console.warn('Erreur open_external_path :', err);
      }
    }

    if (/^https?:\/\//i.test(clean) || /^mailto:/i.test(clean)) {
      window.open(clean, '_blank');
    }
  }
