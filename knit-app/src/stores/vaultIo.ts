import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { toast } from './toastStore';
import { crdtManager } from '../crdt';
import { tabStore } from './tabStore';
import { networkStore } from './networkStore';
import { frontmatterIndex } from './frontmatterIndex';
import { isTauriEnvironment } from '../utils/env';
import { hasFileNode } from '../utils';
import { DEMO_FILES, DEMO_CONTENTS, DEMO_ASSET_URLS } from './demoVaultLoader';
import { isDemoVaultPath, vaultRegistry } from './vaultRegistry';
import type {
  FileNode,
  InitVaultOptions,
  InitVaultResult,
  JoinFolderReport,
  LinkRefactorReport,
  PickVaultOutcome,
  VaultOps,
} from '../types';

export { isDemoVaultPath };

/** Coffre démo mémoire (pas un chemin disque réel). */
export function isVirtualDemoVault(ops: VaultOps): boolean {
  const path = ops.currentVaultPath;
  return !path || isDemoVaultPath(path);
}

export async function checkVaultInitialized(path: string): Promise<boolean> {
  // Toujours : le coffre démo n'est pas un dossier FS
  if (isDemoVaultPath(path)) return true;

  if (!isTauriEnvironment()) {
    // En Vite, un chemin « créé » via Wizard est enregistré → initialisé
    return vaultRegistry.list().some((v) => v.path === path);
  }
  try {
    return await invoke<boolean>('is_vault_initialized', { vaultPath: path });
  } catch {
    return false;
  }
}

/** Clone profond de l'arbre démo (évite de muter DEMO_FILES partagé). */
export function cloneDemoFileTree(nodes: FileNode[]): FileNode[] {
  return nodes.map((n) => ({
    ...n,
    children: cloneDemoFileTree(n.children ?? []),
  }));
}

export async function pickVaultFolderPath(): Promise<string | null> {
  if (!isTauriEnvironment()) return null;
  return invoke<string | null>('pick_vault_folder');
}

export async function initVault(
  vaultPath: string,
  options: InitVaultOptions
): Promise<InitVaultResult> {
  return invoke<InitVaultResult>('init_vault', { vaultPath, options });
}

export async function inspectJoinFolder(vaultPath: string): Promise<JoinFolderReport> {
  return invoke<JoinFolderReport>('inspect_join_folder', { vaultPath });
}

export async function prepareJoinVault(
  vaultPath: string,
  vaultName: string
): Promise<InitVaultResult> {
  return invoke<InitVaultResult>('prepare_join_vault', { vaultPath, vaultName });
}

export async function pickAndOpenVault(ops: VaultOps): Promise<boolean> {
    const outcome = await pickVaultFolderInteractive(ops);
    return outcome.kind === 'opened';
  }

export async function pickVaultFolderInteractive(ops: VaultOps): Promise<PickVaultOutcome> {
    if (!isTauriEnvironment()) {
      return { kind: 'cancelled' };
    }

    try {
      ops.isLoading = true;
      ops.notify();

      const selected = await pickVaultFolderPath();
      if (!selected) return { kind: 'cancelled' };

      const ok = await checkVaultInitialized(selected);
      if (!ok) return { kind: 'needs_init', path: selected };

      await ops.openVault(selected);
      return { kind: 'opened', path: selected };
    } catch (err: unknown) {
      ops.error = String(err);
      return { kind: 'error', message: String(err) };
    } finally {
      ops.isLoading = false;
      ops.notify();
    }
  }

export async function openVault(ops: VaultOps, path: string): Promise<void> {
    ops.currentVaultPath = path;
    const isDemo = isDemoVaultPath(path);
    vaultRegistry.touch(path, undefined, { isDemo });

    // Coffre démo mémoire : Vite ET Tauri (jamais de get_vault_tree sur ce chemin)
    if (isDemo || !isTauriEnvironment()) {
      if (isDemo) {
        ops.files = cloneDemoFileTree(DEMO_FILES);
        for (const key of Object.keys(ops.localContents)) {
          delete ops.localContents[key];
        }
        Object.assign(ops.localContents, DEMO_CONTENTS, DEMO_ASSET_URLS);
        if (ops.files.length === 0) {
          console.warn(
            'DEMO_FILES vide : vérifiez que demo_vault/ est accessible au build Vite (server.fs.allow).'
          );
        }
      } else {
        for (const key of Object.keys(ops.localContents)) {
          delete ops.localContents[key];
        }
        const welcome =
          '---\ntype: note\n---\n\n# Accueil\n\nCoffre créé en mode développement (Vite).\n';
        ops.localContents['accueil.md'] = welcome;
        ops.files = [
          {
            id: 'accueil.md',
            name: 'accueil.md',
            path: 'accueil.md',
            is_dir: false,
            extension: 'md',
            children: [],
          },
        ];
      }
      void frontmatterIndex.rebuild(ops);
      await networkStore.startNetwork(path).catch((err) => {
        console.warn('Erreur initialisation P2P (Vite/démo):', err);
      });
      ops.notify();
      return;
    }

    // Initialisation ou redémarrage du watcher FS natif
    await setupWatcher(ops, path);
    await ops.reloadTree();
    void frontmatterIndex.rebuild(ops);

    // Config locale (.knit/config.yaml) — thème / corbeille / air-gap
    try {
      const { vaultConfigStore } = await import('./vaultConfigStore');
      await vaultConfigStore.load(path);
      if (typeof vaultConfigStore.config.hue === 'number') {
        const { applyHue } = await import('../theme/theme');
        applyHue(vaultConfigStore.config.hue);
      }
    } catch (err) {
      console.warn('Erreur chargement config locale:', err);
    }

    // Démarrage du réseau P2P Iroh & mDNS (await pour éviter la course ticket/PIN/join)
    await networkStore.startNetwork(path).catch((err) => {
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
      await invoke<void>('stop_vault_watcher').catch(() => {});
      await invoke<void>('start_vault_watcher', { vaultPath: path });

      // Debounce trailing pour consolider les événements FS en rafale (git, IA, batch mkdir/touch)
      let treeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
      const scheduleTreeReload = () => {
        if (treeDebounceTimer !== null) {
          clearTimeout(treeDebounceTimer);
        }
        treeDebounceTimer = setTimeout(() => {
          treeDebounceTimer = null;
          void ops.reloadTree().then(() => frontmatterIndex.rebuild(ops));
        }, 120);
      };

      const u1 = await listen<{ path: string; content: string }>(
        'vault_file_changed',
        (event) => {
          const { path: relPath, content } = event.payload;
          ops.localContents[relPath] = content;

          // Si le fichier n'est pas encore présent dans l'arborescence, rafraîchir l'arbre dynamiquement
          if (!hasFileNode(ops.files, relPath)) {
            scheduleTreeReload();
          }

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
          void frontmatterIndex.upsert(ops, relPath);
          ops.notify();
        }
      );

      const u2 = await listen<{ path: string }>('vault_file_deleted', (event) => {
        const { path: relPath } = event.payload;
        delete ops.localContents[relPath];
        crdtManager.removeDoc(relPath);
        frontmatterIndex.remove(relPath);

        const fileName = relPath.split('/').pop() || relPath;
        const tab = tabStore.tabs.find((t) => t.path === relPath);
        if (tab) {
          toast.info('Fichier supprimé', `Le fichier "${fileName}" a été supprimé du disque`);
        }

        scheduleTreeReload();
      });

      const u3 = await listen('vault_tree_changed', () => {
        scheduleTreeReload();
      });

      ops.unlistenFns.push(u1, u2, u3, () => {
        if (treeDebounceTimer !== null) {
          clearTimeout(treeDebounceTimer);
          treeDebounceTimer = null;
        }
      });
    } catch (err: unknown) {
      console.warn('Impossible de démarrer le Vault Watcher :', err);
    }
  }

export async function reloadTree(ops: VaultOps): Promise<void> {
    if (!ops.currentVaultPath) return;

    if (!isTauriEnvironment() || isVirtualDemoVault(ops)) {
      ops.files = [...DEMO_FILES];
      // Resync contenus / assets démo (après HMR éventuel)
      Object.assign(ops.localContents, DEMO_CONTENTS, DEMO_ASSET_URLS);
      ops.notify();
      void frontmatterIndex.rebuild(ops);
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
      void frontmatterIndex.rebuild(ops);
    } catch (err: unknown) {
      ops.error = String(err);
    } finally {
      ops.isLoading = false;
      ops.notify();
    }
  }

export async function readFile(ops: VaultOps, relPath: string): Promise<string> {
    if (!isTauriEnvironment() || isVirtualDemoVault(ops)) {
      const tab = tabStore.tabs.find((t) => t.path === relPath);
      // Ne pas écraser une édition locale non sauvegardée
      if (tab?.isDirty && relPath in ops.localContents) {
        return ops.localContents[relPath];
      }
      if (relPath in DEMO_CONTENTS) {
        const fresh = DEMO_CONTENTS[relPath];
        ops.localContents[relPath] = fresh;
        return fresh;
      }
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

    if (!isTauriEnvironment() || isVirtualDemoVault(ops)) {
      tabStore.markClean(relPath);
      void frontmatterIndex.upsert(ops, relPath);
      return;
    }

    await invoke<void>('write_vault_file', {
      vaultPath: ops.currentVaultPath,
      relPath,
      content,
    });

    tabStore.markClean(relPath);
    void frontmatterIndex.upsert(ops, relPath);
  }

export async function createFile(ops: VaultOps, relPath: string, initialContent: string = ''): Promise<void> {
    if (!ops.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      ops.localContents[relPath] = initialContent;
      await ops.reloadTree();
      return;
    }

    await invoke<void>('create_vault_file', {
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
      await invoke<void>('create_vault_dir', {
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
