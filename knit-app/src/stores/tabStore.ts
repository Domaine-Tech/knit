export interface Tab {
  id: string; // Rel path
  path: string;
  title: string;
  isPreview: boolean;
  isDirty: boolean;
  content: string;
}

type TabListener = () => void;

class TabStore {
  public tabs: Tab[] = [];
  public activeTabId: string | null = null;
  private closedTabsHistory: { path: string; title: string }[] = [];
  private listeners: Set<TabListener> = new Set();

  public subscribe(listener: TabListener): () => void {
    this.listeners.add(listener);
    listener();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public get activeTab(): Tab | undefined {
    return this.tabs.find((t) => t.id === this.activeTabId);
  }

  public setActiveTab(id: string) {
    if (this.tabs.some((t) => t.id === id)) {
      this.activeTabId = id;
      this.notify();
    }
  }

  public openTab(
    path: string,
    preview: boolean = false,
    content: string = '',
    activate: boolean = true
  ) {
    const existingIndex = this.tabs.findIndex((t) => t.id === path);

    if (existingIndex !== -1) {
      // Si l'onglet est déjà ouvert
      if (!preview) {
        // Un double-clic ou une ouverture forcée le rend permanent
        this.tabs[existingIndex].isPreview = false;
      }
      if (activate || this.activeTabId === null) {
        this.activeTabId = path;
      }
      this.notify();
      return;
    }

    const title = path.split('/').pop() || path;

    // Si on ouvre en mode aperçu, on vérifie s'il y a déjà un onglet d'aperçu à remplacer
    if (preview) {
      const previewIndex = this.tabs.findIndex((t) => t.isPreview && !t.isDirty);
      if (previewIndex !== -1) {
        // On remplace l'onglet aperçu existant
        this.tabs[previewIndex] = {
          id: path,
          path,
          title,
          isPreview: true,
          isDirty: false,
          content,
        };
        if (activate || this.activeTabId === null) {
          this.activeTabId = path;
        }
        this.notify();
        return;
      }
    }

    // Sinon nouvel onglet
    const newTab: Tab = {
      id: path,
      path,
      title,
      isPreview: preview,
      isDirty: false,
      content,
    };

    this.tabs.push(newTab);
    if (activate || this.activeTabId === null) {
      this.activeTabId = path;
    }
    this.notify();
  }

  public pinTab(id: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab && tab.isPreview) {
      tab.isPreview = false;
      this.notify();
    }
  }

  public closeTab(id: string) {
    const index = this.tabs.findIndex((t) => t.id === id);
    if (index === -1) return;

    const [closed] = this.tabs.splice(index, 1);
    this.closedTabsHistory.push({ path: closed.path, title: closed.title });
    if (this.closedTabsHistory.length > 20) {
      this.closedTabsHistory.shift();
    }

    // Définir le nouvel onglet actif si c'était celui fermé
    if (this.activeTabId === id) {
      if (this.tabs.length > 0) {
        // Prendre le voisin immédiat (à gauche de préférence ou le premier)
        const newIndex = Math.max(0, index - 1);
        this.activeTabId = this.tabs[newIndex].id;
      } else {
        this.activeTabId = null;
      }
    }

    this.notify();
  }

  public closeOtherTabs(id: string) {
    this.tabs = this.tabs.filter((t) => t.id === id);
    this.activeTabId = id;
    this.notify();
  }

  public closeTabsToTheRight(id: string) {
    const index = this.tabs.findIndex((t) => t.id === id);
    if (index === -1) return;

    const removed = this.tabs.slice(index + 1);
    removed.forEach((tab) => {
      this.closedTabsHistory.push({ path: tab.path, title: tab.title });
    });
    this.tabs = this.tabs.slice(0, index + 1);

    if (this.activeTabId && !this.tabs.some((t) => t.id === this.activeTabId)) {
      this.activeTabId = id;
    }
    this.notify();
  }

  public closeAllTabs() {
    this.tabs.forEach((tab) => {
      this.closedTabsHistory.push({ path: tab.path, title: tab.title });
    });
    this.tabs = [];
    this.activeTabId = null;
    this.notify();
  }

  public reopenLastClosed(getContent?: (path: string) => Promise<string>) {
    const last = this.closedTabsHistory.pop();
    if (!last) return;

    if (getContent) {
      getContent(last.path).then((c) => {
        this.openTab(last.path, false, c);
      });
    } else {
      this.openTab(last.path, false, '');
    }
  }

  public nextTab() {
    if (this.tabs.length <= 1) return;
    const currentIndex = this.tabs.findIndex((t) => t.id === this.activeTabId);
    const nextIndex = (currentIndex + 1) % this.tabs.length;
    this.activeTabId = this.tabs[nextIndex].id;
    this.notify();
  }

  public prevTab() {
    if (this.tabs.length <= 1) return;
    const currentIndex = this.tabs.findIndex((t) => t.id === this.activeTabId);
    const prevIndex = (currentIndex - 1 + this.tabs.length) % this.tabs.length;
    this.activeTabId = this.tabs[prevIndex].id;
    this.notify();
  }

  public goToTab(index: number) {
    if (index >= 0 && index < this.tabs.length) {
      this.activeTabId = this.tabs[index].id;
      this.notify();
    }
  }

  public updateContent(id: string, content: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (!tab) return;

    if (tab.content !== content) {
      tab.content = content;
      tab.isDirty = true;
      // La frappe transforme immédiatement un aperçu en permanent
      if (tab.isPreview) {
        tab.isPreview = false;
      }
      this.notify();
    }
  }

  public markClean(id: string) {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab && tab.isDirty) {
      tab.isDirty = false;
      this.notify();
    }
  }

  public reorderTabs(fromIndex: number, toIndex: number) {
    if (
      fromIndex < 0 ||
      fromIndex >= this.tabs.length ||
      toIndex < 0 ||
      toIndex >= this.tabs.length
    ) {
      return;
    }
    const [moved] = this.tabs.splice(fromIndex, 1);
    this.tabs.splice(toIndex, 0, moved);
    this.notify();
  }

  public renameTab(oldPath: string, newPath: string) {
    const tab = this.tabs.find((t) => t.id === oldPath || t.path === oldPath);
    if (tab) {
      tab.id = newPath;
      tab.path = newPath;
      tab.title = newPath.split('/').pop() || newPath;
      if (this.activeTabId === oldPath) {
        this.activeTabId = newPath;
      }
      this.notify();
    }
  }

  public closeTabsForPath(path: string) {
    const toClose = this.tabs.filter(
      (t) => t.path === path || t.path.startsWith(path + '/')
    );
    for (const tab of toClose) {
      this.closeTab(tab.id);
    }
  }
}

export const tabStore = new TabStore();
