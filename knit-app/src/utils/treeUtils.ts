import type { FileNode, FlattenedFile, KanbanFileInfo } from '../types';

/**
 * Utilitaires universels de parcours et manipulation de l'arborescence de fichiers de Knit
 */

/**
 * Recherche récursive d'un nœud dans l'arborescence du coffre à partir d'une cible WikiLink
 */
export function findVaultNode(target: string, nodes: FileNode[]): FileNode | null {
  const clean = target
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .split('|')[0]
    .replace(/^\.\//, '')
    .replace(/\/$/, '')
    .trim();

  const cleanNoExt = clean.replace(/\.md$/i, '');
  const cleanBase = cleanNoExt.split('/').pop() || cleanNoExt;

  let match: FileNode | null = null;
  const traverse = (items: FileNode[]) => {
    for (const item of items) {
      const itemNoExt = item.path.replace(/\.md$/i, '');
      const itemBase = item.name.replace(/\.md$/i, '');

      if (
        item.path === clean ||
        item.path === `${clean}.md` ||
        itemNoExt === clean ||
        itemNoExt === cleanNoExt ||
        itemBase.toLowerCase() === cleanBase.toLowerCase() ||
        item.name.toLowerCase() === clean.toLowerCase() ||
        item.path.toLowerCase().endsWith(`/${cleanNoExt.toLowerCase()}.md`)
      ) {
        match = item;
        return;
      }
      if (item.is_dir && item.children) {
        traverse(item.children);
        if (match) return;
      }
    }
  };
  traverse(nodes);
  return match;
}

/**
 * Aplatit l'arborescence pour lister tous les chemins relatifs des fichiers Markdown du coffre
 */
export function getFlatFiles(nodes: FileNode[]): string[] {
  const res: string[] = [];
  const traverse = (items: FileNode[]) => {
    for (const item of items) {
      if (item.is_dir) {
        traverse(item.children);
      } else if (item.path.endsWith('.md') || item.name === 'KNIT.md') {
        res.push(item.path);
      }
    }
  };
  traverse(nodes);
  return res;
}

/**
 * Aplatit l'arborescence des fichiers pour la recherche rapide (Quick Switcher)
 */
export function flattenFileNodes(nodes: FileNode[]): FlattenedFile[] {
  const list: FlattenedFile[] = [];

  const traverse = (items: FileNode[]) => {
    for (const node of items) {
      if (node.is_dir) {
        traverse(node.children);
      } else {
        const parts = node.path.split('/');
        const parentDir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
        list.push({
          path: node.path,
          name: node.name,
          parentDir,
        });
      }
    }
  };

  traverse(nodes);
  return list;
}

/**
 * Extrait les métadonnées et fichiers compatibles Kanban depuis l'arborescence
 */
export function extractKanbanFiles(nodes: FileNode[]): KanbanFileInfo[] {
  const list: KanbanFileInfo[] = [];

  const traverse = (items: FileNode[]) => {
    for (const node of items) {
      if (node.is_dir) {
        traverse(node.children);
      } else if (node.path.endsWith('.md')) {
        const lower = node.name.toLowerCase();
        const cleanTitle = node.name.replace(/\.md$/, '').replace(/^kanban-?/, '').trim() || node.name;
        const formattedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

        if (lower.includes('kanban') || lower.includes('tableau') || lower.includes('board')) {
          list.push({
            path: node.path,
            name: node.name,
            title: formattedTitle,
          });
        }
      }
    }
  };

  traverse(nodes);
  return list;
}
