import type { ContextMenuItem, DocType } from '../types';
import {
  copyAbsolutePath,
  copyFileName,
  copyMarkdownLink,
  copyRelativePath,
  copyTextWithToast,
} from './clipboardUtils';
import { vaultStore } from '../stores/vaultStore';
import { toast } from '../stores/toastStore';

/** Types Markdown convertibles via frontmatter `type:` (hors médias `image`). */
export type ConvertibleDocType = Extract<DocType, 'note' | 'kanban' | 'table'>;

const CONVERTIBLE_DOC_TYPES: ReadonlyArray<{
  type: ConvertibleDocType;
  label: string;
  icon: ContextMenuItem['icon'];
}> = [
  { type: 'note', label: 'Note Markdown', icon: 'file-markdown' },
  { type: 'kanban', label: 'Tableau Kanban', icon: 'kanban' },
  { type: 'table', label: 'Vue Tableau', icon: 'table' },
];

/**
 * Entrée unique « Changer le type » avec sous-menu (note / kanban / table).
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

export interface PathCopyMenuOptions {
  relPath: string;
  absPath: string;
  /** Nom affiché pour « Copier le nom ». Absent : l'entrée est omise. */
  name?: string;
  nameLabel?: string;
  includeMarkdownLink?: boolean;
  /** Libellé court dans le sous-menu (défaut dérivé de nameLabel). */
  nameChildLabel?: string;
  markdownAlias?: string;
  /** Préfixe des identifiants, ex. `copy-` ou `copy-dir-`. */
  idPrefix?: string;
  /** Variante image : `![alias](path)` au lieu de `[alias](path)`. */
  markdownAsImage?: boolean;
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

/**
 * @deprecated Préférer `buildPathCopyMenuItem` (entrée unique + sous-menu).
 * Conservé pour compatibilité : renvoie un tableau d'une entrée.
 */
export function buildPathCopyMenuItems(options: PathCopyMenuOptions): ContextMenuItem[] {
  return [buildPathCopyMenuItem(options)];
}

export interface CreateInFolderMenuOptions {
  /** Dossier parent relatif (`''` = racine du coffre). */
  parentDir: string;
  /** Inclure « Nouveau dossier… » (défaut : true). */
  includeFolder?: boolean;
  /**
   * Remplace le prompt pour la note (ex. saisie inline sidebar).
   * Si fourni, `onCreated` n'est pas appelé pour ce chemin.
   */
  createNote?: () => void;
  /** Raccourci affiché sur « Note Markdown… » (souvent Ctrl+N à la racine). */
  noteShortcut?: string;
  onCreated?: (relPath: string, kind: 'note' | 'kanban' | 'table' | 'dir') => void;
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
 * Entrée unique « Nouveau » avec sous-menu (note / kanban / table / dossier).
 */
export function buildCreateInFolderMenuItem(
  options: CreateInFolderMenuOptions
): ContextMenuItem {
  const { parentDir, includeFolder = true, createNote, noteShortcut, onCreated } = options;
  const inLabel = parentDir ? ` dans ce dossier` : '';

  const children: ContextMenuItem[] = [
    {
      id: 'new-note',
      label: 'Note Markdown…',
      icon: 'file-markdown',
      shortcut: noteShortcut,
      onClick: () => {
        if (createNote) {
          createNote();
          return;
        }
        const cleanName = promptMarkdownName(
          `Nouvelle note${inLabel} :`,
          'nouvelle-note.md'
        );
        if (!cleanName) return;
        const relPath = joinVaultPath(parentDir, cleanName);
        void vaultStore
          .createFile(relPath, `# ${cleanName.replace(/\.md$/, '')}\n\n`)
          .then(() => {
            toast.success('Note créée', relPath);
            onCreated?.(relPath, 'note');
          });
      },
    },
    {
      id: 'new-kanban',
      label: 'Tableau Kanban…',
      icon: 'kanban',
      onClick: () => {
        const cleanName = promptMarkdownName(
          `Nouveau tableau Kanban${inLabel} :`,
          'kanban.md'
        );
        if (!cleanName) return;
        const relPath = joinVaultPath(parentDir, cleanName);
        void vaultStore
          .createKanbanFile(relPath, cleanName.replace(/\.md$/, ''))
          .then((createdPath) => {
            toast.success('Tableau Kanban créé', createdPath);
            onCreated?.(createdPath, 'kanban');
          });
      },
    },
    {
      id: 'new-table',
      label: 'Vue Tableau…',
      icon: 'table',
      onClick: () => {
        const cleanName = promptMarkdownName(
          `Nouvelle vue Tableau${inLabel} :`,
          'tableau.md'
        );
        if (!cleanName) return;
        const title = cleanName.replace(/\.md$/, '');
        const relPath = joinVaultPath(parentDir, cleanName);
        void vaultStore
          .createFile(
            relPath,
            `---\ntype: table\ntitle: "${title}"\n---\n\n# ${title}\n\n## À faire\n- [ ] Première ligne de données\n`
          )
          .then(() => {
            toast.success('Vue Tableau créée', relPath);
            onCreated?.(relPath, 'table');
          });
      },
    },
  ];

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

export interface CloseTabsMenuOptions {
  tabId: string;
  tabIndex: number;
  tabsCount: number;
  onClose: () => void;
  onCloseOthers: () => void;
  onCloseToRight: () => void;
  onCloseAll: () => void;
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
