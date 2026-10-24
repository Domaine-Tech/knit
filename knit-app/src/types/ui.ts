/**
 * Types d'interface utilisateur (UI), icônes, thèmes et infobulles de Knit
 */

import type { FileNode } from './vault';

export type IconName =
  | 'folder'
  | 'folder-open'
  | 'file-text'
  | 'file-markdown'
  | 'image'
  | 'search'
  | 'close'
  | 'save'
  | 'sun'
  | 'moon'
  | 'sync'
  | 'check'
  | 'warning'
  | 'info'
  | 'plus'
  | 'add'
  | 'minus'
  | 'star'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'edit'
  | 'split'
  | 'slider'
  | 'vault'
  | 'collapse-all'
  | 'expand-all'
  | 'copy'
  | 'trash'
  | 'external-link'
  | 'clipboard'
  | 'pin'
  | 'link'
  | 'folder-plus'
  | 'share'
  | 'arrow-right'
  | 'x'
  | 'user'
  | 'upload'
  | 'shield'
  | 'kanban'
  | 'table'
  | 'tag'
  | 'command'
  | 'download'
  | 'filter'
  | 'eye'
  | 'eye-off'
  | 'sort'
  | 'knit'
  | 'logo'
  | 'bug'
  | 'calendar'
  | 'canvas'
  | 'slides'
  | 'gallery'
  | 'graph';

export type ThemeMode = 'light' | 'dark';

/** Préférence thème (auto = suit l'OS). */
export type ThemePreference = 'light' | 'dark' | 'auto';

/** Narrowing sûr de la préférence thème (config locale / Wizard). */
export function parseThemePreference(
  raw: string | null | undefined,
  fallback: ThemePreference = 'auto'
): ThemePreference {
  return raw === 'light' || raw === 'dark' || raw === 'auto' ? raw : fallback;
}

/** Onglets du panneau latéral (fichiers / recherche / tags / agenda / corbeille / historique). */
export type SidebarTab = 'files' | 'search' | 'tags' | 'calendar' | 'trash' | 'history';

/** Options du hook `useSidebarTree`. */
export interface UseSidebarTreeOptions {
  files: FileNode[];
  onSelectFile: (path: string, preview: boolean) => void;
  onMiddleClickFile: (path: string) => void;
  controlledSidebarTab?: SidebarTab;
  onSidebarTabChange?: (tab: SidebarTab) => void;
}

export interface PresetColor {
  name: string;
  hue: number;
  bgHex?: string;
}

export interface TooltipProps {
  content: string;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}

export interface TooltipData {
  text: string;
  shortcut?: string;
  targetRect: DOMRect;
  mouse: { x: number; y: number };
  preferredPos: 'top' | 'bottom' | 'left' | 'right';
}

export interface ComputedPosition {
  left: number;
  top: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

/** Option d'une liste déroulante Knit (React + DOM). */
export interface KnitSelectOption {
  value: string;
  label: string;
}

/** Options du sélecteur DOM (`createKnitSelectDom`). */
export interface KnitSelectDomOptions {
  value: string;
  options: KnitSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  minWidth?: number | string;
  /** Empêche la propagation vers CodeMirror / widgets parent */
  stopEditorEvents?: boolean;
}
