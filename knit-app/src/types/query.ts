/**
 * Types du moteur de requêtes Frontmatter & blocs dynamiques (Sprint 6bis)
 * + index coffre unifié B-057 (`VaultIndexData`).
 */

import type { CalendarEvent, CalendarIndexData } from './calendar';
import type { HeadingItem, IndexedInlineTask, SuggestIndexData } from './markdown';
import type { DocType } from './views';

/** Forme brute IPC frontmatter (camelCase ou snake_case). */
export interface RawFrontmatterFileEntry {
  path: string;
  name: string;
  title: string;
  docType?: string;
  doc_type?: string;
  mtime: number;
  fields: Record<string, string>;
}

/** Forme brute IPC tâche inline. */
export interface RawIndexedInlineTask {
  path: string;
  lineIndex?: number;
  line_index?: number;
  status: string;
  text: string;
  rawLine?: string;
  raw_line?: string;
}

/** Payload brut `get_vault_index` avant normalisation. */
export interface RawVaultIndexData {
  generation: number;
  suggest: {
    docs: Array<{ rel_path: string; title: string; doc_type: string }>;
    headings: HeadingItem[];
    tags: SuggestIndexData['tags'];
  };
  files: RawFrontmatterFileEntry[];
  tasks: RawIndexedInlineTask[];
  calendar: CalendarIndexData | { events: CalendarEvent[] };
}

export type QuerySortDirection = 'asc' | 'desc';

export interface QuerySortSpec {
  field: string;
  direction: QuerySortDirection;
}

export type QueryWhereOperator = '=' | '!=' | '==' | 'contains' | '>' | '<';

export interface QueryWhereClause {
  field: string;
  operator: QueryWhereOperator;
  value: string;
}

export interface QueryFilter {
  from?: string;
  where?: QueryWhereClause[];
  sort?: QuerySortSpec[];
  columns?: string[];
  limit?: number;
}

export interface FrontmatterIndexEntry {
  path: string;
  name: string;
  title: string;
  docType: DocType;
  mtime: number;
  fields: Record<string, string>;
}

/** Payload IPC `get_vault_index` (scan unique B-057). */
export interface VaultIndexData {
  generation: number;
  suggest: SuggestIndexData;
  files: FrontmatterIndexEntry[];
  tasks: IndexedInlineTask[];
  calendar: CalendarIndexData;
}

/** Projection unitaire IPC `index_markdown_content`. */
export interface IndexedMarkdownSlice {
  file: FrontmatterIndexEntry;
  headings: SuggestIndexData['headings'];
  fileTags: string[];
  tasks: IndexedInlineTask[];
  calendarEvents: CalendarIndexData['events'];
}

export interface QueryResultRow {
  path: string;
  name: string;
  title: string;
  mtime: number;
  values: Record<string, string>;
}

export interface QueryResult {
  columns: string[];
  rows: QueryResultRow[];
}

/** Options déclaratives d'un bloc fence knit-* */
export type BlockOptions = Record<string, string | number | boolean | string[]>;

export interface InlineTaskItem {
  path: string;
  lineIndex: number;
  status: string;
  text: string;
  rawLine: string;
}

/** Coque DOM commune des blocs dynamiques knit-* (Live Preview). */
export interface DynamicBlockShell {
  container: HTMLElement;
  resizeObserver: ResizeObserver;
}
