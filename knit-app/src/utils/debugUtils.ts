import { toast } from '../stores/toastStore';
import { copyTextWithToast } from './clipboardUtils';

/**
 * Helpers partagés du Mode Debug Global (B-056) — copie JSON & dump console.
 */

export async function copyDebugJson(
  payload: unknown,
  title: string,
  description?: string
): Promise<void> {
  await copyTextWithToast(JSON.stringify(payload, null, 2), title, description);
}

export function dumpDebugConsole(label: string, ...payloads: unknown[]): void {
  console.group(`[${label} DEBUG]`);
  for (const p of payloads) {
    console.log(p);
  }
  console.groupEnd();
  toast.info('Inspecteur Console', `Données ${label} affichées dans la console (F12).`);
}
