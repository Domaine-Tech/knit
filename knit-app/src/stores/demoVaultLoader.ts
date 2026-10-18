import type { FileNode } from '../types';

/**
 * Chargeur dynamique du coffre de démonstration Knit
 * Alimenté directement par les vrais fichiers Markdown du dossier demo_vault/ à la racine.
 * Vite injecte automatiquement leur contenu textuel brut au build/dev (?raw).
 * ZÉRO duplication de texte Markdown dans le code TypeScript !
 */

// Import dynamique de tous les fichiers Markdown de demo_vault
const rawMarkdownModules = import.meta.glob('../../../demo_vault/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const DEMO_CONTENTS: Record<string, string> = {};

// Arborescence racine
const rootNodes: Record<string, FileNode> = {};

function getOrCreateDirNode(parts: string[]): FileNode {
  let currentPath = '';
  let parentNode: FileNode | null = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    if (i === 0) {
      if (!rootNodes[part]) {
        rootNodes[part] = {
          id: part,
          name: part,
          path: currentPath,
          is_dir: true,
          children: [],
        };
      }
      parentNode = rootNodes[part];
    } else if (parentNode) {
      let child: FileNode | undefined = parentNode.children.find((c: FileNode) => c.name === part);
      if (!child) {
        child = {
          id: currentPath,
          name: part,
          path: currentPath,
          is_dir: true,
          children: [],
        };
        parentNode.children.push(child);
      }
      parentNode = child;
    }
  }

  return parentNode!;
}

// Construction automatique du dictionnaire des contenus et de l'arborescence FileNode[]
for (const [moduleKey, content] of Object.entries(rawMarkdownModules)) {
  // Chemin relatif normalisé (ex: 'accueil.md', 'wiki/architecture.md')
  const relPath = moduleKey.replace(/^.*\/demo_vault\//, '').replace(/^\/+/, '');
  DEMO_CONTENTS[relPath] = content;

  const parts = relPath.split('/');
  const fileName = parts.pop()!;

  const fileNode: FileNode = {
    id: relPath,
    name: fileName,
    path: relPath,
    is_dir: false,
    extension: fileName.split('.').pop() || 'md',
    children: [],
  };

  if (parts.length === 0) {
    // Fichier à la racine
    rootNodes[fileName] = fileNode;
  } else {
    // Fichier dans un sous-dossier (ex: wiki/, journal/)
    const dirNode = getOrCreateDirNode(parts);
    dirNode.children.push(fileNode);
  }
}

// Convertit le dictionnaire racine en tableau ordonné (dossiers en premier ou accueil.md en tête)
export const DEMO_FILES: FileNode[] = Object.values(rootNodes).sort((a, b) => {
  if (a.name === 'accueil.md') return -1;
  if (b.name === 'accueil.md') return 1;
  if (a.is_dir && !b.is_dir) return -1;
  if (!a.is_dir && b.is_dir) return 1;
  return a.name.localeCompare(b.name);
});

// Neutralise la propagation HMR pour éviter tout rechargement d'application lors de modifications de notes
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    // Ne pas propager le rechargement aux stores importateurs
  });
}
