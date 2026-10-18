/**
 * Types d'interface utilisateur (UI), icônes, thèmes et infobulles de Knit
 */

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
  | 'sort'
  | 'knit'
  | 'logo'
  | 'bug';

export type ThemeMode = 'light' | 'dark';

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
