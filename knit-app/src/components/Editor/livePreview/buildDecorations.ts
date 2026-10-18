import { RangeSetBuilder, type EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import type { DecItem } from './scanners/types';
import {
  detectFrontmatterRange,
  computeTaskProgress,
  scanFrontmatterDecorations,
} from './scanners/frontmatter';
import { tryScanDetailsBlock } from './scanners/detailsBlock';
import { tryScanTableBlock } from './scanners/tableBlock';
import { tryScanFenceBlock } from './scanners/fenceBlock';
import { scanInlineLine } from './scanners/inlineMarkup';
import { isLivePreviewVisualLocked } from './visualLock';

/**
 * Extension Obsidian-style Live Preview pour CodeMirror 6.
 * Orchestrateur mince : délègue aux scanners (frontmatter, table, fence, inline).
 */
export function buildLivePreviewDecorations(state: EditorState): DecorationSet {
  try {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = state.doc;
    const sel = state.selection.main;
    // Mode lecture (Hover Preview + Zen) : ignorer le curseur → widgets toujours visibles
    const visualLock = isLivePreviewVisualLocked(state);
    const selFrom = visualLock ? -1 : sel.from;
    const selTo = visualLock ? -1 : sel.to;

    const { fmStart, fmEnd } = detectFrontmatterRange(doc);
    const progress = computeTaskProgress(doc, fmStart, fmEnd);

    const lineDecorations: DecItem[] = [];
    const rangeDecorations: DecItem[] = [
      ...scanFrontmatterDecorations(doc, selFrom, selTo, fmStart, fmEnd, progress),
    ];

    let lineNum = 1;
    let activeCalloutType: string | null = null;

    while (lineNum <= doc.lines) {
      if (fmStart !== -1 && lineNum >= fmStart && lineNum <= fmEnd) {
        lineNum++;
        continue;
      }

      const line = doc.line(lineNum);
      const lineText = line.text;
      const isCursorOnLine = !visualLock && sel.from <= line.to && sel.to >= line.from;

      // details avant table/fence : un tableau peut vivre *dans* un <details>
      const detailsResult = tryScanDetailsBlock(doc, lineNum, selFrom, selTo);
      if (detailsResult.handled) {
        lineDecorations.push(...detailsResult.lineDecorations);
        rangeDecorations.push(...detailsResult.rangeDecorations);
        lineNum = detailsResult.nextLine;
        continue;
      }

      const tableResult = tryScanTableBlock(doc, lineNum, selFrom, selTo);
      if (tableResult.handled) {
        lineDecorations.push(...tableResult.lineDecorations);
        rangeDecorations.push(...tableResult.rangeDecorations);
        lineNum = tableResult.nextLine;
        continue;
      }

      const fenceResult = tryScanFenceBlock(doc, lineNum, selFrom, selTo);
      if (fenceResult.handled) {
        lineDecorations.push(...fenceResult.lineDecorations);
        rangeDecorations.push(...fenceResult.rangeDecorations);
        lineNum = fenceResult.nextLine;
        continue;
      }

      const inlineResult = scanInlineLine(
        doc,
        lineNum,
        line,
        lineText,
        isCursorOnLine,
        activeCalloutType
      );
      lineDecorations.push(...inlineResult.lineDecorations);
      rangeDecorations.push(...inlineResult.rangeDecorations);
      activeCalloutType = inlineResult.activeCalloutType;
      lineNum++;
    }

    const allDecorations = [...lineDecorations, ...rangeDecorations];
    allDecorations.sort((a, b) => {
      if (a.from !== b.from) return a.from - b.from;
      if (a.isLine && !b.isLine) return -1;
      if (!a.isLine && b.isLine) return 1;
      return a.to - b.to;
    });

    let lastFrom = -1;
    let lastTo = -1;

    for (const item of allDecorations) {
      if (item.from > item.to) continue;
      if (item.from < lastFrom) continue;
      if (item.from === lastFrom && item.to < lastTo) continue;

      try {
        builder.add(item.from, item.to, item.deco);
        lastFrom = item.from;
        lastTo = item.to;
      } catch {
        // Protection anti-collision
      }
    }

    return builder.finish();
  } catch (err) {
    console.warn('Erreur construction décorations LivePreview :', err);
    return Decoration.none;
  }
}
