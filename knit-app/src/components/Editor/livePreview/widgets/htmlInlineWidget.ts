import { WidgetType } from '@codemirror/view';

/**
 * Widget Live Preview pour balises HTML whitelistées inline (B-059).
 * Les blocs `<details>` multi-ligne sont gérés par `HtmlDetailsWidget`.
 */
export class HtmlInlineWidget extends WidgetType {
  private tag: string;
  private innerText: string;
  private raw: string;

  constructor(tag: string, innerText: string, raw: string) {
    super();
    this.tag = tag;
    this.innerText = innerText;
    this.raw = raw;
  }

  eq(other: HtmlInlineWidget): boolean {
    return this.raw === other.raw;
  }

  toDOM(): HTMLElement {
    const tag = this.tag.toLowerCase();
    if (tag === 'br') {
      return document.createElement('br');
    }

    const el = document.createElement(
      tag === 'kbd' || tag === 'mark' || tag === 'u' || tag === 'sub' || tag === 'sup'
        ? tag
        : 'span'
    );
    el.className = `knit-html-${tag}`;
    el.textContent = this.innerText;
    return el;
  }

  ignoreEvent(): boolean {
    return false;
  }
}
