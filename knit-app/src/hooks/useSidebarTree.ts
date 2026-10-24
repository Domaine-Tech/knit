import { useState, useEffect, type FormEvent } from 'react';
import type {
  FileNode,
  RenameTarget,
  SelectedTreeNode,
  SidebarTab,
  UseSidebarTreeOptions,
} from '../types';
import { vaultStore } from '../stores/vaultStore';
import { toast } from '../stores/toastStore';
import { tabStore } from '../stores/tabStore';
import { historyStore } from '../stores/historyStore';
import {
  filterHiddenVaultNodes,
  loadShowHiddenFiles,
  saveShowHiddenFiles,
} from '../utils/vaultTreeVisibility';

function filterNodes(nodes: FileNode[], query: string): FileNode[] {
  if (!query.trim()) return nodes;
  const lower = query.toLowerCase();

  return nodes
    .map((node) => {
      if (node.is_dir) {
        const matchingChildren = filterNodes(node.children, query);
        if (matchingChildren.length > 0) {
          return { ...node, children: matchingChildren };
        }
        if (node.name.toLowerCase().includes(lower)) {
          return node;
        }
        return null;
      }
      return node.name.toLowerCase().includes(lower) ? node : null;
    })
    .filter((n): n is FileNode => n !== null);
}

/**
 * Logique métier de l'arborescence sidebar : filtre, CRUD, favoris, onglets internes.
 * Sidebar.tsx reste une UI pure consommant le retour de ce hook.
 */
export function useSidebarTree(options: UseSidebarTreeOptions) {
  const {
    files,
    onSelectFile,
    controlledSidebarTab,
    onSidebarTabChange,
  } = options;

  const [internalSidebarTab, setInternalSidebarTab] = useState<SidebarTab>('files');
  const activeTab = controlledSidebarTab || internalSidebarTab;

  const setSidebarTab = (tab: SidebarTab): void => {
    setInternalSidebarTab(tab);
    if (onSidebarTabChange) onSidebarTabChange(tab);
  };

  const [filterText, setFilterText] = useState('');
  const [showHiddenFiles, setShowHiddenFilesState] = useState(loadShowHiddenFiles);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedTreeNode | null>(null);
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
  const [treeKey, setTreeKey] = useState(0);

  const [, setIndexVersion] = useState(0);

  useEffect(() => {
    const unsubFm = vaultStore.subscribeFrontmatterIndex(() => {
      setIndexVersion((v) => v + 1);
    });
    const unsubTabs = tabStore.subscribe(() => {
      setIndexVersion((v) => v + 1);
    });
    return () => {
      unsubFm();
      unsubTabs();
    };
  }, []);

  useEffect(() => {
    const onReveal = (e: Event) => {
      const custom = e as CustomEvent<{ path: string; isDir: boolean }>;
      if (custom.detail?.path) {
        setInternalSidebarTab('files');
        setSelectedNode({
          path: custom.detail.path,
          isDir: custom.detail.isDir,
          name: custom.detail.path.split('/').pop() || custom.detail.path,
        });
        setTimeout(() => {
          const el = document.querySelector(`[data-tree-path="${custom.detail.path}"]`);
          el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, 120);
      }
    };
    window.addEventListener('knit-reveal-in-tree', onReveal);
    return () => {
      window.removeEventListener('knit-reveal-in-tree', onReveal);
    };
  }, []);

  const handleToggleExpandAll = (): void => {
    setIsAllExpanded((prev) => !prev);
    setTreeKey((k) => k + 1);
  };

  const handleCreateFileSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const name = newFileName.trim();
    if (!name) {
      setIsCreatingFile(false);
      return;
    }

    const relPath = name.endsWith('.md') ? name : `${name}.md`;
    try {
      await vaultStore.createFile(relPath, `# ${name.replace('.md', '')}\n\n`);
      setNewFileName('');
      setIsCreatingFile(false);
      onSelectFile(relPath, false);
      toast.success('Fichier créé', relPath);
    } catch (err: unknown) {
      toast.error('Erreur de création', String(err));
    }
  };

  const handleRenameSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (!renameTarget) return;
    const { oldPath, newPath } = renameTarget;
    const cleanNew = newPath.trim();
    if (!cleanNew || cleanNew === oldPath) {
      setRenameTarget(null);
      return;
    }

    try {
      const report = await vaultStore.renameFile(oldPath, cleanNew);
      tabStore.renameTab(oldPath, cleanNew);
      setRenameTarget(null);
      toast.success(
        'Fichier renommé & liens refactorisés',
        `${report.links_updated} lien(s) mis à jour dans ${report.files_modified} fichier(s)`
      );
    } catch (err: unknown) {
      toast.error('Erreur lors du renommage', String(err));
    }
  };

  const handleDelete = async (path: string, isDir: boolean, name: string): Promise<void> => {
    try {
      const trashRecord = await vaultStore.trashPath(path);
      tabStore.closeTabsForPath(path);

      let commitTimer: number | null = window.setTimeout(async () => {
        commitTimer = null;
        historyStore.remove(`trash-${trashRecord.trash_id}`);
        await vaultStore.commitTrash(trashRecord.trash_id);
      }, 8000);

      const doUndo = async () => {
        if (commitTimer) {
          clearTimeout(commitTimer);
          commitTimer = null;
        }
        historyStore.remove(`trash-${trashRecord.trash_id}`);
        await vaultStore.restoreTrash(trashRecord.trash_id);
        if (!isDir) {
          tabStore.openTab(path, false);
        }
        toast.success(
          isDir ? 'Dossier restauré' : 'Note restaurée',
          `"${name}" a été restauré`
        );
      };

      historyStore.push({
        id: `trash-${trashRecord.trash_id}`,
        description: `Suppression de ${name}`,
        undo: doUndo,
      });

      toast.undoable(
        isDir ? 'Dossier supprimé' : 'Note supprimée',
        `"${name}" déplacé vers la corbeille`,
        () => {
          doUndo();
        },
        8000
      );
    } catch (err: unknown) {
      toast.error('Erreur de suppression', String(err));
    }
  };

  const startCreatingFile = (): void => {
    setIsCreatingFile(true);
  };

  const startRename = (path: string): void => {
    setRenameTarget({ oldPath: path, newPath: path });
  };

  const selectTreeNode = (path: string, isDir: boolean, name: string): void => {
    setSelectedNode({ path, isDir, name });
  };

  const togglePinNote = (path: string): void => {
    vaultStore.togglePinNote(path);
  };

  const reloadTree = (): void => {
    vaultStore.reloadTree();
  };

  const pickAndOpenVault = (): void => {
    void vaultStore.pickAndOpenVaultSmart();
  };

  const revealVaultInExplorer = (): void => {
    vaultStore.revealInExplorer('');
  };

  const setShowHiddenFiles = (value: boolean | ((prev: boolean) => boolean)): void => {
    setShowHiddenFilesState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      saveShowHiddenFiles(next);
      return next;
    });
  };

  const toggleShowHiddenFiles = (): void => {
    setShowHiddenFiles((prev) => !prev);
  };

  // Toggle œil OU recherche active → révéler dots / kit IA (jamais `.knit` etc.)
  const visibleTree = filterHiddenVaultNodes(
    files,
    showHiddenFiles || Boolean(filterText.trim())
  );
  const filtered = filterNodes(visibleTree, filterText);
  const pinnedNotes = vaultStore.getPinnedNotes();
  const vaultRoot = vaultStore.currentVaultPath || '';
  const vaultDisplayName = vaultRoot.split(/[/\\]/).pop() || 'Coffre-fort';

  return {
    activeTab,
    setSidebarTab,

    filterText,
    setFilterText,
    filtered,
    showHiddenFiles,
    toggleShowHiddenFiles,

    isCreatingFile,
    setIsCreatingFile,
    newFileName,
    setNewFileName,
    startCreatingFile,
    handleCreateFileSubmit,

    renameTarget,
    setRenameTarget,
    startRename,
    handleRenameSubmit,

    selectedNode,
    setSelectedNode,
    selectTreeNode,

    isAllExpanded,
    treeKey,
    handleToggleExpandAll,

    isPinnedExpanded,
    setIsPinnedExpanded,
    pinnedNotes,
    togglePinNote,

    handleDelete,

    vaultRoot,
    vaultDisplayName,
    reloadTree,
    pickAndOpenVault,
    revealVaultInExplorer,
  };
}
