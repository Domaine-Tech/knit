/**
 * Parser et sérialiseur Markdown <-> Tableau Kanban
 *
 * Représentation 100% Markdown standard (compatible Obsidian Kanban et CommonMark) :
 * - Frontmatter YAML avec `type: kanban` ou `kanban: true` ou `kanban-plugin: basic`
 * - Chaque colonne correspond à un titre `## Nom de la colonne`
 * - Chaque carte correspond à une ligne de liste `- [ ] Titre` ou `- [x] Titre`
 * - Supporte le nombre de colonnes illimité et personnalisable
 */

export interface KanbanCard {
  id: string;
  title: string;
  completed: boolean;
  rawText: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color?: string;
  cards: KanbanCard[];
}

export interface KanbanBoard {
  frontmatter: string;
  title: string;
  preamble: string;
  columns: KanbanColumn[];
}

// Couleurs par défaut attribuées cycliquement aux colonnes
export const COLUMN_ACCENT_COLORS = [
  'var(--knit-primary)',
  '#3B82F6', // Bleu
  '#F59E0B', // Ambre / Orange
  '#10B981', // Vert émeraude
  '#8B5CF6', // Violet
  '#EC4899', // Rose
  '#06B6D4', // Cyan
  '#64748B', // Ardoise
];

/**
 * Détecte si un contenu Markdown ou un chemin est déclaré comme un Kanban
 */
export function isKanbanContent(content: string, path?: string): boolean {
  if (path && (path.endsWith('.kanban.md') || path.toLowerCase().includes('kanban'))) {
    return true;
  }
  if (!content) return false;

  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const yaml = fmMatch[1].toLowerCase();
    if (
      yaml.includes('type: kanban') ||
      yaml.includes('type: tableau') ||
      yaml.includes('type: board') ||
      yaml.includes('kanban: true') ||
      yaml.includes('kanban-plugin:')
    ) {
      return true;
    }
  }

  // Si le document possède au moins 2 titres ## et des items de liste - [ ]
  const h2Count = (content.match(/^##\s+/gm) || []).length;
  const taskCount = (content.match(/^-\s*\[[ xX]\]/gm) || []).length;
  return h2Count >= 2 && taskCount >= 1;
}

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
      md += `- [ ] Première tâche du projet\n`;
    }
    md += '\n';
  }

  return md;
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

  let cardCounter = 0;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    // Détection d'un titre de colonne : ## Nom de colonne
    const h2Match = trimmed.match(/^##\s+(.+)$/);
    if (h2Match) {
      foundFirstColumn = true;
      const colTitle = h2Match[1].trim();
      const colId = `col-${columns.length}-${colTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'col'}`;
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
      // Format 1 : - [ ] Tâche ou - [x] Tâche
      const checkMatch = trimmed.match(/^-\s*\[([ xX])\]\s*(.*)$/);
      if (checkMatch) {
        cardCounter++;
        const completed = checkMatch[1].toLowerCase() === 'x';
        const cardTitle = checkMatch[2].trim() || 'Sans titre';
        currentColumn.cards.push({
          id: `card-${cardCounter}-${Date.now().toString().slice(-4)}`,
          title: cardTitle,
          completed,
          rawText: rawLine,
        });
        continue;
      }

      // Format 2 : Simple puce - Tâche ou * Tâche
      const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
      if (bulletMatch) {
        cardCounter++;
        const cardTitle = bulletMatch[1].trim() || 'Sans titre';
        currentColumn.cards.push({
          id: `card-${cardCounter}-${Date.now().toString().slice(-4)}`,
          title: cardTitle,
          completed: false,
          rawText: rawLine,
        });
        continue;
      }
    }
  }

  // Si aucune colonne n'a été détectée dans le document, initialiser des colonnes par défaut
  if (columns.length === 0) {
    columns.push(
      { id: 'col-0-a-faire', title: 'À faire', color: 'var(--knit-text-secondary)', cards: [] },
      { id: 'col-1-en-cours', title: 'En cours', color: 'var(--knit-primary)', cards: [] },
      { id: 'col-2-termine', title: 'Terminé', color: '#10B981', cards: [] }
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
      const checkMark = card.completed ? 'x' : ' ';
      output += `- [${checkMark}] ${card.title.trim()}\n`;
    }
    output += '\n';
  }

  return output;
}

/**
 * Analyse une ligne de carte pour extraire d'éventuels WikiLinks [[...]] et #tags
 */
export function parseCardMetadata(title: string): {
  cleanTitle: string;
  tags: string[];
  wikiLinks: string[];
} {
  const tags: string[] = [];
  const wikiLinks: string[] = [];

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

  return {
    cleanTitle: title,
    tags,
    wikiLinks,
  };
}
