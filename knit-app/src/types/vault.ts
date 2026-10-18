/**
 * Types relatifs au coffre-fort (Vault), arborescence et opérations de fichiers
 */

import type { UnlistenFn } from '@tauri-apps/api/event';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  is_dir: boolean;
  extension?: string;
  /** Horodatage de modification FS (ms epoch), fourni par le scan Rust ou le mode démo. */
  mtime_ms?: number;
  children: FileNode[];
}

export interface FlattenedFile {
  path: string;
  name: string;
  parentDir: string;
}

export interface FrontmatterDoc {
  has_frontmatter: boolean;
  raw_frontmatter?: string;
  fields: Record<string, string>;
  ordered_keys: string[];
  body: string;
}

export interface LinkRefactorReport {
  files_scanned: number;
  files_modified: number;
  links_updated: number;
  modified_files: string[];
}

export interface TrashRecord {
  trash_id: string;
  original_rel_path: string;
  item_name: string;
  is_dir: boolean;
  deleted_at: number;
}

export interface KanbanFileInfo {
  path: string;
  name: string;
  title: string;
  columns_count?: number;
  cards_count?: number;
}

export interface VaultMockTrash {
  relPath: string;
  backupContent?: string;
}

/**
 * Contexte interne partagé par les modules du coffre.
 * L'API publique reste la classe VaultStore.
 */
export interface VaultOps {
  currentVaultPath: string | null;
  files: FileNode[];
  isLoading: boolean;
  error: string | null;
  localContents: Record<string, string>;
  unlistenFns: UnlistenFn[];
  mockTrash: Record<string, VaultMockTrash>;
  notify(): void;
  openVault(path: string): Promise<void>;
  reloadTree(): Promise<void>;
  readFile(relPath: string): Promise<string>;
  writeFile(relPath: string, content: string): Promise<void>;
  createFile(relPath: string, initialContent?: string): Promise<void>;
  parseFrontmatter(content: string): Promise<FrontmatterDoc>;
  updateFrontmatter(content: string, key: string, value: string): Promise<string>;
  getAbsolutePath(relPath?: string): string;
  getPinnedNotes(): string[];
  recoverTrash(): Promise<string[]>;
}

