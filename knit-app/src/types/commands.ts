import type { IconName, SidebarTab, ThemeMode } from './ui';
import type { Tab } from './views';

/**
 * Types relatifs à la palette de commandes et au registre de commandes de Knit
 */

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  icon: IconName;
  action: () => void;
}

export interface CommandRegistryOptions {
  splitTabId: string | null;
  activeTab: Tab | null | undefined;
  isZenMode: boolean;
  theme: ThemeMode;
  setIsZenMode: (fn: (prev: boolean) => boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  setIsQuickSwitcherOpen: (open: boolean) => void;
  handleNewNote: () => void;
  handleNewKanban: () => void;
  handleSaveActiveNote: () => void;
  handleOpenDailyNote: () => void;
  handlePackageContext: () => void;
  /** Ouvre la modale Agenda global (optionnellement sur une date ISO). */
  handleOpenGlobalAgenda: (iso?: string) => void;
}

export interface KnitShortcutsProps {
  setIsQuickSwitcherOpen: (open: boolean) => void;
  setIsCommandPaletteOpen: (open: boolean) => void;
  setIsZenMode: (fn: (prev: boolean) => boolean) => void;
  handleOpenDailyNote: () => void;
  handlePackageContext: () => void;
  handleSaveActiveNote: () => void;
  handleNewNote: () => void;
  handleOpenGlobalAgenda?: () => void;
}
