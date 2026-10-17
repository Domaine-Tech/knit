import {
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  keymap,
} from '@codemirror/view';
import { Compartment, type Extension } from '@codemirror/state';

export interface LineDebugInfo {
  lineNum: number;
  lineTop: number;
  lineHeight: number;
  gutterTop: number;
  gutterHeight: number;
  delta: number;
  isMismatch: boolean;
  textSnippet: string;
}

export interface WidgetDebugInfo {
  type: string;
  domHeight: number;
  offsetTop: number;
}

export interface LivePreviewDebugStats {
  totalLines: number;
  visibleLines: number;
  mismatches: LineDebugInfo[];
  lines: LineDebugInfo[];
  widgets: WidgetDebugInfo[];
  timestamp: number;
}

export const livePreviewDebugCompartment = new Compartment();

declare global {
  interface Window {
    __KNIT_DEBUG__?: {
      dumpReport: () => void;
      getStats: () => LivePreviewDebugStats | null;
      getView: () => EditorView;
      requestMeasure: () => void;
      toggle: () => void;
      isActive: boolean;
    };
  }
}

/**
 * Plugin CodeMirror 6 pour le diagnostic géométrique en temps réel (Mode Debug Live Viewer)
 * Utilise une couche de calque overlay complètement découplée pour préserver l'intégrité de CodeMirror.
 */
export const livePreviewDebugPlugin = ViewPlugin.fromClass(
  class {
    private view: EditorView;
    private overlayEl: HTMLElement | null = null;
    private lastStats: LivePreviewDebugStats | null = null;
    private measureScheduled = false;

    constructor(view: EditorView) {
      this.view = view;
      this.setupOverlayLayer();
      this.attachGlobalDebug();
      this.scheduleMeasure();
    }

    private setupOverlayLayer() {
      // Nettoyer toute couche existante résiduelle
      const old = this.view.dom.querySelector('.knit-debug-overlay-layer');
      if (old) old.remove();

      this.overlayEl = document.createElement('div');
      this.overlayEl.className = 'knit-debug-overlay-layer';
      this.overlayEl.style.cssText =
        'position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; overflow: hidden; z-index: 25;';

      this.view.dom.style.position = 'relative';
      this.view.dom.appendChild(this.overlayEl);
    }

    update(update: ViewUpdate) {
      // Déclencher le recalcul géométrique uniquement sur de vrais changements de géométrie ou de viewport
      if (update.docChanged || update.viewportChanged || update.geometryChanged) {
        this.scheduleMeasure();
      }
    }

    destroy() {
      if (this.overlayEl) {
        this.overlayEl.remove();
        this.overlayEl = null;
      }
      this.cleanupClasses();
      if (window.__KNIT_DEBUG__) {
        window.__KNIT_DEBUG__.isActive = false;
      }
    }

    private attachGlobalDebug() {
      window.__KNIT_DEBUG__ = {
        dumpReport: () => {
          if (!this.lastStats) {
            console.warn('[Knit Debug] Aucune statistique disponible.');
            return;
          }
          console.group(
            `%c[Knit Live Viewer Debug] Rapport géométrique — ${this.lastStats.visibleLines} lignes visibles (${this.lastStats.mismatches.length} décalages)`,
            this.lastStats.mismatches.length > 0
              ? 'color: #EF4444; font-weight: bold;'
              : 'color: #10B981; font-weight: bold;'
          );
          console.log('Total document lines:', this.lastStats.totalLines);
          console.log('Widgets détectés:', this.lastStats.widgets);
          if (this.lastStats.mismatches.length > 0) {
            console.table(this.lastStats.mismatches);
          } else {
            console.log(
              '%c✓ Parfait : 100% des lignes sont alignées au pixel près avec leur gouttière.',
              'color: #10B981;'
            );
          }
          console.groupEnd();
        },
        getStats: () => this.lastStats,
        getView: () => this.view,
        requestMeasure: () => {
          this.view.requestMeasure();
          this.measureNow();
        },
        toggle: () => {
          const el = this.view.dom.closest('.knit-editor-wrapper');
          el?.dispatchEvent(new CustomEvent('knit-toggle-live-debug'));
        },
        isActive: true,
      };
    }

    private scheduleMeasure() {
      if (this.measureScheduled) return;
      this.measureScheduled = true;
      requestAnimationFrame(() => {
        this.measureScheduled = false;
        this.measureNow();
      });
    }

    private cleanupClasses() {
      const lines = this.view.dom.querySelectorAll('.cm-line');
      lines.forEach((l) => {
        l.classList.remove('knit-debug-line-error', 'knit-debug-line-ok');
      });

      const gutters = this.view.dom.querySelectorAll('.cm-gutterElement');
      gutters.forEach((g) => {
        g.classList.remove('knit-debug-gutter-error', 'knit-debug-gutter-ok');
      });
    }

    private measureNow() {
      if (!this.view.dom || !this.view.dom.isConnected || !this.overlayEl) return;

      const editorRect = this.view.dom.getBoundingClientRect();
      const contentEl = this.view.dom.querySelector('.cm-content');
      if (!contentEl) return;

      // Réinitialiser la couche de calque overlay sans toucher au DOM de CodeMirror
      this.overlayEl.innerHTML = '';

      const lineElements = Array.from(contentEl.querySelectorAll('.cm-line')) as HTMLElement[];
      const gutterElements = Array.from(
        this.view.dom.querySelectorAll('.cm-gutter.cm-lineNumbers .cm-gutterElement')
      ) as HTMLElement[];

      // Construire une map des positions de gouttières par numéro de ligne
      const gutterMap = new Map<number, { el: HTMLElement; rect: DOMRect }>();
      for (const gel of gutterElements) {
        const text = gel.textContent?.trim();
        const num = text ? parseInt(text, 10) : NaN;
        if (!isNaN(num)) {
          gutterMap.set(num, { el: gel, rect: gel.getBoundingClientRect() });
        }
      }

      const linesInfo: LineDebugInfo[] = [];
      const mismatches: LineDebugInfo[] = [];

      for (const lineEl of lineElements) {
        try {
          const pos = this.view.posAtDOM(lineEl);
          if (pos < 0 || pos > this.view.state.doc.length) continue;

          const docLine = this.view.state.doc.lineAt(pos);
          const lineRect = lineEl.getBoundingClientRect();
          const gutterInfo = gutterMap.get(docLine.number);

          const gutterTop = gutterInfo ? gutterInfo.rect.top : lineRect.top;
          const gutterHeight = gutterInfo ? gutterInfo.rect.height : lineRect.height;

          // Delta en pixels entre le haut de la ligne de texte et le haut du numéro de gouttière
          const delta = Math.round(lineRect.top - gutterTop);
          const isMismatch = Math.abs(delta) > 1.5;

          const textSnippet =
            docLine.text.slice(0, 35) + (docLine.text.length > 35 ? '...' : '');

          const info: LineDebugInfo = {
            lineNum: docLine.number,
            lineTop: Math.round(lineRect.top - editorRect.top),
            lineHeight: Math.round(lineRect.height),
            gutterTop: Math.round(gutterTop - editorRect.top),
            gutterHeight: Math.round(gutterHeight),
            delta,
            isMismatch,
            textSnippet,
          };

          linesInfo.push(info);
          if (isMismatch) {
            mismatches.push(info);
          }

          // Mise à jour discrète des classes CSS
          if (isMismatch) {
            lineEl.classList.add('knit-debug-line-error');
            lineEl.classList.remove('knit-debug-line-ok');
            if (gutterInfo) {
              gutterInfo.el.classList.add('knit-debug-gutter-error');
              gutterInfo.el.classList.remove('knit-debug-gutter-ok');
            }
          } else {
            lineEl.classList.add('knit-debug-line-ok');
            lineEl.classList.remove('knit-debug-line-error');
            if (gutterInfo) {
              gutterInfo.el.classList.add('knit-debug-gutter-ok');
              gutterInfo.el.classList.remove('knit-debug-gutter-error');
            }
          }

          // Badge rendu DANS L'OVERLAY (complètement hors de .cm-line)
          const badgeTop = Math.round(lineRect.top - editorRect.top);
          const badgeEl = document.createElement('div');
          badgeEl.className = isMismatch
            ? 'knit-debug-line-badge knit-debug-badge-error'
            : 'knit-debug-line-badge knit-debug-badge-ok';
          badgeEl.style.top = `${badgeTop + 2}px`;

          if (isMismatch) {
            badgeEl.innerHTML = `⚠️ L${docLine.number} Δ:${delta > 0 ? `+${delta}` : delta}px [H:${info.lineHeight}]`;
          } else {
            badgeEl.innerHTML = `L${docLine.number} [H:${info.lineHeight}] ✓`;
          }

          this.overlayEl.appendChild(badgeEl);
        } catch {
          // Ignorer les lignes temporairement hors-arbre
        }
      }

      // Diagnostic des widgets blocs
      const widgetsInfo: WidgetDebugInfo[] = [];
      const widgetSelectors = [
        { sel: '.knit-properties-card', name: 'Frontmatter YAML' },
        { sel: '.knit-preview-table-card', name: 'Table Card GFM' },
        { sel: '.knit-mermaid-container', name: 'Mermaid Diagram' },
        { sel: '.knit-preview-hr', name: 'Divider HR' },
        { sel: '.knit-doc-progress-bar', name: 'Progress Bar' },
        { sel: '.knit-preview-image-card', name: 'Image Card' },
      ];

      for (const w of widgetSelectors) {
        const els = this.view.dom.querySelectorAll(w.sel);
        els.forEach((el) => {
          const r = el.getBoundingClientRect();
          widgetsInfo.push({
            type: w.name,
            domHeight: Math.round(r.height),
            offsetTop: Math.round(r.top - editorRect.top),
          });
        });
      }

      const stats: LivePreviewDebugStats = {
        totalLines: this.view.state.doc.lines,
        visibleLines: linesInfo.length,
        mismatches,
        lines: linesInfo,
        widgets: widgetsInfo,
        timestamp: Date.now(),
      };

      this.lastStats = stats;

      // Émettre l'événement pour le panneau React HUD
      this.view.dom.dispatchEvent(
        new CustomEvent('knit-live-debug-update', {
          bubbles: true,
          detail: stats,
        })
      );
    }
  }
);

/**
 * Raccourci clavier universel : Ctrl+Alt+D (ou Cmd+Alt+D) pour basculer le mode debug
 */
export const livePreviewDebugKeymap = (onToggle: () => void) =>
  keymap.of([
    {
      key: 'Mod-Alt-d',
      run: () => {
        onToggle();
        return true;
      },
    },
  ]);

/**
 * Crée le package d'extension pour le mode Debug Live Preview
 */
export function createLivePreviewDebugExtension(onToggle: () => void): Extension[] {
  return [livePreviewDebugPlugin, livePreviewDebugKeymap(onToggle)];
}
