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

export interface UseKanbanBoardProps {
  activeFilePath?: string | null;
  activeFileContent?: string;
  onUpdateContent: (path: string, content: string) => void;
}

