import type { IconName } from './ui';
import type { ConvertibleDocType } from './views';

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

export interface PathCopyMenuOptions {
  relPath: string;
  absPath: string;
  /** Nom affiché pour « Copier le nom ». Absent : l'entrée est omise. */
  name?: string;
  nameLabel?: string;
  includeMarkdownLink?: boolean;
  /** Libellé court dans le sous-menu (défaut dérivé de nameLabel). */
  nameChildLabel?: string;
  markdownAlias?: string;
  /** Préfixe des identifiants, ex. `copy-` ou `copy-dir-`. */
  idPrefix?: string;
  /** Variante image : `![alias](path)` au lieu de `[alias](path)`. */
  markdownAsImage?: boolean;
}

export type CreateDocKind = ConvertibleDocType | 'dir';

export interface CreateInFolderMenuOptions {
  /** Dossier parent relatif (`''` = racine du coffre). */
  parentDir: string;
  /** Inclure « Nouveau dossier… » (défaut : true). */
  includeFolder?: boolean;
  /**
   * Remplace le prompt pour la note (ex. saisie inline sidebar).
   * Si fourni, `onCreated` n'est pas appelé pour ce chemin.
   */
  createNote?: () => void;
  /** Raccourci affiché sur « Note Markdown… » (souvent Ctrl+N à la racine). */
  noteShortcut?: string;
  onCreated?: (relPath: string, kind: CreateDocKind) => void;
}

export interface CloseTabsMenuOptions {
  tabId: string;
  tabIndex: number;
  tabsCount: number;
  onClose: () => void;
  onCloseOthers: () => void;
  onCloseToRight: () => void;
  onCloseAll: () => void;
}
