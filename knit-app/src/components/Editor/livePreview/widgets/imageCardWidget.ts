import { WidgetType, type EditorView } from '@codemirror/view';
import { resolveAssetUrl } from '../../../../utils/assetUrl';

/**
 * 7. Widget d'affichage immersif d'images Markdown (![alt](url))
 */
export class ImageCardWidget extends WidgetType {
  private alt: string;
  private url: string;
  private from: number;
  private to: number;
  private ro?: ResizeObserver;

  constructor(alt: string, url: string, from: number, to: number) {
    super();
    this.alt = alt;
    this.url = url;
    this.from = from;
    this.to = to;
  }

  eq(other: ImageCardWidget) {
    return (
      other.alt === this.alt &&
      other.url === this.url &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  get estimatedHeight(): number {
    return 260;
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

  toDOM(view: EditorView): HTMLElement {
    const card = document.createElement('div');
    card.className = 'knit-preview-image-card';
    card.title = "Cliquer sur l'image pour modifier le lien Markdown";

    this.ro = new ResizeObserver(() => {
      view.requestMeasure();
    });
    this.ro.observe(card);

    const img = document.createElement('img');
    img.className = 'knit-preview-img';
    img.alt = this.alt;
    img.src = resolveAssetUrl(this.url);
    img.loading = 'lazy';

    img.onload = () => {
      view.requestMeasure();
    };

    img.onerror = () => {
      view.requestMeasure();
      card.innerHTML = `
        <div class="knit-image-fallback">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          <div class="knit-image-fallback-text">
            <span class="knit-image-fallback-title">${this.alt || 'Image introuvable'}</span>
            <span class="knit-image-fallback-url">${this.url}</span>
          </div>
        </div>
      `;
    };

    card.appendChild(img);

    if (this.alt && this.alt.trim().length > 0) {
      const caption = document.createElement('div');
      caption.className = 'knit-preview-image-caption';
      caption.textContent = this.alt;
      card.appendChild(caption);
    }

    card.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      view.dispatch({
        selection: { anchor: this.from },
        scrollIntoView: true,
      });
      view.focus();
    };

    return card;
  }
}
