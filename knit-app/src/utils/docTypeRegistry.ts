/**
 * Registre unique des types Doc-Driven Knit.
 *
 * Toute nouvelle vue (`type: …` dans le frontmatter) DOIT être ajoutée ici :
 * elle apparaît automatiquement dans création (+), conversion (clic droit),
 * icônes d’onglets / arbre, et commandes palette.
 */

import type { ConvertibleDocType, DocTypeMeta, IconName } from '../types';

export type { ConvertibleDocType, DocTypeMeta };

/**
 * Source de vérité — ajouter une entrée ici pour propager la vue partout
 * (création +, conversion clic droit, icônes, labels, templates, palette).
 */
export const CONVERTIBLE_DOC_TYPES: readonly DocTypeMeta[] = [
  {
    type: 'note',
    label: 'Note Markdown',
    icon: 'file-markdown',
    description: 'Note Markdown',
    defaultFileName: 'nouvelle-note.md',
  },
  {
    type: 'kanban',
    label: 'Tableau Kanban',
    icon: 'kanban',
    description: 'Vue Kanban agile',
    defaultFileName: 'kanban.md',
  },
  {
    type: 'table',
    label: 'Vue Tableau',
    icon: 'table',
    description: 'Vue Tableau synthétique',
    defaultFileName: 'tableau.md',
  },
  {
    type: 'calendar',
    label: 'Agenda',
    icon: 'calendar',
    description: 'Vue Agenda / Calendrier',
    defaultFileName: 'agenda.md',
  },
  {
    type: 'canvas',
    label: 'Canvas',
    icon: 'canvas',
    description: 'Vue Canvas infini 2D',
    defaultFileName: 'canvas.md',
  },
  {
    type: 'slides',
    label: 'Diaporama',
    icon: 'slides',
    description: 'Vue Diaporama',
    defaultFileName: 'diaporama.md',
  },
  {
    type: 'gallery',
    label: 'Galerie',
    icon: 'gallery',
    description: 'Vue Galerie multimédia',
    defaultFileName: 'galerie.md',
  },
] as const;

export function isConvertibleDocType(
  value: string | null | undefined
): value is ConvertibleDocType {
  return CONVERTIBLE_DOC_TYPES.some((d) => d.type === value);
}

export function getConvertibleDocTypeMeta(
  type: string | null | undefined
): DocTypeMeta | undefined {
  return CONVERTIBLE_DOC_TYPES.find((d) => d.type === type);
}

/** Icône Duotone selon le type (inclut `image`). */
export function docTypeToIconName(docType: string): IconName {
  const t = (docType || 'note').toLowerCase();
  if (t === 'image') return 'image';
  return getConvertibleDocTypeMeta(t)?.icon ?? 'file-markdown';
}

/** Libellé UI d’un type (fallback = type brut). */
export function docTypeLabel(docType: string): string {
  if (docType === 'image') return 'Image';
  return getConvertibleDocTypeMeta(docType)?.label ?? docType;
}

/** Infobulle courte pour l’arbre / onglets. */
export function docTypeDescription(docType: string): string | undefined {
  if (docType === 'image') return 'Média / Image';
  return getConvertibleDocTypeMeta(docType)?.description;
}

/**
 * Contenu Markdown initial pour un type Doc-Driven.
 * `kanban` retourne `''` : déléguer à `vaultStore.createKanbanFile`.
 */
export function defaultContentForDocType(
  type: ConvertibleDocType,
  title: string
): string {
  const clean = title.replace(/\.md$/, '');
  switch (type) {
    case 'note':
      return `# ${clean}\n\n`;
    case 'kanban':
      return '';
    case 'table':
      return `---\ntype: table\ntitle: "${clean}"\n---\n\n# ${clean}\n\n## À faire\n- [ ] Première ligne de données\n`;
    case 'calendar':
      return `---\ntype: calendar\ntitle: "${clean}"\n---\n\n# ${clean}\n\n`;
    case 'canvas':
      return `---\ntype: canvas\ntitle: "${clean}"\n---\n\n# ${clean}\n\n\`\`\`canvas\n{\n  "nodes": [],\n  "edges": []\n}\n\`\`\`\n`;
    case 'slides':
      return `---\ntype: slides\ntitle: "${clean}"\n---\n\n# ${clean}\n\n---\n\n## Diapositive 2\n\n`;
    case 'gallery':
      return `---\ntype: gallery\ntitle: "${clean}"\n---\n\n# ${clean}\n\n`;
  }
}
