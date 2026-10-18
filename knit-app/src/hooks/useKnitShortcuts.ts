import { useEffect } from 'react';
import { tabStore } from '../stores/tabStore';
import { vaultStore } from '../stores/vaultStore';
import { historyStore } from '../stores/historyStore';
import { debugStore } from '../stores/debugStore';
import { toast } from '../stores/toastStore';

import type { KnitShortcutsProps } from '../types';

export function useKnitShortcuts({
  setIsQuickSwitcherOpen,
  setIsCommandPaletteOpen,
  setIsZenMode,
  handleOpenDailyNote,
  handlePackageContext,
  handleSaveActiveNote,
  handleNewNote,
}: KnitShortcutsProps) {
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

      // Mode Zen (Ctrl+Shift+F - US B-055)
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsZenMode((z) => {
          const next = !z;
          toast.info(next ? 'Mode Zen activé (Ctrl+Shift+F pour quitter)' : 'Mode Zen désactivé');
          return next;
        });
        return;
      }

      // Split View (Ctrl+\ - US B-030b)
      if (isMod && (e.key === '\\' || e.code === 'Backslash')) {
        e.preventDefault();
        tabStore.toggleSplit();
        return;
      }

      // Bascule universelle Source </> ↔ Rendu (Ctrl+E - US B-030d)
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'e') {
        const active =
          tabStore.activeGroupId === 2 && tabStore.isSplit
            ? tabStore.splitTab
            : tabStore.activeTab;
        if (active?.docType === 'image') return;
        e.preventDefault();
        tabStore.toggleViewMode();
        return;
      }

      // Mode Debug Global (Ctrl+Alt+D ou Cmd+Option+D)
      if (isMod && e.altKey && (e.key.toLowerCase() === 'd' || e.code === 'KeyD')) {
        e.preventDefault();
        e.stopPropagation();
        const next = debugStore.toggle();
        toast.info(
          next ? 'Mode Debug Global activé' : 'Mode Debug désactivé',
          'Inspecteur Knit (Ctrl+Alt+D)'
        );
        return;
      }

      // Note quotidienne (Ctrl+Shift+J ou Alt+D - US B-053)
      if ((isMod && e.shiftKey && e.key.toLowerCase() === 'j') || (!isMod && e.altKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        handleOpenDailyNote();
        return;
      }

      // Packager IA (Ctrl+Shift+C - US B-045)
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handlePackageContext();
        return;
      }

      // Raccourci Kanban rapide (Ctrl+Shift+K)
      if (isMod && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (tabStore.activeTab && tabStore.activeTab.docType !== 'image') {
          const nextType = tabStore.activeTab.docType === 'kanban' ? 'note' : 'kanban';
          vaultStore.convertDocumentType(tabStore.activeTab.path, nextType);
        }
        return;
      }

      if (isMod && !e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveActiveNote();
      } else if (isMod && !e.shiftKey && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        const active = (tabStore.activeGroupId === 2 && tabStore.isSplit) ? tabStore.splitTab : tabStore.activeTab;
        if (active) {
          tabStore.closeTab(active.id, (tabStore.activeGroupId === 2 && tabStore.isSplit) ? 2 : 1);
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

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [
    setIsQuickSwitcherOpen,
    setIsCommandPaletteOpen,
    setIsZenMode,
    handleOpenDailyNote,
    handlePackageContext,
    handleSaveActiveNote,
    handleNewNote,
  ]);
}
