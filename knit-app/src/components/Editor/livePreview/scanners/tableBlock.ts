import type { Text } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { TableCardWidget } from '../widgets/tableCardWidget';
import type { BlockScanResult, DecItem } from './types';

/**
 * Scanne un tableau GFM à la ligne courante.
 * Retourne handled=false si la ligne n'est pas une ligne de tableau.
 */
export function tryScanTableBlock(
  doc: Text,
  lineNum: number,
  selFrom: number,
  selTo: number
): BlockScanResult {
  const line = doc.line(lineNum);
  const lineText = line.text;
  const isTableLine = /^\s*\|.*\|\s*$/.test(lineText.trim());
  if (!isTableLine) {
    return { handled: false, nextLine: lineNum, lineDecorations: [], rangeDecorations: [] };
  }

  let tableEndLine = lineNum;
  while (tableEndLine <= doc.lines && /^\s*\|.*\|\s*$/.test(doc.line(tableEndLine).text.trim())) {
    tableEndLine++;
  }
  tableEndLine--;

  const tableStartPos = line.from;
  const tableEndPos = doc.line(tableEndLine).to;
  const isCursorInTable = selFrom <= tableEndPos && selTo >= tableStartPos;

  const lineDecorations: DecItem[] = [];
  const rangeDecorations: DecItem[] = [];

  if (!isCursorInTable && tableEndLine >= lineNum + 1) {
    const fullTableText = doc.sliceString(tableStartPos, tableEndPos);
    rangeDecorations.push({
      from: tableStartPos,
      to: tableEndPos,
      deco: Decoration.replace({
        widget: new TableCardWidget(fullTableText, tableStartPos, tableEndPos, lineNum),
        block: true,
      }),
    });
  } else {
    for (let l = lineNum; l <= tableEndLine; l++) {
      const rowLine = doc.line(l);
      const isTableDelimiter =
        /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(rowLine.text.trim());
      if (isTableDelimiter) {
        lineDecorations.push({
          from: rowLine.from,
          to: rowLine.from,
          deco: Decoration.line({ class: 'knit-table-delimiter-line' }),
          isLine: true,
        });
      } else {
        const isHeader = l === lineNum;
        lineDecorations.push({
          from: rowLine.from,
          to: rowLine.from,
          deco: Decoration.line({
            class: isHeader ? 'knit-table-header-line' : 'knit-table-row-line',
          }),
          isLine: true,
        });
      }
    }
  }

  return {
    handled: true,
    nextLine: tableEndLine + 1,
    lineDecorations,
    rangeDecorations,
  };
}
