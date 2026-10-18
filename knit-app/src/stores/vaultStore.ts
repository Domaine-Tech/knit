import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { toast } from './toastStore';
import { historyStore } from './historyStore';
import { crdtManager } from '../crdt';
import { tabStore } from './tabStore';
import { networkStore } from './networkStore';
import {
  detectDocType,
  extractKanbanFiles,
  createDefaultKanbanMarkdown,
  isTauriEnvironment,
} from '../utils';
import { DEMO_FILES, DEMO_CONTENTS } from './demoVaultLoader';

import type {
  HeadingItem,
  SuggestDocItem,
  SuggestIndexData,
  FileNode,
  FrontmatterDoc,
  LinkRefactorReport,
  TrashRecord,
  SearchSnippet,
  FileSearchResult,
  TaskCard,
  TagInfo,
  KanbanFileInfo,
} from '../types';

type VaultListener = () => void;

class VaultStore {
  public currentVaultPath: string | null = null;
  public files: FileNode[] = [];
  public isLoading: boolean = false;
  public error: string | null = null;

  private listeners: Set<VaultListener> = new Set();
  private localContents: Record<string, string> = { ...DEMO_CONTENTS };
  private unlistenFns: UnlistenFn[] = [];
  private _mockTrash: Record<string, { relPath: string; backupContent?: string }> = {};

  constructor() {
    const savedPath = localStorage.getItem('knit-last-vault-path');
    if (savedPath && isTauriEnvironment()) {
      this.openVault(savedPath);
    } else {
      this.currentVaultPath = 'Knit Demo Vault';
      this.files = DEMO_FILES;
    }
  }

  public get vaultPath(): string | null {
    return this.currentVaultPath;
  }

  public get vaultName(): string | null {
    if (!this.currentVaultPath) return null;
    const parts = this.currentVaultPath.split(/[/\\]/).filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  }

  public subscribe(listener: VaultListener): () => void {
    this.listeners.add(listener);
    listener();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public async pickAndOpenVault(): Promise<boolean> {
    if (!isTauriEnvironment()) {
      this.currentVaultPath = 'Knit Workspace (Web Dev)';
      this.files = DEMO_FILES;
      this.notify();
      return true;
    }

    try {
      this.isLoading = true;
      this.notify();

      const selected = await invoke<string | null>('pick_vault_folder');
      if (selected) {
        await this.openVault(selected);
        return true;
      }
      return false;
    } catch (err: unknown) {
      this.error = String(err);
      return false;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  public async openVault(path: string): Promise<void> {
    this.currentVaultPath = path;
    localStorage.setItem('knit-last-vault-path', path);

    // Initialisation ou redémarrage du watcher FS natif
    await this.setupWatcher(path);
    await this.reloadTree();

    // Démarrage du réseau P2P Iroh & mDNS
    networkStore.startNetwork(path).catch((err) => {
      console.warn('Erreur initialisation P2P sur coffre:', err);
    });

    // Récupération des éléments orphelins de corbeille (restauration OS vers .knit/trash)
    const recovered = await this.recoverTrash();
    if (recovered.length > 0) {
      toast.success(
        'Corbeille synchronisée',
        `${recovered.length} note(s) restaurée(s) : ${recovered.join(', ')}`
      );
    }
  }

  private async setupWatcher(path: string) {
    // Nettoyer les écouteurs précédents
    for (const unlisten of this.unlistenFns) {
      unlisten();
    }
    this.unlistenFns = [];

    if (!isTauriEnvironment()) return;

    try {
      // Arrêt préventif de tout watcher précédent
      await invoke('stop_vault_watcher').catch(() => {});
      await invoke('start_vault_watcher', { vaultPath: path });

      const u1 = await listen<{ path: string; content: string }>(
        'vault_file_changed',
        (event) => {
          const { path: relPath, content } = event.payload;
          this.localContents[relPath] = content;

          // Injection dans Yjs via crdtManager
          const updated = crdtManager.applyExternalContent(relPath, content);
          if (updated) {
            const fileName = relPath.split('/').pop() || relPath;
            toast.info(
              'Synchronisation externe',
              `Fichier "${fileName}" mis à jour par un agent externe`
            );

            // Mettre à jour l'onglet correspondant et le marquer comme propre
            const tab = tabStore.tabs.find((t) => t.path === relPath);
            if (tab) {
              tab.content = content;
              tab.isDirty = false;
            }
          }
          this.notify();
        }
      );

      const u2 = await listen<{ path: string }>('vault_file_deleted', (event) => {
        const { path: relPath } = event.payload;
        delete this.localContents[relPath];
        crdtManager.removeDoc(relPath);

        const fileName = relPath.split('/').pop() || relPath;
        const tab = tabStore.tabs.find((t) => t.path === relPath);
        if (tab) {
          toast.info('Fichier supprimé', `Le fichier "${fileName}" a été supprimé du disque`);
        }

        this.reloadTree();
      });

      const u3 = await listen('vault_tree_changed', () => {
        this.reloadTree();
      });

      this.unlistenFns.push(u1, u2, u3);
    } catch (err: unknown) {
      console.warn('Impossible de démarrer le Vault Watcher :', err);
    }
  }

  public async reloadTree(): Promise<void> {
    if (!this.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      this.files = [...DEMO_FILES];
      this.notify();
      return;
    }

    try {
      this.isLoading = true;
      this.notify();
      const nodes = await invoke<FileNode[]>('get_vault_tree', {
        vaultPath: this.currentVaultPath,
      });
      this.files = nodes;
      this.error = null;
    } catch (err: unknown) {
      this.error = String(err);
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  public async readFile(relPath: string): Promise<string> {
    if (!isTauriEnvironment()) {
      if (relPath in this.localContents) {
        return this.localContents[relPath];
      }
      return `# ${relPath}\nNouveau document`;
    }

    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    const content = await invoke<string>('read_vault_file', {
      vaultPath: this.currentVaultPath,
      relPath,
    });
    this.localContents[relPath] = content;
    return content;
  }

  public async writeFile(relPath: string, content: string): Promise<void> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    // Évite toute écriture FS redondante si le contenu est déjà identique
    if (this.localContents[relPath] === content) {
      tabStore.markClean(relPath);
      return;
    }

    this.localContents[relPath] = content;

    if (!isTauriEnvironment()) {
      tabStore.markClean(relPath);
      return;
    }

    await invoke('write_vault_file', {
      vaultPath: this.currentVaultPath,
      relPath,
      content,
    });

    tabStore.markClean(relPath);
  }

  public async createFile(relPath: string, initialContent: string = ''): Promise<void> {
    if (!this.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      this.localContents[relPath] = initialContent;
      await this.reloadTree();
      return;
    }

    await invoke('create_vault_file', {
      vaultPath: this.currentVaultPath,
      relPath,
      content: initialContent,
    });
    await this.reloadTree();
  }

  public async createDir(relPath: string): Promise<void> {
    if (!this.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      await this.reloadTree();
      return;
    }

    try {
      await invoke('create_vault_dir', {
        vaultPath: this.currentVaultPath,
        relPath,
      });
      await this.reloadTree();
    } catch (err: unknown) {
      toast.error('Erreur lors de la création du dossier', String(err));
    }
  }

  public async saveAsset(base64Data: string, filenameHint?: string): Promise<string> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      const timestamp = Date.now();
      const name = filenameHint || `img-${timestamp}.png`;
      const relPath = `assets/${name}`;
      this.localContents[relPath] = base64Data;
      return relPath;
    }

    return await invoke<string>('save_vault_asset', {
      vaultPath: this.currentVaultPath,
      filenameHint,
      base64Data,
    });
  }

  public async renameFile(oldRelPath: string, newRelPath: string): Promise<LinkRefactorReport> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      const content = this.localContents[oldRelPath] || '';
      delete this.localContents[oldRelPath];
      this.localContents[newRelPath] = content;
      await this.reloadTree();
      return {
        files_scanned: 1,
        files_modified: 0,
        links_updated: 0,
        modified_files: [],
      };
    }

    const report = await invoke<LinkRefactorReport>('rename_vault_file', {
      vaultPath: this.currentVaultPath,
      oldRelPath,
      newRelPath,
    });

    await this.reloadTree();
    return report;
  }

  public async trashPath(relPath: string): Promise<TrashRecord> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      const isDir = !relPath.includes('.');
      const itemName = relPath.split('/').pop() || relPath;
      const backupContent = this.localContents[relPath];
      delete this.localContents[relPath];
      crdtManager.removeDoc(relPath);
      await this.reloadTree();
      const mockRecord: TrashRecord = {
        trash_id: `mock-${Date.now()}`,
        original_rel_path: relPath,
        item_name: itemName,
        is_dir: isDir,
        deleted_at: Date.now(),
      };
      this._mockTrash[mockRecord.trash_id] = { relPath, backupContent };
      return mockRecord;
    }

    const record = await invoke<TrashRecord>('trash_vault_path', {
      vaultPath: this.currentVaultPath,
      relPath,
    });

    delete this.localContents[relPath];
    crdtManager.removeDoc(relPath);
    await this.reloadTree();
    return record;
  }

  public async restoreTrash(trashId: string): Promise<string> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      const mock = this._mockTrash[trashId];
      if (mock) {
        if (mock.backupContent !== undefined) {
          this.localContents[mock.relPath] = mock.backupContent;
        }
        delete this._mockTrash[trashId];
        await this.reloadTree();
        return mock.relPath;
      }
      return '';
    }

    const restoredPath = await invoke<string>('restore_vault_path', {
      vaultPath: this.currentVaultPath,
      trashId,
    });

    await this.reloadTree();
    return restoredPath;
  }

  public async commitTrash(trashId: string): Promise<void> {
    if (!this.currentVaultPath || !isTauriEnvironment()) return;
    try {
      await invoke('commit_vault_trash', {
        vaultPath: this.currentVaultPath,
        trashId,
      });
    } catch {
      // Ignore si déjà commis ou restauré
    }
  }

  public async recoverTrash(): Promise<string[]> {
    if (!this.currentVaultPath || !isTauriEnvironment()) return [];
    try {
      const recovered = await invoke<string[]>('recover_vault_trash', {
        vaultPath: this.currentVaultPath,
      });
      if (recovered && recovered.length > 0) {
        await this.reloadTree();
      }
      return recovered || [];
    } catch {
      return [];
    }
  }

  public async deletePath(relPath: string): Promise<void> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      delete this.localContents[relPath];
      crdtManager.removeDoc(relPath);
      await this.reloadTree();
      return;
    }

    await invoke('delete_vault_path', {
      vaultPath: this.currentVaultPath,
      relPath,
    });

    delete this.localContents[relPath];
    crdtManager.removeDoc(relPath);
    await this.reloadTree();
  }

  public async parseFrontmatter(content: string): Promise<FrontmatterDoc> {
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

  public async updateFrontmatter(content: string, key: string, value: string): Promise<string> {
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

  public async getBacklinks(relPath: string): Promise<string[]> {
    if (!this.currentVaultPath) return [];

    if (!isTauriEnvironment()) {
      const targetStem = relPath.split('/').pop()?.replace(/\.md$/, '') || '';
      const backlinks: string[] = [];
      for (const [p, c] of Object.entries(this.localContents)) {
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
        vaultPath: this.currentVaultPath,
        relPath,
      });
    } catch (err: unknown) {
      console.warn('Erreur récupération backlinks :', err);
      return [];
    }
  }

  public getAbsolutePath(relPath: string = ''): string {
    if (!this.currentVaultPath) return relPath;
    const cleanRel = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
    const cleanVault = this.currentVaultPath.replace(/\\/g, '/').replace(/\/+$/, '');
    return cleanRel ? `${cleanVault}/${cleanRel}` : cleanVault;
  }

  public async revealInExplorer(relPath: string = ''): Promise<void> {
    if (!this.currentVaultPath) return;

    const fullPath = this.getAbsolutePath(relPath);

    if (!isTauriEnvironment()) {
      await navigator.clipboard.writeText(fullPath);
      toast.info('Chemin copié (mode démo web)', fullPath);
      return;
    }

    try {
      await invoke('reveal_in_explorer', {
        vaultPath: this.currentVaultPath,
        relPath,
      });
    } catch (err: unknown) {
      toast.error('Impossible d’ouvrir l’explorateur', String(err));
    }
  }

  public async searchVault(query: string): Promise<FileSearchResult[]> {
    if (!this.currentVaultPath || !query.trim()) return [];

    if (!isTauriEnvironment()) {
      const q = query.toLowerCase();
      const results: FileSearchResult[] = [];
      for (const [relPath, content] of Object.entries(this.localContents)) {
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
        vaultPath: this.currentVaultPath,
        query,
      });
    } catch (err: unknown) {
      console.warn('Erreur recherche coffre-fort :', err);
      return [];
    }
  }

  public async getVaultTasks(): Promise<TaskCard[]> {
    if (!this.currentVaultPath) return [];

    if (!isTauriEnvironment()) {
      const tasks: TaskCard[] = [];
      for (const [relPath, content] of Object.entries(this.localContents)) {
        if (!relPath.endsWith('.md')) continue;
        const fm = await this.parseFrontmatter(content);
        if (fm.fields['statut'] || relPath.includes('taches/')) {
          const statut = (fm.fields['statut'] || 'a-faire').toLowerCase();
          const id = fm.fields['id'] || relPath.split('/').pop()?.replace('.md', '') || 'task';
          const titre = fm.fields['titre'] || fm.body.split('\n')[0].replace(/^#+\s*/, '') || id;
          const tags = fm.fields['tags']
            ? fm.fields['tags'].replace(/[[\]]/g, '').split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean)
            : [];
          tasks.push({
            rel_path: relPath,
            id,
            titre,
            statut,
            priorite: fm.fields['priorite'],
            assigne: fm.fields['assigne'],
            sprint: fm.fields['sprint'],
            echeance: fm.fields['echeance'],
            tags,
            snippet: fm.body.slice(0, 100),
          });
        }
      }
      return tasks.sort((a, b) => a.id.localeCompare(b.id));
    }

    try {
      return await invoke<TaskCard[]>('get_vault_tasks', {
        vaultPath: this.currentVaultPath,
      });
    } catch (err: unknown) {
      console.warn('Erreur récupération des tâches :', err);
      return [];
    }
  }

  public async updateTaskStatus(relPath: string, newStatus: string): Promise<void> {
    if (!this.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      const content = this.localContents[relPath] || '';
      const updated = await this.updateFrontmatter(content, 'statut', newStatus);
      await this.writeFile(relPath, updated);
      this.notify();
      return;
    }

    await invoke('update_task_status', {
      vaultPath: this.currentVaultPath,
      relPath,
      newStatus,
    });

    const updatedContent = await this.readFile(relPath);
    const tab = tabStore.tabs.find((t) => t.path === relPath);
    if (tab) {
      tab.content = updatedContent;
      tab.isDirty = false;
    }
    this.notify();
  }

  public async getVaultTags(): Promise<TagInfo[]> {
    if (!this.currentVaultPath) return [];

    if (isTauriEnvironment()) {
      try {
        return await invoke<TagInfo[]>('get_vault_tags', {
          vaultPath: this.currentVaultPath,
        });
      } catch (err: unknown) {
        console.debug('Fallback local pour get_vault_tags :', err);
      }
    }

    const tagMap: Record<string, Set<string>> = {};
    for (const [relPath, content] of Object.entries(this.localContents)) {
      const fm = await this.parseFrontmatter(content);
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

  public async getKanbanFiles(): Promise<KanbanFileInfo[]> {
    return extractKanbanFiles(this.files);
  }

  public async createKanbanFile(
    relPath: string,
    title?: string,
    columns?: string[]
  ): Promise<string> {
    const cleanPath = relPath.endsWith('.md') ? relPath : `${relPath}.md`;
    const defaultTitle = title || cleanPath.split('/').pop()?.replace(/\.md$/, '') || 'Kanban';
    const content = createDefaultKanbanMarkdown(defaultTitle, columns);
    await this.createFile(cleanPath, content);
    return cleanPath;
  }

  public getPinnedNotes(): string[] {
    try {
      const data = localStorage.getItem('knit-pinned-notes');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public togglePinNote(relPath: string): void {
    const pinned = this.getPinnedNotes();
    const index = pinned.indexOf(relPath);
    if (index >= 0) {
      pinned.splice(index, 1);
      toast.info('Note retirée des favoris', relPath);
    } else {
      pinned.push(relPath);
      toast.success('Note épinglée aux favoris', relPath);
    }
    localStorage.setItem('knit-pinned-notes', JSON.stringify(pinned));
    this.notify();
  }

  public isPinned(relPath: string): boolean {
    return this.getPinnedNotes().includes(relPath);
  }

  public async getSuggestIndex(): Promise<SuggestIndexData> {
    if (!this.currentVaultPath) return { docs: [], headings: [], tags: [] };

    if (isTauriEnvironment()) {
      try {
        return await invoke<SuggestIndexData>('get_suggest_index', {
          vaultPath: this.currentVaultPath,
        });
      } catch (err) {
        console.debug('Fallback local pour get_suggest_index :', err);
      }
    }

    const docs: SuggestDocItem[] = [];
    const headings: HeadingItem[] = [];
    const tagCounts: Record<string, number> = {};

    for (const [p, c] of Object.entries(this.localContents)) {
      if (!p.endsWith('.md')) continue;
      const title = p.split('/').pop()?.replace(/\.md$/, '') || p;
      const doc_type = detectDocType(c, p);
      docs.push({ rel_path: p, title, doc_type });

      for (const line of c.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          headings.push({
            file_rel: p,
            level: 1,
            text: trimmed.slice(2).trim(),
            slug: trimmed.slice(2).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          });
        } else if (trimmed.startsWith('## ')) {
          headings.push({
            file_rel: p,
            level: 2,
            text: trimmed.slice(3).trim(),
            slug: trimmed.slice(3).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          });
        } else if (trimmed.startsWith('### ')) {
          headings.push({
            file_rel: p,
            level: 3,
            text: trimmed.slice(4).trim(),
            slug: trimmed.slice(4).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          });
        }
        const tagMatches = line.matchAll(/(?:^|\s)#([a-zA-Z0-9_/-]+)/g);
        for (const m of tagMatches) {
          tagCounts[m[1]] = (tagCounts[m[1]] || 0) + 1;
        }
      }
    }

    return {
      docs,
      headings,
      tags: Object.entries(tagCounts).map(([tag, count]) => ({ tag, count })),
    };
  }

  public async convertDocumentType(
    relPath: string,
    targetType: 'note' | 'kanban' | 'table'
  ): Promise<void> {
    const originalContent = await this.readFile(relPath);
    let newContent = originalContent;

    if (targetType === 'kanban') {
      newContent = await this.updateFrontmatter(newContent, 'type', 'kanban');
      const hasH2 = /^##\s+/m.test(newContent);
      if (!hasH2) {
        const fmMatch = newContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
        const fmPart = fmMatch ? fmMatch[0] : '';
        const bodyPart = fmMatch ? newContent.slice(fmMatch[0].length).trim() : newContent.trim();

        let h1Title = relPath.split('/').pop()?.replace(/\.md$/, '') || 'Kanban';
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
      newContent = await this.updateFrontmatter(newContent, 'type', 'table');
    } else {
      newContent = await this.updateFrontmatter(newContent, 'type', 'note');
    }

    await this.writeFile(relPath, newContent);

    const tab = tabStore.tabs.find((t) => t.path === relPath);
    if (tab) {
      tab.content = newContent;
      tab.docType = targetType;
      tab.viewMode = 'visual';
      tabStore.notify();
    }

    historyStore.push({
      id: `convert-${Date.now()}`,
      description: `Conversion en ${targetType === 'kanban' ? 'Tableau Kanban' : targetType === 'table' ? 'Vue Tableau' : 'Note Markdown'}`,
      undo: async () => {
        await this.writeFile(relPath, originalContent);
        if (tab) {
          tab.content = originalContent;
          tab.docType = detectDocType(originalContent, relPath);
          tabStore.notify();
        }
      },
    });

    toast.undoable(
      'Type de document converti',
      `Fichier configuré en ${targetType === 'kanban' ? 'Tableau Kanban' : targetType === 'table' ? 'Vue Tableau' : 'Note Markdown'}`,
      async () => {
        await this.writeFile(relPath, originalContent);
        if (tab) {
          tab.content = originalContent;
          tab.docType = detectDocType(originalContent, relPath);
          tabStore.notify();
        }
      }
    );
  }

  public async openExternalPath(pathOrUrl: string): Promise<void> {
    const clean = pathOrUrl.trim();
    if (!clean) return;

    if (isTauriEnvironment()) {
      try {
        await invoke('open_external_path', { pathOrUrl: clean });
        return;
      } catch (err) {
        console.warn('Erreur open_external_path :', err);
      }
    }

    if (/^https?:\/\//i.test(clean) || /^mailto:/i.test(clean)) {
      window.open(clean, '_blank');
    }
  }
}

export const vaultStore = new VaultStore();

