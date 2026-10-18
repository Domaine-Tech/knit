/**
 * Types relatifs aux onglets, modes de rendu et vues Doc-Driven
 *
 * Métadonnées UI (labels, icônes, templates de création) :
 * → `utils/docTypeRegistry.ts` (`CONVERTIBLE_DOC_TYPES`).
 * Ajouter une vue ici **et** dans le registre pour la propager partout.
 */

import type { IconName } from './ui';

export type DocType =
  | 'note'
  | 'kanban'
  | 'table'
  | 'image'
  | 'calendar'
  | 'canvas'
  | 'slides'
  | 'gallery';

export const DOC_TYPES: readonly DocType[] = [
  'note',
  'kanban',
  'table',
  'image',
  'calendar',
  'canvas',
  'slides',
  'gallery',
] as const;

export function isDocType(value: string | null | undefined): value is DocType {
  return DOC_TYPES.includes((value || '') as DocType);
}

/** Types Markdown convertibles via frontmatter `type:` (hors médias `image`). */
export type ConvertibleDocType = Extract<
  DocType,
  'note' | 'kanban' | 'table' | 'calendar' | 'canvas' | 'slides' | 'gallery'
>;

export interface DocTypeMeta {
  type: ConvertibleDocType;
  label: string;
  icon: IconName;
  description: string;
  defaultFileName: string;
}

/** Mode plein onglet vs aperçu hover (lecture seule, chrome réduit). */
export type DocTypeRenderMode = 'page' | 'preview';

export type ViewMode = 'visual' | 'source';

export type AppViewMode =
  | 'editor'
  | 'kanban'
  | 'table'
  | 'image'
  | 'calendar'
  | 'canvas'
  | 'slides'
  | 'gallery';

/** Mapping DocType → vue debug / shell active. */
export function docTypeToAppViewMode(docType: DocType): AppViewMode {
  switch (docType) {
    case 'kanban':
      return 'kanban';
    case 'table':
      return 'table';
    case 'image':
      return 'image';
    case 'calendar':
      return 'calendar';
    case 'canvas':
      return 'canvas';
    case 'slides':
      return 'slides';
    case 'gallery':
      return 'gallery';
    case 'note':
      return 'editor';
    default: {
      const _exhaustive: never = docType;
      return _exhaustive;
    }
  }
}

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

export interface DocTypeViewRouterProps {
  path: string;
  content: string;
  docType: DocType;
  mode?: DocTypeRenderMode;
  readOnly?: boolean;
  viewMode?: ViewMode;
  isDirty?: boolean;
  initialLine?: number;
  onChange?: (newContent: string) => void;
  onSave?: () => void;
  onUpdateContent?: (path: string, content: string) => void | Promise<void>;
  onOpenFile?: (path: string, line?: number, opts?: { newTab?: boolean }) => void;
  onSwitchToEditor?: () => void;
  onNavigateFile?: (targetPath: string) => void;
}

