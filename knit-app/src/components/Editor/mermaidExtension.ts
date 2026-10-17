import { RangeSetBuilder, StateField, type EditorState } from '@codemirror/state';
import {
  EditorView,
  WidgetType,
  Decoration,
  type DecorationSet,
} from '@codemirror/view';
import mermaid from 'mermaid';
import { getStoredHue, getStoredTheme } from '../../theme/theme';

/**
 * Cache SVG en mémoire pour éviter tout re-calcul lourd saccadé
 */
const svgCache = new Map<string, string>();

/**
 * Configuration dynamique de Mermaid synchronisée avec le thème Knit et --knit-hue
 */
export function configureMermaid() {
  const isDark = getStoredTheme() === 'dark';
  const hue = getStoredHue();

  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'neutral',
      themeVariables: {
        darkMode: isDark,
        primaryColor: `hsl(${hue}, 60%, 55%)`,
        primaryTextColor: isDark ? '#F3F4F6' : '#1F2937',
        primaryBorderColor: `hsl(${hue}, 70%, 45%)`,
        lineColor: `hsl(${hue}, 50%, 60%)`,
        secondaryColor: isDark ? '#262626' : '#F3F4F6',
        tertiaryColor: isDark ? '#1E1E1E' : '#FFFFFF',
        background: isDark ? '#1E1E1E' : '#FFFFFF',
        mainBkg: isDark ? '#1E1E1E' : '#FFFFFF',
        nodeBorder: `hsl(${hue}, 60%, 50%)`,
        clusterBkg: isDark ? '#252525' : '#F8F9FA',
        titleColor: isDark ? '#F3F4F6' : '#111827',
        fontFamily: 'Inter, system-ui, sans-serif',
      },
      securityLevel: 'loose',
      suppressErrorRendering: true,
    });
  } catch (err) {
    console.warn('Erreur initialisation Mermaid :', err);
  }
}

// Initialisation immédiate
configureMermaid();

class MermaidWidget extends WidgetType {
  private code: string;
  private from: number;
  private to: number;
  private viewRef?: EditorView;
  private ro?: ResizeObserver;

  constructor(code: string, from: number, to: number) {
    super();
    this.code = code;
    this.from = from;
    this.to = to;
  }

  eq(other: MermaidWidget) {
    return (
      other.code === this.code &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  get estimatedHeight(): number {
    return 240;
  }

  destroy() {
    if (this.ro) {
      this.ro.disconnect();
      this.ro = undefined;
    }
  }

  toDOM(view: EditorView): HTMLElement {
    this.viewRef = view;
    const container = document.createElement('div');
    container.className = 'knit-mermaid-container';
    container.style.cssText = `
      margin: 0 auto;
      box-sizing: border-box;
      padding: 16px;
      background-color: var(--knit-surface);
      border: 1px solid var(--knit-border);
      border-radius: var(--knit-radius-md);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      transition: border-color var(--knit-duration-fast);
      user-select: none;
      max-width: 100%;
      overflow-x: auto;
    `;

    container.title = 'Cliquer sur le diagramme pour modifier le code Mermaid';

    this.ro = new ResizeObserver(() => {
      view.requestMeasure();
    });
    this.ro.observe(container);

    // Badge discret indiquant que c'est un bloc interactif
    const badge = document.createElement('div');
    badge.style.cssText = `
      position: absolute;
      top: 6px;
      right: 8px;
      font-size: 10px;
      font-weight: 600;
      color: var(--knit-text-muted);
      opacity: 0.6;
      font-family: var(--knit-font-mono);
      display: flex;
      align-items: center;
      gap: 4px;
    `;
    badge.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg><span>Mermaid</span>`;
    container.appendChild(badge);

    const svgSlot = document.createElement('div');
    svgSlot.style.cssText = 'width: 100%; display: flex; justify-content: center;';
    container.appendChild(svgSlot);

    // Clic direct pour révéler le code et positionner le curseur
    container.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: Math.min(this.from + 10, this.to) },
        scrollIntoView: true,
      });
      view.focus();
    };

    container.onmouseenter = () => {
      container.style.borderColor = 'var(--knit-primary)';
      badge.style.opacity = '1';
    };
    container.onmouseleave = () => {
      container.style.borderColor = 'var(--knit-border)';
      badge.style.opacity = '0.6';
    };

    const cacheKey = `${this.code.trim()}-${getStoredHue()}-${getStoredTheme()}`;
    const cachedSvg = svgCache.get(cacheKey);

    if (cachedSvg) {
      svgSlot.innerHTML = cachedSvg;
    } else {
      svgSlot.innerHTML = `
        <div style="font-size: 11px; color: var(--knit-text-muted); padding: 8px;">
          Génération du diagramme...
        </div>
      `;

      // Lazy-rendering avec IntersectionObserver
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            observer.disconnect();
            this.renderDiagram(svgSlot, cacheKey);
          }
        },
        { rootMargin: '100px' }
      );
      observer.observe(container);
    }

    return container;
  }

  private async renderDiagram(slot: HTMLElement, cacheKey: string) {
    try {
      configureMermaid();
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      const cleanCode = this.code.trim();
      const { svg } = await mermaid.render(id, cleanCode);
      svgCache.set(cacheKey, svg);
      slot.innerHTML = svg;
      this.viewRef?.requestMeasure();
    } catch (err: unknown) {
      console.warn('Erreur rendu diagramme Mermaid :', err);
      slot.innerHTML = `
        <div style="color: #ef4444; font-size: 12px; font-family: var(--knit-font-mono); padding: 8px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 6px;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>Erreur de syntaxe Mermaid (cliquez pour corriger)</span>
        </div>
      `;
      this.viewRef?.requestMeasure();
    }
  }
}

/**
 * Extension CodeMirror 6 pour intercepter et rendre les blocs Mermaid
 */
function buildMermaidDecorations(state: EditorState): DecorationSet {
  try {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = state.doc;
    const docText = doc.toString();
    const sel = state.selection.main;

    // Expression régulière interceptant les blocs ```mermaid ... ```
    const mermaidRegex = /```mermaid\r?\n([\s\S]*?)\r?\n```/g;
    let match: RegExpExecArray | null;
    let lastFrom = -1;

    while ((match = mermaidRegex.exec(docText)) !== null) {
      const rawFrom = match.index;
      const rawTo = match.index + match[0].length;
      const code = match[1];

      // Alignement strict sur les limites de ligne pour Decoration.replace block
      const lineFrom = doc.lineAt(rawFrom);
      const lineTo = doc.lineAt(rawTo);
      const blockFrom = lineFrom.from;
      const blockTo = lineTo.to < doc.length ? lineTo.to + 1 : lineTo.to;

      const isCursorInside = sel.to >= blockFrom && sel.from <= blockTo;

      if (!isCursorInside && blockFrom > lastFrom && blockFrom < blockTo) {
        try {
          builder.add(
            blockFrom,
            blockTo,
            Decoration.replace({
              widget: new MermaidWidget(code, blockFrom, blockTo),
              block: true,
            })
          );
          lastFrom = blockFrom;
        } catch {
          // Protection anti-collision
        }
      }
    }

    return builder.finish();
  } catch (err) {
    console.warn('Erreur rendu mermaidExtension :', err);
    return Decoration.none;
  }
}

export function createMermaidInlinePlugin() {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildMermaidDecorations(state);
    },
    update(decorations, tr) {
      if (tr.docChanged || tr.selection) {
        return buildMermaidDecorations(tr.state);
      }
      return decorations.map(tr.changes);
    },
    provide: (f) => EditorView.decorations.from(f),
  });
}
