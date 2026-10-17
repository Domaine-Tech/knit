/**
 * Types relatifs aux onglets, modes de rendu et vues Doc-Driven
 */

export type DocType = 'note' | 'kanban' | 'table';

export type ViewMode = 'visual' | 'source';

export type AppViewMode = 'editor' | 'kanban' | 'table';

export interface Tab {
  id: string; // Rel path
  path: string;
  title: string;
  isPreview: boolean;
  isDirty: boolean;
  content: string;
  docType: DocType;
  viewMode: ViewMode;
  isPinned?: boolean;
}

