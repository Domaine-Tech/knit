import type { Text } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { CodeBlockCardWidget } from '../widgets/codeBlockWidget';
import { KnitTocWidget } from '../widgets/knitTocWidget';
import { KnitFilesWidget } from '../widgets/knitFilesWidget';
import { KnitQueryWidget } from '../widgets/knitQueryWidget';
import { KnitTasksWidget } from '../widgets/knitTasksWidget';
import { isKnitDynamicLang } from '../../../../utils/dynamicBlockUtils';
import { vaultStore } from '../../../../stores/vaultStore';
import type { BlockScanResult, DecItem } from './types';

/**
 * Scanne un fence ``` à la ligne courante (mermaid skip, code, knit-*).
 */
export function tryScanFenceBlock(
  doc: Text,
  lineNum: number,
  selFrom: number,
  selTo: number
): BlockScanResult {
  const line = doc.line(lineNum);
  const lineText = line.text;
  const codeFenceMatch = lineText.match(/^```([a-zA-Z0-9_+#.-]*)\s*$/);
  if (!codeFenceMatch) {
    return { handled: false, nextLine: lineNum, lineDecorations: [], rangeDecorations: [] };
  }

  const lang = codeFenceMatch[1].trim();
  const langLower = lang.toLowerCase();

  let endLine = lineNum + 1;
  while (endLine <= doc.lines && !doc.line(endLine).text.trim().startsWith('```')) {
    endLine++;
  }

  // ```mermaid : délégué à mermaidExtension — sauter tout le bloc
  if (langLower === 'mermaid') {
    return {
      handled: true,
      nextLine: endLine <= doc.lines ? endLine + 1 : endLine,
      lineDecorations: [],
      rangeDecorations: [],
    };
  }

  if (endLine > doc.lines) {
    return { handled: false, nextLine: lineNum, lineDecorations: [], rangeDecorations: [] };
  }

  const codeLines: string[] = [];
  for (let l = lineNum + 1; l < endLine; l++) {
    codeLines.push(doc.line(l).text);
  }
  const fullCode = codeLines.join('\n');

  const codeStartPos = line.from;
  const codeEndPos = doc.line(endLine).to;
  const isCursorInCodeBlock = selFrom <= codeEndPos && selTo >= codeStartPos;

  const lineDecorations: DecItem[] = [];
  const rangeDecorations: DecItem[] = [];

  if (!isCursorInCodeBlock) {
    const indexVersion = vaultStore.getFrontmatterIndexVersion();
    let widget;
    if (isKnitDynamicLang(langLower)) {
      if (langLower === 'knit-toc') {
        widget = new KnitTocWidget(fullCode, codeStartPos, codeEndPos, doc.toString());
      } else if (langLower === 'knit-files') {
        widget = new KnitFilesWidget(fullCode, codeStartPos, codeEndPos, indexVersion);
      } else if (langLower === 'knit-query') {
        widget = new KnitQueryWidget(fullCode, codeStartPos, codeEndPos, indexVersion);
      } else {
        widget = new KnitTasksWidget(fullCode, codeStartPos, codeEndPos, indexVersion);
      }
    } else {
      widget = new CodeBlockCardWidget(lang, fullCode, codeStartPos, codeEndPos);
    }

    rangeDecorations.push({
      from: codeStartPos,
      to: codeEndPos,
      deco: Decoration.replace({
        widget,
        block: true,
      }),
    });
  } else {
    lineDecorations.push({
      from: line.from,
      to: line.from,
      deco: Decoration.line({ class: 'knit-code-line knit-code-header-line' }),
      isLine: true,
    });

    for (let l = lineNum + 1; l < endLine; l++) {
      const codeLine = doc.line(l);
      lineDecorations.push({
        from: codeLine.from,
        to: codeLine.from,
        deco: Decoration.line({ class: 'knit-code-line knit-code-body-line' }),
        isLine: true,
      });
    }

    const closeLine = doc.line(endLine);
    lineDecorations.push({
      from: closeLine.from,
      to: closeLine.from,
      deco: Decoration.line({ class: 'knit-code-line knit-code-footer-line' }),
      isLine: true,
    });
  }

  return {
    handled: true,
    nextLine: endLine + 1,
    lineDecorations,
    rangeDecorations,
  };
}
