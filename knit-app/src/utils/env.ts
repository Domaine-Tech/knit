/**
 * Utilitaires de détection de l'environnement d'exécution (Tauri natif vs Navigateur Web dev)
 */

/**
 * Détecte si l'application s'exécute dans le conteneur natif Tauri v2
 */
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};
