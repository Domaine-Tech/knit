import type { VaultOps } from './vaultOps';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { toast } from './toastStore';
import { crdtManager } from '../crdt';
import { tabStore } from './tabStore';
import { networkStore } from './networkStore';
import { isTauriEnvironment } from '../utils';
import { DEMO_FILES } from './demoVaultLoader';
import type { FileNode, LinkRefactorReport } from '../types';

export async function pickAndOpenVault(ops: VaultOps): Promise<boolean> {
    if (!isTauriEnvironment()) {
      ops.currentVaultPath = 'Knit Workspace (Web Dev)';
      ops.files = DEMO_FILES;
      ops.notify();
      return true;
    }

    try {
      ops.isLoading = true;
      ops.notify();

      const selected = await invoke<string | null>('pick_vault_folder');
      if (selected) {
        await ops.openVault(selected);
        return true;
      }
      return false;
    } catch (err: unknown) {
      ops.error = String(err);
      return false;
    } finally {
      ops.isLoading = false;
      ops.notify();
    }
  }

export async function openVault(ops: VaultOps, path: string): Promise<void> {
    ops.currentVaultPath = path;
    localStorage.setItem('knit-last-vault-path', path);

    // Initialisation ou redémarrage du watcher FS natif
    await setupWatcher(ops, path);
    await ops.reloadTree();

    // Démarrage du réseau P2P Iroh & mDNS
    networkStore.startNetwork(path).catch((err) => {
      console.warn('Erreur initialisation P2P sur coffre:', err);
    });

    // Récupération des éléments orphelins de corbeille (restauration OS vers .knit/trash)
    const recovered = await ops.recoverTrash();
    if (recovered.length > 0) {
      toast.success(
        'Corbeille synchronisée',
        `${recovered.length} note(s) restaurée(s) : ${recovered.join(', ')}`
      );
    }
  }

async function setupWatcher(ops: VaultOps, path: string) {
    // Nettoyer les écouteurs précédents
    for (const unlisten of ops.unlistenFns) {
      unlisten();
    }
    ops.unlistenFns = [];

    if (!isTauriEnvironment()) return;

    try {
      // Arrêt préventif de tout watcher précédent
      await invoke('stop_vault_watcher').catch(() => {});
      await invoke('start_vault_watcher', { vaultPath: path });

      const u1 = await listen<{ path: string; content: string }>(
        'vault_file_changed',
        (event) => {
          const { path: relPath, content } = event.payload;
          ops.localContents[relPath] = content;

          // Injection dans Yjs via crdtManager
          const updated = crdtManager.applyExternalContent(relPath, content);
          if (updated) {
            const fileName = relPath.split('/').pop() || relPath;
            toast.info(
              'Synchronisation externe',
              `Fichier "${fileName}" mis à jour par un agent externe`
            );

            // Mettre à jour l'onglet correspondant et le marquer comme propre
            const tab = tabStore.tabs.find((t) => t.path === relPath);
            if (tab) {
              tab.content = content;
              tab.isDirty = false;
            }
          }
          ops.notify();
        }
      );

      const u2 = await listen<{ path: string }>('vault_file_deleted', (event) => {
        const { path: relPath } = event.payload;
        delete ops.localContents[relPath];
        crdtManager.removeDoc(relPath);

        const fileName = relPath.split('/').pop() || relPath;
        const tab = tabStore.tabs.find((t) => t.path === relPath);
        if (tab) {
          toast.info('Fichier supprimé', `Le fichier "${fileName}" a été supprimé du disque`);
        }

        ops.reloadTree();
      });

      const u3 = await listen('vault_tree_changed', () => {
        ops.reloadTree();
      });

      ops.unlistenFns.push(u1, u2, u3);
    } catch (err: unknown) {
      console.warn('Impossible de démarrer le Vault Watcher :', err);
    }
  }

export async function reloadTree(ops: VaultOps): Promise<void> {
    if (!ops.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      ops.files = [...DEMO_FILES];
      ops.notify();
      return;
    }

    try {
      ops.isLoading = true;
      ops.notify();
      const nodes = await invoke<FileNode[]>('get_vault_tree', {
        vaultPath: ops.currentVaultPath,
      });
      ops.files = nodes;
      ops.error = null;
    } catch (err: unknown) {
      ops.error = String(err);
    } finally {
      ops.isLoading = false;
      ops.notify();
    }
  }

export async function readFile(ops: VaultOps, relPath: string): Promise<string> {
    if (!isTauriEnvironment()) {
      if (relPath in ops.localContents) {
        return ops.localContents[relPath];
      }
      return `# ${relPath}\nNouveau document`;
    }

    if (!ops.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    const content = await invoke<string>('read_vault_file', {
      vaultPath: ops.currentVaultPath,
      relPath,
    });
    ops.localContents[relPath] = content;
    return content;
  }

export async function writeFile(ops: VaultOps, relPath: string, content: string): Promise<void> {
    if (!ops.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    // Évite toute écriture FS redondante si le contenu est déjà identique
    if (ops.localContents[relPath] === content) {
      tabStore.markClean(relPath);
      return;
    }

    ops.localContents[relPath] = content;

    if (!isTauriEnvironment()) {
      tabStore.markClean(relPath);
      return;
    }

    await invoke('write_vault_file', {
      vaultPath: ops.currentVaultPath,
      relPath,
      content,
    });

    tabStore.markClean(relPath);
  }

export async function createFile(ops: VaultOps, relPath: string, initialContent: string = ''): Promise<void> {
    if (!ops.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      ops.localContents[relPath] = initialContent;
      await ops.reloadTree();
      return;
    }

    await invoke('create_vault_file', {
      vaultPath: ops.currentVaultPath,
      relPath,
      content: initialContent,
    });
    await ops.reloadTree();
  }

export async function createDir(ops: VaultOps, relPath: string): Promise<void> {
    if (!ops.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      await ops.reloadTree();
      return;
    }

    try {
      await invoke('create_vault_dir', {
        vaultPath: ops.currentVaultPath,
        relPath,
      });
      await ops.reloadTree();
    } catch (err: unknown) {
      toast.error('Erreur lors de la création du dossier', String(err));
    }
  }

export async function saveAsset(ops: VaultOps, base64Data: string, filenameHint?: string): Promise<string> {
    if (!ops.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      const timestamp = Date.now();
      const name = filenameHint || `img-${timestamp}.png`;
      const relPath = `assets/${name}`;
      ops.localContents[relPath] = base64Data;
      return relPath;
    }

    return await invoke<string>('save_vault_asset', {
      vaultPath: ops.currentVaultPath,
      filenameHint,
      base64Data,
    });
  }

export async function renameFile(ops: VaultOps, oldRelPath: string, newRelPath: string): Promise<LinkRefactorReport> {
    if (!ops.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      const content = ops.localContents[oldRelPath] || '';
      delete ops.localContents[oldRelPath];
      ops.localContents[newRelPath] = content;
      await ops.reloadTree();
      return {
        files_scanned: 1,
        files_modified: 0,
        links_updated: 0,
        modified_files: [],
      };
    }

    const report = await invoke<LinkRefactorReport>('rename_vault_file', {
      vaultPath: ops.currentVaultPath,
      oldRelPath,
      newRelPath,
    });

    await ops.reloadTree();
    return report;
  }
