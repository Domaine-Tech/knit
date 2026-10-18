import { tabStore } from '../stores/tabStore';
import { vaultStore } from '../stores/vaultStore';
import { debugStore } from '../stores/debugStore';
import { toast } from '../stores/toastStore';
import { applyTheme } from '../theme/theme';
import type { CommandItem, CommandRegistryOptions } from '../types';

export function buildCommandList(opts: CommandRegistryOptions): CommandItem[] {
  const {
    splitTabId,
    activeTab,
    isZenMode,
    theme,
    setIsZenMode,
    setTheme,
    setSidebarTab,
    setIsQuickSwitcherOpen,
    handleNewNote,
    handleNewKanban,
    handleSaveActiveNote,
    handleOpenDailyNote,
    handlePackageContext,
    handleHeaderViewChange,
  } = opts;

  return [
    {
      id: 'cmd-toggle-debug',
      title: 'Activer / Désactiver le Mode Debug Global (Inspecteur)',
      category: 'Développement',
      shortcut: 'Ctrl+Alt+D',
      icon: 'bug',
      action: () => {
        const next = debugStore.toggle();
        toast.info(
          next ? 'Mode Debug Global activé' : 'Mode Debug désactivé',
          'Inspecteur Knit (Ctrl+Alt+D)'
        );
      },
    },
    {
      id: 'cmd-split-view',
      title: splitTabId ? 'Fermer le panneau scindé' : 'Scinder l’espace de travail en 2 (Split View)',
      category: 'Affichage',
      shortcut: 'Ctrl+\\',
      icon: 'split',
      action: () => tabStore.toggleSplit(),
    },
    {
      id: 'cmd-toggle-source',
      title: activeTab?.viewMode === 'visual' ? 'Basculer en Code Source brut' : 'Basculer en Rendu Visuel',
      category: 'Affichage',
      shortcut: 'Ctrl+E',
      icon: 'command',
      action: () => {
        if (activeTab) tabStore.toggleViewMode(activeTab.id);
      },
    },
    {
      id: 'cmd-zen-mode',
      title: isZenMode ? 'Quitter le mode Zen' : 'Activer le mode Zen sans distraction',
      category: 'Affichage',
      shortcut: 'Ctrl+Shift+F',
      icon: 'sun',
      action: () => setIsZenMode((z) => !z),
    },
    {
      id: 'cmd-daily-note',
      title: 'Ouvrir la note quotidienne du jour (Journal)',
      category: 'Navigation',
      shortcut: 'Ctrl+Shift+J',
      icon: 'edit',
      action: handleOpenDailyNote,
    },
    {
      id: 'cmd-package-ai',
      title: 'Générer & copier le contexte IA (Context Packager)',
      category: 'IA & Outils',
      shortcut: 'Ctrl+Shift+C',
      icon: 'share',
      action: handlePackageContext,
    },
    {
      id: 'cmd-convert-kanban',
      title: 'Convertir la note active en Tableau Kanban',
      category: 'Document',
      icon: 'kanban',
      action: () => {
        if (activeTab) vaultStore.convertDocumentType(activeTab.path, 'kanban');
      },
    },
    {
      id: 'cmd-convert-table',
      title: 'Convertir la note active en Vue Tableau',
      category: 'Document',
      icon: 'table',
      action: () => {
        if (activeTab) vaultStore.convertDocumentType(activeTab.path, 'table');
      },
    },
    {
      id: 'cmd-convert-note',
      title: 'Convertir la vue active en Note Markdown standard',
      category: 'Document',
      icon: 'file-markdown',
      action: () => {
        if (activeTab) vaultStore.convertDocumentType(activeTab.path, 'note');
      },
    },
    {
      id: 'cmd-editor-view',
      title: 'Afficher en mode Éditeur de note',
      category: 'Vues',
      icon: 'file-markdown',
      action: () => handleHeaderViewChange('editor'),
    },
    {
      id: 'cmd-kanban-view',
      title: 'Afficher en mode Tableau Kanban',
      category: 'Vues',
      shortcut: 'Ctrl+Shift+K',
      icon: 'kanban',
      action: () => handleHeaderViewChange('kanban'),
    },
    {
      id: 'cmd-table-view',
      title: 'Afficher en mode Vue Tableau',
      category: 'Vues',
      icon: 'table',
      action: () => handleHeaderViewChange('table'),
    },
    {
      id: 'cmd-new-kanban',
      title: 'Créer un nouveau tableau Kanban...',
      category: 'Fichier',
      icon: 'kanban',
      action: handleNewKanban,
    },
    {
      id: 'cmd-quick-switcher',
      title: 'Recherche rapide de notes (Quick Switcher)',
      category: 'Navigation',
      shortcut: 'Ctrl+O',
      icon: 'search',
      action: () => setIsQuickSwitcherOpen(true),
    },
    {
      id: 'cmd-global-search',
      title: 'Recherche globale dans tout le coffre',
      category: 'Navigation',
      icon: 'search',
      action: () => setSidebarTab('search'),
    },
    {
      id: 'cmd-sidebar-notes',
      title: 'Afficher les notes dans la barre latérale',
      category: 'Navigation',
      icon: 'folder',
      action: () => setSidebarTab('files'),
    },
    {
      id: 'cmd-sidebar-tags',
      title: 'Afficher les tags dans la barre latérale',
      category: 'Navigation',
      icon: 'tag',
      action: () => setSidebarTab('tags'),
    },
    {
      id: 'cmd-save-note',
      title: 'Enregistrer le document actif',
      category: 'Fichier',
      shortcut: 'Ctrl+S',
      icon: 'save',
      action: handleSaveActiveNote,
    },
    {
      id: 'cmd-new-note',
      title: 'Créer une nouvelle note',
      category: 'Fichier',
      shortcut: 'Ctrl+N',
      icon: 'plus',
      action: handleNewNote,
    },
    {
      id: 'cmd-close-tab',
      title: "Fermer l'onglet actif",
      category: 'Onglets',
      shortcut: 'Ctrl+W',
      icon: 'close',
      action: () => {
        if (activeTab) {
          const groupId = tabStore.activeGroupId === 2 && tabStore.isSplit ? 2 : 1;
          tabStore.closeTab(activeTab.id, groupId);
        }
      },
    },
    {
      id: 'cmd-reopen-tab',
      title: 'Rouvrir le dernier onglet fermé',
      category: 'Onglets',
      shortcut: 'Ctrl+Shift+T',
      icon: 'sync',
      action: () => tabStore.reopenLastClosed((p) => vaultStore.readFile(p)),
    },
    {
      id: 'cmd-next-tab',
      title: 'Onglet suivant',
      category: 'Onglets',
      shortcut: 'Ctrl+Tab',
      icon: 'arrow-right',
      action: () => tabStore.nextTab(),
    },
    {
      id: 'cmd-prev-tab',
      title: 'Onglet précédent',
      category: 'Onglets',
      shortcut: 'Ctrl+Shift+Tab',
      icon: 'arrow-right',
      action: () => tabStore.prevTab(),
    },
    {
      id: 'cmd-toggle-theme',
      title: theme === 'dark' ? 'Basculer en thème clair' : 'Basculer en thème sombre',
      category: 'Affichage',
      icon: theme === 'dark' ? 'sun' : 'moon',
      action: () => {
        const next = theme === 'dark' ? 'light' : 'dark';
        setTheme(next);
        applyTheme(next);
      },
    },
    {
      id: 'cmd-open-vault',
      title: 'Ouvrir un coffre-fort local...',
      category: 'Coffre-fort',
      icon: 'folder-open',
      action: () => vaultStore.pickAndOpenVault(),
    },
  ];
}
