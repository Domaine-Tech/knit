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

/** Nœud sélectionné dans l'arborescence sidebar. */
export interface SelectedTreeNode {
  path: string;
  isDir: boolean;
  name: string;
}

/** Cible de renommage inline (sidebar). */
export interface RenameTarget {
  oldPath: string;
  newPath: string;
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

/** Mode corbeille après staging `.knit/trash/` (B-034a). */
export type TrashMode = 'os' | 'knit';

/** Narrowing sûr du mode corbeille (IPC / KnitSelect). */
export function parseTrashMode(raw: string | null | undefined, fallback: TrashMode = 'os'): TrashMode {
  return raw === 'knit' || raw === 'os' ? raw : fallback;
}

/** Résultat d'une sélection de dossier coffre. */
export type PickVaultOutcome =
  | { kind: 'cancelled' }
  | { kind: 'opened'; path: string }
  | { kind: 'needs_init'; path: string }
  | { kind: 'error'; message: string };

/** Config locale `.knit/config.yaml` (jamais synchronisée). */
export interface VaultLocalConfig {
  theme: string;
  hue: number;
  trash_mode: TrashMode;
  lan_only: boolean;
}

/** Options d'initialisation d'un coffre (IPC `init_vault`). */
export interface InitVaultOptions {
  vault_name: string;
  create_default_structure?: boolean;
  install_ai_kit?: boolean;
  init_git?: boolean;
  hue?: number;
  theme?: string;
}

export interface InitVaultResult {
  vault_path: string;
  vault_name: string;
  created_files: string[];
}

/** Entrée du registre local des coffres (persistance `localStorage`, style Obsidian). */
export interface RegisteredVault {
  path: string;
  name: string;
  lastOpenedAt: number;
  /** Coffre mémoire Vite (`Knit Demo Vault`). */
  isDemo?: boolean;
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

