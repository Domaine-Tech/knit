import type { DocType, Tab } from '../types';
import { detectDocType, fileNameFromPath } from '../utils';

type TabListener = () => void;

class TabStore {
  public tabs: Tab[] = []; // Groupe 1 (panneau gauche)
  public group2Tabs: Tab[] = []; // Groupe 2 (panneau droit scindé)
  public activeTabId: string | null = null; // Onglet actif groupe 1
  public activeGroup2TabId: string | null = null; // Onglet actif groupe 2
  public activeGroupId: 1 | 2 = 1; // Groupe actuellement ciblé / focus (style VS Code)
  public isSplit: boolean = false;
  public splitDirection: 'vertical' | 'horizontal' = 'vertical';

  private closedTabsHistory: { path: string; title: string; docType?: DocType; group?: 1 | 2 }[] = [];
  private listeners: Set<TabListener> = new Set();

  public subscribe(listener: TabListener): () => void {
    this.listeners.add(listener);
    listener();
    return () => {
      this.listeners.delete(listener);
    };
  }

  public notify() {
    this.listeners.forEach((l) => l());
  }

  // Rétrocompatibilité : getter/setter splitTabId
  public get splitTabId(): string | null {
    return this.isSplit ? this.activeGroup2TabId : null;
  }

  public set splitTabId(id: string | null) {
    this.activeGroup2TabId = id;
    this.isSplit = !!id;
    this.notify();
  }

  public get activeTab(): Tab | undefined {
    return this.tabs.find((t) => t.id === this.activeTabId) || (this.tabs.length > 0 ? this.tabs[0] : undefined);
  }

  public get splitTab(): Tab | undefined {
    return this.group2Tabs.find((t) => t.id === this.activeGroup2TabId) || (this.group2Tabs.length > 0 ? this.group2Tabs[0] : undefined);
  }

  public get currentFocusedTab(): Tab | undefined {
    if (this.isSplit && this.activeGroupId === 2) {
      return this.splitTab || this.activeTab;
    }
    return this.activeTab;
  }

  public setFocusedGroup(group: 1 | 2) {
    if (this.activeGroupId !== group) {
      this.activeGroupId = group;
      this.notify();
    }
  }

  public setActiveTab(id: string, group: 1 | 2 = 1) {
    if (group === 2) {
      if (this.group2Tabs.some((t) => t.id === id)) {
        this.activeGroup2TabId = id;
        this.activeGroupId = 2;
        this.notify();
      }
    } else {
      if (this.tabs.some((t) => t.id === id)) {
        this.activeTabId = id;
        this.activeGroupId = 1;
        this.notify();
      }
    }
  }

  public toggleSplit(targetPath?: string) {
    if (this.isSplit) {
      this.closeSplit();
    } else {
      this.isSplit = true;
      if (targetPath) {
        this.openTab(targetPath, false, '', true, undefined, 2);
      } else {
        // Si d'autres onglets existent dans le groupe 1, ouvrir l'un d'eux dans le groupe 2
        const other = this.tabs.find((t) => t.id !== this.activeTabId);
        if (other) {
          this.openTab(other.path, false, other.content, true, other.docType, 2);
        } else if (this.activeTab) {
          // Sinon dupliquer l'onglet courant dans le panneau droit (comme VS Code)
          this.openTab(this.activeTab.path, false, this.activeTab.content, true, this.activeTab.docType, 2);
        }
      }
      this.activeGroupId = 2;
      this.notify();
    }
  }

  public closeSplit() {
    this.isSplit = false;
    this.activeGroupId = 1;
    this.notify();
  }

  public openTab(
    path: string,
    preview: boolean = false,
    content: string = '',
    activate: boolean = true,
    forcedDocType?: DocType,
    targetGroup?: 1 | 2
  ) {
    // Si un groupe cible n'est pas spécifié, on ouvre dans le groupe actuellement focalisé (comportement VS Code)
    const group = targetGroup || (this.isSplit ? this.activeGroupId : 1);
    const targetTabs = group === 2 ? this.group2Tabs : this.tabs;
    const resolvedDocType = forcedDocType || detectDocType(content, path);
    const existingIndex = targetTabs.findIndex((t) => t.id === path);

    if (existingIndex !== -1) {
      const existing = targetTabs[existingIndex];
      if (!preview) {
        existing.isPreview = false;
      }
      if (content && content !== existing.content) {
        existing.content = content;
        existing.docType = resolvedDocType;
      }
      if (activate) {
        if (group === 2) {
          this.activeGroup2TabId = path;
          this.activeGroupId = 2;
        } else {
          this.activeTabId = path;
          this.activeGroupId = 1;
        }
      }
      this.notify();
      return;
    }

    const title = fileNameFromPath(path);

    // Remplacement d'aperçu au sein du groupe
    if (preview) {
      const previewIndex = targetTabs.findIndex((t) => t.isPreview && !t.isDirty && !t.isPinned);
      if (previewIndex !== -1) {
        targetTabs[previewIndex] = {
          id: path,
          path,
          title,
          isPreview: true,
          isDirty: false,
          content,
          docType: resolvedDocType,
          viewMode: 'visual',
          isPinned: false,
        };
        if (activate) {
          if (group === 2) {
            this.activeGroup2TabId = path;
            this.activeGroupId = 2;
          } else {
            this.activeTabId = path;
            this.activeGroupId = 1;
          }
        }
        this.notify();
        return;
      }
    }

    const newTab: Tab = {
      id: path,
      path,
      title,
      isPreview: preview,
      isDirty: false,
      content,
      docType: resolvedDocType,
      viewMode: 'visual',
      isPinned: false,
    };

    targetTabs.push(newTab);
    if (activate) {
      if (group === 2) {
        this.activeGroup2TabId = path;
        this.activeGroupId = 2;
      } else {
        this.activeTabId = path;
        this.activeGroupId = 1;
      }
    }
    this.notify();
  }

  public closeTab(id: string, group?: 1 | 2) {
    const targetGroup =
      group ||
      (this.group2Tabs.some((t) => t.id === id) && !this.tabs.some((t) => t.id === id) ? 2 : 1);

    const targetList = targetGroup === 2 ? this.group2Tabs : this.tabs;
    const index = targetList.findIndex((t) => t.id === id);
    if (index === -1) return;

    const [closed] = targetList.splice(index, 1);
    this.closedTabsHistory.push({ path: closed.path, title: closed.title, docType: closed.docType, group: targetGroup });
    if (this.closedTabsHistory.length > 20) {
      this.closedTabsHistory.shift();
    }

    if (targetGroup === 2) {
      if (this.activeGroup2TabId === id) {
        if (targetList.length > 0) {
          const newIndex = Math.max(0, index - 1);
          this.activeGroup2TabId = targetList[newIndex].id;
        } else {
          this.activeGroup2TabId = null;
          // Si plus aucun onglet dans le groupe 2, fermer la division
          this.closeSplit();
        }
      }
    } else {
      if (this.activeTabId === id) {
        if (targetList.length > 0) {
          const newIndex = Math.max(0, index - 1);
          this.activeTabId = targetList[newIndex].id;
        } else {
          this.activeTabId = null;
        }
      }
    }

    this.notify();
  }

  public pinTab(id: string, group: 1 | 2 = 1) {
    const targetList = group === 2 ? this.group2Tabs : this.tabs;
    const tab = targetList.find((t) => t.id === id);
    if (tab) {
      tab.isPreview = false;
      tab.isPinned = !tab.isPinned;
      this.notify();
    }
  }

  public toggleViewMode(id?: string, group?: 1 | 2) {
    const targetGroup = group || this.activeGroupId;
    const targetList = targetGroup === 2 ? this.group2Tabs : this.tabs;
    const targetId = id || (targetGroup === 2 ? this.activeGroup2TabId : this.activeTabId);
    if (!targetId) return;

    const tab = targetList.find((t) => t.id === targetId);
    if (tab) {
      tab.viewMode = tab.viewMode === 'visual' ? 'source' : 'visual';
      this.notify();
    }
  }

  public setDocType(id: string, docType: DocType, group?: 1 | 2) {
    const targetGroup = group || this.activeGroupId;
    const targetList = targetGroup === 2 ? this.group2Tabs : this.tabs;
    const tab = targetList.find((t) => t.id === id);
    if (tab && tab.docType !== docType) {
      tab.docType = docType;
      this.notify();
    }
  }

  public closeOtherTabs(id: string, group: 1 | 2 = 1) {
    const targetList = group === 2 ? this.group2Tabs : this.tabs;
    const kept = targetList.filter((t) => t.id === id || t.isPinned);
    if (group === 2) {
      this.group2Tabs = kept;
      this.activeGroup2TabId = id;
    } else {
      this.tabs = kept;
      this.activeTabId = id;
    }
    this.notify();
  }

  public closeTabsToTheRight(id: string, group: 1 | 2 = 1) {
    const targetList = group === 2 ? this.group2Tabs : this.tabs;
    const index = targetList.findIndex((t) => t.id === id);
    if (index === -1) return;

    const kept = targetList.slice(0, index + 1);
    const right = targetList.slice(index + 1);

    right.forEach((tab) => {
      if (tab.isPinned) {
        kept.push(tab);
      } else {
        this.closedTabsHistory.push({ path: tab.path, title: tab.title, docType: tab.docType, group });
      }
    });

    if (group === 2) {
      this.group2Tabs = kept;
      if (this.activeGroup2TabId && !kept.some((t) => t.id === this.activeGroup2TabId)) {
        this.activeGroup2TabId = id;
      }
    } else {
      this.tabs = kept;
      if (this.activeTabId && !kept.some((t) => t.id === this.activeTabId)) {
        this.activeTabId = id;
      }
    }
    this.notify();
  }

  public closeAllTabs(group?: 1 | 2) {
    if (!group || group === 1) {
      const pinned = this.tabs.filter((t) => t.isPinned);
      this.tabs = pinned;
      this.activeTabId = pinned.length > 0 ? pinned[0].id : null;
    }
    if (!group || group === 2) {
      this.group2Tabs = [];
      this.activeGroup2TabId = null;
      if (this.isSplit) this.closeSplit();
    }
    this.notify();
  }

  public reopenLastClosed(getContent?: (path: string) => Promise<string>) {
    const last = this.closedTabsHistory.pop();
    if (!last) return;

    const targetGroup = last.group || 1;
    if (getContent) {
      getContent(last.path).then((c) => {
        this.openTab(last.path, false, c, true, last.docType, targetGroup);
      });
    } else {
      this.openTab(last.path, false, '', true, last.docType, targetGroup);
    }
  }

  public nextTab(group: 1 | 2 = 1) {
    const list = group === 2 ? this.group2Tabs : this.tabs;
    if (list.length <= 1) return;
    const currentId = group === 2 ? this.activeGroup2TabId : this.activeTabId;
    const currentIndex = list.findIndex((t) => t.id === currentId);
    const nextIndex = (currentIndex + 1) % list.length;
    if (group === 2) {
      this.activeGroup2TabId = list[nextIndex].id;
    } else {
      this.activeTabId = list[nextIndex].id;
    }
    this.notify();
  }

  public prevTab(group: 1 | 2 = 1) {
    const list = group === 2 ? this.group2Tabs : this.tabs;
    if (list.length <= 1) return;
    const currentId = group === 2 ? this.activeGroup2TabId : this.activeTabId;
    const currentIndex = list.findIndex((t) => t.id === currentId);
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    if (group === 2) {
      this.activeGroup2TabId = list[prevIndex].id;
    } else {
      this.activeTabId = list[prevIndex].id;
    }
    this.notify();
  }

  public goToTab(index: number, group: 1 | 2 = 1) {
    const list = group === 2 ? this.group2Tabs : this.tabs;
    if (index >= 0 && index < list.length) {
      if (group === 2) {
        this.activeGroup2TabId = list[index].id;
      } else {
        this.activeTabId = list[index].id;
      }
      this.notify();
    }
  }

  public updateContent(id: string, content: string) {
    let changed = false;
    // Mise à jour synchronisée dans les deux groupes
    const all = [...this.tabs, ...this.group2Tabs];
    for (const tab of all) {
      if (tab.id === id && tab.content !== content) {
        tab.content = content;
        tab.isDirty = true;
        if (tab.isPreview) {
          tab.isPreview = false;
        }
        const newDocType = detectDocType(content, tab.path);
        if (newDocType !== tab.docType) {
          tab.docType = newDocType;
        }
        changed = true;
      }
    }
    if (changed) {
      this.notify();
    }
  }

  public markClean(idOrPath: string) {
    let changed = false;
    const all = [...this.tabs, ...this.group2Tabs];
    for (const tab of all) {
      if ((tab.id === idOrPath || tab.path === idOrPath) && tab.isDirty) {
        tab.isDirty = false;
        changed = true;
      }
    }
    if (changed) {
      this.notify();
    }
  }

  public reorderTabs(fromIndex: number, toIndex: number, group: 1 | 2 = 1) {
    const list = group === 2 ? this.group2Tabs : this.tabs;
    if (fromIndex < 0 || fromIndex >= list.length || toIndex < 0 || toIndex >= list.length) {
      return;
    }
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    this.notify();
  }

  public renameTab(oldPath: string, newPath: string) {
    let changed = false;
    const all = [...this.tabs, ...this.group2Tabs];
    for (const tab of all) {
      if (tab.id === oldPath || tab.path === oldPath) {
        tab.id = newPath;
        tab.path = newPath;
        tab.title = fileNameFromPath(newPath);
        tab.docType = detectDocType(tab.content, newPath);
        changed = true;
      } else if (tab.path.startsWith(`${oldPath}/`)) {
        const sub = tab.path.slice(oldPath.length + 1);
        const updatedPath = `${newPath}/${sub}`;
        tab.id = updatedPath;
        tab.path = updatedPath;
        tab.title = fileNameFromPath(updatedPath);
        tab.docType = detectDocType(tab.content, updatedPath);
        changed = true;
      }
    }

    if (this.activeTabId === oldPath) this.activeTabId = newPath;
    if (this.activeGroup2TabId === oldPath) this.activeGroup2TabId = newPath;

    if (changed) {
      this.notify();
    }
  }

  public closeTabsForPath(path: string) {
    const toClose1 = this.tabs.filter((t) => t.path === path || t.path.startsWith(path + '/'));
    for (const tab of toClose1) {
      this.closeTab(tab.id, 1);
    }
    const toClose2 = this.group2Tabs.filter((t) => t.path === path || t.path.startsWith(path + '/'));
    for (const tab of toClose2) {
      this.closeTab(tab.id, 2);
    }
  }
}

export const tabStore = new TabStore();
