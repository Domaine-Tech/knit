/**
 * Types du moteur de requêtes Frontmatter & blocs dynamiques (Sprint 6bis)
 */

import type { DocType } from './views';

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
