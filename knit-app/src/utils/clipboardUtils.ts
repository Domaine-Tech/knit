import { toast } from '../stores/toastStore';

/**
 * Utilitaires centralisés pour la manipulation du presse-papier et notifications associées
 */

/**
 * Copie un texte dans le presse-papier système avec notification toast
 */
export async function copyTextWithToast(
  text: string,
  title: string,
  description?: string
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.info(title, description || text);
  } catch (err: unknown) {
    toast.error('Erreur presse-papier', String(err));
  }
}

/**
 * Copie le chemin relatif d'un document ou dossier
 */
export function copyRelativePath(path: string): Promise<void> {
  return copyTextWithToast(path, 'Chemin relatif copié', path);
}

/**
 * Copie le chemin absolu système d'un document ou dossier
 */
export function copyAbsolutePath(absPath: string): Promise<void> {
  return copyTextWithToast(absPath, 'Chemin absolu copié', absPath);
}

/**
 * Copie le nom d'un fichier ou dossier
 */
export function copyFileName(name: string): Promise<void> {
  return copyTextWithToast(name, 'Nom copié', name);
}

/**
 * Copie un WikiLink Markdown formaté ([[cible]] ou [[cible|alias]])
 */
export function copyMarkdownLink(target: string, alias?: string): Promise<void> {
  const cleanTarget = target.replace(/\.md$/, '');
  const link = alias && alias !== target && alias !== cleanTarget
    ? `[[${cleanTarget}|${alias}]]`
    : `[[${cleanTarget}]]`;
  return copyTextWithToast(link, 'Lien Markdown copié', link);
}
