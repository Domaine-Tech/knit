/**
 * Types relatifs aux métadonnées Markdown, recherche, suggestions et tâches
 */

import type { TaskStatus } from './kanban';
import type { DocType } from './views';

/**
 * Statut YAML frontmatter (`statut:` / `status:`).
 * Alias FR/EN normalisés côté parseurs (`todo` → `a-faire`, etc.).
 */
export type VaultTaskStatut =
  | 'backlog'
  | 'a-faire'
  | 'en-cours'
  | 'en-revue'
  | 'termine'
  | 'bloque';

/**
 * Priorité YAML frontmatter (`priorite:` / `priority:`).
 * Distinct de `TaskPriority` inline (`!p1`…`!p3`).
 * Inclut `critique` (legacy VISION/demo) et `urgente` (MARKDOWN_SPEC).
 */
export type VaultTaskPriorite = 'basse' | 'moyenne' | 'haute' | 'urgente' | 'critique';

export interface HeadingItem {
  file_rel: string;
  level: number;
  text: string;
  slug: string;
}

export interface SuggestDocItem {
  rel_path: string;
  title: string;
  doc_type: DocType;
}

export interface SuggestTagItem {
  tag: string;
  count: number;
}

export interface SuggestIndexData {
  docs: SuggestDocItem[];
  headings: HeadingItem[];
  tags: SuggestTagItem[];
}

export interface SearchSnippet {
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
}

export interface FileSearchResult {
  rel_path: string;
  file_name: string;
  total_matches: number;
  snippets: SearchSnippet[];
}

export interface TaskCard {
  rel_path: string;
  id: string;
  titre: string;
  statut: VaultTaskStatut;
  priorite?: VaultTaskPriorite;
  assigne?: string;
  sprint?: string;
  echeance?: string;
  tags: string[];
  snippet: string;
}

export interface TagInfo {
  tag: string;
  count: number;
  files: string[];
}

/** Tâche checkbox indexée dans le corps Markdown (hors frontmatter). */
export interface IndexedInlineTask {
  path: string;
  lineIndex: number;
  status: TaskStatus;
  text: string;
  rawLine: string;
}

/** Cible WikiLink résolue (alias, chemin fichier, ancre optionnelle). */
export interface ResolvedWikiLink {
  /** Libellé affiché (alias ou titre dérivé). */
  displayName: string;
  /** Chemin relatif fichier (avec `.md` si note). */
  filePath: string;
  /** Cible brute sans alias (`Note#ancre` ou `Note`). */
  target: string;
  /** Fragment d'ancre sans `#`, si présent. */
  anchor: string | null;
}
