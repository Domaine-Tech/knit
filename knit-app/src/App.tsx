import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Header, type AppViewMode } from './components/Header/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TabBar } from './components/Tabs/TabBar';
import { Editor } from './components/Editor/Editor';
import { KanbanView } from './components/Kanban/KanbanView';
import { TableView } from './components/Table/TableView';
import { QuickSwitcherModal } from './components/Modal/QuickSwitcherModal';
import { CommandPaletteModal, type CommandItem } from './components/Modal/CommandPaletteModal';
import { ToastContainer } from './components/Toast/ToastContainer';
import { ContextMenuContainer } from './components/ContextMenu/ContextMenuContainer';
import { TooltipContainer } from './components/Tooltip/TooltipContainer';
import type { ThemeMode } from './theme/theme';
import {
  getStoredTheme,
  getStoredHue,
  applyTheme,
  applyHue,
} from './theme/theme';
import { vaultStore } from './stores/vaultStore';
import type { FileNode } from './stores/vaultStore';
import { tabStore } from './stores/tabStore';
import type { Tab } from './stores/tabStore';
import { toast } from './stores/toastStore';
import { historyStore } from './stores/historyStore';
import { DuotoneIcon } from './components/Icons/DuotoneIcon';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);
  const [hue, setHue] = useState<number>(getStoredHue);
  const [files, setFiles] = useState<FileNode[]>(vaultStore.files);
  const [tabs, setTabs] = useState<Tab[]>(tabStore.tabs);
  const [activeTabId, setActiveTabId] = useState<string | null>(tabStore.activeTabId);

  // Vue active : Éditeur, Kanban ou Tableau (Sprint 5)
  const [currentView, setCurrentView] = useState<AppViewMode>('editor');

  // Modales Sprint 5
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Onglet Sidebar (Notes, Recherche, Tags)
  const [sidebarTab, setSidebarTab] = useState<'files' | 'search' | 'tags'>('files');

  // Ligne cible pour le saut de ligne depuis la recherche globale
  const [targetLine, setTargetLine] = useState<number | undefined>(undefined);

  // Initialisation du thème au montage
  useEffect(() => {
    applyTheme(theme);
    applyHue(hue);
  }, [theme, hue]);

  // Souscriptions aux stores
  useEffect(() => {
    const unsubVault = vaultStore.subscribe(() => {
      setFiles([...vaultStore.files]);
    });
    const unsubTabs = tabStore.subscribe(() => {
      setTabs([...tabStore.tabs]);
      setActiveTabId(tabStore.activeTabId);
    });

    return () => {
      unsubVault();
      unsubTabs();
    };
  }, []);

  // Ouvre par défaut accueil.md au démarrage si aucun onglet
  useEffect(() => {
    if (tabStore.tabs.length === 0) {
      vaultStore.readFile('accueil.md').then((content) => {
        tabStore.openTab('accueil.md', false, content);
      }).catch(() => {
        // Ignorer si pas dispo
      });
    }
  }, []);

  const handleSelectFile = useCallback(async (path: string, preview: boolean) => {
    try {
      const content = await vaultStore.readFile(path);
      tabStore.openTab(path, preview, content);
    } catch (err: unknown) {
      toast.error('Erreur de lecture', String(err));
    }
  }, []);

  const handleMiddleClickFile = useCallback(async (path: string) => {
    try {
      const content = await vaultStore.readFile(path);
      // Ouvre en arrière-plan (activate = false)
      tabStore.openTab(path, false, content, false);
      toast.info('Onglet ouvert en arrière-plan', path);
    } catch (err: unknown) {
      toast.error('Erreur de lecture', String(err));
    }
  }, []);

  const handleSaveActiveNote = useCallback(async () => {
    const active = tabStore.activeTab;
    if (!active) return;

    try {
      await vaultStore.writeFile(active.path, active.content);
      tabStore.markClean(active.id);
      toast.success('Document enregistré', active.path);
    } catch (err: unknown) {
      toast.error("Erreur lors de l'enregistrement", String(err));
    }
  }, []);

  const handleNewNote = useCallback(async () => {
    const name = `note-${Date.now().toString().slice(-4)}.md`;
    try {
      await vaultStore.createFile(name, `# Nouvelle note\n\n`);
      const content = await vaultStore.readFile(name);
      setCurrentView('editor');
      tabStore.openTab(name, false, content);
      toast.success('Note créée', name);
    } catch (err: unknown) {
      toast.error('Erreur', String(err));
    }
  }, []);

  // Écouteur global des raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.ctrlKey || e.metaKey;

      // Quick Switcher (Ctrl+O)
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setIsQuickSwitcherOpen(true);
        return;
      }

      // Command Palette (Ctrl+P)
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      // Recherche globale dans tout le coffre (Ctrl+Shift+F)
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSidebarTab('search');
        return;
      }

      // Vue Kanban directe (Ctrl+Shift+K)
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCurrentView((prev) => (prev === 'kanban' ? 'editor' : 'kanban'));
        return;
      }

      if (isMod && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveActiveNote();
      } else if (isMod && !e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (tabStore.activeTabId) {
          tabStore.closeTab(tabStore.activeTabId);
        }
      } else if (isMod && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        tabStore.reopenLastClosed((p) => vaultStore.readFile(p));
      } else if (isMod && e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          tabStore.prevTab();
        } else {
          tabStore.nextTab();
        }
      } else if (isMod && !e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNewNote();
      } else if (isMod && !e.shiftKey && e.key.toLowerCase() === 'z') {
        // Annulation globale (Ctrl+Z) hors des champs texte/éditeur
        const activeEl = document.activeElement;
        const isTextInput =
          activeEl?.closest('.cm-editor') ||
          ['INPUT', 'TEXTAREA'].includes(activeEl?.tagName || '');

        if (!isTextInput && historyStore.canUndo()) {
          e.preventDefault();
          historyStore.undo();
        }
      } else if (isMod && !e.shiftKey && e.key.toLowerCase() === 'f') {
        // Si le focus n'est pas dans l'éditeur, on donne le focus à l'éditeur CodeMirror
        const editorDom = document.querySelector('.cm-content') as HTMLElement | null;
        if (editorDom && document.activeElement !== editorDom) {
          editorDom.focus();
        }
      } else if (isMod && !e.shiftKey && e.key.toLowerCase() === 'h') {
        // Si le focus n'est pas dans l'éditeur, on donne le focus à l'éditeur CodeMirror
        const editorDom = document.querySelector('.cm-content') as HTMLElement | null;
        if (editorDom && document.activeElement !== editorDom) {
          editorDom.focus();
        }
      } else if (isMod && e.key >= '1' && e.key <= '8') {
        const index = parseInt(e.key, 10) - 1;
        tabStore.goToTab(index);
      } else if (isMod && e.key === '9') {
        tabStore.goToTab(tabStore.tabs.length - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveActiveNote, handleNewNote]);

  // Désactivation globale du menu contextuel natif du navigateur / webview
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, []);

  const activeTab = tabStore.activeTab;

  // Synchronise le titre de la barre de fenêtre avec la note active et la version du projet
  useEffect(() => {
    if (activeTab) {
      document.title = `${activeTab.title}${activeTab.isDirty ? ' •' : ''} — Knit v0.3.0 (Sprint 5)`;
    } else {
      document.title = 'Knit — v0.3.0 (Sprint 5)';
    }
  }, [activeTab]);

  // Commandes pour la palette de commandes (Ctrl+P)
  const commands: CommandItem[] = useMemo(() => [
    {
      id: 'cmd-editor-view',
      title: "Basculer vers l'Éditeur de note",
      category: 'Vues',
      icon: 'file-markdown',
      action: () => setCurrentView('editor'),
    },
    {
      id: 'cmd-kanban-view',
      title: 'Afficher la vue Kanban des tâches',
      category: 'Vues',
      shortcut: 'Ctrl+Shift+K',
      icon: 'kanban',
      action: () => setCurrentView('kanban'),
    },
    {
      id: 'cmd-table-view',
      title: 'Afficher la vue Tableau récapitulatif',
      category: 'Vues',
      icon: 'table',
      action: () => setCurrentView('table'),
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
      shortcut: 'Ctrl+Shift+F',
      icon: 'search',
      action: () => {
        setSidebarTab('search');
      },
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
      title: 'Afficher l’explorateur de tags',
      category: 'Navigation',
      icon: 'tag',
      action: () => setSidebarTab('tags'),
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
      id: 'cmd-save-note',
      title: 'Sauvegarder la note active',
      category: 'Fichier',
      shortcut: 'Ctrl+S',
      icon: 'save',
      action: handleSaveActiveNote,
    },
    {
      id: 'cmd-close-tab',
      title: "Fermer l'onglet actif",
      category: 'Onglets',
      shortcut: 'Ctrl+W',
      icon: 'close',
      action: () => {
        if (tabStore.activeTabId) tabStore.closeTab(tabStore.activeTabId);
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
  ], [theme, handleNewNote, handleSaveActiveNote]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--knit-bg)',
        color: 'var(--knit-text)',
        overflow: 'hidden',
      }}
    >
      {/* En-tête de l'application avec sélecteur de vues et palette */}
      <Header
        theme={theme}
        hue={hue}
        currentView={currentView}
        onViewChange={setCurrentView}
        onOpenQuickSwitcher={() => setIsQuickSwitcherOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onThemeToggle={() => {
          const next = theme === 'dark' ? 'light' : 'dark';
          setTheme(next);
          applyTheme(next);
        }}
        onHueChange={(newHue) => {
          setHue(newHue);
          applyHue(newHue);
        }}
        onSave={handleSaveActiveNote}
        canSave={!!activeTab && activeTab.isDirty}
      />

      {/* Corps principal : Sidebar + Zone de travail (Éditeur, Kanban, ou Tableau) */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          files={files}
          activePath={activeTabId}
          sidebarTab={sidebarTab}
          onSidebarTabChange={setSidebarTab}
          onSelectFile={(p, preview) => {
            setTargetLine(undefined);
            handleSelectFile(p, preview);
          }}
          onMiddleClickFile={handleMiddleClickFile}
          onOpenFileAtLine={(p, line) => {
            setCurrentView('editor');
            setTargetLine(line);
            handleSelectFile(p, false);
          }}
        />

        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            backgroundColor: 'var(--knit-surface)',
            position: 'relative',
          }}
        >
          {currentView === 'kanban' && (
            <KanbanView
              onOpenTask={(taskPath) => {
                setCurrentView('editor');
                setTargetLine(undefined);
                handleSelectFile(taskPath, false);
              }}
            />
          )}

          {currentView === 'table' && (
            <TableView
              onOpenTask={(taskPath) => {
                setCurrentView('editor');
                setTargetLine(undefined);
                handleSelectFile(taskPath, false);
              }}
            />
          )}

          {currentView === 'editor' && (
            <>
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onNewNote={handleNewNote}
              />

              {activeTab ? (
                <Editor
                  key={activeTab.id}
                  path={activeTab.path}
                  content={activeTab.content}
                  isDirty={activeTab.isDirty}
                  initialLine={targetLine}
                  onChange={(newContent) => {
                    tabStore.updateContent(activeTab.id, newContent);
                  }}
                  onSave={handleSaveActiveNote}
                />
              ) : (
                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--knit-text-muted)',
                    gap: 16,
                    padding: 32,
                  }}
                >
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      backgroundColor: 'var(--knit-surface-hover)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <DuotoneIcon name="file-markdown" size={28} />
                  </div>

                  <div style={{ textAlign: 'center' }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--knit-text)', marginBottom: 6 }}>
                      Aucun document ouvert
                    </h3>
                    <p style={{ fontSize: 13, maxWidth: 360, lineHeight: 1.5 }}>
                      Sélectionnez un fichier dans la barre latérale ou créez une nouvelle note avec <kbd style={{ padding: '2px 6px', background: 'var(--knit-surface-hover)', border: '1px solid var(--knit-border)', borderRadius: 4, fontFamily: 'var(--knit-font-mono)' }}>Ctrl+N</kbd>.
                    </p>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 12,
                      marginTop: 10,
                      fontSize: 12,
                      color: 'var(--knit-text-secondary)',
                    }}
                  >
                    <div><kbd>Ctrl+O</kbd> Sauter à...</div>
                    <div>•</div>
                    <div><kbd>Ctrl+P</kbd> Commandes</div>
                    <div>•</div>
                    <div><kbd>Ctrl+Shift+K</kbd> Kanban</div>
                    <div>•</div>
                    <div><kbd>Ctrl+Shift+F</kbd> Recherche</div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modale Quick Switcher (Ctrl+O) */}
      <QuickSwitcherModal
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
        onSelectFile={(path, inNewTab) => {
          setIsQuickSwitcherOpen(false);
          setCurrentView('editor');
          setTargetLine(undefined);
          if (inNewTab) {
            handleMiddleClickFile(path);
          } else {
            handleSelectFile(path, false);
          }
        }}
      />

      {/* Palette de commandes (Ctrl+P) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* Notifications Toast */}
      <ToastContainer />

      {/* Menu contextuel centralisé */}
      <ContextMenuContainer />

      {/* Tooltips modernes et unifiés */}
      <TooltipContainer />
    </div>
  );
};

export default App;
