import { tabStore } from '../stores/tabStore';
import { vaultStore } from '../stores/vaultStore';
import { debugStore } from '../stores/debugStore';
import { toast } from '../stores/toastStore';
import { applyTheme } from '../theme/theme';
import type { CommandItem, CommandRegistryOptions } from '../types';
import { CONVERTIBLE_DOC_TYPES } from './docTypeRegistry';

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
    handleOpenGlobalAgenda,
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
      title: isZenMode
        ? 'Quitter le mode lecture'
        : 'Activer le mode lecture (lecture seule, liens au clic simple)',
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
    // Conversions Doc-Driven — générées depuis docTypeRegistry (source unique)
    ...CONVERTIBLE_DOC_TYPES.map(({ type, label, icon }) => ({
      id: `cmd-convert-${type}`,
      title: `Convertir en ${label}`,
      category: 'Document' as const,
      icon,
      shortcut: type === 'kanban' ? 'Ctrl+Shift+K' : undefined,
      action: () => {
        if (activeTab && activeTab.docType !== 'image') {
          void vaultStore.convertDocumentType(activeTab.path, type);
        }
      },
    })),
    {
      id: 'cmd-new-kanban',
      title: 'Créer un nouveau tableau Kanban...',
      category: 'Fichier',
      icon: 'kanban',
      action: handleNewKanban,
    },
    {
      id: 'cmd-global-agenda',
      title: 'Ouvrir l\'Agenda Global du coffre',
      category: 'Navigation',
      shortcut: 'Ctrl+Shift+A',
      icon: 'calendar',
      action: () => handleOpenGlobalAgenda(),
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
      id: 'cmd-sidebar-calendar',
      title: 'Afficher l\'Agenda & les échéances dans la barre latérale',
      category: 'Navigation',
      icon: 'calendar',
      action: () => setSidebarTab('calendar'),
    },
    {
      id: 'cmd-open-agenda',
      title: 'Ouvrir l\'Agenda global (modale)',
      category: 'Affichage',
      icon: 'calendar',
      action: () => handleOpenGlobalAgenda(),
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
      title: 'Ouvrir un dossier coffre…',
      category: 'Coffre-fort',
      icon: 'folder-open',
      action: () => {
        void vaultStore.pickAndOpenVaultSmart();
      },
    },
    {
      id: 'cmd-switch-vault',
      title: 'Changer de coffre-fort…',
      category: 'Coffre-fort',
      icon: 'vault',
      shortcut: 'Ctrl+Shift+O',
      action: () => {
        window.dispatchEvent(new CustomEvent('knit-open-vault-switcher'));
      },
    },
    {
      id: 'cmd-close-vault',
      title: 'Fermer le coffre actuel (Wizard)',
      category: 'Coffre-fort',
      icon: 'x',
      action: () => {
        void vaultStore.openWizard();
      },
    },
    {
      id: 'cmd-new-vault-wizard',
      title: 'Créer ou rejoindre un coffre…',
      category: 'Coffre-fort',
      icon: 'plus',
      action: () => {
        void vaultStore.openWizard();
      },
    },
    {
      id: 'cmd-demo-vault',
      title: 'Ouvrir le coffre démo',
      category: 'Coffre-fort',
      icon: 'knit',
      action: () => {
        void vaultStore.openDemoVault();
      },
    },
  ];
}
