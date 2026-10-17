import type { IconName, ThemeMode } from './ui';
import type { Tab, AppViewMode } from './views';

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
  setSidebarTab: (tab: 'files' | 'search' | 'tags') => void;
  setIsQuickSwitcherOpen: (open: boolean) => void;
  handleNewNote: () => void;
  handleNewKanban: () => void;
  handleSaveActiveNote: () => void;
  handleOpenDailyNote: () => void;
  handlePackageContext: () => void;
  handleHeaderViewChange: (view: AppViewMode) => void;
}
