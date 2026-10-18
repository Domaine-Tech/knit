import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import {
  findTableDelimiterOffsets,
  formatTableColumns,
  mutateTableStructure,
  splitTableRow,
  type TableAlign,
} from '../../utils/markdownUtils';

interface TableRange {
  from: number;
  to: number;
  startLine: number;
  endLine: number;
  activeColIndex: number;
  colCount: number;
}

function getTableAtCursor(view: EditorView): TableRange | null {
  const sel = view.state.selection.main;
  const line = view.state.doc.lineAt(sel.from);
  if (!line.text.includes('|')) return null;

  let startLine = line.number;
  while (startLine > 1) {
    const prev = view.state.doc.line(startLine - 1);
    if (!prev.text.includes('|') || !prev.text.trim()) break;
    startLine--;
  }

  let endLine = line.number;
  while (endLine < view.state.doc.lines) {
    const next = view.state.doc.line(endLine + 1);
    if (!next.text.includes('|') || !next.text.trim()) break;
    endLine++;
  }

  if (endLine - startLine < 1) return null;

  const from = view.state.doc.line(startLine).from;
  const to = view.state.doc.line(endLine).to;

  // Calcul du nombre de colonnes et de la colonne active sous le curseur (B-047a)
  const lineText = line.text;
  const headerLine = view.state.doc.line(startLine).text;
  const headerCells = splitTableRow(headerLine);
  const colCount = Math.max(1, headerCells.length);

  const colOffsetInLine = sel.from - line.from;
  const delimiters = findTableDelimiterOffsets(lineText);
  let activeColIndex = 0;

  if (delimiters.length > 0) {
    const leadingDelims = delimiters.filter((d) => d < colOffsetInLine).length;
    const isLeadingPipe = lineText.trim().startsWith('|');
    activeColIndex = isLeadingPipe ? Math.max(0, leadingDelims - 1) : leadingDelims;
    activeColIndex = Math.min(activeColIndex, colCount - 1);
  }

  return { from, to, startLine, endLine, activeColIndex, colCount };
}

function applyTableMutation(
  view: EditorView,
  range: TableRange,
  action: Parameters<typeof mutateTableStructure>[1]
): void {
  const current = view.state.doc.sliceString(range.from, range.to);
  const next = mutateTableStructure(current, action);
  if (next === null) return;

  if (next === '') {
    view.dispatch({
      changes: { from: range.from, to: Math.min(range.to + 1, view.state.doc.length), insert: '' },
    });
    return;
  }

  view.dispatch({
    changes: { from: range.from, to: range.to, insert: next },
    selection: { anchor: range.from + Math.min(2, next.length) },
  });
}

/**
 * Mini-toolbar contextuelle au survol / focus d'un tableau GFM (B-047 & B-047a).
 */
export function createTableHelperExtension(): Extension {
  return ViewPlugin.fromClass(
    class {
      toolbar: HTMLDivElement | null = null;
      private colIndicator: HTMLSpanElement | null = null;
      private alignGButton: HTMLButtonElement | null = null;
      private alignCButton: HTMLButtonElement | null = null;
      private alignDButton: HTMLButtonElement | null = null;
      private hideTimer: ReturnType<typeof setTimeout> | null = null;
      private view: EditorView;

      constructor(view: EditorView) {
        this.view = view;
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'knit-table-toolbar';
        this.toolbar.style.display = 'none';
        this.toolbar.addEventListener('mousedown', (e) => {
          if (e.button === 1) e.preventDefault();
          e.preventDefault();
        });
        this.toolbar.addEventListener('mouseenter', () => this.cancelHide());
        this.toolbar.addEventListener('mouseleave', () => this.scheduleHide());

        this.colIndicator = document.createElement('span');
        this.colIndicator.className = 'knit-table-toolbar-col';
        this.colIndicator.textContent = 'Col. 1';
        this.toolbar.appendChild(this.colIndicator);

        const actions: Array<{
          label: string;
          tooltip: string;
          run: (range: TableRange) => void;
          onCreated?: (btn: HTMLButtonElement) => void;
        }> = [
          {
            label: '+ Ligne',
            tooltip: 'Ajouter une ligne au tableau',
            run: (r) => applyTableMutation(view, r, { type: 'add-row' }),
          },
          {
            label: '+ Colonne',
            tooltip: 'Ajouter une colonne au tableau',
            run: (r) => applyTableMutation(view, r, { type: 'add-column' }),
          },
          {
            label: 'Align. G',
            tooltip: 'Aligner la colonne sous le curseur à gauche',
            run: (r) =>
              applyTableMutation(view, r, {
                type: 'set-align',
                colIndex: r.activeColIndex,
                align: 'left' as TableAlign,
              }),
            onCreated: (btn) => {
              this.alignGButton = btn;
            },
          },
          {
            label: 'Align. C',
            tooltip: 'Centrer la colonne sous le curseur',
            run: (r) =>
              applyTableMutation(view, r, {
                type: 'set-align',
                colIndex: r.activeColIndex,
                align: 'center',
              }),
            onCreated: (btn) => {
              this.alignCButton = btn;
            },
          },
          {
            label: 'Align. D',
            tooltip: 'Aligner la colonne sous le curseur à droite',
            run: (r) =>
              applyTableMutation(view, r, {
                type: 'set-align',
                colIndex: r.activeColIndex,
                align: 'right',
              }),
            onCreated: (btn) => {
              this.alignDButton = btn;
            },
          },
          {
            label: 'Supprimer',
            tooltip: 'Supprimer le tableau',
            run: (r) => applyTableMutation(view, r, { type: 'delete-table' }),
          },
          {
            label: 'Aligner',
            tooltip: 'Réaligner les colonnes',
            run: (r) => {
              const current = view.state.doc.sliceString(r.from, r.to);
              const formatted = formatTableColumns(current);
              if (formatted !== current) {
                view.dispatch({
                  changes: { from: r.from, to: r.to, insert: formatted },
                });
              }
            },
          },
        ];

        for (const action of actions) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'knit-btn';
          btn.textContent = action.label;
          btn.setAttribute('data-tooltip', action.tooltip);
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const range = getTableAtCursor(view);
            if (range) action.run(range);
            this.hide();
          });
          action.onCreated?.(btn);
          this.toolbar.appendChild(btn);
        }

        view.dom.appendChild(this.toolbar);
      }

      update(update: ViewUpdate) {
        if (update.selectionSet || update.docChanged || update.focusChanged) {
          const range = getTableAtCursor(update.view);
          if (range && update.view.hasFocus) {
            this.showNear(range);
          } else if (!this.toolbar?.matches(':hover')) {
            this.scheduleHide();
          }
        }
      }

      private showNear(range: TableRange) {
        if (!this.toolbar) return;
        const coords = this.view.coordsAtPos(range.from);
        if (!coords) return;

        const colNum = range.activeColIndex + 1;
        if (this.colIndicator) {
          this.colIndicator.textContent = `Col. ${colNum}/${range.colCount}`;
        }
        if (this.alignGButton) {
          this.alignGButton.setAttribute('data-tooltip', `Aligner la colonne ${colNum} à gauche`);
        }
        if (this.alignCButton) {
          this.alignCButton.setAttribute('data-tooltip', `Centrer la colonne ${colNum}`);
        }
        if (this.alignDButton) {
          this.alignDButton.setAttribute('data-tooltip', `Aligner la colonne ${colNum} à droite`);
        }

        const editorRect = this.view.dom.getBoundingClientRect();

        this.toolbar.style.display = 'flex';
        this.toolbar.style.top = `${coords.top - editorRect.top - 36}px`;
        this.toolbar.style.left = `${Math.max(8, coords.left - editorRect.left)}px`;
        this.cancelHide();
      }

      private scheduleHide() {
        this.cancelHide();
        this.hideTimer = setTimeout(() => this.hide(), 400);
      }

      private cancelHide() {
        if (this.hideTimer) {
          clearTimeout(this.hideTimer);
          this.hideTimer = null;
        }
      }

      private hide() {
        if (this.toolbar) this.toolbar.style.display = 'none';
      }

      destroy() {
        this.cancelHide();
        this.toolbar?.remove();
        this.toolbar = null;
        this.colIndicator = null;
        this.alignGButton = null;
        this.alignCButton = null;
        this.alignDButton = null;
      }
    }
  );
}
