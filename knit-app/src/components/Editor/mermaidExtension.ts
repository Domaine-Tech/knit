import { RangeSetBuilder, StateField, type EditorState } from '@codemirror/state';
import {
  EditorView,
  WidgetType,
  Decoration,
  type DecorationSet,
} from '@codemirror/view';
import mermaid from 'mermaid';
import { isLivePreviewVisualLocked } from './livePreview/visualLock';
import { getStoredHue, getStoredTheme } from '../../theme/theme';

/**
 * Cache SVG en mémoire pour éviter tout re-calcul lourd saccadé
 */
const svgCache = new Map<string, string>();

/**
 * Calcule la luminance perçue d'une couleur (hex, rgb, hsl, nom)
 * Retourne true si le fond est clair (luminance > 140/255)
 */
function isLightColor(colorStr: string): boolean {
  const c = colorStr.trim().toLowerCase();
  if (!c || c === 'none' || c === 'transparent') return false;

  // Hex 3 ou 6 caractères: #fff, #ffffff
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum > 140;
  }

  // rgb(r, g, b) ou rgba(r, g, b, a)
  const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    return lum > 140;
  }

  // hsl(h, s%, l%) ou hsla(h, s%, l%, a)
  const hslMatch = c.match(/hsla?\((\d+),\s*(\d+)%?,\s*(\d+)%?/);
  if (hslMatch) {
    const l = parseInt(hslMatch[3], 10);
    return l > 55;
  }

  // Couleurs nommées pastel / claires
  const lightNames = [
    'white', 'lightyellow', 'lightgreen', 'lightblue', 'lightcyan',
    'lightgray', 'lightpink', 'yellow', 'cyan', 'ivory', 'beige',
    'azure', 'floralwhite', 'honeydew', 'mintcream'
  ];
  if (lightNames.includes(c)) return true;

  return false;
}

/**
 * Post-traite le SVG généré pour garantir un contraste parfait (notamment pour les styles custom
 * style fill:#d4edda ou style fill:#fff3cd) et débloquer les débordements de texte
 */
export function enhanceMermaidSvg(svgContainer: HTMLElement) {
  const isDark = getStoredTheme() === 'dark';

  // 1. Contrastes des nœuds (gèrent les nœuds custom style fill:#...)
  const nodes = svgContainer.querySelectorAll('.node, .cluster');
  nodes.forEach((node) => {
    const shape = node.querySelector('rect, polygon, circle, ellipse, path') as SVGGraphicsElement | null;
    let fill = '';

    if (shape) {
      fill = shape.style.fill || shape.getAttribute('fill') || '';
    }
    if (!fill && (node as HTMLElement).style.fill) {
      fill = (node as HTMLElement).style.fill;
    }

    if (fill && fill !== 'none' && fill !== 'transparent') {
      const isLight = isLightColor(fill);
      const textEls = node.querySelectorAll('.nodeLabel, span, p, text, tspan');
      textEls.forEach((el) => {
        const htmlEl = el as HTMLElement;
        if (isLight) {
          htmlEl.style.setProperty('color', '#111827', 'important');
          htmlEl.style.setProperty('fill', '#111827', 'important');
        } else {
          htmlEl.style.setProperty('color', '#ECECEC', 'important');
          htmlEl.style.setProperty('fill', '#ECECEC', 'important');
        }
      });
    }

    // Débloquer l'overflow sur les foreignObject des nœuds
    const fo = node.querySelector('foreignObject');
    if (fo) {
      fo.style.overflow = 'visible';
    }
  });

  // 2. Débloquer l'overflow sur les titres de cluster / subgraph (évite la troncature "Proje")
  const clusterLabels = svgContainer.querySelectorAll('.cluster-label, .cluster-label foreignObject');
  clusterLabels.forEach((el) => {
    (el as HTMLElement).style.overflow = 'visible';
  });

  // 3. Étiquettes de liens/flèches (.edgeLabel)
  const edgeLabels = svgContainer.querySelectorAll('.edgeLabel');
  edgeLabels.forEach((el) => {
    const htmlEl = el as HTMLElement;
    htmlEl.style.overflow = 'visible';
    const texts = el.querySelectorAll('span, p, text, tspan');
    texts.forEach((t) => {
      (t as HTMLElement).style.setProperty('color', isDark ? '#ECECEC' : '#1A1A1A', 'important');
      (t as HTMLElement).style.setProperty('fill', isDark ? '#ECECEC' : '#1A1A1A', 'important');
    });
  });

  // 4. Débloquer tous les foreignObject globaux
  svgContainer.querySelectorAll('foreignObject').forEach((fo) => {
    if (fo instanceof SVGElement) {
      fo.style.overflow = 'visible';
    }
  });
}

/**
 * Configuration dynamique de Mermaid synchronisée avec le thème Knit et --knit-hue
 */
export function configureMermaid() {
  const isDark = getStoredTheme() === 'dark';
  const hue = getStoredHue();

  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      // Paramètres généraux de rendu
      flowchart: {
        htmlLabels: true,
        curve: 'linear',
        padding: 16,
        subGraphTitleMargin: { top: 12, bottom: 12 },
      },
      // Gantt : espacement augmenté pour éviter tout télescopage de barres & textes
      gantt: {
        useMaxWidth: true,
        leftPadding: 140,
        barHeight: 24,
        barGap: 6,
        fontSize: 11,
        sectionFontSize: 11,
      },
      // Quadrant Chart : largeur étendue & tailles équilibrées pour éviter toute superposition
      quadrantChart: {
        chartWidth: 720,
        chartHeight: 520,
        titleFontSize: 16,
        quadrantLabelFontSize: 11,
        xAxisLabelFontSize: 12,
        yAxisLabelFontSize: 12,
        pointLabelFontSize: 11,
        quadrantPadding: 10,
        xAxisLabelPadding: 10,
        yAxisLabelPadding: 24,
      },
      themeVariables: {
        darkMode: isDark,
        // Surfaces & fonds
        background: isDark ? '#1A1A1A' : '#FFFFFF',
        mainBkg: isDark ? '#262626' : '#FFFFFF',
        primaryColor: isDark ? `hsl(${hue}, 35%, 22%)` : `hsl(${hue}, 45%, 95%)`,
        primaryBorderColor: isDark ? `hsl(${hue}, 55%, 45%)` : `hsl(${hue}, 55%, 40%)`,
        nodeBorder: isDark ? `hsl(${hue}, 55%, 45%)` : `hsl(${hue}, 55%, 40%)`,
        // Textes essentiels (lisibilité garantie à 100% dans les deux thèmes)
        primaryTextColor: isDark ? '#ECECEC' : '#1A1A1A',
        textColor: isDark ? '#ECECEC' : '#1A1A1A',
        nodeTextColor: isDark ? '#ECECEC' : '#1A1A1A',
        titleColor: isDark ? '#ECECEC' : '#111827',
        // Liens & flèches
        lineColor: isDark ? `hsl(${hue}, 25%, 65%)` : `hsl(${hue}, 35%, 45%)`,
        arrowheadColor: isDark ? `hsl(${hue}, 25%, 65%)` : `hsl(${hue}, 35%, 45%)`,
        edgeLabelBackground: isDark ? '#262626' : '#FFFFFF',
        // Niveaux secondaires & tertiaires
        secondaryColor: isDark ? '#2A2A2A' : '#F3F4F6',
        secondaryTextColor: isDark ? '#ECECEC' : '#1A1A1A',
        secondaryBorderColor: isDark ? '#3E3E3E' : '#E5E5E5',
        tertiaryColor: isDark ? '#1E1E1E' : '#FAFAFA',
        tertiaryTextColor: isDark ? '#ECECEC' : '#1A1A1A',
        tertiaryBorderColor: isDark ? '#333333' : '#E5E5E5',
        // Sous-graphes
        clusterBkg: isDark ? '#141414' : '#F9FAFB',
        clusterBorder: isDark ? '#333333' : '#E5E5E5',
        // Diagrammes de séquence
        actorBkg: isDark ? '#262626' : '#F9FAFB',
        actorBorder: isDark ? `hsl(${hue}, 55%, 45%)` : `hsl(${hue}, 55%, 40%)`,
        actorTextColor: isDark ? '#ECECEC' : '#1A1A1A',
        actorLineColor: isDark ? '#4A4A4A' : '#D1D5DB',
        signalColor: isDark ? '#ECECEC' : '#1A1A1A',
        signalTextColor: isDark ? '#ECECEC' : '#1A1A1A',
        labelBoxBkgColor: isDark ? '#262626' : '#FFFFFF',
        labelBoxBorderColor: isDark ? '#444444' : '#E5E5E5',
        labelTextColor: isDark ? '#ECECEC' : '#1A1A1A',
        loopTextColor: isDark ? '#ECECEC' : '#1A1A1A',
        noteBkgColor: isDark ? '#2A2618' : '#FEF9C3',
        noteTextColor: isDark ? '#FDE047' : '#713F12',
        noteBorderColor: isDark ? '#854D0E' : '#FACC15',
        // Diagrammes de classes
        classText: isDark ? '#ECECEC' : '#1A1A1A',
        // Gantt chart variables
        sectionBkgColor: isDark ? '#262626' : '#F3F4F6',
        sectionBkgColor2: isDark ? '#1E1E1E' : '#FFFFFF',
        altSectionBkgColor: isDark ? '#1A1A1A' : '#FAFAFA',
        taskBkgColor: isDark ? `hsl(${hue}, 35%, 26%)` : `hsl(${hue}, 45%, 90%)`,
        taskBorderColor: isDark ? `hsl(${hue}, 55%, 45%)` : `hsl(${hue}, 55%, 40%)`,
        taskTextColor: isDark ? '#ECECEC' : '#1A1A1A',
        taskTextLightColor: isDark ? '#ECECEC' : '#1A1A1A',
        taskTextDarkColor: isDark ? '#ECECEC' : '#1A1A1A',
        taskTextOutsideColor: isDark ? '#ECECEC' : '#1A1A1A',
        activeTaskBkgColor: isDark ? `hsl(${hue}, 45%, 35%)` : `hsl(${hue}, 55%, 80%)`,
        activeTaskBorderColor: isDark ? `hsl(${hue}, 65%, 55%)` : `hsl(${hue}, 60%, 45%)`,
        doneTaskBkgColor: isDark ? '#374151' : '#D1D5DB',
        doneTaskBorderColor: isDark ? '#4B5563' : '#9CA3AF',
        gridColor: isDark ? '#333333' : '#E5E5E5',
        todayLineColor: '#ef4444',
        // Quadrant Chart variables
        quadrant1Fill: isDark ? '#1C271E' : '#F0FDF4',
        quadrant2Fill: isDark ? '#282417' : '#FEFCE8',
        quadrant3Fill: isDark ? '#281C1D' : '#FEF2F2',
        quadrant4Fill: isDark ? '#18232C' : '#EFF6FF',
        quadrant1TextFill: isDark ? '#86EFAC' : '#166534',
        quadrant2TextFill: isDark ? '#FDE047' : '#854D0E',
        quadrant3TextFill: isDark ? '#FCA5A5' : '#991B1B',
        quadrant4TextFill: isDark ? '#93C5FD' : '#1E40AF',
        quadrantPointFill: isDark ? '#FFFFFF' : '#111827',
        quadrantPointTextFill: isDark ? '#ECECEC' : '#1A1A1A',
        quadrantXAxisTextFill: isDark ? '#A3A3A3' : '#525252',
        quadrantYAxisTextFill: isDark ? '#A3A3A3' : '#525252',
        quadrantTitleFill: isDark ? '#ECECEC' : '#111827',
        quadrantInternalBorderStrokeFill: isDark ? '#404040' : '#D4D4D4',
        quadrantExternalBorderStrokeFill: isDark ? '#525252' : '#A3A3A3',
        // Typographie
        fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        fontSize: '13px',
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
  private theme: string;
  private hue: number;
  private viewRef?: EditorView;
  private ro?: ResizeObserver;
  private mo?: MutationObserver;
  private unbindThemeEvents?: () => void;

  constructor(code: string, from: number, to: number, theme: string, hue: number) {
    super();
    this.code = code;
    this.from = from;
    this.to = to;
    this.theme = theme;
    this.hue = hue;
  }

  eq(other: MermaidWidget) {
    return (
      other.code === this.code &&
      other.from === this.from &&
      other.to === this.to &&
      other.theme === this.theme &&
      other.hue === this.hue
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
    if (this.mo) {
      this.mo.disconnect();
      this.mo = undefined;
    }
    if (this.unbindThemeEvents) {
      this.unbindThemeEvents();
      this.unbindThemeEvents = undefined;
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

    // Réactivité immédiate au changement de thème / hue
    const handleThemeOrHueChange = () => {
      const activeTheme = getStoredTheme();
      const activeHue = getStoredHue();
      this.theme = activeTheme;
      this.hue = activeHue;
      const newCacheKey = `${this.code.trim()}-${activeHue}-${activeTheme}`;
      this.renderDiagram(svgSlot, newCacheKey);
    };

    window.addEventListener('knit-theme-changed', handleThemeOrHueChange);
    window.addEventListener('knit-hue-changed', handleThemeOrHueChange);

    this.mo = new MutationObserver(() => {
      handleThemeOrHueChange();
    });
    this.mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style'],
    });

    this.unbindThemeEvents = () => {
      window.removeEventListener('knit-theme-changed', handleThemeOrHueChange);
      window.removeEventListener('knit-hue-changed', handleThemeOrHueChange);
    };

    // Clic → mode source (sauf Hover Preview verrouillé en lecture visuelle)
    container.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isLivePreviewVisualLocked(view.state)) return;
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

    const cacheKey = `${this.code.trim()}-${this.hue}-${this.theme}`;
    const cachedSvg = svgCache.get(cacheKey);

    if (cachedSvg) {
      svgSlot.innerHTML = cachedSvg;
      enhanceMermaidSvg(svgSlot);
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
      enhanceMermaidSvg(slot);
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
    const currentTheme = getStoredTheme();
    const currentHue = getStoredHue();

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

      const visualLock = isLivePreviewVisualLocked(state);
      const isCursorInside =
        !visualLock && sel.to >= blockFrom && sel.from <= blockTo;

      if (!isCursorInside && blockFrom > lastFrom && blockFrom < blockTo) {
        try {
          builder.add(
            blockFrom,
            blockTo,
            Decoration.replace({
              widget: new MermaidWidget(code, blockFrom, blockTo, currentTheme, currentHue),
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
