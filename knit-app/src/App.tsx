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
import { DuotoneIcon } from './components/Icons/DuotoneIcon';
import { packageContextForAI } from './components/Editor/smartUxExtension';
import { ErrorBoundary } from './components/Common/ErrorBoundary';
import { debugStore } from './stores/debugStore';
import { useResizablePanels } from './utils/useResizablePanels';
import { useKnitShortcuts } from './utils/useKnitShortcuts';
import { buildCommandList } from './utils/commandRegistry';
import { APP_VERSION } from './utils/version';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<ThemeMode>(getStoredTheme);
  const [hue, setHue] = useState<number>(getStoredHue);
  const [files, setFiles] = useState<FileNode[]>(vaultStore.files);
  const [tabs, setTabs] = useState<Tab[]>(tabStore.tabs);
  const [group2Tabs, setGroup2Tabs] = useState<Tab[]>(tabStore.group2Tabs);
  const [activeTabId, setActiveTabId] = useState<string | null>(tabStore.activeTabId);
  const [activeGroup2TabId, setActiveGroup2TabId] = useState<string | null>(tabStore.activeGroup2TabId);
  const [focusedGroupId, setFocusedGroupId] = useState<1 | 2>(tabStore.activeGroupId);
  const [isSplit, setIsSplit] = useState<boolean>(tabStore.isSplit);
  const [splitTabId, setSplitTabId] = useState<string | null>(tabStore.splitTabId);

  // Redimensionnement dynamique de l'arborescence et Split View via hook dédié
  const {
    sidebarWidth,
    isDraggingSidebar,
    handleSidebarResizeStart,
    resetSidebarWidth,
    splitRatio,
    isDraggingSplit,
    splitContainerRef,
    handleSplitResizeStart,
    resetSplitRatio,
  } = useResizablePanels();

  // Mode Zen (Ctrl+Shift+F)
  const [isZenMode, setIsZenMode] = useState(false);

  // Modales Sprint 5 & 6
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
      setGroup2Tabs([...tabStore.group2Tabs]);
      setActiveTabId(tabStore.activeTabId);
      setActiveGroup2TabId(tabStore.activeGroup2TabId);
      setFocusedGroupId(tabStore.activeGroupId);
      setIsSplit(tabStore.isSplit);
      setSplitTabId(tabStore.splitTabId);
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

  // Synchronise le type de vue active dans le debugStore
  useEffect(() => {
    const active = (tabStore.activeGroupId === 2 && tabStore.isSplit) ? tabStore.splitTab : tabStore.activeTab;
    if (active) {
      if (active.docType === 'kanban') debugStore.setActiveView('kanban');
      else if (active.docType === 'table') debugStore.setActiveView('table');
      else debugStore.setActiveView('editor');
    }
  }, [activeTabId, activeGroup2TabId, focusedGroupId, isSplit]);

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
    const active = (tabStore.activeGroupId === 2 && tabStore.isSplit) ? tabStore.splitTab : tabStore.activeTab;
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

  const handleNewKanban = useCallback(async () => {
    const name = window.prompt('Nom du nouveau tableau Kanban :', 'kanban.md');
    if (name && name.trim()) {
      const clean = name.trim().endsWith('.md') ? name.trim() : `${name.trim()}.md`;
      try {
        const createdPath = await vaultStore.createKanbanFile(clean, clean.replace(/\.md$/, ''));
        const content = await vaultStore.readFile(createdPath);
        tabStore.openTab(createdPath, false, content);
        toast.success('Tableau Kanban créé', createdPath);
      } catch (err: unknown) {
        toast.error('Erreur de création Kanban', String(err));
      }
    }
  }, []);

  // Note Quotidienne (Ctrl+Shift+J ou Alt+D - US B-053)
  const handleOpenDailyNote = useCallback(async () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const relativePath = `journal/${dateStr}.md`;

    try {
      const existing = await vaultStore.readFile(relativePath).catch(() => null);
      if (existing !== null) {
        tabStore.openTab(relativePath, false, existing);
        toast.info('Note quotidienne ouverte', relativePath);
      } else {
        const template = `---
title: Journal du ${dateStr}
date: ${dateStr}
type: note
tags: [journal, quotidien]
---

# Journal du ${dateStr}

## Objectifs de la journée
- [ ] 

## Notes & Réflexions

## Idées & Découvertes

`;
        await vaultStore.createFile(relativePath, template);
        const content = await vaultStore.readFile(relativePath);
        tabStore.openTab(relativePath, false, content);
        toast.success('Note quotidienne créée', relativePath);
      }
    } catch (err: unknown) {
      toast.error('Erreur journal', String(err));
    }
  }, []);

  // Générateur de contexte IA (Ctrl+Shift+C - US B-045)
  const handlePackageContext = useCallback(() => {
    const active = (tabStore.activeGroupId === 2 && tabStore.isSplit) ? tabStore.splitTab : tabStore.activeTab;
    if (!active) {
      toast.info('Aucun document actif à packager');
      return;
    }
    packageContextForAI(active.path, active.content);
  }, []);

  // Écouteur global des raccourcis clavier via hook modulaire
  useKnitShortcuts({
    setIsQuickSwitcherOpen,
    setIsCommandPaletteOpen,
    setIsZenMode,
    handleOpenDailyNote,
    handlePackageContext,
    handleSaveActiveNote,
    handleNewNote,
  });

  // Désactivation globale du menu contextuel natif du navigateur / webview
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, []);

  const activeTab = tabStore.activeTab;
  const splitTab = tabStore.splitTab;
  const focusedTab = (focusedGroupId === 2 && isSplit) ? splitTab : activeTab;

  // Vue déduite dynamiquement du document actif (Doc-Driven Views)
  const currentView: AppViewMode = useMemo(() => {
    const doc = focusedTab || activeTab;
    if (!doc) return 'editor';
    if (doc.viewMode === 'source') return 'editor';
    return doc.docType === 'note' ? 'editor' : doc.docType;
  }, [focusedTab, activeTab]);

  const handleHeaderViewChange = useCallback(async (view: AppViewMode) => {
    const doc = (tabStore.activeGroupId === 2 && tabStore.isSplit) ? tabStore.splitTab : tabStore.activeTab;
    if (!doc) return;
    const group = (tabStore.activeGroupId === 2 && tabStore.isSplit) ? 2 : 1;
    if (view === 'editor') {
      if (doc.viewMode === 'source') {
        tabStore.toggleViewMode(doc.id, group);
      } else if (doc.docType !== 'note') {
        await vaultStore.convertDocumentType(doc.path, 'note');
      }
    } else if (view === 'kanban') {
      if (doc.docType !== 'kanban') {
        await vaultStore.convertDocumentType(doc.path, 'kanban');
      }
      if (doc.viewMode === 'source') {
        tabStore.toggleViewMode(doc.id, group);
      }
    } else if (view === 'table') {
      if (doc.docType !== 'table') {
        await vaultStore.convertDocumentType(doc.path, 'table');
      }
      if (doc.viewMode === 'source') {
        tabStore.toggleViewMode(doc.id, group);
      }
    }
  }, []);

  // Synchronise le titre de la barre de fenêtre avec la note active et la version du projet
  useEffect(() => {
    const current = focusedTab || activeTab;
    if (current) {
      document.title = `${current.title}${current.isDirty ? ' •' : ''} — Knit v${APP_VERSION}`;
    } else {
      document.title = `Knit — v${APP_VERSION}`;
    }
  }, [activeTab, focusedTab]);

  // Commandes pour la palette de commandes (Ctrl+P) via registre extrait
  const commands: CommandItem[] = useMemo(
    () =>
      buildCommandList({
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
      }),
    [
      splitTabId,
      activeTab,
      isZenMode,
      theme,
      handleNewNote,
      handleNewKanban,
      handleSaveActiveNote,
      handleOpenDailyNote,
      handlePackageContext,
      handleHeaderViewChange,
    ]
  );

  // Rendu modulaire d'un panneau de document (Doc-Driven Views)
  const renderDocumentPane = (tab: Tab | undefined, groupId: 1 | 2 = 1) => {
    if (!tab) {
      return (
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
            <div><kbd>Ctrl+\</kbd> Scinder vue</div>
            <div>•</div>
            <div><kbd>Ctrl+Shift+J</kbd> Note du jour</div>
          </div>
        </div>
      );
    }

    let paneNode: React.ReactNode;

    // 1. Si en mode source brut universel (Ctrl+E - US B-030d)
    if (tab.viewMode === 'source') {
      paneNode = (
        <Editor
          key={`${tab.id}-source-g${groupId}`}
          path={tab.path}
          content={tab.content}
          isDirty={tab.isDirty}
          viewMode="source"
          initialLine={tab.id === (groupId === 2 ? activeGroup2TabId : activeTabId) ? targetLine : undefined}
          onChange={(newContent) => {
            tabStore.updateContent(tab.id, newContent);
          }}
          onSave={handleSaveActiveNote}
          onNavigateFile={(targetPath) => handleSelectFile(targetPath, false)}
        />
      );
    } else if (tab.docType === 'kanban') {
      // 2. Vue Kanban automatique si type: kanban dans le frontmatter
      paneNode = (
        <KanbanView
          key={`${tab.id}-kanban-g${groupId}`}
          activeFilePath={tab.path}
          activeFileContent={tab.content}
          onUpdateContent={async (path, content) => {
            tabStore.updateContent(tab.id, content);
            await vaultStore.writeFile(path, content);
          }}
          onOpenFile={(path) => handleSelectFile(path, false)}
          onSwitchToEditor={() => tabStore.toggleViewMode(tab.id, groupId)}
        />
      );
    } else if (tab.docType === 'table') {
      // 3. Vue Table automatique si type: table dans le frontmatter
      paneNode = (
        <TableView
          key={`${tab.id}-table-g${groupId}`}
          activeFilePath={tab.path}
          activeFileContent={tab.content}
          onUpdateContent={async (path, content) => {
            tabStore.updateContent(tab.id, content);
            await vaultStore.writeFile(path, content);
          }}
          onOpenFile={(path) => handleSelectFile(path, false)}
          onSwitchToEditor={() => tabStore.toggleViewMode(tab.id, groupId)}
        />
      );
    } else {
      // 4. Par défaut : Note Markdown en vue visuelle riche (Mermaid, Live Preview, Autocomplete)
      paneNode = (
        <Editor
          key={`${tab.id}-visual-g${groupId}`}
          path={tab.path}
          content={tab.content}
          isDirty={tab.isDirty}
          viewMode="visual"
          initialLine={tab.id === (groupId === 2 ? activeGroup2TabId : activeTabId) ? targetLine : undefined}
          onChange={(newContent) => {
            tabStore.updateContent(tab.id, newContent);
          }}
          onSave={handleSaveActiveNote}
          onNavigateFile={(targetPath) => handleSelectFile(targetPath, false)}
        />
      );
    }

    return (
      <ErrorBoundary key={`${tab.id}-eb-g${groupId}`} fallbackTitle={`Erreur lors de l'affichage de ${tab.title}`}>
        {paneNode}
      </ErrorBoundary>
    );
  };

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
      {/* En-tête de l'application (atténué en mode Zen) */}
      <div
        style={{
          transition: 'opacity 0.2s ease',
          opacity: isZenMode ? 0.25 : 1,
        }}
        onMouseEnter={(e) => {
          if (isZenMode) e.currentTarget.style.opacity = '1';
        }}
        onMouseLeave={(e) => {
          if (isZenMode) e.currentTarget.style.opacity = '0.25';
        }}
      >
        <Header
          theme={theme}
          hue={hue}
          currentView={currentView}
          onViewChange={handleHeaderViewChange}
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
          canSave={!!((focusedGroupId === 2 && isSplit ? splitTab : activeTab)?.isDirty)}
          isZenMode={isZenMode}
          onToggleZenMode={() => setIsZenMode((z) => !z)}
        />
      </div>

      {/* Corps principal : Sidebar (masquée en Zen) + Séparateur resizable + Zone de travail universelle */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {!isZenMode && (
          <Sidebar
            files={files}
            width={sidebarWidth}
            activePath={(focusedGroupId === 2 && isSplit ? activeGroup2TabId : activeTabId)}
            sidebarTab={sidebarTab}
            onSidebarTabChange={setSidebarTab}
            onSelectFile={(p, preview) => {
              setTargetLine(undefined);
              handleSelectFile(p, preview);
            }}
            onMiddleClickFile={handleMiddleClickFile}
            onOpenFileAtLine={(p, line) => {
              setTargetLine(line);
              handleSelectFile(p, false);
            }}
          />
        )}

        {/* Poignée de redimensionnement de l'arborescence (Sidebar) - Ligne fine 1px style VS Code */}
        {!isZenMode && (
          <div
            onMouseDown={handleSidebarResizeStart}
            onDoubleClick={resetSidebarWidth}
            title="Glisser pour redimensionner (Double-clic pour 250px)"
            style={{
              position: 'relative',
              width: 1,
              backgroundColor: 'var(--knit-border)',
              cursor: 'col-resize',
              zIndex: 20,
              flexShrink: 0,
            }}
          >
            {/* Zone interactive invisible plus large pour une saisie facile sans épaisseur visuelle */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: -3,
                width: 7,
                cursor: 'col-resize',
              }}
            />
            {/* Ligne lumineuse active au survol ou glissement */}
            <div
              className="knit-resizer-line"
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: 2,
                backgroundColor: isDraggingSidebar ? 'var(--knit-primary)' : 'transparent',
                boxShadow: isDraggingSidebar ? '0 0 6px var(--knit-primary)' : 'none',
                transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
              }}
            />
          </div>
        )}

        <main
          ref={splitContainerRef}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            minWidth: 0,
            backgroundColor: 'var(--knit-surface)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {isSplit ? (
            <>
              {/* Panneau 1 (Gauche) : Groupe d'onglets 1 indépendant style VS Code */}
              <div
                onClick={() => tabStore.setFocusedGroup(1)}
                style={{
                  width: `${splitRatio * 100}%`,
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 150,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    transition: 'opacity 0.2s ease',
                    opacity: isZenMode ? 0.35 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (isZenMode) e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    if (isZenMode) e.currentTarget.style.opacity = '0.35';
                  }}
                >
                  <TabBar
                    tabs={tabs}
                    activeTabId={activeTabId}
                    groupId={1}
                    isFocused={focusedGroupId === 1}
                    isSplit={true}
                    onNewNote={handleNewNote}
                    onNewKanban={handleNewKanban}
                    onToggleSplit={() => tabStore.toggleSplit()}
                  />
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {renderDocumentPane(activeTab, 1)}
                </div>
              </div>

              {/* Poignée de redimensionnement entre les 2 panneaux scindés - Ligne fine 1px style VS Code */}
              <div
                onMouseDown={handleSplitResizeStart}
                onDoubleClick={resetSplitRatio}
                title="Glisser pour redimensionner (Double-clic pour 50% / 50%)"
                style={{
                  position: 'relative',
                  width: 1,
                  backgroundColor: 'var(--knit-border)',
                  cursor: 'col-resize',
                  zIndex: 20,
                  flexShrink: 0,
                }}
              >
                {/* Zone interactive invisible plus large pour une saisie facile sans épaisseur visuelle */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: -3,
                    width: 7,
                    cursor: 'col-resize',
                  }}
                />
                {/* Ligne lumineuse active au survol ou glissement */}
                <div
                  className="knit-resizer-line"
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 0,
                    width: 2,
                    backgroundColor: isDraggingSplit ? 'var(--knit-primary)' : 'transparent',
                    boxShadow: isDraggingSplit ? '0 0 6px var(--knit-primary)' : 'none',
                    transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
                  }}
                />
              </div>

              {/* Panneau 2 (Droit) : Groupe d'onglets 2 indépendant style VS Code */}
              <div
                onClick={() => tabStore.setFocusedGroup(2)}
                style={{
                  width: `${(1 - splitRatio) * 100}%`,
                  display: 'flex',
                  flexDirection: 'column',
                  minWidth: 150,
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    transition: 'opacity 0.2s ease',
                    opacity: isZenMode ? 0.35 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (isZenMode) e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    if (isZenMode) e.currentTarget.style.opacity = '0.35';
                  }}
                >
                  <TabBar
                    tabs={group2Tabs}
                    activeTabId={activeGroup2TabId}
                    groupId={2}
                    isFocused={focusedGroupId === 2}
                    isSplit={true}
                    onNewNote={handleNewNote}
                    onNewKanban={handleNewKanban}
                    onCloseSplit={() => tabStore.closeSplit()}
                  />
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  {renderDocumentPane(splitTab, 2)}
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
              <div
                style={{
                  transition: 'opacity 0.2s ease',
                  opacity: isZenMode ? 0.35 : 1,
                }}
                onMouseEnter={(e) => {
                  if (isZenMode) e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  if (isZenMode) e.currentTarget.style.opacity = '0.35';
                }}
              >
                <TabBar
                  tabs={tabs}
                  activeTabId={activeTabId}
                  groupId={1}
                  isFocused={false}
                  isSplit={false}
                  onNewNote={handleNewNote}
                  onNewKanban={handleNewKanban}
                  onToggleSplit={() => tabStore.toggleSplit()}
                />
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {renderDocumentPane(activeTab, 1)}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modale Quick Switcher (Ctrl+O) */}
      <QuickSwitcherModal
        isOpen={isQuickSwitcherOpen}
        onClose={() => setIsQuickSwitcherOpen(false)}
        onSelectFile={(path, inNewTab) => {
          setIsQuickSwitcherOpen(false);
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
