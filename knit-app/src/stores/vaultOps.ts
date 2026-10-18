import type { UnlistenFn } from '@tauri-apps/api/event';
import type { FileNode, FrontmatterDoc } from '../types';

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
