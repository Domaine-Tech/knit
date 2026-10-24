import type { Text } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import type { DecItem, FrontmatterRange, TaskProgress } from '../../../../types';
import { FrontmatterPropertiesWidget } from '../widgets/frontmatterWidget';
import { ProgressBarWidget } from '../widgets/progressBarWidget';

export type { FrontmatterRange, TaskProgress };

/** Détecte la plage de lignes du frontmatter YAML (1-indexé CodeMirror). */
export function detectFrontmatterRange(doc: Text): FrontmatterRange {
  let fmStart = -1;
  let fmEnd = -1;
  if (doc.lines >= 2 && doc.line(1).text.trim() === '---') {
    fmStart = 1;
    for (let i = 2; i <= doc.lines; i++) {
      if (doc.line(i).text.trim() === '---') {
        fmEnd = i;
        break;
      }
    }
  }
  return { fmStart, fmEnd };
}

/** Compte les tâches et localise le premier H1 (hors frontmatter). */
export function computeTaskProgress(
  doc: Text,
  fmStart: number,
  fmEnd: number
): TaskProgress {
  let totalTasks = 0;
  let completedTasks = 0;
  let firstH1LineEnd = -1;

  for (let i = 1; i <= doc.lines; i++) {
    if (fmStart !== -1 && i >= fmStart && i <= fmEnd) continue;

    const line = doc.line(i);
    const text = line.text;
    const trimmed = text.trim();

    if (firstH1LineEnd === -1 && trimmed.startsWith('# ') && !trimmed.startsWith('## ')) {
      firstH1LineEnd = line.to;
    }

    const taskMatch = text.match(/^(\s*-\s*\[)([ xX/\-?>!])(\])\s*/);
    if (taskMatch) {
      totalTasks++;
      const st = taskMatch[2];
      if (st === 'x' || st === 'X') completedTasks++;
    }
  }

  return { totalTasks, completedTasks, firstH1LineEnd };
}

/** Widgets progress bar sous H1 + carte propriétés frontmatter. */
export function scanFrontmatterDecorations(
  doc: Text,
  selFrom: number,
  selTo: number,
  fmStart: number,
  fmEnd: number,
  progress: TaskProgress
): DecItem[] {
  const rangeDecorations: DecItem[] = [];

  if (progress.totalTasks > 0 && progress.firstH1LineEnd !== -1) {
    rangeDecorations.push({
      from: progress.firstH1LineEnd,
      to: progress.firstH1LineEnd,
      deco: Decoration.widget({
        widget: new ProgressBarWidget(progress.completedTasks, progress.totalTasks),
        side: 1,
        block: true,
      }),
    });
  }

  if (fmStart !== -1 && fmEnd !== -1) {
    const fmLineStart = doc.line(fmStart);
    const fmLineEnd = doc.line(fmEnd);
    const isCursorInFm = selFrom <= fmLineEnd.to && selTo >= fmLineStart.from;

    if (!isCursorInFm) {
      const fmText = doc.sliceString(fmLineStart.from, fmLineEnd.to);
      rangeDecorations.push({
        from: fmLineStart.from,
        to: fmLineEnd.to,
        deco: Decoration.replace({
          widget: new FrontmatterPropertiesWidget(fmText, fmLineStart.from, fmLineEnd.to),
          block: true,
        }),
      });
    }
  }

  return rangeDecorations;
}
