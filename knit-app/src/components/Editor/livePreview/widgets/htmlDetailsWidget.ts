import { WidgetType, type EditorView } from '@codemirror/view';
import { renderBlockMarkdown, renderSimpleMarkdown } from '../../../../utils/markdownUtils';
import { focusBlockSource } from '../../../../utils/dynamicBlockUtils';
import { shouldNavigateOnLinkClick } from '../../../../utils/linkNavigateMode';

/**
 * Bloc `<details>` / `<summary>` multi-ligne (B-059) — widget block CodeMirror.
 */
export class HtmlDetailsWidget extends WidgetType {
  private raw: string;
  private from: number;
  private to: number;
  private isOpen: boolean;
  private ro?: ResizeObserver;

  constructor(raw: string, from: number, to: number, isOpen: boolean) {
    super();
    this.raw = raw;
    this.from = from;
    this.to = to;
    this.isOpen = isOpen;
  }

  eq(other: HtmlDetailsWidget): boolean {
    return (
      other.raw === this.raw &&
      other.from === this.from &&
      other.to === this.to &&
      other.isOpen === this.isOpen
    );
  }

  get estimatedHeight(): number {
    return this.isOpen ? 160 : 40;
  }

  coordsAt(dom: HTMLElement): DOMRect | null {
    return dom.getBoundingClientRect();
  }

  destroy() {
    if (this.ro) {
      this.ro.disconnect();
      this.ro = undefined;
    }
  }

  ignoreEvent(event: Event): boolean {
    const t = event.target as HTMLElement | null;
    if (!t) return false;
    // Laisser le navigateur gérer ouverture/fermeture du summary
    if (t.closest('summary') || t.tagName === 'SUMMARY') {
      return event.type === 'mousedown' || event.type === 'click';
    }
    return false;
  }

  toDOM(view: EditorView): HTMLElement {
    const details = document.createElement('details');
    details.className = 'knit-html-details';
    if (this.isOpen) details.open = true;

    const inner = this.raw
      .replace(/^<details(?:\s[^>]*)?>/i, '')
      .replace(/<\/details>\s*$/i, '');

    const summaryMatch = inner.match(/<summary(?:\s[^>]*)?>([\s\S]*?)<\/summary>/i);
    const summaryEl = document.createElement('summary');
    summaryEl.innerHTML = renderSimpleMarkdown(
      (summaryMatch?.[1] ?? 'Détails').trim()
    );
    details.appendChild(summaryEl);

    const bodyMd = inner
      .replace(/<summary(?:\s[^>]*)?>[\s\S]*?<\/summary>/i, '')
      .trim();

    if (bodyMd) {
      const body = document.createElement('div');
      body.className = 'knit-html-details-body';
      body.innerHTML = renderBlockMarkdown(bodyMd);
      details.appendChild(body);
    }

    this.ro = new ResizeObserver(() => {
      view.requestMeasure();
    });
    this.ro.observe(details);

    details.addEventListener('toggle', () => {
      view.requestMeasure();
    });

    details.addEventListener('dblclick', (e) => {
      const link = (e.target as HTMLElement).closest('[data-target]');
      if (link) return;
      e.preventDefault();
      e.stopPropagation();
      focusBlockSource(view, this.from);
    });

    details.addEventListener('click', (e) => {
      const linkEl = (e.target as HTMLElement).closest(
        '[data-target]'
      ) as HTMLElement | null;
      if (!linkEl) return;
      if (!shouldNavigateOnLinkClick(e)) return;
      e.preventDefault();
      e.stopPropagation();
      const targetUrl = linkEl.getAttribute('data-target');
      if (targetUrl) {
        details.dispatchEvent(
          new CustomEvent('knit-navigate-link', {
            bubbles: true,
            detail: { url: targetUrl },
          })
        );
      }
    });

    details.setAttribute('data-tooltip', 'Double-clic pour éditer le source');
    return details;
  }
}
