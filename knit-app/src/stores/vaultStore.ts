import type { UnlistenFn } from '@tauri-apps/api/event';
import { isTauriEnvironment } from '../utils/env';
import { DEMO_FILES, DEMO_CONTENTS, DEMO_ASSET_URLS } from './demoVaultLoader';
import type { VaultOps } from './vaultOps';
import {
  pickAndOpenVault,
  openVault,
  reloadTree,
  readFile,
  writeFile,
  createFile,
  createDir,
  saveAsset,
  renameFile,
} from './vaultIo';
import {
  trashPath,
  restoreTrash,
  commitTrash,
  recoverTrash,
  deletePath,
} from './vaultTrash';
import {
  parseFrontmatter,
  updateFrontmatter,
  getBacklinks,
  getAbsolutePath,
  revealInExplorer,
  searchVault,
  getVaultTasks,
  updateTaskStatus,
  getVaultTags,
  getKanbanFiles,
  createKanbanFile,
  getPinnedNotes,
  togglePinNote,
  isPinned,
  getSuggestIndex,
  convertDocumentType,
  openExternalPath,
} from './vaultQuery';

import { frontmatterIndex } from './frontmatterIndex';
import { crdtManager } from '../crdt';
import type {
  SuggestIndexData,
  FileNode,
  FrontmatterDoc,
  LinkRefactorReport,
  TrashRecord,
  FileSearchResult,
  TaskCard,
  TagInfo,
  KanbanFileInfo,
  QueryFilter,
  QueryResult,
  FrontmatterIndexEntry,
} from '../types';

type VaultListener = () => void;

class VaultStore {
  public currentVaultPath: string | null = null;
  public files: FileNode[] = [];
  public isLoading: boolean = false;
  public error: string | null = null;

  private listeners: Set<VaultListener> = new Set();
  private localContents: Record<string, string> = {
    ...DEMO_CONTENTS,
    ...DEMO_ASSET_URLS,
  };
  private unlistenFns: UnlistenFn[] = [];
  private _mockTrash: Record<string, { relPath: string; backupContent?: string }> = {};
  private readonly ops: VaultOps;

  constructor() {
    const self = this;
    this.ops = {
      get currentVaultPath() {
        return self.currentVaultPath;
      },
      set currentVaultPath(value) {
        self.currentVaultPath = value;
      },
      get files() {
        return self.files;
      },
      set files(value) {
        self.files = value;
      },
      get isLoading() {
        return self.isLoading;
      },
      set isLoading(value) {
        self.isLoading = value;
      },
      get error() {
        return self.error;
      },
      set error(value) {
        self.error = value;
      },
      get localContents() {
        return self.localContents;
      },
      get unlistenFns() {
        return self.unlistenFns;
      },
      set unlistenFns(value) {
        self.unlistenFns = value;
      },
      get mockTrash() {
        return self._mockTrash;
      },
      notify: () => self.notify(),
      openVault: (path) => self.openVault(path),
      reloadTree: () => self.reloadTree(),
      readFile: (relPath) => self.readFile(relPath),
      writeFile: (relPath, content) => self.writeFile(relPath, content),
      createFile: (relPath, initialContent) => self.createFile(relPath, initialContent),
      parseFrontmatter: (content) => self.parseFrontmatter(content),
      updateFrontmatter: (content, key, value) => self.updateFrontmatter(content, key, value),
      getAbsolutePath: (relPath) => self.getAbsolutePath(relPath),
      getPinnedNotes: () => self.getPinnedNotes(),
      recoverTrash: () => self.recoverTrash(),
    };

    const savedPath = localStorage.getItem('knit-last-vault-path');
    if (savedPath && isTauriEnvironment()) {
      void this.openVault(savedPath);
    } else {
      this.currentVaultPath = 'Knit Demo Vault';
      this.files = DEMO_FILES;
      void frontmatterIndex.rebuild(this.ops);
    }
  }

  public get vaultPath(): string | null {
    return this.currentVaultPath;
  }

  /** Contenu mémoire (mode démo / assets collés hors Tauri). */
  public getLocalContent(relPath: string): string | undefined {
    const key = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
    return this.localContents[key];
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

  public pickAndOpenVault(): Promise<boolean> {
    return pickAndOpenVault(this.ops);
  }

  public openVault(path: string): Promise<void> {
    return openVault(this.ops, path);
  }

  public reloadTree(): Promise<void> {
    return reloadTree(this.ops);
  }

  public readFile(relPath: string): Promise<string> {
    return readFile(this.ops, relPath);
  }

  public writeFile(relPath: string, content: string): Promise<void> {
    return writeFile(this.ops, relPath, content);
  }

  public createFile(relPath: string, initialContent: string = ''): Promise<void> {
    return createFile(this.ops, relPath, initialContent);
  }

  public createDir(relPath: string): Promise<void> {
    return createDir(this.ops, relPath);
  }

  public saveAsset(base64Data: string, filenameHint?: string): Promise<string> {
    return saveAsset(this.ops, base64Data, filenameHint);
  }

  public renameFile(oldRelPath: string, newRelPath: string): Promise<LinkRefactorReport> {
    return renameFile(this.ops, oldRelPath, newRelPath);
  }

  public trashPath(relPath: string): Promise<TrashRecord> {
    return trashPath(this.ops, relPath);
  }

  public restoreTrash(trashId: string): Promise<string> {
    return restoreTrash(this.ops, trashId);
  }

  public commitTrash(trashId: string): Promise<void> {
    return commitTrash(this.ops, trashId);
  }

  public recoverTrash(): Promise<string[]> {
    return recoverTrash(this.ops);
  }

  public deletePath(relPath: string): Promise<void> {
    return deletePath(this.ops, relPath);
  }

  public parseFrontmatter(content: string): Promise<FrontmatterDoc> {
    return parseFrontmatter(this.ops, content);
  }

  public updateFrontmatter(content: string, key: string, value: string): Promise<string> {
    return updateFrontmatter(this.ops, content, key, value);
  }

  public getBacklinks(relPath: string): Promise<string[]> {
    return getBacklinks(this.ops, relPath);
  }

  public getAbsolutePath(relPath: string = ''): string {
    return getAbsolutePath(this.ops, relPath);
  }

  public revealInExplorer(relPath: string = ''): Promise<void> {
    return revealInExplorer(this.ops, relPath);
  }

  public searchVault(query: string): Promise<FileSearchResult[]> {
    return searchVault(this.ops, query);
  }

  public getVaultTasks(): Promise<TaskCard[]> {
    return getVaultTasks(this.ops);
  }

  public updateTaskStatus(relPath: string, newStatus: string): Promise<void> {
    return updateTaskStatus(this.ops, relPath, newStatus);
  }

  public getVaultTags(): Promise<TagInfo[]> {
    return getVaultTags(this.ops);
  }

  public getKanbanFiles(): Promise<KanbanFileInfo[]> {
    return getKanbanFiles(this.ops);
  }

  public createKanbanFile(relPath: string, title?: string, columns?: string[]): Promise<string> {
    return createKanbanFile(this.ops, relPath, title, columns);
  }

  public getPinnedNotes(): string[] {
    return getPinnedNotes(this.ops);
  }

  public togglePinNote(relPath: string): void {
    togglePinNote(this.ops, relPath);
  }

  public isPinned(relPath: string): boolean {
    return isPinned(this.ops, relPath);
  }

  public getSuggestIndex(): Promise<SuggestIndexData> {
    return getSuggestIndex(this.ops);
  }

  public convertDocumentType(relPath: string, targetType: 'note' | 'kanban' | 'table'): Promise<void> {
    return convertDocumentType(this.ops, relPath, targetType);
  }

  public openExternalPath(pathOrUrl: string): Promise<void> {
    return openExternalPath(this.ops, pathOrUrl);
  }

  /** Moteur Dataview en mémoire (B-031e) */
  public queryFiles(filter: QueryFilter): QueryResult {
    return frontmatterIndex.queryFiles(filter);
  }

  public listIndexedFiles(
    folder: string,
    sort?: string,
    limit?: number
  ): FrontmatterIndexEntry[] {
    return frontmatterIndex.listFiles(folder, sort, limit);
  }

  public rebuildFrontmatterIndex(): Promise<void> {
    return frontmatterIndex.rebuild(this.ops);
  }

  public getFrontmatterIndexVersion(): number {
    return frontmatterIndex.getVersion();
  }

  public subscribeFrontmatterIndex(listener: () => void): () => void {
    return frontmatterIndex.subscribe(listener);
  }

  public collectInlineTasks(fromFolder?: string, statusFilter?: string) {
    return frontmatterIndex.collectInlineTasks(this.ops, fromFolder, statusFilter);
  }

  public async toggleInlineTask(
    relPath: string,
    lineIndex: number,
    nextStatus: string
  ): Promise<boolean> {
    const existing = crdtManager.getContent(relPath);
    const content =
      existing && existing.length > 0 ? existing : await this.readFile(relPath);
    const updated = frontmatterIndex.toggleTaskInContent(content, lineIndex, nextStatus);
    if (updated === null) return false;

    if (existing && existing.length > 0) {
      crdtManager.applyExternalContent(relPath, updated);
    }
    await this.writeFile(relPath, updated);
    return true;
  }
}

export const vaultStore = new VaultStore();
