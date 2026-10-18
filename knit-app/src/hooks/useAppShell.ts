import { useEffect, useState, useCallback, useMemo } from 'react';
import type { AppViewMode, CommandItem, ThemeMode, FileNode, SidebarTab, Tab } from '../types';
import { docTypeToAppViewMode } from '../types';
import {
  getStoredTheme,
  getStoredHue,
  applyTheme,
  applyHue,
} from '../theme/theme';
import { vaultStore } from '../stores/vaultStore';
import { tabStore } from '../stores/tabStore';
import { toast } from '../stores/toastStore';
import { debugStore } from '../stores/debugStore';
import { useResizablePanels } from './useResizablePanels';
import { useKnitShortcuts } from './useKnitShortcuts';
import {
  buildCommandList,
  APP_VERSION,
  packageContextForAI,
  formatIsoDate,
  isMediaFilePath,
  setSimpleLinkClick,
  buildDailyJournalTemplate,
  journalPathForDate,
} from '../utils';

/**
 * Shell applicatif : thème, synchro vault/tabs, handlers fichiers et commandes.
 * Isolé de App.tsx pour garder le rendu JSX léger.
 */
export function useAppShell() {
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

  const [isZenMode, setIsZenMode] = useState(false);

  // Mode Lecture (Zen) : liens au clic simple partout (CM + widgets LP)
  useEffect(() => {
    setSimpleLinkClick(isZenMode);
    return () => setSimpleLinkClick(false);
  }, [isZenMode]);
  const [isQuickSwitcherOpen, setIsQuickSwitcherOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('files');
  const [targetLine, setTargetLine] = useState<number | undefined>(undefined);
  const [isGlobalAgendaOpen, setIsGlobalAgendaOpen] = useState(false);
  const [globalAgendaFocusDate, setGlobalAgendaFocusDate] = useState<string | undefined>(undefined);

  useEffect(() => {
    applyTheme(theme);
    applyHue(hue);
  }, [theme, hue]);

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

  useEffect(() => {
    if (tabStore.tabs.length === 0) {
      vaultStore.readFile('accueil.md').then((content) => {
        tabStore.openTab('accueil.md', false, content);
      }).catch(() => {
        // Ignorer si pas dispo
      });
    }
  }, []);

  useEffect(() => {
    const active = (tabStore.activeGroupId === 2 && tabStore.isSplit) ? tabStore.splitTab : tabStore.activeTab;
    if (active) {
      debugStore.setActiveView(docTypeToAppViewMode(active.docType));
    }
  }, [activeTabId, activeGroup2TabId, focusedGroupId, isSplit]);

  const handleSelectFile = useCallback(async (path: string, preview: boolean) => {
    try {
      if (path.startsWith('knit://')) {
        if (path === 'knit://agenda') {
          setGlobalAgendaFocusDate(undefined);
          setIsGlobalAgendaOpen(true);
        }
        return;
      }
      if (isMediaFilePath(path)) {
        tabStore.openTab(path, preview, '', true, 'image');
        return;
      }
      const content = await vaultStore.readFile(path);
      tabStore.openTab(path, preview, content);
    } catch (err: unknown) {
      toast.error('Erreur de lecture', String(err));
    }
  }, []);

  const handleMiddleClickFile = useCallback(async (path: string) => {
    try {
      if (path.startsWith('knit://')) return;
      if (isMediaFilePath(path)) {
        tabStore.openTab(path, false, '', false, 'image');
        toast.info('Onglet média ouvert en arrière-plan', path);
        return;
      }
      const content = await vaultStore.readFile(path);
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

  const handleOpenDailyNote = useCallback(async () => {
    const dateStr = formatIsoDate(new Date());
    const relativePath = journalPathForDate(dateStr);

    try {
      const existing = await vaultStore.readFile(relativePath).catch(() => null);
      if (existing !== null) {
        tabStore.openTab(relativePath, false, existing);
        toast.info('Note quotidienne ouverte', relativePath);
      } else {
        await vaultStore.createFile(relativePath, buildDailyJournalTemplate(dateStr));
        const content = await vaultStore.readFile(relativePath);
        tabStore.openTab(relativePath, false, content);
        toast.success('Note quotidienne créée', relativePath);
      }
    } catch (err: unknown) {
      toast.error('Erreur journal', String(err));
    }
  }, []);

  const handlePackageContext = useCallback(() => {
    const active = (tabStore.activeGroupId === 2 && tabStore.isSplit) ? tabStore.splitTab : tabStore.activeTab;
    if (!active) {
      toast.info('Aucun document actif à packager');
      return;
    }
    packageContextForAI(active.path, active.content);
  }, []);

  const closeResidualAgendaTabs = useCallback(() => {
    tabStore.closeTabsForPath('knit://agenda');
  }, []);

  const openGlobalAgenda = useCallback((iso?: string) => {
    closeResidualAgendaTabs();
    setGlobalAgendaFocusDate(iso);
    setIsGlobalAgendaOpen(true);
  }, [closeResidualAgendaTabs]);

  const closeGlobalAgenda = useCallback(() => {
    setIsGlobalAgendaOpen(false);
    setGlobalAgendaFocusDate(undefined);
  }, []);

  /** Toggle Header / raccourci Ctrl+Shift+A (sans date focale). */
  const handleOpenGlobalAgenda = useCallback(() => {
    setIsGlobalAgendaOpen((open) => {
      if (open) {
        setGlobalAgendaFocusDate(undefined);
        return false;
      }
      closeResidualAgendaTabs();
      return true;
    });
  }, [closeResidualAgendaTabs]);

  useEffect(() => {
    closeResidualAgendaTabs();
  }, [closeResidualAgendaTabs]);

  useKnitShortcuts({
    setIsQuickSwitcherOpen,
    setIsCommandPaletteOpen,
    setIsZenMode,
    handleOpenDailyNote,
    handlePackageContext,
    handleSaveActiveNote,
    handleNewNote,
    handleOpenGlobalAgenda,
  });

  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, []);

  const resolvedActiveTabId = useMemo(() => {
    if (activeTabId && tabs.some((t) => t.id === activeTabId)) return activeTabId;
    return tabs.length > 0 ? tabs[0].id : null;
  }, [tabs, activeTabId]);

  const resolvedGroup2TabId = useMemo(() => {
    if (activeGroup2TabId && group2Tabs.some((t) => t.id === activeGroup2TabId)) return activeGroup2TabId;
    return group2Tabs.length > 0 ? group2Tabs[0].id : null;
  }, [group2Tabs, activeGroup2TabId]);

  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === resolvedActiveTabId);
  }, [tabs, resolvedActiveTabId]);

  const splitTab = useMemo(() => {
    return group2Tabs.find((t) => t.id === resolvedGroup2TabId);
  }, [group2Tabs, resolvedGroup2TabId]);

  const focusedTab = (focusedGroupId === 2 && isSplit) ? splitTab : activeTab;

  const currentView: AppViewMode = useMemo(() => {
    const doc = focusedTab || activeTab;
    if (!doc) return 'editor';
    if (doc.docType === 'image') return 'image';
    if (doc.viewMode === 'source') return 'editor';
    return doc.docType === 'note' ? 'editor' : doc.docType;
  }, [focusedTab, activeTab]);

  const handleHeaderViewChange = useCallback(async (view: AppViewMode) => {
    const doc = (tabStore.activeGroupId === 2 && tabStore.isSplit) ? tabStore.splitTab : tabStore.activeTab;
    if (!doc) return;
    if (doc.docType === 'image' || view === 'image') return;
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
    } else if (view === 'calendar') {
      if (doc.docType !== 'calendar') {
        await vaultStore.convertDocumentType(doc.path, 'calendar');
      }
      if (doc.viewMode === 'source') {
        tabStore.toggleViewMode(doc.id, group);
      }
    }
  }, []);

  useEffect(() => {
    const current = focusedTab || activeTab;
    if (current) {
      document.title = `${current.title}${current.isDirty ? ' •' : ''} — Knit v${APP_VERSION}`;
    } else {
      document.title = `Knit — v${APP_VERSION}`;
    }
  }, [activeTab, focusedTab]);

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
        handleOpenGlobalAgenda: openGlobalAgenda,
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
      openGlobalAgenda,
    ]
  );

  const documentPaneProps = {
    activeTabId,
    activeGroup2TabId,
    targetLine,
    onSave: handleSaveActiveNote,
    onSelectFile: handleSelectFile,
    onOpenFileInNewTab: handleMiddleClickFile,
    onOpenFileAtLine: (path: string, line: number) => {
      setTargetLine(line);
      void handleSelectFile(path, false);
    },
    readOnly: isZenMode,
  };

  return {
    theme,
    setTheme,
    hue,
    setHue,
    files,
    tabs,
    group2Tabs,
    activeTabId,
    activeGroup2TabId,
    focusedGroupId,
    isSplit,
    sidebarWidth,
    isDraggingSidebar,
    handleSidebarResizeStart,
    resetSidebarWidth,
    splitRatio,
    isDraggingSplit,
    splitContainerRef,
    handleSplitResizeStart,
    resetSplitRatio,
    isZenMode,
    setIsZenMode,
    isQuickSwitcherOpen,
    setIsQuickSwitcherOpen,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    sidebarTab,
    setSidebarTab,
    targetLine,
    setTargetLine,
    handleSelectFile,
    handleMiddleClickFile,
    handleSaveActiveNote,
    handleNewNote,
    handleNewKanban,
    resolvedActiveTabId,
    resolvedGroup2TabId,
    activeTab,
    splitTab,
    focusedTab,
    currentView,
    handleHeaderViewChange,
    handleOpenGlobalAgenda,
    openGlobalAgenda,
    closeGlobalAgenda,
    isGlobalAgendaOpen,
    globalAgendaFocusDate,
    commands,
    documentPaneProps,
  };
}
