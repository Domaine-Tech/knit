/**
 * Wrapper Tauri v2 Updater — no-op propre hors environnement natif.
 * Une seule mise à jour en vol ; progression cumulée via updaterLogic.
 */
import { isTauriEnvironment } from './env';
import { getAppVersion } from './version';
import { accumulateUpdateProgress } from './updaterLogic';
import type { KnitUpdateInfo, UpdateProgress } from '../types/updater';

export type { KnitUpdateInfo, UpdateProgress };

export type CheckUpdateOk =
  | { ok: true; available: false; currentVersion: string }
  | { ok: true; available: true; currentVersion: string; update: KnitUpdateInfo };

export type CheckUpdateErr = {
  ok: false;
  currentVersion: string;
  error: string;
};

export type CheckUpdateResult = CheckUpdateOk | CheckUpdateErr;

/** Handle du plugin (évite de ré-appeler check avant install). */
type PendingUpdate = {
  version: string;
  body?: string | null;
  date?: string | null;
  downloadAndInstall: (
    onEvent?: (event: {
      event: string;
      data?: { contentLength?: number; chunkLength?: number };
    }) => void
  ) => Promise<void>;
};

let pendingUpdate: PendingUpdate | null = null;

export function getPendingUpdateVersion(): string | null {
  return pendingUpdate?.version ?? null;
}

export function clearPendingUpdate(): void {
  pendingUpdate = null;
}

/**
 * Vérifie si une mise à jour est disponible (endpoint GitHub Releases / latest.json).
 */
export async function checkForUpdates(): Promise<CheckUpdateResult> {
  const currentVersion = await getAppVersion();
  if (!isTauriEnvironment()) {
    return { ok: true, available: false, currentVersion };
  }

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) {
      pendingUpdate = null;
      return { ok: true, available: false, currentVersion };
    }

    pendingUpdate = update as PendingUpdate;

    const info: KnitUpdateInfo = {
      version: update.version,
      body: update.body ?? null,
      date: update.date ?? null,
    };

    return { ok: true, available: true, currentVersion, update: info };
  } catch (err: unknown) {
    pendingUpdate = null;
    const message =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'Erreur de vérification';
    console.warn('[updater] check failed:', err);
    return { ok: false, currentVersion, error: message };
  }
}

/**
 * Télécharge et installe la mise à jour précédemment détectée (pas de re-check).
 * @returns true si une installation a été lancée avec succès.
 */
export async function downloadAndInstallUpdate(
  onProgress?: (p: UpdateProgress) => void
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isTauriEnvironment()) {
    return { ok: false, error: 'Mises à jour disponibles uniquement dans l’application installée.' };
  }
  if (!pendingUpdate) {
    return { ok: false, error: 'Aucune mise à jour en attente.' };
  }

  try {
    let progress: UpdateProgress = { downloaded: 0, total: null };
    await pendingUpdate.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        progress = accumulateUpdateProgress(progress, {
          kind: 'started',
          contentLength: event.data?.contentLength ?? null,
        });
        onProgress?.(progress);
      } else if (event.event === 'Progress') {
        progress = accumulateUpdateProgress(progress, {
          kind: 'progress',
          chunkLength: event.data?.chunkLength ?? 0,
        });
        onProgress?.(progress);
      } else if (event.event === 'Finished') {
        progress = accumulateUpdateProgress(progress, { kind: 'finished' });
        onProgress?.(progress);
      }
    });
    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
          ? err
          : 'Échec du téléchargement ou de la vérification de signature.';
    console.warn('[updater] downloadAndInstall failed:', err);
    return { ok: false, error: message };
  }
}

/** Relance l'application après installation (plugin process). */
export async function relaunchApp(): Promise<void> {
  if (!isTauriEnvironment()) return;
  try {
    const { relaunch } = await import('@tauri-apps/plugin-process');
    await relaunch();
  } catch (err: unknown) {
    console.warn('[updater] relaunch failed:', err);
  }
}
