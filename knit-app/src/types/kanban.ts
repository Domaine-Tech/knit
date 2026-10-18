/**
 * Types relatifs aux tableaux Kanban et statuts de tâches Markdown
 */

export type TaskStatus = ' ' | '/' | 'x' | '-' | '?' | '>' | '!';

export interface KanbanCard {
  id: string;
  title: string;
  completed: boolean;
  status: TaskStatus;
  priority?: 'p1' | 'p2' | 'p3';
  rawText: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  cards: KanbanCard[];
}

export interface KanbanBoard {
  frontmatter: string;
  title: string;
  preamble: string;
  columns: KanbanColumn[];
}

export interface CardMetadata {
  cleanTitle: string;
  tags: string[];
  wikiLinks: string[];
  priority?: 'p1' | 'p2' | 'p3';
  assignee?: string;
  dueDate?: string;
}

export interface UseKanbanBoardProps {
  activeFilePath?: string | null;
  activeFileContent?: string;
  onUpdateContent: (path: string, content: string) => void;
}

export interface MoveCardOptions {
  cardId: string;
  sourceColumnId: string;
  targetColumnId: string;
  /** Slot d'insertion. Absent : la carte est ajoutée en fin de colonne cible. */
  insertIndex?: number;
}

export type MoveCardOutcome =
  | 'missing-source'
  | 'missing-card'
  | 'missing-target'
  | 'noop'
  | 'reordered'
  | 'moved';

export interface MoveCardResult {
  outcome: MoveCardOutcome;
  cardTitle: string;
  cardId: string;
  fromColumn: string;
  toColumn: string;
  fromIndex: number;
  toIndex: number;
}

export interface KanbanDragInfo {
  cardId: string;
  sourceColumnId: string;
}

export interface KanbanDropSlot {
  columnId: string;
  index: number;
}

