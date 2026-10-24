import { invoke } from '@tauri-apps/api/core';
import { crdtManager } from '../crdt';
import { isTauriEnvironment } from '../utils';
import type { TrashRecord, VaultOps } from '../types';

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
      await invoke<void>('commit_vault_trash_respecting_mode', {
        vaultPath: ops.currentVaultPath,
        trashId,
      });
    } catch {
      // Ignore si déjà commis ou restauré
    }
  }

export async function listTrash(ops: VaultOps): Promise<TrashRecord[]> {
  if (!ops.currentVaultPath || !isTauriEnvironment()) {
    return Object.entries(ops.mockTrash).map(([trash_id, mock]) => ({
      trash_id,
      original_rel_path: mock.relPath,
      item_name: mock.relPath.split('/').pop() || mock.relPath,
      is_dir: false,
      deleted_at: Date.now(),
    }));
  }
  try {
    return await invoke<TrashRecord[]>('list_vault_trash', {
      vaultPath: ops.currentVaultPath,
    });
  } catch {
    return [];
  }
}

export async function purgeTrashItem(ops: VaultOps, trashId: string): Promise<void> {
  if (!ops.currentVaultPath) return;
  if (!isTauriEnvironment()) {
    delete ops.mockTrash[trashId];
    return;
  }
  await invoke<void>('purge_vault_trash_item', {
    vaultPath: ops.currentVaultPath,
    trashId,
  });
}

export async function purgeAllTrash(ops: VaultOps): Promise<number> {
  if (!ops.currentVaultPath) return 0;
  if (!isTauriEnvironment()) {
    const n = Object.keys(ops.mockTrash).length;
    for (const key of Object.keys(ops.mockTrash)) {
      delete ops.mockTrash[key];
    }
    return n;
  }
  return invoke<number>('purge_all_vault_trash', {
    vaultPath: ops.currentVaultPath,
  });
}

export async function readTrashPreview(
  ops: VaultOps,
  trashId: string
): Promise<string | null> {
  if (!ops.currentVaultPath || !isTauriEnvironment()) {
    const mock = ops.mockTrash[trashId];
    return mock?.backupContent ?? null;
  }
  try {
    return await invoke<string | null>('read_trash_preview', {
      vaultPath: ops.currentVaultPath,
      trashId,
    });
  } catch {
    return null;
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

    await invoke<void>('delete_vault_path', {
      vaultPath: ops.currentVaultPath,
      relPath,
    });

    delete ops.localContents[relPath];
    crdtManager.removeDoc(relPath);
    await ops.reloadTree();
  }
