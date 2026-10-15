import React, { useEffect, useState, useCallback } from 'react';
import { Header } from './components/Header/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TabBar } from './components/Tabs/TabBar';
import { Editor } from './components/Editor/Editor';
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

      if (isMod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveActiveNote();
      } else if (isMod && e.key.toLowerCase() === 'w') {
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
      } else if (isMod && e.key.toLowerCase() === 'n') {
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
      } else if (isMod && e.key.toLowerCase() === 'f') {
        // Si le focus n'est pas dans l'éditeur, on donne le focus à l'éditeur CodeMirror
        const editorDom = document.querySelector('.cm-content') as HTMLElement | null;
        if (editorDom && document.activeElement !== editorDom) {
          editorDom.focus();
        }
      } else if (isMod && e.key.toLowerCase() === 'h') {
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
      document.title = `${activeTab.title}${activeTab.isDirty ? ' •' : ''} — Knit v0.1.0 (Sprint 1)`;
    } else {
      document.title = 'Knit — v0.1.0 (Sprint 1)';
    }
  }, [activeTab]);

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
      {/* En-tête de l'application */}
      <Header
        theme={theme}
        hue={hue}
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
        onTriggerDemoSync={() => {
          toast.sync('Node-Alice (P2P)', 1);
        }}
      />

      {/* Corps principal : Sidebar + Espace Éditeur */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar
          files={files}
          activePath={activeTabId}
          onSelectFile={handleSelectFile}
          onMiddleClickFile={handleMiddleClickFile}
        />

        <main
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            backgroundColor: 'var(--knit-surface)',
          }}
        >
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
                <div><kbd>Ctrl+F</kbd> Rechercher</div>
                <div>•</div>
                <div><kbd>Ctrl+S</kbd> Sauvegarder</div>
                <div>•</div>
                <div><kbd>Clic molette</kbd> Nouvel onglet / Fermer</div>
              </div>
            </div>
          )}
        </main>
      </div>

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
