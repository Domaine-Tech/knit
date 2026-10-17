/**
 * Types relatifs à la vue tabulaire (TableView / Doc-Driven Tables) de Knit
 */

export interface TableRowItem {
  id: string;
  columnId: string;
  columnTitle: string;
  columnColor?: string;
  title: string;
  completed: boolean;
  tags: string[];
  wikiLinks: string[];
}

export type SortField = 'column' | 'title' | 'completed';
export type SortOrder = 'asc' | 'desc';
