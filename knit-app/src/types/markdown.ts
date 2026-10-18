/**
 * Types relatifs aux métadonnées Markdown, recherche, suggestions et tâches
 */

export interface HeadingItem {
  file_rel: string;
  level: number;
  text: string;
  slug: string;
}

export interface SuggestDocItem {
  rel_path: string;
  title: string;
  doc_type: string;
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
  statut: string;
  priorite?: string;
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
  status: string;
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
