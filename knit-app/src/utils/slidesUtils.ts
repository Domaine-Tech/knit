/**
 * Découpage diaporama : séparateurs `---` hors frontmatter YAML (B-031c).
 */

import { escapeThenAllowlist } from './htmlSanitize';

export function stripFrontmatterBody(content: string): string {
  const fm = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return fm ? content.slice(fm[0].length) : content;
}

/** Rendu Markdown très léger pour une slide (titres, listes, gras/italique, HTML whitelist). */
export function renderSlideHtml(md: string): string {
  let html = escapeThenAllowlist(md);
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`);
  html = html.replace(/\n\n/g, '<br/><br/>');
  return html;
}

export function splitSlides(content: string): string[] {
  const body = stripFrontmatterBody(content);
  const slides = body.split(/\n---\n|\r\n---\r\n/).map((s) => s.trim());
  return slides.filter((s) => s.length > 0);
}

/** Nombre de séparateurs `---` hors frontmatter YAML. */
export function countSlideSeparators(content: string): number {
  const body = stripFrontmatterBody(content);
  return body.match(/\n---\n|\r\n---\r\n/g)?.length ?? 0;
}
