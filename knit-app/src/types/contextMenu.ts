import type { IconName } from './ui';

/**
 * Types relatifs aux menus contextuels applicatifs de Knit
 */

export interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: IconName;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  divider?: boolean;
  /** Sous-menu déroulant (flyout au survol). */
  children?: ContextMenuItem[];
  onClick?: () => void;
}

export interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  items: ContextMenuItem[];
}
