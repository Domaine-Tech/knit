/**
 * Utilitaires partagés pour les blocs dynamiques knit-* (Live Preview)
 */

import type { EditorView } from '@codemirror/view';
import type { IconName } from '../types';

export const KNIT_DYNAMIC_LANGS = new Set([
  'knit-toc',
  'knit-files',
  'knit-query',
  'knit-tasks',
]);

export function isKnitDynamicLang(lang: string): boolean {
  return KNIT_DYNAMIC_LANGS.has(lang.trim().toLowerCase());
}

/** Icône Duotone (SVG pur) selon le type de document Frontmatter. */
export function docTypeToIconName(docType: string): IconName {
  const t = (docType || 'note').toLowerCase();
  if (t === 'kanban') return 'kanban';
  if (t === 'table') return 'table';
  if (t === 'image') return 'image';
  return 'file-markdown';
}

/**
 * Crée un SVG Duotone inline (widgets CodeMirror hors React).
 */
export function createDocTypeIconSvg(docType: string, size = 14): SVGSVGElement {
  const name = docTypeToIconName(docType);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 512 512');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('class', 'knit-icon knit-files-icon');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.flexShrink = '0';
  svg.style.color = 'var(--knit-primary)';

  const primary = 'currentColor';
  const secondary = 'var(--knit-primary)';

  const appendPath = (
    d: string,
    attrs: Record<string, string>
  ): void => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', d);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.appendChild(el);
  };

  const appendRect = (attrs: Record<string, string>): void => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.appendChild(el);
  };

  const appendLine = (attrs: Record<string, string>): void => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.appendChild(el);
  };

  if (name === 'kanban') {
    for (const [x, h] of [
      ['56', '368'],
      ['204', '264'],
      ['352', '320'],
    ] as const) {
      appendRect({
        x,
        y: '72',
        width: '104',
        height: h,
        rx: '16',
        fill: secondary,
        'fill-opacity': '0.2',
        stroke: primary,
        'stroke-width': '28',
      });
    }
  } else if (name === 'table') {
    appendRect({
      x: '56',
      y: '80',
      width: '400',
      height: '352',
      rx: '16',
      fill: secondary,
      'fill-opacity': '0.15',
      stroke: primary,
      'stroke-width': '28',
    });
    appendLine({
      x1: '56',
      y1: '184',
      x2: '456',
      y2: '184',
      stroke: primary,
      'stroke-width': '28',
    });
    appendLine({
      x1: '220',
      y1: '80',
      x2: '220',
      y2: '432',
      stroke: primary,
      'stroke-width': '24',
    });
  } else if (name === 'image') {
    appendRect({
      x: '64',
      y: '96',
      width: '384',
      height: '320',
      rx: '40',
      fill: secondary,
      'fill-opacity': '0.18',
      stroke: primary,
      'stroke-width': '28',
      'stroke-linejoin': 'round',
    });
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '176');
    circle.setAttribute('cy', '208');
    circle.setAttribute('r', '36');
    circle.setAttribute('fill', secondary);
    circle.setAttribute('fill-opacity', '0.35');
    circle.setAttribute('stroke', primary);
    circle.setAttribute('stroke-width', '24');
    svg.appendChild(circle);
    appendPath('M96 352 L192 272 L256 320 L320 248 L416 352', {
      fill: 'none',
      stroke: primary,
      'stroke-width': '28',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    });
  } else {
    const fileD =
      'M96 48 L320 48 L416 144 L416 432 C416 449.7 401.7 464 384 464 L96 464 C78.3 464 64 449.7 64 432 L64 80 C64 62.3 78.3 48 96 48 Z';
    appendPath(fileD, {
      fill: secondary,
      'fill-opacity': '0.18',
    });
    appendPath(fileD, {
      fill: 'none',
      stroke: primary,
      'stroke-width': '28',
      'stroke-linejoin': 'round',
    });
    appendPath('M320 48 L320 144 L416 144', {
      fill: 'none',
      stroke: primary,
      'stroke-width': '28',
      'stroke-linejoin': 'round',
    });
  }

  return svg;
}

export function focusBlockSource(view: EditorView, from: number): void {
  view.dispatch({
    selection: { anchor: from + 1 },
    scrollIntoView: true,
  });
  view.focus();
}

export function formatRelativeMtime(mtime: number): string {
  const diff = Date.now() - mtime;
  if (diff < 60_000) return 'à l\'instant';
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `il y a ${Math.floor(diff / 3_600_000)} h`;
  if (diff < 7 * 86_400_000) return `il y a ${Math.floor(diff / 86_400_000)} j`;
  return new Date(mtime).toLocaleDateString('fr-FR');
}

export function createDynamicBlockShell(
  lang: string,
  from: number,
  view: EditorView
): HTMLElement {
  const container = document.createElement('div');
  container.className = `knit-dynamic-block knit-dynamic-${lang}`;
  container.setAttribute('data-tooltip', 'Cliquer pour éditer le bloc source');

  const badge = document.createElement('button');
  badge.type = 'button';
  badge.className = 'knit-dynamic-badge knit-btn';
  badge.textContent = lang;
  badge.addEventListener('mousedown', (e) => {
    if (e.button === 1) e.preventDefault();
  });
  badge.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    focusBlockSource(view, from);
  });

  container.appendChild(badge);
  return container;
}

/**
 * Extrait les titres Markdown du document (hors frontmatter et fences).
 */
export function extractHeadingsFromDoc(
  text: string,
  maxDepth = 6
): Array<{ level: number; title: string; lineIndex: number }> {
  const lines = text.split(/\r?\n/);
  const headings: Array<{ level: number; title: string; lineIndex: number }> = [];
  let inFm = false;
  let fmDone = false;
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!fmDone && i === 0 && trimmed === '---') {
      inFm = true;
      continue;
    }
    if (inFm) {
      if (trimmed === '---') {
        inFm = false;
        fmDone = true;
      }
      continue;
    }

    if (trimmed.startsWith('```')) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const m = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (m) {
      const level = m[1].length;
      if (level <= maxDepth) {
        headings.push({ level, title: m[2].trim(), lineIndex: i });
      }
    }
  }
  return headings;
}

/** Alias vers `slugify` (markdownUtils) — unicité des ancres. */
export { slugify as slugifyHeading } from './markdownUtils';
