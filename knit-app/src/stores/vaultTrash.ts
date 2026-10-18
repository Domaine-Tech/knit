import type { VaultOps } from './vaultOps';
import { invoke } from '@tauri-apps/api/core';
import { crdtManager } from '../crdt';
import { isTauriEnvironment } from '../utils';
import type { TrashRecord } from '../types';

export async function trashPath(ops: VaultOps, relPath: string): Promise<TrashRecord> {
    if (!ops.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      const isDir = !relPath.includes('.');
      const itemName = relPath.split('/').pop() || relPath;
      const backupContent = ops.localContents[relPath];
      delete ops.localContents[relPath];
      crdtManager.removeDoc(relPath);
      await ops.reloadTree();
      const mockRecord: TrashRecord = {
        trash_id: `mock-${Date.now()}`,
        original_rel_path: relPath,
        item_name: itemName,
        is_dir: isDir,
        deleted_at: Date.now(),
      };
      ops.mockTrash[mockRecord.trash_id] = { relPath, backupContent };
      return mockRecord;
    }

    const record = await invoke<TrashRecord>('trash_vault_path', {
      vaultPath: ops.currentVaultPath,
      relPath,
    });

    delete ops.localContents[relPath];
    crdtManager.removeDoc(relPath);
    await ops.reloadTree();
    return record;
  }

export async function restoreTrash(ops: VaultOps, trashId: string): Promise<string> {
    if (!ops.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      const mock = ops.mockTrash[trashId];
      if (mock) {
        if (mock.backupContent !== undefined) {
          ops.localContents[mock.relPath] = mock.backupContent;
        }
        delete ops.mockTrash[trashId];
        await ops.reloadTree();
        return mock.relPath;
      }
      return '';
    }

    const restoredPath = await invoke<string>('restore_vault_path', {
      vaultPath: ops.currentVaultPath,
      trashId,
    });

    await ops.reloadTree();
    return restoredPath;
  }

export async function commitTrash(ops: VaultOps, trashId: string): Promise<void> {
    if (!ops.currentVaultPath || !isTauriEnvironment()) return;
    try {
      await invoke('commit_vault_trash', {
        vaultPath: ops.currentVaultPath,
        trashId,
      });
    } catch {
      // Ignore si déjà commis ou restauré
    }
  }

export async function recoverTrash(ops: VaultOps): Promise<string[]> {
    if (!ops.currentVaultPath || !isTauriEnvironment()) return [];
    try {
      const recovered = await invoke<string[]>('recover_vault_trash', {
        vaultPath: ops.currentVaultPath,
      });
      if (recovered && recovered.length > 0) {
        await ops.reloadTree();
      }
      return recovered || [];
    } catch {
      return [];
    }
  }

export async function deletePath(ops: VaultOps, relPath: string): Promise<void> {
    if (!ops.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      delete ops.localContents[relPath];
      crdtManager.removeDoc(relPath);
      await ops.reloadTree();
      return;
    }

    await invoke('delete_vault_path', {
      vaultPath: ops.currentVaultPath,
      relPath,
    });

    delete ops.localContents[relPath];
    crdtManager.removeDoc(relPath);
    await ops.reloadTree();
  }
