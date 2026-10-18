import type { Line, Text } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import type { TaskStatus } from '../../../../types';
import { HTML_INLINE_TAG_RE } from '../../../../utils/htmlSanitize';
import { CheckboxWidget } from '../widgets/checkboxWidget';
import { PriorityWidget } from '../widgets/priorityWidget';
import { DividerWidget } from '../widgets/dividerWidget';
import { ImageCardWidget } from '../widgets/imageCardWidget';
import { CalloutHeaderWidget } from '../widgets/calloutWidget';
import { HtmlInlineWidget } from '../widgets/htmlInlineWidget';
import { emptyReplace, type DecItem, type LineScanResult } from './types';

/**
 * Scanne une ligne hors blocs table/fence : callouts, HR, images, titres, tâches, inline.
 */
export function scanInlineLine(
  doc: Text,
  lineNum: number,
  line: Line,
  lineText: string,
  isCursorOnLine: boolean,
  activeCalloutType: string | null
): LineScanResult {
  const lineDecorations: DecItem[] = [];
  const rangeDecorations: DecItem[] = [];
  let calloutType = activeCalloutType;

  // C. Callouts GFM (> [!NOTE])
  const calloutHeaderMatch = lineText.match(/^\s*>\s*\[!([a-zA-Z]+)\]\s*(.*)$/);
  if (calloutHeaderMatch) {
    const rawType = calloutHeaderMatch[1].toLowerCase();
    let normalizedType = 'note';
    if (['note', 'info'].includes(rawType)) normalizedType = 'note';
    else if (['tip', 'hint'].includes(rawType)) normalizedType = 'tip';
    else if (['warning', 'warn', 'attention'].includes(rawType)) normalizedType = 'warning';
    else if (['important'].includes(rawType)) normalizedType = 'important';
    else if (['caution', 'danger', 'error'].includes(rawType)) normalizedType = 'caution';
    else normalizedType = rawType;

    calloutType = normalizedType;
    const customTitle = calloutHeaderMatch[2].trim();
    const isNextLineInCallout = lineNum < doc.lines && /^\s*>/.test(doc.line(lineNum + 1).text);

    lineDecorations.push({
      from: line.from,
      to: line.from,
      deco: Decoration.line({
        class: `knit-callout-line knit-callout-header knit-callout-${normalizedType}${!isNextLineInCallout ? ' knit-callout-end' : ''}`,
      }),
      isLine: true,
    });

    if (!isCursorOnLine && line.from < line.to) {
      rangeDecorations.push({
        from: line.from,
        to: line.to,
        deco: Decoration.replace({
          widget: new CalloutHeaderWidget(normalizedType, customTitle, line.from),
        }),
      });
    }

    if (!isNextLineInCallout) {
      calloutType = null;
    }

    return {
      lineDecorations,
      rangeDecorations,
      skipRest: true,
      activeCalloutType: calloutType,
    };
  }

  const quoteMatch = lineText.match(/^(\s*>\s?)(.*)$/);
  if (quoteMatch) {
    const prefixLen = quoteMatch[1].length;
    const isNextLineInQuote = lineNum < doc.lines && /^\s*>/.test(doc.line(lineNum + 1).text);

    if (calloutType) {
      lineDecorations.push({
        from: line.from,
        to: line.from,
        deco: Decoration.line({
          class: `knit-callout-line knit-callout-body knit-callout-${calloutType}${!isNextLineInQuote ? ' knit-callout-end' : ''}`,
        }),
        isLine: true,
      });
    } else {
      lineDecorations.push({
        from: line.from,
        to: line.from,
        deco: Decoration.line({
          class: `knit-blockquote-line${!isNextLineInQuote ? ' knit-blockquote-end' : ''}`,
        }),
        isLine: true,
      });
    }

    if (!isCursorOnLine && prefixLen > 0 && line.from + prefixLen <= line.to) {
      rangeDecorations.push({
        from: line.from,
        to: line.from + prefixLen,
        deco: emptyReplace,
      });
    }

    if (!isNextLineInQuote) {
      calloutType = null;
    }
  } else {
    calloutType = null;
  }

  // D. Séparateurs horizontaux
  const hrMatch = lineText.match(/^(\s*[-*_]\s*){3,}$/);
  if (hrMatch && !isCursorOnLine && line.from < line.to) {
    rangeDecorations.push({
      from: line.from,
      to: line.to,
      deco: Decoration.replace({
        widget: new DividerWidget(),
      }),
    });
    return {
      lineDecorations,
      rangeDecorations,
      skipRest: true,
      activeCalloutType: calloutType,
    };
  }

  // D2. Images Markdown standalone
  const imageMatch = lineText.match(/^(\s*)!\[(.*?)\]\((.*?)\)\s*$/);
  if (imageMatch && !isCursorOnLine && line.from < line.to) {
    const altText = imageMatch[2];
    const imageUrl = imageMatch[3].trim().replace(/^<|>$/g, '');
    rangeDecorations.push({
      from: line.from,
      to: line.to,
      deco: Decoration.replace({
        widget: new ImageCardWidget(altText, imageUrl, line.from, line.to),
        block: true,
      }),
    });
    return {
      lineDecorations,
      rangeDecorations,
      skipRest: true,
      activeCalloutType: calloutType,
    };
  }

  // E. Titres Markdown
  const headingMatch = lineText.match(/^(#{1,6})\s+(.*)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    lineDecorations.push({
      from: line.from,
      to: line.from,
      deco: Decoration.line({ class: `knit-line-h${level}` }),
      isLine: true,
    });

    if (!isCursorOnLine) {
      const prefixLen = headingMatch[1].length + 1;
      if (prefixLen > 0 && line.from + prefixLen <= line.to) {
        rangeDecorations.push({
          from: line.from,
          to: line.from + prefixLen,
          deco: emptyReplace,
        });
      }
    }
  }

  // F. Cases à cocher étendues
  const taskMatch = lineText.match(/^(\s*)(-\s*)(\[[ xX/\-?>!]\])(\s*)/);
  if (taskMatch && !isCursorOnLine) {
    const indentLen = taskMatch[1].length;
    const dashLen = taskMatch[2].length;
    const boxLen = taskMatch[3].length;
    const rawChar = taskMatch[3].charAt(1);
    const statusChar = (rawChar.toLowerCase() === 'x' ? 'x' : rawChar) as TaskStatus;

    if (dashLen > 0) {
      rangeDecorations.push({
        from: line.from + indentLen,
        to: line.from + indentLen + dashLen,
        deco: emptyReplace,
      });
    }

    const checkFrom = line.from + indentLen + dashLen;
    const checkTo = checkFrom + boxLen;

    if (checkFrom < checkTo) {
      rangeDecorations.push({
        from: checkFrom,
        to: checkTo,
        deco: Decoration.replace({
          widget: new CheckboxWidget(statusChar, checkFrom, checkTo),
        }),
      });
    }

    const afterBox = checkTo + taskMatch[4].length;
    if (afterBox < line.to) {
      if (statusChar === 'x') {
        rangeDecorations.push({
          from: afterBox,
          to: line.to,
          deco: Decoration.mark({ class: 'knit-task-done-text' }),
        });
      } else if (statusChar === '-') {
        rangeDecorations.push({
          from: afterBox,
          to: line.to,
          deco: Decoration.mark({ class: 'knit-task-cancelled-text' }),
        });
      }
    }
  }

  // G. Priorités inline
  const prioMatch = lineText.match(/!(p[1-3])\b/i);
  if (prioMatch && !isCursorOnLine) {
    const prioLevel = prioMatch[1].toLowerCase() as 'p1' | 'p2' | 'p3';
    const prioIdx = lineText.indexOf(prioMatch[0]);
    const prioFrom = line.from + prioIdx;
    const prioTo = prioFrom + prioMatch[0].length;

    if (prioFrom < prioTo) {
      rangeDecorations.push({
        from: prioFrom,
        to: prioTo,
        deco: Decoration.replace({
          widget: new PriorityWidget(prioLevel, prioFrom),
        }),
      });
    }
  }

  // H. Éléments inline
  if (!isCursorOnLine && !headingMatch) {
    scanInlineMarkup(line.from, lineText, rangeDecorations);
  }

  return {
    lineDecorations,
    rangeDecorations,
    skipRest: false,
    activeCalloutType: calloutType,
  };
}

function scanInlineMarkup(
  lineStart: number,
  lineText: string,
  rangeDecorations: DecItem[]
): void {
  const occupiedRanges: [number, number][] = [];

  const isOverlap = (s: number, e: number) => {
    return occupiedRanges.some(([os, oe]) => Math.max(s, os) < Math.min(e, oe));
  };

  const codeRegex = /`([^`\n]+)`/g;
  let cm: RegExpExecArray | null;
  while ((cm = codeRegex.exec(lineText)) !== null) {
    const start = lineStart + cm.index;
    const end = start + cm[0].length;
    if (end - start > 2 && !isOverlap(start, end)) {
      occupiedRanges.push([start, end]);
      rangeDecorations.push({ from: start, to: start + 1, deco: emptyReplace });
      rangeDecorations.push({
        from: start + 1,
        to: end - 1,
        deco: Decoration.mark({ class: 'knit-preview-code' }),
      });
      rangeDecorations.push({ from: end - 1, to: end, deco: emptyReplace });
    }
  }

  const mdLinkRegex = /\[([^\]\n]+)\]\(([^)\n]+)\)/g;
  let ml: RegExpExecArray | null;
  while ((ml = mdLinkRegex.exec(lineText)) !== null) {
    const label = ml[1];
    const start = lineStart + ml.index;
    const labelStart = start + 1;
    const labelEnd = labelStart + label.length;
    const end = start + ml[0].length;

    if (label.length > 0 && !isOverlap(start, end)) {
      occupiedRanges.push([start, end]);
      rangeDecorations.push({ from: start, to: labelStart, deco: emptyReplace });
      rangeDecorations.push({
        from: labelStart,
        to: labelEnd,
        deco: Decoration.mark({
          class: 'knit-preview-link',
          attributes: { 'data-target': ml[2].trim() },
        }),
      });
      rangeDecorations.push({ from: labelEnd, to: end, deco: emptyReplace });
    }
  }

  const boldRegex = /(\*\*|__)([^\n]+?)\1/g;
  let bm: RegExpExecArray | null;
  while ((bm = boldRegex.exec(lineText)) !== null) {
    const start = lineStart + bm.index;
    const end = start + bm[0].length;
    if (end - start > 4 && !isOverlap(start, end)) {
      occupiedRanges.push([start, end]);
      rangeDecorations.push({ from: start, to: start + 2, deco: emptyReplace });
      rangeDecorations.push({
        from: start + 2,
        to: end - 2,
        deco: Decoration.mark({ class: 'knit-preview-bold' }),
      });
      rangeDecorations.push({ from: end - 2, to: end, deco: emptyReplace });
    }
  }

  const italicRegex = /(?:^|[^*])(\*([^*\n]+)\*)(?!\*)|(?:^|[^_])(_([^_\n]+)_)(?!_)/g;
  let im: RegExpExecArray | null;
  while ((im = italicRegex.exec(lineText)) !== null) {
    const fullMatch = im[1] || im[3];
    if (!fullMatch) continue;
    const matchOffset = im[0].indexOf(fullMatch);
    const start = lineStart + im.index + matchOffset;
    const end = start + fullMatch.length;
    if (end - start > 2 && !isOverlap(start, end)) {
      occupiedRanges.push([start, end]);
      rangeDecorations.push({ from: start, to: start + 1, deco: emptyReplace });
      rangeDecorations.push({
        from: start + 1,
        to: end - 1,
        deco: Decoration.mark({ class: 'knit-preview-italic' }),
      });
      rangeDecorations.push({ from: end - 1, to: end, deco: emptyReplace });
    }
  }

  const strikeRegex = /~~([^~\n]+?)~~/g;
  let sm: RegExpExecArray | null;
  while ((sm = strikeRegex.exec(lineText)) !== null) {
    const start = lineStart + sm.index;
    const end = start + sm[0].length;
    if (end - start > 4 && !isOverlap(start, end)) {
      occupiedRanges.push([start, end]);
      rangeDecorations.push({ from: start, to: start + 2, deco: emptyReplace });
      rangeDecorations.push({
        from: start + 2,
        to: end - 2,
        deco: Decoration.mark({ class: 'knit-preview-strikethrough' }),
      });
      rangeDecorations.push({ from: end - 2, to: end, deco: emptyReplace });
    }
  }

  const wikiRegex = /\[\[([^\]|\n]+)(?:\|([^\]\n]+))?\]\]/g;
  let wm: RegExpExecArray | null;
  while ((wm = wikiRegex.exec(lineText)) !== null) {
    const start = lineStart + wm.index;
    const end = start + wm[0].length;
    const target = wm[1];
    const alias = wm[2];

    if (end - start > 4 && !isOverlap(start, end)) {
      occupiedRanges.push([start, end]);

      if (alias !== undefined) {
        const aliasStart = start + 2 + target.length + 1;
        const aliasEnd = aliasStart + alias.length;

        rangeDecorations.push({ from: start, to: aliasStart, deco: emptyReplace });
        rangeDecorations.push({
          from: aliasStart,
          to: aliasEnd,
          deco: Decoration.mark({
            class: 'knit-preview-wikilink',
            attributes: { 'data-target': target },
          }),
        });
        rangeDecorations.push({ from: aliasEnd, to: end, deco: emptyReplace });
      } else {
        const targetStart = start + 2;
        const targetEnd = end - 2;

        rangeDecorations.push({ from: start, to: targetStart, deco: emptyReplace });
        rangeDecorations.push({
          from: targetStart,
          to: targetEnd,
          deco: Decoration.mark({
            class: 'knit-preview-wikilink',
            attributes: { 'data-target': target },
          }),
        });
        rangeDecorations.push({ from: targetEnd, to: end, deco: emptyReplace });
      }
    }
  }

  const mentionRegex = /(?:^|\s)@([a-zA-Z0-9_.-/]+)/g;
  let mm: RegExpExecArray | null;
  while ((mm = mentionRegex.exec(lineText)) !== null) {
    const matchOffset = mm[0].indexOf('@');
    const start = lineStart + mm.index + matchOffset;
    const end = start + mm[1].length + 1;
    if (!isOverlap(start, end)) {
      occupiedRanges.push([start, end]);
      rangeDecorations.push({
        from: start,
        to: end,
        deco: Decoration.mark({ class: 'knit-preview-mention' }),
      });
    }
  }

  const dateRegex = /(?:^|\s)@(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2}(?:-\d{2}:\d{2})?)?)/g;
  let dm: RegExpExecArray | null;
  while ((dm = dateRegex.exec(lineText)) !== null) {
    const matchOffset = dm[0].indexOf('@');
    const start = lineStart + dm.index + matchOffset;
    const end = start + dm[1].length + 1;
    if (!isOverlap(start, end)) {
      occupiedRanges.push([start, end]);
      rangeDecorations.push({
        from: start,
        to: end,
        deco: Decoration.mark({ class: 'knit-preview-date' }),
      });
    }
  }

  const tagRegex = /(?:^|\s)#([a-zA-Z0-9_/-]+)/g;
  let tm: RegExpExecArray | null;
  while ((tm = tagRegex.exec(lineText)) !== null) {
    const matchOffset = tm[0].indexOf('#');
    const start = lineStart + tm.index + matchOffset;
    const end = start + tm[1].length + 1;
    if (!isOverlap(start, end)) {
      occupiedRanges.push([start, end]);
      rangeDecorations.push({
        from: start,
        to: end,
        deco: Decoration.mark({ class: 'knit-preview-tag' }),
      });
    }
  }

  // B-059 : HTML whitelist inline (details multi-ligne → detailsBlock.ts)
  const htmlInlineRe = new RegExp(HTML_INLINE_TAG_RE.source, 'gi');
  let hm: RegExpExecArray | null;
  while ((hm = htmlInlineRe.exec(lineText)) !== null) {
    const start = lineStart + hm.index;
    const end = start + hm[0].length;
    if (isOverlap(start, end)) continue;
    occupiedRanges.push([start, end]);
    const tag = (
      hm[1] || (hm[0].toLowerCase().startsWith('<br') ? 'br' : 'span')
    ).toLowerCase();
    const inner = hm[2] ?? '';
    rangeDecorations.push({
      from: start,
      to: end,
      deco: Decoration.replace({
        widget: new HtmlInlineWidget(tag, inner, hm[0]),
      }),
    });
  }
}
