import type {
  CloseTabsMenuOptions,
  ContextMenuItem,
  CreateDocKind,
  CreateInFolderMenuOptions,
  DocType,
  PathCopyMenuOptions,
} from '../types';
import {
  copyAbsolutePath,
  copyFileName,
  copyMarkdownLink,
  copyRelativePath,
  copyTextWithToast,
} from './clipboardUtils';
import { vaultStore } from '../stores/vaultStore';
import { toast } from '../stores/toastStore';
import {
  CONVERTIBLE_DOC_TYPES,
  defaultContentForDocType,
  type ConvertibleDocType,
} from './docTypeRegistry';

export type {
  CloseTabsMenuOptions,
  CreateDocKind,
  CreateInFolderMenuOptions,
  PathCopyMenuOptions,
};

/**
 * Entrée unique « Changer le type » avec sous-menu (tous les types du registre).
 */
export function buildConvertDocTypeMenuItem(
  relPath: string,
  currentType?: ConvertibleDocType | DocType | null
): ContextMenuItem {
  return {
    id: 'convert-doc-type',
    label: 'Changer le type',
    icon: 'slider',
    children: CONVERTIBLE_DOC_TYPES.map(({ type, label, icon }) => {
      const isActive = currentType === type;
      return {
        id: `convert-to-${type}`,
        label: isActive ? `${label} (actuel)` : label,
        icon,
        onClick: () => {
          if (isActive) return;
          void vaultStore.convertDocumentType(relPath, type);
        },
      };
    }),
  };
}

/**
 * Entrée unique « Copier » avec sous-menu (chemin, nom, lien).
 */
export function buildPathCopyMenuItem(options: PathCopyMenuOptions): ContextMenuItem {
  const {
    relPath,
    absPath,
    name,
    nameLabel = 'Copier le nom du fichier',
    nameChildLabel,
    includeMarkdownLink = true,
    markdownAlias,
    markdownAsImage = false,
    idPrefix = 'copy-',
  } = options;

  const children: ContextMenuItem[] = [
    {
      id: `${idPrefix}rel-path`,
      label: 'Chemin relatif',
      icon: 'copy',
      onClick: () => {
        void copyRelativePath(relPath);
      },
    },
    {
      id: `${idPrefix}abs-path`,
      label: 'Chemin absolu',
      icon: 'copy',
      onClick: () => {
        void copyAbsolutePath(absPath);
      },
    },
  ];

  if (name) {
    const derivedNameLabel =
      nameLabel.replace(/^Copier\s+/i, '').replace(/^le\s+/i, '') || 'Nom';
    children.push({
      id: `${idPrefix}name`,
      label: nameChildLabel ?? derivedNameLabel,
      icon: 'clipboard',
      onClick: () => {
        void copyFileName(name);
      },
    });
  }

  if (includeMarkdownLink) {
    children.push({
      id: `${idPrefix}md-link`,
      label: markdownAsImage ? 'Lien Markdown image' : 'Lien Markdown',
      icon: 'link',
      onClick: () => {
        if (markdownAsImage) {
          const alias = markdownAlias || name || relPath.split('/').pop() || 'image';
          const link = `![${alias}](${relPath.replace(/\\/g, '/')})`;
          void copyTextWithToast(link, 'Lien Markdown image copié', link);
        } else {
          void copyMarkdownLink(relPath, markdownAlias);
        }
      },
    });
  }

  return {
    id: `${idPrefix}group`,
    label: 'Copier',
    icon: 'copy',
    children,
  };
}

function joinVaultPath(parentDir: string, name: string): string {
  const base = parentDir.replace(/\\/g, '/').replace(/\/+$/, '');
  return base ? `${base}/${name}` : name;
}

function promptMarkdownName(title: string, defaultName: string): string | null {
  const raw = window.prompt(title, defaultName);
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  return trimmed.endsWith('.md') ? trimmed : `${trimmed}.md`;
}

/**
 * Entrée unique « Nouveau » avec sous-menu (tous les types Doc-Driven + dossier).
 * Types issus de `CONVERTIBLE_DOC_TYPES` (`docTypeRegistry.ts`).
 */
export function buildCreateInFolderMenuItem(
  options: CreateInFolderMenuOptions
): ContextMenuItem {
  const { parentDir, includeFolder = true, createNote, noteShortcut, onCreated } = options;
  const inLabel = parentDir ? ` dans ce dossier` : '';

  const children: ContextMenuItem[] = CONVERTIBLE_DOC_TYPES.map(
    ({ type, label, icon, defaultFileName }) => ({
      id: `new-${type}`,
      label: `${label}…`,
      icon,
      shortcut: type === 'note' ? noteShortcut : undefined,
      onClick: () => {
        if (type === 'note' && createNote) {
          createNote();
          return;
        }

        const cleanName = promptMarkdownName(
          `Nouveau — ${label}${inLabel} :`,
          defaultFileName
        );
        if (!cleanName) return;
        const title = cleanName.replace(/\.md$/, '');
        const relPath = joinVaultPath(parentDir, cleanName);

        if (type === 'kanban') {
          void vaultStore.createKanbanFile(relPath, title).then((createdPath) => {
            toast.success(`${label} créé`, createdPath);
            onCreated?.(createdPath, type);
          });
          return;
        }

        const content = defaultContentForDocType(type, title);
        void vaultStore.createFile(relPath, content).then(() => {
          toast.success(`${label} créé`, relPath);
          onCreated?.(relPath, type);
        });
      },
    })
  );

  if (includeFolder) {
    children.push({
      id: 'new-dir',
      label: 'Dossier…',
      icon: 'folder-plus',
      onClick: () => {
        const dirName = window.prompt(
          `Nouveau dossier${inLabel} :`,
          'nouveau-dossier'
        );
        if (!dirName || !dirName.trim()) return;
        const relPath = joinVaultPath(parentDir, dirName.trim());
        void vaultStore.createDir(relPath).then(() => {
          toast.success('Dossier créé', relPath);
          onCreated?.(relPath, 'dir');
        });
      },
    });
  }

  return {
    id: 'new-in-folder',
    label: 'Nouveau',
    icon: 'plus',
    children,
  };
}

/** Variante plate (ex. bouton « + ») : les entrées sans parent « Nouveau ». */
export function buildCreateInFolderMenuItems(
  options: CreateInFolderMenuOptions
): ContextMenuItem[] {
  return buildCreateInFolderMenuItem(options).children ?? [];
}

/**
 * « Fermer » direct + sous-menu pour les variantes (autres / à droite / tous).
 * Renvoie 1 ou 2 entrées selon le contexte.
 */
export function buildCloseTabsMenuItems(
  options: CloseTabsMenuOptions
): ContextMenuItem[] {
  const {
    tabIndex,
    tabsCount,
    onClose,
    onCloseOthers,
    onCloseToRight,
    onCloseAll,
  } = options;

  const items: ContextMenuItem[] = [
    {
      id: 'close',
      label: 'Fermer',
      icon: 'close',
      shortcut: 'Ctrl+W',
      onClick: onClose,
    },
  ];

  const variants: ContextMenuItem[] = [];
  if (tabsCount > 1) {
    variants.push({
      id: 'close-others',
      label: 'Les autres onglets',
      onClick: onCloseOthers,
    });
  }
  if (tabIndex < tabsCount - 1) {
    variants.push({
      id: 'close-to-right',
      label: 'Les onglets à droite',
      onClick: onCloseToRight,
    });
  }
  if (tabsCount > 1) {
    variants.push({
      id: 'close-all',
      label: 'Tous les onglets',
      danger: true,
      onClick: onCloseAll,
    });
  }

  if (variants.length > 0) {
    items.push({
      id: 'close-more',
      label: 'Fermer…',
      icon: 'close',
      children: variants,
    });
  }

  return items;
}
