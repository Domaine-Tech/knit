/**
 * Wrapper Tauri v2 Updater — no-op propre hors environnement natif.
 */
import { isTauriEnvironment } from './env';
import { getAppVersion } from './version';

export interface KnitUpdateInfo {
  version: string;
  body: string | null;
  date: string | null;
}

export type UpdateProgress = {
  downloaded: number;
  total: number | null;
};

export type CheckUpdateResult =
  | { available: false; currentVersion: string }
  | { available: true; currentVersion: string; update: KnitUpdateInfo };

let pendingInstall: (() => Promise<void>) | null = null;

/**
 * Vérifie si une mise à jour est disponible (endpoint GitHub Releases / latest.json).
 */
export async function checkForUpdates(): Promise<CheckUpdateResult> {
  const currentVersion = await getAppVersion();
  if (!isTauriEnvironment()) {
    return { available: false, currentVersion };
  }

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) {
      pendingInstall = null;
      return { available: false, currentVersion };
    }

    const info: KnitUpdateInfo = {
      version: update.version,
      body: update.body ?? null,
      date: update.date ?? null,
    };

    pendingInstall = async () => {
      await update.downloadAndInstall();
    };

    return { available: true, currentVersion, update: info };
  } catch (err: unknown) {
    console.warn('[updater] check failed:', err);
    pendingInstall = null;
    return { available: false, currentVersion };
  }
}

/**
 * Télécharge et installe la mise à jour précédemment détectée.
 * @returns true si une installation a été lancée.
 */
export async function downloadAndInstallUpdate(
  onProgress?: (p: UpdateProgress) => void
): Promise<boolean> {
  if (!isTauriEnvironment() || !pendingInstall) return false;

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (!update) return false;

    await update.downloadAndInstall((event) => {
      if (!onProgress) return;
      if (event.event === 'Started') {
        onProgress({ downloaded: 0, total: event.data.contentLength ?? null });
      } else if (event.event === 'Progress') {
        onProgress({
          downloaded: event.data.chunkLength,
          total: null,
        });
      }
    });
    return true;
  } catch (err: unknown) {
    console.warn('[updater] downloadAndInstall failed:', err);
    return false;
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
