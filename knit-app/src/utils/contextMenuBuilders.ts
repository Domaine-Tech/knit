import type { ContextMenuItem } from '../types';
import {
  copyAbsolutePath,
  copyFileName,
  copyMarkdownLink,
  copyRelativePath,
} from './clipboardUtils';

export interface PathCopyMenuOptions {
  relPath: string;
  absPath: string;
  /** Nom affiché pour « Copier le nom ». Absent : l'entrée est omise. */
  name?: string;
  nameLabel?: string;
  includeMarkdownLink?: boolean;
  markdownAlias?: string;
  /** Préfixe des identifiants, ex. `copy-` ou `copy-dir-`. */
  idPrefix?: string;
}

/**
 * Items de menu « copier chemin / nom / lien » partagés par l'arbre, les onglets et l'éditeur.
 */
export function buildPathCopyMenuItems(options: PathCopyMenuOptions): ContextMenuItem[] {
  const {
    relPath,
    absPath,
    name,
    nameLabel = 'Copier le nom du fichier',
    includeMarkdownLink = true,
    markdownAlias,
    idPrefix = 'copy-',
  } = options;

  const items: ContextMenuItem[] = [
    {
      id: `${idPrefix}rel-path`,
      label: 'Copier le chemin relatif',
      icon: 'copy',
      onClick: () => {
        void copyRelativePath(relPath);
      },
    },
    {
      id: `${idPrefix}abs-path`,
      label: 'Copier le chemin absolu',
      icon: 'copy',
      onClick: () => {
        void copyAbsolutePath(absPath);
      },
    },
  ];

  if (name) {
    items.push({
      id: `${idPrefix}name`,
      label: nameLabel,
      icon: 'clipboard',
      onClick: () => {
        void copyFileName(name);
      },
    });
  }

  if (includeMarkdownLink) {
    items.push({
      id: `${idPrefix}md-link`,
      label: 'Copier le lien Markdown',
      icon: 'link',
      onClick: () => {
        void copyMarkdownLink(relPath, markdownAlias);
      },
    });
  }

  return items;
}
