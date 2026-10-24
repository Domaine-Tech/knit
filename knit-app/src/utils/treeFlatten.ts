import type { FileNode } from '../types';

export interface FlatTreeItem {
  node: FileNode;
  depth: number;
}

/**
 * Aplatit les nœuds visibles (dossiers dépliés uniquement) pour un rendu virtualisé.
 */
export function flattenVisibleTree(
  nodes: FileNode[],
  isExpanded: (path: string) => boolean,
  depth = 0
): FlatTreeItem[] {
  const out: FlatTreeItem[] = [];
  for (const node of nodes) {
    out.push({ node, depth });
    if (node.is_dir && isExpanded(node.path) && node.children.length > 0) {
      out.push(...flattenVisibleTree(node.children, isExpanded, depth + 1));
    }
  }
  return out;
}

/**
 * Compte le nombre total de nœuds dans un arbre (tous niveaux).
 */
export function countTreeNodes(nodes: FileNode[]): number {
  let n = 0;
  for (const node of nodes) {
    n += 1;
    if (node.children.length > 0) {
      n += countTreeNodes(node.children);
    }
  }
  return n;
}

/**
 * Construit un arbre synthétique plat pour tests de virtualisation (N fichiers sous une racine).
 */
export function buildSyntheticFlatTree(fileCount: number): FileNode[] {
  const children: FileNode[] = [];
  for (let i = 0; i < fileCount; i += 1) {
    const name = `note-${String(i).padStart(5, '0')}.md`;
    children.push({
      id: `syn-${i}`,
      name,
      path: `bulk/${name}`,
      is_dir: false,
      children: [],
    });
  }
  return [
    {
      id: 'syn-root',
      name: 'bulk',
      path: 'bulk',
      is_dir: true,
      children,
    },
  ];
}
