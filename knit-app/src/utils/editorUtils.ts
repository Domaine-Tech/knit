import type { EditorView } from '@codemirror/view';

/**
 * Utilitaires universels pour CodeMirror 6 et inspection du curseur
 */

/**
 * Détecte l'URL ou la cible de lien (WikiLink, lien Markdown, URL brute, chemin local) sous les coordonnées du curseur
 */
export function findLinkAtCoords(x: number, y: number, view: EditorView): string | null {
  const pos = view.posAtCoords({ x, y });
  if (pos === null) return null;

  const line = view.state.doc.lineAt(pos);
  const lineText = line.text;
  const col = pos - line.from;

  // 1. WikiLinks [[Note#Ancre|Alias]] ou [[Note]] ou [[#Ancre]]
  const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let wm: RegExpExecArray | null;
  while ((wm = wikiRegex.exec(lineText)) !== null) {
    const start = wm.index;
    const end = start + wm[0].length;
    if (col >= start && col <= end) {
      return wm[1].trim();
    }
  }

  // 2. Liens Markdown [Label](url-or-path)
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let ml: RegExpExecArray | null;
  while ((ml = mdLinkRegex.exec(lineText)) !== null) {
    const start = ml.index;
    const end = start + ml[0].length;
    if (col >= start && col <= end) {
      return ml[2].trim();
    }
  }

  // 3. URLs brutes ou file URLs (ex: https://..., http://..., file:///..., mailto:...)
  const rawUrlRegex = /(https?:\/\/[^\s<>)"]+|file:\/\/\/[^\s<>)"]+|mailto:[^\s<>)"]+)/g;
  let rm: RegExpExecArray | null;
  while ((rm = rawUrlRegex.exec(lineText)) !== null) {
    const start = rm.index;
    const end = start + rm[0].length;
    if (col >= start && col <= end) {
      return rm[1].trim();
    }
  }

  // 4. Chemins de fichiers ou dossiers (ex: C:\... ou D:/... ou ./...)
  const pathRegex = /(?:^|\s)((?:[a-zA-Z]:[\\/]|(?:\.\.?\/))[^\s<>)"]+)/g;
  let pm: RegExpExecArray | null;
  while ((pm = pathRegex.exec(lineText)) !== null) {
    const start = pm.index;
    const end = start + pm[0].length;
    if (col >= start && col <= end) {
      return pm[1].trim();
    }
  }

  return null;
}
