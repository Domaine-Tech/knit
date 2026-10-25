import { getVersion } from '@tauri-apps/api/app';

/**
 * Version de l'application Knit.
 * Synchronisée avec root Cargo.toml, tauri.conf.json et package.json.
 */
export const APP_VERSION = '1.1.2';

let cachedVersion: string | null = null;

/**
 * Récupère le numéro de version de l'application.
 * En mode Tauri natif, interroge le runtime Tauri (tauri.conf.json).
 * En mode Web/Dev, retourne la constante centralisée.
 */
export async function getAppVersion(): Promise<string> {
  if (cachedVersion) return cachedVersion;
  try {
    const ver = await getVersion();
    if (ver && ver.trim()) {
      cachedVersion = ver.trim();
      return cachedVersion;
    }
  } catch {
    // Mode navigateur web ou fallback
  }
  cachedVersion = APP_VERSION;
  return cachedVersion;
}
