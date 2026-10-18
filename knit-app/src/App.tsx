import React from 'react';
import { Header } from './components/Header/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { TabBar } from './components/Tabs/TabBar';
import { DocumentPane } from './components/Workspace/DocumentPane';
import { QuickSwitcherModal } from './components/Modal/QuickSwitcherModal';
import { CommandPaletteModal } from './components/Modal/CommandPaletteModal';
import { GlobalAgendaModal } from './components/Calendar/GlobalAgendaModal';
import { HoverPreviewHost } from './components/Editor/HoverPreviewHost';
import { ToastContainer } from './components/Toast/ToastContainer';
import { ContextMenuContainer } from './components/ContextMenu/ContextMenuContainer';
import { TooltipContainer } from './components/Tooltip/TooltipContainer';
import { applyTheme, applyHue } from './theme/theme';
import { tabStore } from './stores/tabStore';
import { useAppShell } from './hooks';

export const App: React.FC = () => {
  const shell = useAppShell();
  const {
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
    setTargetLine,
    handleSelectFile,
    handleMiddleClickFile,
    handleSaveActiveNote,
    handleNewNote,
    handleOpenGlobalAgenda,
    openGlobalAgenda,
    closeGlobalAgenda,
    isGlobalAgendaOpen,
    globalAgendaFocusDate,
    resolvedActiveTabId,
    resolvedGroup2TabId,
    activeTab,
    splitTab,
    commands,
    documentPaneProps,
  } = shell;

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
          onOpenGlobalAgenda={handleOpenGlobalAgenda}
          isGlobalAgendaOpen={isGlobalAgendaOpen}
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
            onOpenGlobalAgenda={openGlobalAgenda}
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
                    activeTabId={resolvedActiveTabId}
                    groupId={1}
                    isFocused={focusedGroupId === 1}
                    isSplit={true}
                    onNewNote={handleNewNote}
                    onToggleSplit={() => tabStore.toggleSplit()}
                  />
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <DocumentPane tab={activeTab} groupId={1} {...documentPaneProps} />
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
                    activeTabId={resolvedGroup2TabId}
                    groupId={2}
                    isFocused={focusedGroupId === 2}
                    isSplit={true}
                    onNewNote={handleNewNote}
                    onCloseSplit={() => tabStore.closeSplit()}
                  />
                </div>
                <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <DocumentPane tab={splitTab} groupId={2} {...documentPaneProps} />
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
                  activeTabId={resolvedActiveTabId}
                  groupId={1}
                  isFocused={false}
                  isSplit={false}
                  onNewNote={handleNewNote}
                  onToggleSplit={() => tabStore.toggleSplit()}
                />
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <DocumentPane tab={activeTab} groupId={1} {...documentPaneProps} />
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

      {/* Agenda global du coffre (modale — pas un onglet fichier) */}
      <GlobalAgendaModal
        isOpen={isGlobalAgendaOpen}
        onClose={closeGlobalAgenda}
        initialDate={globalAgendaFocusDate}
        onOpenFile={(path, line, opts) => {
          if (line != null && line > 0) setTargetLine(line);
          if (opts?.newTab) {
            void handleMiddleClickFile(path);
          } else {
            void handleSelectFile(path, false);
          }
        }}
      />

      {/* Hover Preview global (Agenda, Canvas, recherche — hors Editor) */}
      <HoverPreviewHost />

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
