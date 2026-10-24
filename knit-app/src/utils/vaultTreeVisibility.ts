import type { FileNode } from '../types';

/**
 * Visibilité arbre coffre — **source unique côté frontend**.
 *
 * Aligné sur `knit-core/src/vault/walk.rs` :
 * 1. `ALWAYS_EXCLUDED` — jamais listés (build)
 * 2. Masquage UI par défaut — dots (dont `.knit`) + kit IA ; révélés via toggle œil
 *
 * Le scan Rust liste `.knit` / `.git` / autres dots ; le watcher ignore `.knit`/`.git`.
 */

/** Aligné avec `is_always_excluded_name` (walk.rs) — artefacts de build. */
export const ALWAYS_EXCLUDED_VAULT_NAMES = new Set(
  ['node_modules', 'target', 'dist'].map((n) => n.toLowerCase())
);

/**
 * Fichiers kit agents créés par `init_vault` (pas de préfixe `.`).
 * Masqués UI par défaut ; toujours sur disque.
 */
export const DEFAULT_HIDDEN_VAULT_FILES = new Set(
  ['KNIT.md', 'GUIDE_IA.md', 'CLAUDE.md', 'AGENTS.md'].map((n) => n.toLowerCase())
);

const SHOW_HIDDEN_KEY = 'knit-sidebar-show-hidden';

export function loadShowHiddenFiles(): boolean {
  try {
    return localStorage.getItem(SHOW_HIDDEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveShowHiddenFiles(value: boolean): void {
  try {
    localStorage.setItem(SHOW_HIDDEN_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Exclusion absolue (jamais dans l'arbre UI). */
export function isAlwaysExcludedVaultName(name: string): boolean {
  return ALWAYS_EXCLUDED_VAULT_NAMES.has(name.toLowerCase());
}

/**
 * Masqué par défaut tant que le toggle œil est off :
 * - tout nom commençant par `.` (dont `.knit`, `.knitshare`, `.git`)
 * - kit IA racine (KNIT.md, GUIDE_IA.md, …)
 */
export function isDefaultHiddenVaultName(name: string): boolean {
  if (isAlwaysExcludedVaultName(name)) return true;
  if (name.startsWith('.')) return true;
  return DEFAULT_HIDDEN_VAULT_FILES.has(name.toLowerCase());
}

/**
 * Filtre l'arbre selon le toggle.
 * - `showHidden = false` : retire dots + kit IA (+ exclusion absolue)
 * - `showHidden = true` : retire uniquement l'exclusion absolue (`.knit` visible)
 */
export function filterHiddenVaultNodes(nodes: FileNode[], showHidden: boolean): FileNode[] {
  return nodes
    .map((node) => {
      if (isAlwaysExcludedVaultName(node.name)) return null;
      if (!showHidden && isDefaultHiddenVaultName(node.name)) return null;

      if (node.is_dir) {
        const children = filterHiddenVaultNodes(node.children, showHidden);
        if (children.length === 0 && node.children.length > 0) {
          return null;
        }
        return { ...node, children };
      }
      return node;
    })
    .filter((n): n is FileNode => n !== null);
}
