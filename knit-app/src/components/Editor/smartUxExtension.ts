import { EditorView, keymap } from '@codemirror/view';
import {
  splitTableRow,
  findTableDelimiterOffsets,
  formatTableColumns,
} from '../../utils';

function realignTableContainingLine(view: EditorView, lineNumber: number): void {
  let startLine = lineNumber;
  while (startLine > 1) {
    const prev = view.state.doc.line(startLine - 1);
    if (!prev.text.includes('|') || !prev.text.trim()) break;
    startLine--;
  }
  let endLine = lineNumber;
  while (endLine < view.state.doc.lines) {
    const next = view.state.doc.line(endLine + 1);
    if (!next.text.includes('|') || !next.text.trim()) break;
    endLine++;
  }
  if (endLine - startLine < 1) return;

  const from = view.state.doc.line(startLine).from;
  const to = view.state.doc.line(endLine).to;
  const current = view.state.doc.sliceString(from, to);
  const formatted = formatTableColumns(current);
  if (formatted !== current) {
    const sel = view.state.selection.main;
    view.dispatch({
      changes: { from, to, insert: formatted },
      selection: { anchor: Math.min(sel.from, from + formatted.length) },
    });
  }
}

/**
 * Auto-Wrap pour CodeMirror 6 :
 * Si du texte est sélectionné, taper [, *, `, ~, ", ' entoure la sélection
 * sans l'écraser (US B-053).
 */
export function createAutoWrapKeymap() {
  const wrapPairs: Record<string, [string, string]> = {
    '[': ['[[', ']]'],
    '*': ['*', '*'],
    '`': ['`', '`'],
    '~': ['~~', '~~'],
    '"': ['"', '"'],
    "'": ["'", "'"],
  };

  return keymap.of(
    Object.entries(wrapPairs).map(([key, [open, close]]) => ({
      key,
      run: (view: EditorView) => {
        const sel = view.state.selection.main;
        if (sel.empty) {
          return false; // Comportement normal si pas de sélection
        }

        const selectedText = view.state.sliceDoc(sel.from, sel.to);
        const wrapped = `${open}${selectedText}${close}`;

        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: wrapped },
          selection: { anchor: sel.from + open.length, head: sel.from + open.length + selectedText.length },
        });

        return true;
      },
    }))
  );
}

/**
 * Navigation et formatage dynamique de tableaux Markdown (Tab / Shift-Tab / Entrée) :
 * - Tab : saute à la cellule suivante (en ignorant les | de WikiLinks et de code)
 * - Shift-Tab : saute à la cellule précédente
 * - Entrée : crée immédiatement la ligne suivante alignée avec le même nombre de colonnes
 */
export function createTableNavKeymap() {
  return keymap.of([
    {
      key: 'Tab',
      run: (view: EditorView) => {
        const sel = view.state.selection.main;
        const line = view.state.doc.lineAt(sel.from);
        const lineText = line.text;

        // Est-ce une ligne de tableau Markdown ?
        if (lineText.includes('|')) {
          const colIndex = sel.from - line.from;
          const delimiters = findTableDelimiterOffsets(lineText);
          const nextPipe = delimiters.find((idx) => idx > colIndex);

          if (nextPipe !== undefined && nextPipe < lineText.length) {
            // Se déplacer juste après le vrai séparateur de colonne |
            const target = line.from + nextPipe + 1;
            const skipSpace = lineText.charAt(nextPipe + 1) === ' ' ? 1 : 0;
            view.dispatch({
              selection: { anchor: Math.min(target + skipSpace, line.to) },
            });
            return true;
          } else if (line.number < view.state.doc.lines) {
            // Sauter à la première cellule de la ligne suivante si elle fait partie du tableau
            const nextDocLine = view.state.doc.line(line.number + 1);
            if (nextDocLine.text.trim().startsWith('|')) {
              const nextDelims = findTableDelimiterOffsets(nextDocLine.text);
              const firstPipe = nextDelims.length > 0 ? nextDelims[0] : 0;
              const skip = nextDocLine.text.charAt(firstPipe + 1) === ' ' ? 1 : 0;
              view.dispatch({
                selection: { anchor: Math.min(nextDocLine.from + firstPipe + 1 + skip, nextDocLine.to) },
              });
              return true;
            }
          }
        }
        return false;
      },
    },
    {
      key: 'Shift-Tab',
      run: (view: EditorView) => {
        const sel = view.state.selection.main;
        const line = view.state.doc.lineAt(sel.from);
        const lineText = line.text;

        if (lineText.includes('|')) {
          const colIndex = sel.from - line.from;
          const delimiters = findTableDelimiterOffsets(lineText);
          // Chercher le séparateur précédent
          const prevDelims = delimiters.filter((idx) => idx < colIndex - 1);
          if (prevDelims.length > 0) {
            const prevPipe = prevDelims[prevDelims.length - 1];
            const target = line.from + prevPipe + 1;
            const skipSpace = lineText.charAt(prevPipe + 1) === ' ' ? 1 : 0;
            view.dispatch({
              selection: { anchor: Math.min(target + skipSpace, line.to) },
            });
            return true;
          }
        }
        return false;
      },
    },
    {
      key: 'Enter',
      run: (view: EditorView) => {
        const sel = view.state.selection.main;
        const line = view.state.doc.lineAt(sel.from);
        const lineText = line.text;

        // Si la ligne courante est une ligne de tableau
        if (lineText.trim().startsWith('|') && lineText.trim().endsWith('|')) {
          const colCount = splitTableRow(lineText).length;
          if (colCount > 0) {
            let nextRow = '\n|';
            for (let i = 0; i < colCount; i++) {
              nextRow += '  |';
            }
            view.dispatch({
              changes: { from: line.to, insert: nextRow },
              selection: { anchor: line.to + 3 },
            });
            // Réalignement après insertion (ligne suivante = line.number + 1)
            realignTableContainingLine(view, line.number + 1);
            return true;
          }
        }
        return false;
      },
    },
  ]);
}
