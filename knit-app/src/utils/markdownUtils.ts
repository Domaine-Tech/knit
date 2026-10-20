import type { DocType, ResolvedWikiLink, TableAlign } from '../types';
import { isMediaFilePath } from './treeUtils';
import { escapeThenAllowlist } from './htmlSanitize';

export type { ResolvedWikiLink };

/**
 * Utilitaires universels de traitement Markdown pour Knit
 * - Découpage précis des cellules de tableau Markdown (en préservant les | dans [[...|...]], `...` et \|)
 * - Rendu formaté immersif pour les tableaux et infobulles de prévisualisation (Live Preview)
 */

const HTML_TAG_MATCH_RE =
  /^(?:<\/?([a-zA-Z][a-zA-Z0-9]*)(?:\s+(?:[a-zA-Z0-9_:-]+(?:=(?:"[^"]*"|'[^']*'|[^\s"'=>]+))?))*\s*\/?>|<!--[\s\S]*?-->)/;

/**
 * Découpe une ligne de tableau Markdown GFM en cellules distinctes,
 * en ignorant rigoureusement les barres verticales (|) situées à l'intérieur :
 * - De WikiLinks ([[cible|alias]])
 * - De blocs de code inline (`code | text`)
 * - De liens Markdown classiques ou crochets ([texte | description](url))
 * - De paramètres d'URL entre parenthèses ((https://.../path?a=1|2))
 * - De balises HTML inline (<kbd>|</kbd>)
 * - De barres verticales échappées (\\|)
 * Tout en préservant les comparaisons mathématiques (<, >) sans rompre le découpage des colonnes.
 */
export function splitTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('>')) {
    trimmed = trimmed.replace(/^>\s*/, '');
  }
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) trimmed = trimmed.slice(0, -1);

  const cells: string[] = [];
  let current = '';
  let inWiki = false;
  let inCode = false;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    const prev = i > 0 ? trimmed[i - 1] : '';
    const next = i + 1 < trimmed.length ? trimmed[i + 1] : '';

    // Barre échappée : \| -> transformée en | dans le contenu de la cellule
    if (char === '\\' && next === '|') {
      current += '|';
      i++;
      continue;
    }

    // Bascule code inline `
    if (char === '`' && prev !== '\\') {
      inCode = !inCode;
      current += char;
      continue;
    }

    if (!inCode) {
      // WikiLink [[ ... ]]
      if (char === '[' && next === '[') {
        inWiki = true;
        current += '[[';
        i++;
        continue;
      }
      if (char === ']' && next === ']' && inWiki) {
        inWiki = false;
        current += ']]';
        i++;
        continue;
      }

      // Liens Markdown / crochets
      if (char === '[' && !inWiki) {
        bracketDepth++;
      } else if (char === ']' && !inWiki && bracketDepth > 0) {
        bracketDepth--;
      }

      // Parenthèses pour URLs ou paramètres
      if (char === '(') {
        parenDepth++;
      } else if (char === ')' && parenDepth > 0) {
        parenDepth--;
      }

      // Balises HTML <tag ...> ou <!-- ... --> uniquement (évite que < ou > isolés désactivent le découpage)
      if (char === '<') {
        const rest = trimmed.slice(i);
        const tagMatch = rest.match(HTML_TAG_MATCH_RE);
        if (tagMatch) {
          current += tagMatch[0];
          i += tagMatch[0].length - 1;
          continue;
        }
      }
    }

    // Séparateur de cellule de tableau (|) uniquement si hors de tout bloc protégé
    if (char === '|' && !inWiki && !inCode && bracketDepth === 0 && parenDepth === 0) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

/**
 * Calcule les positions d'indices dans la ligne où se trouvent les séparateurs de colonnes valides (|),
 * en ignorant les barres verticales incluses dans des WikiLinks, du code ou échappées.
 * Utile pour la navigation fluide au clavier (Tab / Shift+Tab) dans les tableaux.
 */
export function findTableDelimiterOffsets(lineText: string): number[] {
  const offsets: number[] = [];
  let inWiki = false;
  let inCode = false;
  let bracketDepth = 0;
  let parenDepth = 0;

  for (let i = 0; i < lineText.length; i++) {
    const char = lineText[i];
    const prev = i > 0 ? lineText[i - 1] : '';
    const next = i + 1 < lineText.length ? lineText[i + 1] : '';

    if (char === '\\' && next === '|') {
      i++;
      continue;
    }
    if (char === '`' && prev !== '\\') {
      inCode = !inCode;
      continue;
    }
    if (!inCode) {
      if (char === '[' && next === '[') {
        inWiki = true;
        i++;
        continue;
      }
      if (char === ']' && next === ']' && inWiki) {
        inWiki = false;
        i++;
        continue;
      }
      if (char === '[' && !inWiki) bracketDepth++;
      else if (char === ']' && !inWiki && bracketDepth > 0) bracketDepth--;

      if (char === '(') parenDepth++;
      else if (char === ')' && parenDepth > 0) parenDepth--;

      // Balises HTML <tag ...> ou <!-- ... --> uniquement
      if (char === '<') {
        const rest = lineText.slice(i);
        const tagMatch = rest.match(HTML_TAG_MATCH_RE);
        if (tagMatch) {
          i += tagMatch[0].length - 1;
          continue;
        }
      }
    }

    if (char === '|' && !inWiki && !inCode && bracketDepth === 0 && parenDepth === 0) {
      offsets.push(i);
    }
  }

  return offsets;
}

/**
 * Résout un WikiLink interne `[[cible|alias]]` / `[[cible#ancre]]` en cible navigable.
 * Ne gère pas les ancres locales pures `[[#titre]]` (filePath reste `#…`).
 */
export function resolveWikiLink(link: string): ResolvedWikiLink {
  const raw = link.trim();
  const pipeIdx = raw.indexOf('|');
  const targetPart = (pipeIdx >= 0 ? raw.slice(0, pipeIdx) : raw).trim();
  const alias = pipeIdx >= 0 ? raw.slice(pipeIdx + 1).trim() : '';

  const hashIdx = targetPart.indexOf('#');
  const pathPart = hashIdx >= 0 ? targetPart.slice(0, hashIdx).trim() : targetPart;
  const anchor = hashIdx >= 0 ? targetPart.slice(hashIdx + 1).trim() || null : null;

  let filePath = pathPart;
  if (filePath && !filePath.startsWith('#') && !/\.[a-z0-9]+$/i.test(filePath)) {
    filePath = `${filePath}.md`;
  }
  if (!filePath && anchor) {
    filePath = `#${anchor}`;
  }

  const displayName = alias || wikilinkDisplayLabel(targetPart);

  return {
    displayName,
    filePath,
    target: targetPart,
    anchor,
  };
}

/**
 * Libellé d'affichage d'un WikiLink sans alias.
 * Sépare chemin et ancre avant tout `split('/')` pour ne pas casser
 * les titres du type `[[note.md#9. Images (assets/)]]` (sinon seul `)` reste).
 */
export function wikilinkDisplayLabel(target: string): string {
  const trimmed = target.trim();
  const hashIdx = trimmed.indexOf('#');
  const pathPart = hashIdx >= 0 ? trimmed.slice(0, hashIdx) : trimmed;
  const anchorPart = hashIdx >= 0 ? trimmed.slice(hashIdx + 1).trim() : '';

  const base =
    pathPart
      .replace(/\.md$/i, '')
      .replace(/\\/g, '/')
      .split('/')
      .filter(Boolean)
      .pop() || pathPart.replace(/\.md$/i, '') || trimmed;

  if (!pathPart && anchorPart) return anchorPart;
  if (anchorPart) return `${base} › ${anchorPart}`;
  return base;
}

/**
 * Rendu simplifié d'éléments Markdown en HTML avec injection des attributs data-target.
 * B-059 : conserve une whitelist HTML sécurisée (kbd, u, mark, sub, sup, br, details).
 * Le code inline est protégé en premier pour ne jamais transformer `` `<kbd>` `` en balise vide.
 */
export function renderSimpleMarkdown(raw: string): string {
  const codeSlots: string[] = [];
  let s = raw.replace(/`([^`]+)`/g, (_, code: string) => {
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const idx = codeSlots.length;
    codeSlots.push(escaped);
    return `\u0000CODE${idx}\u0000`;
  });

  s = escapeThenAllowlist(s);

  s = s.replace(/!(p[1-3])\b/gi, (_, p) => {
    const pl = p.toLowerCase();
    const label = pl === 'p1' ? '!p1 urgent' : pl === 'p2' ? '!p2 haut' : '!p3 bas';
    return `<span class="knit-priority-badge knit-priority-${pl}">${label}</span>`;
  });

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/~~([^~]+)~~/g, '<span class="knit-preview-strikethrough">$1</span>');

  // WikiLink avec alias : [[cible|alias]]
  s = s.replace(/\[\[([^\]|\r\n]+)\|([^\]\r\n]+)\]\]/g, (_, target, alias) => {
    return `<span class="knit-preview-wikilink" data-target="${target.trim()}">${alias.trim()}</span>`;
  });

  // WikiLink simple : [[cible]] / [[cible#ancre]]
  s = s.replace(/\[\[([^\]\r\n]+)\]\]/g, (_, target) => {
    const cleanTarget = target.trim();
    const label = wikilinkDisplayLabel(cleanTarget);
    return `<span class="knit-preview-wikilink" data-target="${cleanTarget}">${label}</span>`;
  });

  // Liens Markdown classiques : [label](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="knit-preview-link" data-target="$2">$1</span>');

  // URLs web brutes
  s = s.replace(/(^|[^="'>])\b(https?:\/\/[^\s<)"']+)/g, '$1<span class="knit-preview-link" data-target="$2">$2</span>');

  // Tags & Mentions
  s = s.replace(/(?:^|\s)#([a-zA-Z0-9_\-/]+)/g, ' <span class="knit-preview-tag">#$1</span>');
  s = s.replace(/(?:^|\s)@([a-zA-Z0-9_\-.]+)/g, ' <span class="knit-preview-mention">@$1</span>');

  s = s.replace(/\u0000CODE(\d+)\u0000/g, (_, n) => {
    return `<code class="knit-preview-code">${codeSlots[Number(n)] || ''}</code>`;
  });

  return s;
}

/**
 * Rendu multi-lignes pour le corps d'un `<details>` (listes, tâches, tableaux GFM, paragraphes).
 */
export function renderBlockMarkdown(raw: string): string {
  if (!raw.trim()) return '';

  const lines = raw.split(/\r?\n/);
  const parts: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Tableau GFM
    if (/^\|.*\|$/.test(trimmed)) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        parts.push(renderGfmTableHtml(tableLines));
      }
      continue;
    }

    // Tâche
    const taskMatch = trimmed.match(/^[-*]\s+\[([ xX/\-?>!])\]\s+(.*)$/);
    if (taskMatch) {
      const status = taskMatch[1];
      const done = status.toLowerCase() === 'x';
      const cancelled = status === '-';
      const cls = done
        ? 'is-done'
        : cancelled
          ? 'is-cancelled'
          : status === '/'
            ? 'is-progress'
            : '';
      parts.push(
        `<div class="knit-html-details-task ${cls}"><span class="knit-html-details-check" aria-hidden="true"></span><span class="knit-html-details-task-text">${renderSimpleMarkdown(taskMatch[2])}</span></div>`
      );
      i++;
      continue;
    }

    // Liste à puces
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      parts.push(
        `<div class="knit-html-details-li">• ${renderSimpleMarkdown(bulletMatch[1])}</div>`
      );
      i++;
      continue;
    }

    // Liste numérotée
    const numMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numMatch) {
      parts.push(
        `<div class="knit-html-details-li">${renderSimpleMarkdown(trimmed)}</div>`
      );
      i++;
      continue;
    }

    parts.push(
      `<div class="knit-html-details-p">${renderSimpleMarkdown(trimmed)}</div>`
    );
    i++;
  }

  return parts.join('');
}

function renderGfmTableHtml(tableLines: string[]): string {
  const rows = tableLines.filter(
    (l) => !/^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(l)
  );
  if (rows.length === 0) return '';

  const headerCells = splitTableRow(rows[0]);
  const bodyRows = rows.slice(1);

  let html =
    '<table class="knit-html-details-table"><thead><tr>' +
    headerCells.map((c) => `<th>${renderSimpleMarkdown(c)}</th>`).join('') +
    '</tr></thead><tbody>';

  for (const row of bodyRows) {
    const cells = splitTableRow(row);
    html +=
      '<tr>' +
      cells.map((c) => `<td>${renderSimpleMarkdown(c)}</td>`).join('') +
      '</tr>';
  }
  html += '</tbody></table>';
  return html;
}

/**
 * Normalise un texte ou un titre de section en identifiant slug sécurisé (compatible GitHub/Obsidian)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function padCell(text: string, width: number, align: TableAlign): string {
  const t = text.trim();
  const pad = Math.max(0, width - t.length);
  if (align === 'right') return ' '.repeat(pad) + t;
  if (align === 'center') {
    const left = Math.floor(pad / 2);
    return ' '.repeat(left) + t + ' '.repeat(pad - left);
  }
  return t + ' '.repeat(pad);
}

function alignMarker(align: TableAlign, width: number): string {
  const w = Math.max(3, width);
  if (align === 'center') return `:${'-'.repeat(w - 2)}:`;
  if (align === 'right') return `${'-'.repeat(w - 1)}:`;
  return '-'.repeat(w);
}

/**
 * Réaligne / padde les colonnes d'un tableau GFM sans altérer le texte libre des cellules (B-047).
 */
export function formatTableColumns(tableText: string): string {
  const rawLines = tableText.split(/\r?\n/);
  const lines = rawLines.filter((l) => l.trim().length > 0);
  if (lines.length < 2) return tableText;

  const rows = lines.map((l) => splitTableRow(l));
  const colCount = Math.max(...rows.map((r) => r.length));
  if (colCount === 0) return tableText;

  const normalized = rows.map((r) => {
    const copy = [...r];
    while (copy.length < colCount) copy.push('');
    return copy.slice(0, colCount);
  });

  const alignments: TableAlign[] = normalized[1].map((cell) => {
    const d = cell.trim();
    const left = d.startsWith(':');
    const right = d.endsWith(':');
    if (left && right) return 'center';
    if (right) return 'right';
    return 'left';
  });

  const widths = Array.from({ length: colCount }, (_, i) => {
    let max = 3;
    for (let r = 0; r < normalized.length; r++) {
      if (r === 1) continue;
      max = Math.max(max, normalized[r][i].trim().length);
    }
    return max;
  });

  const out: string[] = [];
  for (let r = 0; r < normalized.length; r++) {
    if (r === 1) {
      const cells = alignments.map((a, i) => alignMarker(a, widths[i]));
      out.push(`| ${cells.join(' | ')} |`);
    } else {
      const cells = normalized[r].map((c, i) => padCell(c, widths[i], alignments[i]));
      out.push(`| ${cells.join(' | ')} |`);
    }
  }
  return out.join('\n');
}

/** Bornes d'un tableau GFM contenant la ligne `lineNumber` (1-based). */
export function findTableBounds(
  docLines: { number: number; text: string }[],
  lineNumber: number
): { start: number; end: number } | null {
  const line = docLines.find((l) => l.number === lineNumber);
  if (!line || !line.text.includes('|')) return null;

  let start = lineNumber;
  while (start > 1) {
    const prev = docLines.find((l) => l.number === start - 1);
    if (!prev || !prev.text.includes('|') || !prev.text.trim()) break;
    start--;
  }

  let end = lineNumber;
  const max = Math.max(...docLines.map((l) => l.number));
  while (end < max) {
    const next = docLines.find((l) => l.number === end + 1);
    if (!next || !next.text.includes('|') || !next.text.trim()) break;
    end++;
  }

  if (end - start < 1) return null;
  return { start, end };
}

export function mutateTableStructure(
  tableText: string,
  action:
    | { type: 'add-row' }
    | { type: 'add-column' }
    | { type: 'delete-row'; rowIndex: number }
    | { type: 'delete-column'; colIndex: number }
    | { type: 'set-align'; colIndex: number; align: TableAlign }
    | { type: 'delete-table' }
): string | null {
  if (action.type === 'delete-table') return '';

  const lines = tableText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const rows = lines.map((l) => splitTableRow(l));
  const colCount = Math.max(...rows.map((r) => r.length));
  const normalized = rows.map((r) => {
    const copy = [...r];
    while (copy.length < colCount) copy.push('');
    return copy.slice(0, colCount);
  });

  if (action.type === 'add-row') {
    normalized.push(Array(colCount).fill(''));
  } else if (action.type === 'add-column') {
    for (let i = 0; i < normalized.length; i++) {
      if (i === 1) normalized[i].push('---');
      else if (i === 0) normalized[i].push('Colonne');
      else normalized[i].push('');
    }
  } else if (action.type === 'delete-row') {
    if (action.rowIndex <= 1 || action.rowIndex >= normalized.length) return null;
    normalized.splice(action.rowIndex, 1);
  } else if (action.type === 'delete-column') {
    if (colCount <= 1 || action.colIndex < 0 || action.colIndex >= colCount) return null;
    for (const row of normalized) {
      row.splice(action.colIndex, 1);
    }
  } else if (action.type === 'set-align') {
    if (action.colIndex < 0 || action.colIndex >= colCount) return null;
    const markers: Record<TableAlign, string> = {
      left: '---',
      center: ':---:',
      right: '---:',
    };
    normalized[1][action.colIndex] = markers[action.align];
  }

  const rebuilt = normalized
    .map((cells) => `| ${cells.map((c) => c.trim()).join(' | ')} |`)
    .join('\n');
  return formatTableColumns(rebuilt);
}

/**
 * Détecte le type de document Doc-Driven à partir du chemin et du frontmatter.
 */
export function detectDocType(content: string, path: string): DocType {
  // Médias coffre (svg/png/…) : détection par extension, avant les heuristiques de chemin
  if (isMediaFilePath(path)) {
    return 'image';
  }

  // 1. Analyse prioritaire du frontmatter YAML si le contenu est disponible
  if (content) {
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      const yaml = fmMatch[1].toLowerCase();
      for (const line of yaml.split('\n')) {
        const parts = line.split(':');
        if (parts.length >= 2 && parts[0].trim() === 'type') {
          const val = parts.slice(1).join(':').trim();
          if (val.includes('kanban') || val.includes('board')) return 'kanban';
          if (val.includes('table') || val.includes('tableau')) return 'table';
          if (val.includes('calendar') || val.includes('agenda')) return 'calendar';
          if (val.includes('canvas')) return 'canvas';
          if (val.includes('slides') || val.includes('slide')) return 'slides';
          if (val.includes('gallery') || val.includes('galerie')) return 'gallery';
          if (val.includes('note')) return 'note';
        }
      }
      if (yaml.includes('kanban: true') || yaml.includes('kanban-plugin:')) {
        return 'kanban';
      }
    }
  }

  // 2. Heuristiques sur le nom du fichier ou extensions dédiées
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('kanban') || lowerPath.endsWith('.kanban.md')) {
    return 'kanban';
  }
  if (lowerPath.includes('tableau') || lowerPath.includes('table') || lowerPath.endsWith('.table.md')) {
    return 'table';
  }
  if (lowerPath.includes('calendar') || lowerPath.includes('agenda') || lowerPath.endsWith('.calendar.md')) {
    return 'calendar';
  }
  if (lowerPath.includes('canvas') || lowerPath.endsWith('.canvas.md')) {
    return 'canvas';
  }
  if (
    lowerPath.includes('slides') ||
    lowerPath.includes('diaporama') ||
    lowerPath.includes('slide') ||
    lowerPath.endsWith('.slides.md')
  ) {
    return 'slides';
  }
  if (lowerPath.includes('gallery') || lowerPath.includes('galerie') || lowerPath.endsWith('.gallery.md')) {
    return 'gallery';
  }

  return 'note';
}

/**
 * Résout le type de document effectif pour l'arborescence et l'interface :
 * 1. Média coffre (extension image) -> 'image'
 * 2. Onglet actif / ouvert dans tabStore -> docType temps réel
 * 3. Type indexé en mémoire par l'index Frontmatter
 * 4. Heuristiques sur le nom du fichier
 */
export function resolveFileDocType(
  relPath: string,
  openDocType?: DocType,
  indexedDocType?: DocType | string
): DocType {
  if (isMediaFilePath(relPath)) {
    return 'image';
  }
  if (openDocType) {
    return openDocType;
  }
  if (indexedDocType && indexedDocType !== 'note') {
    return detectDocType(`---\ntype: ${indexedDocType}\n---\n`, relPath);
  }
  return detectDocType('', relPath);
}


