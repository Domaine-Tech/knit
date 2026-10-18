import type { Text } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { HtmlDetailsWidget } from '../widgets/htmlDetailsWidget';
import type { BlockScanResult, DecItem } from './types';

const DETAILS_OPEN_RE = /^\s*<details(\s[^>]*)?>\s*$/i;
const DETAILS_SINGLE_RE = /^\s*<details(\s[^>]*)?>[\s\S]*<\/details>\s*$/i;
const DETAILS_CLOSE_RE = /^\s*<\/details>\s*$/i;

/**
 * Scanne un bloc `<details>…</details>` (mono ou multi-ligne) à la ligne courante.
 */
export function tryScanDetailsBlock(
  doc: Text,
  lineNum: number,
  selFrom: number,
  selTo: number
): BlockScanResult {
  const line = doc.line(lineNum);
  const lineText = line.text;
  const openMatch = lineText.match(DETAILS_OPEN_RE) || lineText.match(DETAILS_SINGLE_RE);
  if (!openMatch) {
    return { handled: false, nextLine: lineNum, lineDecorations: [], rangeDecorations: [] };
  }

  const attrs = openMatch[1] || '';
  const isOpen = /\bopen\b/i.test(attrs);

  let endLine = lineNum;
  const isSingleLine = DETAILS_SINGLE_RE.test(lineText.trim());
  if (!isSingleLine) {
    endLine = lineNum + 1;
    while (endLine <= doc.lines && !DETAILS_CLOSE_RE.test(doc.line(endLine).text)) {
      endLine++;
    }
    if (endLine > doc.lines) {
      // Bloc non fermé : ne pas consommer
      return { handled: false, nextLine: lineNum, lineDecorations: [], rangeDecorations: [] };
    }
  }

  const startPos = line.from;
  const endPos = doc.line(endLine).to;
  const isCursorInBlock = selFrom <= endPos && selTo >= startPos;

  const lineDecorations: DecItem[] = [];
  const rangeDecorations: DecItem[] = [];

  if (!isCursorInBlock) {
    const raw = doc.sliceString(startPos, endPos);
    rangeDecorations.push({
      from: startPos,
      to: endPos,
      deco: Decoration.replace({
        widget: new HtmlDetailsWidget(raw, startPos, endPos, isOpen),
        block: true,
      }),
    });
  } else {
    for (let l = lineNum; l <= endLine; l++) {
      const row = doc.line(l);
      lineDecorations.push({
        from: row.from,
        to: row.from,
        deco: Decoration.line({ class: 'knit-html-details-source-line' }),
        isLine: true,
      });
    }
  }

  return {
    handled: true,
    nextLine: endLine + 1,
    lineDecorations,
    rangeDecorations,
  };
}
