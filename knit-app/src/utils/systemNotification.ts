/**
 * Notifications OS natives (Tauri). Repli silencieux hors Tauri ou si permission refusée.
 */
import { isTauriEnvironment } from './env';

let permissionAsked = false;

async function ensurePermission(): Promise<boolean> {
  if (!isTauriEnvironment()) return false;
  try {
    const {
      isPermissionGranted,
      requestPermission,
    } = await import('@tauri-apps/plugin-notification');
    let granted = await isPermissionGranted();
    if (!granted && !permissionAsked) {
      permissionAsked = true;
      const result = await requestPermission();
      granted = result === 'granted';
    }
    return granted;
  } catch {
    return false;
  }
}

export async function notifySystem(title: string, body: string): Promise<void> {
  if (!(await ensurePermission())) return;
  try {
    const { sendNotification } = await import('@tauri-apps/plugin-notification');
    sendNotification({ title, body });
  } catch (err: unknown) {
    console.warn('[notification]', err);
  }
}
