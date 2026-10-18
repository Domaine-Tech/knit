import { RangeSetBuilder, type EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet } from '@codemirror/view';
import type { TaskStatus } from '../../../types';
import { CheckboxWidget } from './widgets/checkboxWidget';
import { PriorityWidget } from './widgets/priorityWidget';
import { ProgressBarWidget } from './widgets/progressBarWidget';
import { DividerWidget } from './widgets/dividerWidget';
import { FrontmatterPropertiesWidget } from './widgets/frontmatterWidget';
import { TableCardWidget } from './widgets/tableCardWidget';
import { CodeBlockCardWidget } from './widgets/codeBlockWidget';
import { ImageCardWidget } from './widgets/imageCardWidget';
import { CalloutHeaderWidget } from './widgets/calloutWidget';
import { KnitTocWidget } from './widgets/knitTocWidget';
import { KnitFilesWidget } from './widgets/knitFilesWidget';
import { KnitQueryWidget } from './widgets/knitQueryWidget';
import { KnitTasksWidget } from './widgets/knitTasksWidget';
import { isKnitDynamicLang } from '../../../utils/dynamicBlockUtils';
import { vaultStore } from '../../../stores/vaultStore';

interface DecItem {
  from: number;
  to: number;
  deco: Decoration;
  isLine?: boolean;
}

// Remplacement vide standard CodeMirror 6 pour masquer les balises avec 100% de fidélité métrique
const emptyReplace = Decoration.replace({});

/**
 * Extension Obsidian-style Live Preview pour CodeMirror 6 :
 * - Mode visuel en lecture :
 *   - Remplacement du frontmatter YAML par la carte de propriétés
 *   - Remplacement des tableaux Markdown par de vraies tables HTML interactives
 *   - Masquage des marqueurs (#, **, *, `, ~~, [text](url), [[target|alias]])
 *   - Rendu des tâches sans tiret avec texte barré automatique
 *   - Pilles interactives pour mentions @user, dates @YYYY-MM-DD et tags #tag
 * - Mode édition au curseur : dès que le curseur est placé sur un bloc/ligne,
 *   la syntaxe Markdown brute réapparaît instantanément pour modification exacte.
 */
export function buildLivePreviewDecorations(state: EditorState): DecorationSet {
  try {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = state.doc;
    const sel = state.selection.main;

    // 1. Détection du Frontmatter YAML (--- ... ---)
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

    // 2. Calcul du nombre de tâches pour la barre sous le premier H1
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

    const lineDecorations: DecItem[] = [];
    const rangeDecorations: DecItem[] = [];

    // Barre de progression sous le premier H1
    if (totalTasks > 0 && firstH1LineEnd !== -1) {
      rangeDecorations.push({
        from: firstH1LineEnd,
        to: firstH1LineEnd,
        deco: Decoration.widget({
          widget: new ProgressBarWidget(completedTasks, totalTasks),
          side: 1,
          block: true,
        }),
      });
    }

    // 3. Traitement du Frontmatter YAML -> Carte de Propriétés
    if (fmStart !== -1 && fmEnd !== -1) {
      const fmLineStart = doc.line(fmStart);
      const fmLineEnd = doc.line(fmEnd);
      const isCursorInFm = sel.from <= fmLineEnd.to && sel.to >= fmLineStart.from;

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

    // 4. Décoration séquentielle des lignes du document
    let lineNum = 1;
    let activeCalloutType: string | null = null;

    while (lineNum <= doc.lines) {
      // Si la ligne fait partie du frontmatter YAML
      if (fmStart !== -1 && lineNum >= fmStart && lineNum <= fmEnd) {
        lineNum++;
        continue;
      }

      const line = doc.line(lineNum);
      const lineText = line.text;
      const isCursorOnLine = sel.from <= line.to && sel.to >= line.from;

      // A. Tableaux Markdown GFM -> Carte HTML Visuelle Interactive
      const isTableLine = /^\s*\|.*\|\s*$/.test(lineText.trim());
      if (isTableLine) {
        // Détecter l'ensemble des lignes consécutives du tableau
        let tableEndLine = lineNum;
        while (tableEndLine <= doc.lines && /^\s*\|.*\|\s*$/.test(doc.line(tableEndLine).text.trim())) {
          tableEndLine++;
        }
        tableEndLine--; // Dernière ligne du tableau

        const tableStartPos = line.from;
        const tableEndPos = doc.line(tableEndLine).to;
        const isCursorInTable = sel.from <= tableEndPos && sel.to >= tableStartPos;

        if (!isCursorInTable && tableEndLine >= lineNum + 1) {
          // Curseur hors du tableau : Remplacement par la carte Table HTML riche
          const fullTableText = doc.sliceString(tableStartPos, tableEndPos);
          rangeDecorations.push({
            from: tableStartPos,
            to: tableEndPos,
            deco: Decoration.replace({
              widget: new TableCardWidget(fullTableText, tableStartPos, tableEndPos, lineNum),
              block: true,
            }),
          });
          lineNum = tableEndLine + 1;
          continue;
        } else {
          // Curseur DANS le tableau : affichage de TOUTES les lignes en mode édition fluide
          for (let l = lineNum; l <= tableEndLine; l++) {
            const rowLine = doc.line(l);
            const isTableDelimiter = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(rowLine.text.trim());
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
          lineNum = tableEndLine + 1;
          continue;
        }
      }

      // B. Blocs de code (```lang ... ```)
      const codeFenceMatch = lineText.match(/^```([a-zA-Z0-9_+#.-]*)\s*$/);
      if (codeFenceMatch) {
        const lang = codeFenceMatch[1].trim();
        const langLower = lang.toLowerCase();

        // Trouver la fermeture du fence (partagé mermaid + autres langs)
        let endLine = lineNum + 1;
        while (endLine <= doc.lines && !doc.line(endLine).text.trim().startsWith('```')) {
          endLine++;
        }

        // ```mermaid : délégué à mermaidExtension — il FAUT sauter tout le bloc,
        // sinon le ``` de fermeture est réinterprété comme un nouveau fence
        // et avale le contenu suivant (images, titres, knit-toc…).
        if (langLower === 'mermaid') {
          lineNum = endLine <= doc.lines ? endLine + 1 : endLine;
          continue;
        }

        if (endLine <= doc.lines) {
          const codeLines: string[] = [];
          for (let l = lineNum + 1; l < endLine; l++) {
            codeLines.push(doc.line(l).text);
          }
          const fullCode = codeLines.join('\n');

          const codeStartPos = line.from;
          const codeEndPos = doc.line(endLine).to;
          const isCursorInCodeBlock = sel.from <= codeEndPos && sel.to >= codeStartPos;

          if (!isCursorInCodeBlock) {
            const indexVersion = vaultStore.getFrontmatterIndexVersion();
            let widget;
            if (isKnitDynamicLang(langLower)) {
              if (langLower === 'knit-toc') {
                widget = new KnitTocWidget(
                  fullCode,
                  codeStartPos,
                  codeEndPos,
                  doc.toString()
                );
              } else if (langLower === 'knit-files') {
                widget = new KnitFilesWidget(
                  fullCode,
                  codeStartPos,
                  codeEndPos,
                  indexVersion
                );
              } else if (langLower === 'knit-query') {
                widget = new KnitQueryWidget(
                  fullCode,
                  codeStartPos,
                  codeEndPos,
                  indexVersion
                );
              } else {
                widget = new KnitTasksWidget(
                  fullCode,
                  codeStartPos,
                  codeEndPos,
                  indexVersion
                );
              }
            } else {
              widget = new CodeBlockCardWidget(
                lang,
                fullCode,
                codeStartPos,
                codeEndPos
              );
            }

            rangeDecorations.push({
              from: codeStartPos,
              to: codeEndPos,
              deco: Decoration.replace({
                widget,
                block: true,
              }),
            });
            lineNum = endLine + 1;
            continue;
          } else {
            // Curseur DANS le bloc : affichage de TOUTES les lignes en mode source fluide
            // 1. Ligne d'en-tête (```lang)
            lineDecorations.push({
              from: line.from,
              to: line.from,
              deco: Decoration.line({ class: 'knit-code-line knit-code-header-line' }),
              isLine: true,
            });

            // 2. Lignes internes de code avec styling propre
            for (let l = lineNum + 1; l < endLine; l++) {
              const codeLine = doc.line(l);
              lineDecorations.push({
                from: codeLine.from,
                to: codeLine.from,
                deco: Decoration.line({ class: 'knit-code-line knit-code-body-line' }),
                isLine: true,
              });
            }

            // 3. Ligne de fermeture (```)
            const closeLine = doc.line(endLine);
            lineDecorations.push({
              from: closeLine.from,
              to: closeLine.from,
              deco: Decoration.line({ class: 'knit-code-line knit-code-footer-line' }),
              isLine: true,
            });

            lineNum = endLine + 1;
            continue;
          }
        }
      }

      // C. Callouts GFM (> [!NOTE]) et Citations (> texte)
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

        activeCalloutType = normalizedType;
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
          activeCalloutType = null;
        }

        lineNum++;
        continue;
      }

      const quoteMatch = lineText.match(/^(\s*>\s?)(.*)$/);
      if (quoteMatch) {
        const prefixLen = quoteMatch[1].length;
        const isNextLineInQuote = lineNum < doc.lines && /^\s*>/.test(doc.line(lineNum + 1).text);

        if (activeCalloutType) {
          lineDecorations.push({
            from: line.from,
            to: line.from,
            deco: Decoration.line({
              class: `knit-callout-line knit-callout-body knit-callout-${activeCalloutType}${!isNextLineInQuote ? ' knit-callout-end' : ''}`,
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
          activeCalloutType = null;
        }
      } else {
        activeCalloutType = null;
      }

      // D. Séparateurs horizontaux (--- ou ***) hors curseur
      const hrMatch = lineText.match(/^(\s*[-*_]\s*){3,}$/);
      if (hrMatch && !isCursorOnLine && line.from < line.to) {
        rangeDecorations.push({
          from: line.from,
          to: line.to,
          deco: Decoration.replace({
            widget: new DividerWidget(),
          }),
        });
        lineNum++;
        continue;
      }

      // D2. Images Markdown standalone (![alt](url))
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
        lineNum++;
        continue;
      }

      // E. Titres Markdown (#, ##, ###, ####, #####, ######)
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

      // F. Cases à cocher étendues (- [ ]) avec masquage du tiret et texte barré
      const taskMatch = lineText.match(/^(\s*)(-\s*)(\[[ xX/\-?>!]\])(\s*)/);
      if (taskMatch && !isCursorOnLine) {
        const indentLen = taskMatch[1].length;
        const dashLen = taskMatch[2].length;
        const boxLen = taskMatch[3].length;
        const rawChar = taskMatch[3].charAt(1);
        const statusChar = (rawChar.toLowerCase() === 'x' ? 'x' : rawChar) as TaskStatus;

        // Masquer le tiret "- " pour un alignement épuré Obsidian
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

        // Texte barré et estompé si tâche terminée (- [x]) ou annulée (- [-])
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

      // G. Priorités inline (!p1, !p2, !p3)
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

      // H. Éléments inline en Live Preview (seulement si curseur hors de la ligne)
      if (!isCursorOnLine && !headingMatch) {
        const lineStart = line.from;
        const occupiedRanges: [number, number][] = [];

        const isOverlap = (s: number, e: number) => {
          return occupiedRanges.some(([os, oe]) => Math.max(s, os) < Math.min(e, oe));
        };

        // 1. Code inline `code`
        const codeRegex = /`([^`\n]+)`/g;
        let cm: RegExpExecArray | null;
        while ((cm = codeRegex.exec(lineText)) !== null) {
          const start = lineStart + cm.index;
          const end = start + cm[0].length;
          if (end - start > 2 && !isOverlap(start, end)) {
            occupiedRanges.push([start, end]);
            rangeDecorations.push({
              from: start,
              to: start + 1,
              deco: emptyReplace,
            });
            rangeDecorations.push({
              from: start + 1,
              to: end - 1,
              deco: Decoration.mark({ class: 'knit-preview-code' }),
            });
            rangeDecorations.push({
              from: end - 1,
              to: end,
              deco: emptyReplace,
            });
          }
        }

        // 2. Liens Markdown classiques [Label](url)
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
            rangeDecorations.push({
              from: start,
              to: labelStart,
              deco: emptyReplace,
            });
            rangeDecorations.push({
              from: labelStart,
              to: labelEnd,
              deco: Decoration.mark({ class: 'knit-preview-link', attributes: { 'data-target': ml[2].trim() } }),
            });
            rangeDecorations.push({
              from: labelEnd,
              to: end,
              deco: emptyReplace,
            });
          }
        }

        // 3. Gras **texte** ou __texte__
        const boldRegex = /(\*\*|__)([^\n]+?)\1/g;
        let bm: RegExpExecArray | null;
        while ((bm = boldRegex.exec(lineText)) !== null) {
          const start = lineStart + bm.index;
          const end = start + bm[0].length;
          if (end - start > 4 && !isOverlap(start, end)) {
            occupiedRanges.push([start, end]);
            rangeDecorations.push({
              from: start,
              to: start + 2,
              deco: emptyReplace,
            });
            rangeDecorations.push({
              from: start + 2,
              to: end - 2,
              deco: Decoration.mark({ class: 'knit-preview-bold' }),
            });
            rangeDecorations.push({
              from: end - 2,
              to: end,
              deco: emptyReplace,
            });
          }
        }

        // 4. Italique *texte* ou _texte_
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
            rangeDecorations.push({
              from: start,
              to: start + 1,
              deco: emptyReplace,
            });
            rangeDecorations.push({
              from: start + 1,
              to: end - 1,
              deco: Decoration.mark({ class: 'knit-preview-italic' }),
            });
            rangeDecorations.push({
              from: end - 1,
              to: end,
              deco: emptyReplace,
            });
          }
        }

        // 5. Barré ~~texte~~
        const strikeRegex = /~~([^~\n]+?)~~/g;
        let sm: RegExpExecArray | null;
        while ((sm = strikeRegex.exec(lineText)) !== null) {
          const start = lineStart + sm.index;
          const end = start + sm[0].length;
          if (end - start > 4 && !isOverlap(start, end)) {
            occupiedRanges.push([start, end]);
            rangeDecorations.push({
              from: start,
              to: start + 2,
              deco: emptyReplace,
            });
            rangeDecorations.push({
              from: start + 2,
              to: end - 2,
              deco: Decoration.mark({ class: 'knit-preview-strikethrough' }),
            });
            rangeDecorations.push({
              from: end - 2,
              to: end,
              deco: emptyReplace,
            });
          }
        }

        // 6. WikiLinks [[Note]] ou [[Note|Alias]]
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

              rangeDecorations.push({
                from: start,
                to: aliasStart,
                deco: emptyReplace,
              });
              rangeDecorations.push({
                from: aliasStart,
                to: aliasEnd,
                deco: Decoration.mark({ class: 'knit-preview-wikilink', attributes: { 'data-target': target } }),
              });
              rangeDecorations.push({
                from: aliasEnd,
                to: end,
                deco: emptyReplace,
              });
            } else {
              const targetStart = start + 2;
              const targetEnd = end - 2;

              rangeDecorations.push({
                from: start,
                to: targetStart,
                deco: emptyReplace,
              });
              rangeDecorations.push({
                from: targetStart,
                to: targetEnd,
                deco: Decoration.mark({ class: 'knit-preview-wikilink', attributes: { 'data-target': target } }),
              });
              rangeDecorations.push({
                from: targetEnd,
                to: end,
                deco: emptyReplace,
              });
            }
          }
        }

        // 7. Mentions collaborateurs @collaborateur et @vault
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

        // 8. Dates et échéances @YYYY-MM-DD
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

        // 9. Tags #tag
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
      }

      lineNum++;
    }

    // Tri strict pour CodeMirror 6 RangeSetBuilder :
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
