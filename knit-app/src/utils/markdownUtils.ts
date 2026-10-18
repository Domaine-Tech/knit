import type { DocType } from '../types';

/**
 * Utilitaires universels de traitement Markdown pour Knit
 * - Découpage précis des cellules de tableau Markdown (en préservant les | dans [[...|...]], `...` et \|)
 * - Rendu formaté immersif pour les tableaux et infobulles de prévisualisation (Live Preview)
 */

/**
 * Découpe une ligne de tableau Markdown GFM en cellules distinctes,
 * en ignorant rigoureusement les barres verticales (|) situées à l'intérieur :
 * - De WikiLinks ([[cible|alias]])
 * - De blocs de code inline (`code | text`)
 * - De liens Markdown classiques ou crochets ([texte | description](url))
 * - De paramètres d'URL entre parenthèses ((https://.../path?a=1|2))
 * - De balises HTML inline (<kbd>|</kbd>)
 * - De barres verticales échappées (\\|)
 */
export function splitTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1);
  if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) trimmed = trimmed.slice(0, -1);

  const cells: string[] = [];
  let current = '';
  let inWiki = false;
  let inCode = false;
  let bracketDepth = 0;
  let parenDepth = 0;
  let inHtml = false;

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

      // Balises HTML < ... >
      if (char === '<') {
        inHtml = true;
      } else if (char === '>') {
        inHtml = false;
      }
    }

    // Séparateur de cellule de tableau (|) uniquement si hors de tout bloc protégé
    if (char === '|' && !inWiki && !inCode && bracketDepth === 0 && parenDepth === 0 && !inHtml) {
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
  let inHtml = false;

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

      if (char === '<') inHtml = true;
      else if (char === '>') inHtml = false;
    }

    if (char === '|' && !inWiki && !inCode && bracketDepth === 0 && parenDepth === 0 && !inHtml) {
      offsets.push(i);
    }
  }

  return offsets;
}

/**
 * Rendu simplifié d'éléments Markdown en HTML avec injection des attributs data-target
 */
export function renderSimpleMarkdown(raw: string): string {
  let s = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  s = s.replace(/!(p[1-3])\b/gi, (_, p) => {
    const pl = p.toLowerCase();
    const label = pl === 'p1' ? '!p1 urgent' : pl === 'p2' ? '!p2 haut' : '!p3 bas';
    return `<span class="knit-priority-badge knit-priority-${pl}">${label}</span>`;
  });

  s = s.replace(/`([^`]+)`/g, '<code class="knit-preview-code">$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  s = s.replace(/~~([^~]+)~~/g, '<span class="knit-preview-strikethrough">$1</span>');

  // WikiLink avec alias : [[cible|alias]]
  s = s.replace(/\[\[([^\]|\r\n]+)\|([^\]\r\n]+)\]\]/g, (_, target, alias) => {
    return `<span class="knit-preview-wikilink" data-target="${target.trim()}">${alias.trim()}</span>`;
  });

  // WikiLink simple : [[cible]]
  s = s.replace(/\[\[([^\]\r\n]+)\]\]/g, (_, target) => {
    const cleanTarget = target.trim();
    const clean = cleanTarget.replace(/\.md$/, '').split('/').pop() || cleanTarget;
    return `<span class="knit-preview-wikilink" data-target="${cleanTarget}">${clean}</span>`;
  });

  // Liens Markdown classiques : [label](url)
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="knit-preview-link" data-target="$2">$1</span>');

  // URLs web brutes
  s = s.replace(/(^|[^="'>])\b(https?:\/\/[^\s<)"']+)/g, '$1<span class="knit-preview-link" data-target="$2">$2</span>');

  // Tags & Mentions
  s = s.replace(/(?:^|\s)#([a-zA-Z0-9_\-/]+)/g, ' <span class="knit-preview-tag">#$1</span>');
  s = s.replace(/(?:^|\s)@([a-zA-Z0-9_\-.]+)/g, ' <span class="knit-preview-mention">@$1</span>');

  return s;
}

/**
 * Formate un extrait Markdown complet en HTML riche pour l'infobulle de survol (Hover Preview Tooltip),
 * en reproduisant le rendu du Live Preview au lieu d'afficher du Markdown brut.
 */
export function renderRichMarkdownPreview(raw: string): string {
  if (!raw) return '<div style="color:var(--knit-text-muted);font-style:italic;">(Note vide)</div>';

  let clean = raw;
  // Nettoyage de l'en-tête frontmatter YAML si présent
  if (clean.startsWith('---')) {
    const endFm = clean.indexOf('\n---', 3);
    if (endFm !== -1) {
      clean = clean.slice(endFm + 4).trim();
    }
  }

  const lines = clean.split(/\r?\n/).slice(0, 7);
  const htmlParts: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Titres Markdown
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const fontSize = level === 1 ? '13px' : '12px';
      htmlParts.push(
        `<div style="font-weight:700;font-size:${fontSize};color:var(--knit-text);margin:3px 0;display:flex;align-items:center;gap:6px;">
          <span style="color:var(--knit-primary);opacity:0.8;">#</span>
          <span>${renderSimpleMarkdown(headingMatch[2])}</span>
        </div>`
      );
      continue;
    }

    // Listes de tâches (- [ ], - [x], etc.)
    const taskMatch = trimmed.match(/^-\s*\[([ xX/\-?>!])\]\s*(.*)$/);
    if (taskMatch) {
      const isDone = taskMatch[1].toLowerCase() === 'x';
      const checkSvg = isDone
        ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`
        : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"></rect></svg>`;
      const style = isDone ? 'text-decoration:line-through;opacity:0.65;' : '';
      htmlParts.push(
        `<div style="display:flex;align-items:center;gap:6px;margin:2px 0;font-size:11.5px;${style}">
          <span style="display:inline-flex;align-items:center;color:var(--knit-text-muted);">${checkSvg}</span>
          <span>${renderSimpleMarkdown(taskMatch[2])}</span>
        </div>`
      );
      continue;
    }

    // Puces normales (- ou *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      htmlParts.push(
        `<div style="display:flex;align-items:baseline;gap:6px;margin:2px 0;font-size:11.5px;">
          <span style="color:var(--knit-primary);font-size:10px;">•</span>
          <span>${renderSimpleMarkdown(trimmed.slice(2))}</span>
        </div>`
      );
      continue;
    }

    // Paragraphe classique
    htmlParts.push(
      `<div style="margin:2px 0;font-size:11.5px;line-height:1.45;color:var(--knit-text-secondary);">${renderSimpleMarkdown(trimmed)}</div>`
    );
  }

  return htmlParts.join('') || '<div style="color:var(--knit-text-muted);font-style:italic;">(Note vide)</div>';
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

/**
 * Détecte le type de document ('note' | 'kanban' | 'table') à partir du contenu Markdown et du chemin de fichier
 */
export function detectDocType(content: string, path: string): DocType {
  const lowerPath = path.toLowerCase();
  if (lowerPath.includes('kanban') || lowerPath.endsWith('.kanban.md')) {
    return 'kanban';
  }
  if (lowerPath.includes('tableau') || lowerPath.includes('table') || lowerPath.endsWith('.table.md')) {
    return 'table';
  }
  if (!content) return 'note';

  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (fmMatch) {
    const yaml = fmMatch[1].toLowerCase();
    for (const line of yaml.split('\n')) {
      const parts = line.split(':');
      if (parts.length >= 2 && parts[0].trim() === 'type') {
        const val = parts.slice(1).join(':').trim();
        if (val.includes('kanban') || val.includes('board')) return 'kanban';
        if (val.includes('table') || val.includes('tableau')) return 'table';
        if (val.includes('note')) return 'note';
      }
    }
    if (yaml.includes('kanban: true') || yaml.includes('kanban-plugin:')) {
      return 'kanban';
    }
  }
  return 'note';
}

