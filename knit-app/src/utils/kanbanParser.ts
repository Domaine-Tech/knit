/**
 * Parser et sérialiseur Markdown <-> Tableau Kanban
 *
 * Représentation 100% Markdown standard (compatible Obsidian Kanban et CommonMark) :
 * - Frontmatter YAML avec `type: kanban` ou `kanban: true` ou `kanban-plugin: basic`
 * - Chaque colonne correspond à un titre `## Nom de la colonne`
 * - Chaque carte correspond à une ligne de liste `- [ ] Titre`, `- [/] Titre`, `- [x] Titre` etc.
 * - Support des 7 statuts étendus : ' ', '/', 'x', '-', '?', '>', '!'
 * - Support des priorités inline : !p1, !p2, !p3
 */

import type { TaskStatus, KanbanCard, KanbanColumn, KanbanBoard, CardMetadata } from '../types';
import { slugify } from './markdownUtils';
import { COLUMN_ACCENT_COLORS } from '../theme/theme';

/**
 * Crée le contenu Markdown d'un nouveau tableau Kanban vierge ou pré-rempli
 */
export function createDefaultKanbanMarkdown(
  title: string = 'Nouveau Kanban',
  columns: string[] = ['À faire', 'En cours', 'Terminé']
): string {
  const cleanTitle = title.replace(/\.md$/, '');
  let md = `---
type: kanban
title: "${cleanTitle}"
---

# ${cleanTitle}

`;

  for (const col of columns) {
    md += `## ${col}\n\n`;
    if (col === 'À faire' || col.toLowerCase().includes('faire')) {
      md += `- [ ] Première tâche du projet !p1\n`;
    }
    md += '\n';
  }

  return md;
}

/**
 * Normalise un caractère de statut de case à cocher vers l'un des 7 statuts reconnus
 */
export function normalizeTaskStatus(char: string): TaskStatus {
  switch (char) {
    case 'x':
    case 'X':
      return 'x';
    case '/':
      return '/';
    case '-':
      return '-';
    case '?':
      return '?';
    case '>':
      return '>';
    case '!':
      return '!';
    default:
      return ' ';
  }
}

/** Cycle Live Preview / knit-tasks : à faire → en cours → fait → à faire. */
export function cycleTaskStatus(status: TaskStatus | string): TaskStatus {
  const current = normalizeTaskStatus(status);
  if (current === ' ') return '/';
  if (current === '/') return 'x';
  if (current === 'x') return ' ';
  return ' ';
}

/** Libellé FR pour infobulle / UI d'un statut de tâche. */
export function taskStatusLabel(status: TaskStatus | string): string {
  switch (normalizeTaskStatus(status)) {
    case 'x':
      return 'Fait';
    case '/':
      return 'En cours';
    case '-':
      return 'Annulé';
    case '?':
      return 'Question';
    case '>':
      return 'Reporté';
    case '!':
      return 'Urgent';
    default:
      return 'À faire';
  }
}

/**
 * Parse un document Markdown pour en extraire la structure du tableau Kanban
 */
export function parseKanbanMarkdown(content: string, fallbackTitle: string = 'Tableau Kanban'): KanbanBoard {
  let frontmatter = '';
  let body = content;
  let title = fallbackTitle.replace(/\.md$/, '');

  // 1. Extraction du frontmatter YAML
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (fmMatch) {
    frontmatter = fmMatch[0];
    const yamlContent = fmMatch[1];
    body = content.slice(frontmatter.length);

    const titleMatch = yamlContent.match(/^title:\s*["']?(.*?)["']?$/m);
    if (titleMatch && titleMatch[1].trim()) {
      title = titleMatch[1].trim();
    }
  }

  // 2. Découpage en lignes
  const lines = body.split(/\r?\n/);
  const columns: KanbanColumn[] = [];
  let currentColumn: KanbanColumn | null = null;
  const preambleLines: string[] = [];
  let foundFirstColumn = false;

  const usedColIds = new Set<string>();
  const generateColId = (colTitle: string): string => {
    const slug = slugify(colTitle) || 'col';
    let candidate = `col-${slug}`;
    let counter = 2;
    while (usedColIds.has(candidate)) {
      candidate = `col-${slug}-${counter}`;
      counter++;
    }
    usedColIds.add(candidate);
    return candidate;
  };

  const usedCardIds = new Set<string>();
  const generateCardId = (cardTitle: string): string => {
    const slug = slugify(cardTitle).slice(0, 30) || 'card';
    let candidate = `card-${slug}`;
    let counter = 2;
    while (usedCardIds.has(candidate)) {
      candidate = `card-${slug}-${counter}`;
      counter++;
    }
    usedCardIds.add(candidate);
    return candidate;
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Détection d'un titre de colonne : ## Nom de colonne
    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      foundFirstColumn = true;
      const colTitle = h2Match[1].trim();
      const colId = generateColId(colTitle);
      const color = COLUMN_ACCENT_COLORS[columns.length % COLUMN_ACCENT_COLORS.length];

      currentColumn = {
        id: colId,
        title: colTitle,
        color,
        cards: [],
      };
      columns.push(currentColumn);
      continue;
    }

    if (!foundFirstColumn) {
      preambleLines.push(rawLine);
      continue;
    }

    // Détection d'une carte dans la colonne courante
    if (currentColumn) {
      // Format 1 : - [ ] Tâche ou - [x] Tâche ou - [/] etc. (7 statuts)
      const checkMatch = trimmed.match(/^-\s*\[([ xX/?!>-])\]\s*(.*)$/);
      if (checkMatch) {
        const status = normalizeTaskStatus(checkMatch[1]);
        const completed = status === 'x';
        const cardTitle = checkMatch[2].trim() || 'Sans titre';
        const priorityMatch = cardTitle.match(/!(p[1-3])\b/i);
        const priority = priorityMatch ? (priorityMatch[1].toLowerCase() as 'p1' | 'p2' | 'p3') : undefined;

        currentColumn.cards.push({
          id: generateCardId(cardTitle),
          title: cardTitle,
          completed,
          status,
          priority,
          rawText: rawLine,
        });
        continue;
      }

      // Format 2 : Simple puce - Tâche ou * Tâche
      const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (bulletMatch) {
        const cardTitle = bulletMatch[1].trim() || 'Sans titre';
        const priorityMatch = cardTitle.match(/!(p[1-3])\b/i);
        const priority = priorityMatch ? (priorityMatch[1].toLowerCase() as 'p1' | 'p2' | 'p3') : undefined;

        currentColumn.cards.push({
          id: generateCardId(cardTitle),
          title: cardTitle,
          completed: false,
          status: ' ',
          priority,
          rawText: rawLine,
        });
        continue;
      }
    }
  }

  // Si aucune colonne n'a été détectée dans le document, initialiser des colonnes par défaut
  if (columns.length === 0) {
    columns.push(
      { id: 'col-a-faire', title: 'À faire', color: 'var(--knit-text-secondary)', cards: [] },
      { id: 'col-en-cours', title: 'En cours', color: 'var(--knit-primary)', cards: [] },
      { id: 'col-termine', title: 'Terminé', color: '#10B981', cards: [] }
    );
  }

  return {
    frontmatter,
    title,
    preamble: preambleLines.join('\n').trim(),
    columns,
  };
}

/**
 * Met à jour le statut d'une carte selon le nom de sa colonne de destination (Bijectivité Kanban)
 */
export function adaptCardStatusToColumn(card: KanbanCard, columnTitle: string): KanbanCard {
  const lower = columnTitle.toLowerCase();
  let nextStatus: TaskStatus = card.status;

  if (lower.includes('termin') || lower.includes('done') || lower.includes('fait') || lower.includes('fini')) {
    nextStatus = 'x';
  } else if (lower.includes('cours') || lower.includes('progress') || lower.includes('doing') || lower.includes('actif')) {
    nextStatus = '/';
  } else if (lower.includes('faire') || lower.includes('todo') || lower.includes('backlog') || lower.includes('attente')) {
    nextStatus = ' ';
  } else if (lower.includes('annul') || lower.includes('cancel')) {
    nextStatus = '-';
  }

  return {
    ...card,
    status: nextStatus,
    completed: nextStatus === 'x',
  };
}

/**
 * Sérialise l'état du tableau Kanban en texte Markdown pur et élégant
 */
export function serializeKanbanMarkdown(board: KanbanBoard): string {
  let output = '';

  // 1. Frontmatter
  let fm = board.frontmatter.trim();
  if (!fm) {
    output += `---\ntype: kanban\ntitle: "${board.title || 'Tableau Kanban'}"\n---\n\n`;
  } else {
    // S'assurer que `type: kanban` est présent
    if (!fm.includes('type: kanban') && !fm.includes('kanban: true') && !fm.includes('kanban-plugin:')) {
      fm = fm.replace(/^---\r?\n/, '---\ntype: kanban\n');
    }
    output += `${fm}\n\n`;
  }

  // 2. Préambule ou titre Markdown H1 si présent
  if (board.preamble) {
    output += `${board.preamble.trim()}\n\n`;
  } else if (board.title) {
    output += `# ${board.title}\n\n`;
  }

  // 3. Colonnes et Cartes
  for (const col of board.columns) {
    output += `## ${col.title}\n\n`;
    for (const card of col.cards) {
      const mark = card.status || (card.completed ? 'x' : ' ');
      output += `- [${mark}] ${card.title.trim()}\n`;
    }
    output += '\n';
  }

  return output;
}

/**
 * Analyse une ligne de carte pour extraire d'éventuels WikiLinks [[...]], #tags, et priorités !p1/!p2/!p3
 */
export function parseCardMetadata(title: string): CardMetadata {
  const tags: string[] = [];
  const wikiLinks: string[] = [];

  // Extraction priorités
  const priorityMatch = title.match(/!(p[1-3])\b/i);
  const priority = priorityMatch ? (priorityMatch[1].toLowerCase() as 'p1' | 'p2' | 'p3') : undefined;

  // Extraction assignation @collaborateur
  const assigneeMatch = title.match(/@([a-zA-Z0-9_./-]+)/);
  const assignee = assigneeMatch ? assigneeMatch[1] : undefined;

  // Extraction date @YYYY-MM-DD
  const dateMatch = title.match(/@(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}(?:-\d{2}:\d{2})?)?)/);
  const dueDate = dateMatch ? dateMatch[1] : undefined;

  // Extraction #tags
  const tagMatches = title.match(/#([\w\u00C0-\u017F-]+)/g);
  if (tagMatches) {
    tags.push(...tagMatches.map((t) => t.slice(1)));
  }

  // Extraction [[WikiLinks]]
  const linkMatches = title.match(/\[\[(.*?)\]\]/g);
  if (linkMatches) {
    wikiLinks.push(...linkMatches.map((l) => l.slice(2, -2)));
  }

  let clean = title
    .replace(/!(p[1-3])\b/gi, '')
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .trim();

  return {
    cleanTitle: clean || title,
    tags,
    wikiLinks,
    priority,
    assignee,
    dueDate,
  };
}
