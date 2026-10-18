import { WidgetType, type EditorView } from '@codemirror/view';
import {
  createDynamicBlockShell,
  extractHeadingsFromDoc,
  focusBlockSource,
} from '../../../../utils/dynamicBlockUtils';
import { scrollHeadingIntoView } from '../../../../utils/editorUtils';
import { parseBlockOptions } from '../../../../utils/queryEngine';

/**
 * Bloc dynamique knit-toc : sommaire cliquable de la note courante (B-031h)
 */
export class KnitTocWidget extends WidgetType {
  private code: string;
  private from: number;
  private to: number;
  private docText: string;

  constructor(code: string, from: number, to: number, docText: string) {
    super();
    this.code = code;
    this.from = from;
    this.to = to;
    this.docText = docText;
  }

  eq(other: KnitTocWidget): boolean {
    return (
      other.code === this.code &&
      other.from === this.from &&
      other.to === this.to &&
      other.docText === this.docText
    );
  }

  get estimatedHeight(): number {
    return 120;
  }

  toDOM(view: EditorView): HTMLElement {
    const options = parseBlockOptions(this.code);
    const depth =
      typeof options.depth === 'number'
        ? options.depth
        : typeof options.depth === 'string'
          ? Number(options.depth) || 3
          : 3;
    const collapsible = options.collapsible === true || options.collapsible === 'true';

    const container = createDynamicBlockShell('knit-toc', this.from, view);
    const body = document.createElement('div');
    body.className = 'knit-dynamic-body';

    const title = document.createElement('div');
    title.className = 'knit-dynamic-title';
    title.textContent = 'Sommaire';
    body.appendChild(title);

    const headings = extractHeadingsFromDoc(this.docText, depth);
    if (headings.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'knit-dynamic-empty';
      empty.textContent = 'Aucun titre dans cette note.';
      body.appendChild(empty);
    } else {
      const list = document.createElement(collapsible ? 'details' : 'nav');
      if (collapsible) {
        (list as HTMLDetailsElement).open = true;
        const summary = document.createElement('summary');
        summary.textContent = `${headings.length} titre(s)`;
        list.appendChild(summary);
      }
      list.className = 'knit-toc-nav';

      const ul = document.createElement('ul');
      ul.className = 'knit-toc-list';

      for (const h of headings) {
        const li = document.createElement('li');
        li.className = `knit-toc-item knit-toc-level-${h.level}`;
        li.style.paddingLeft = `${(h.level - 1) * 12}px`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'knit-toc-link knit-btn';
        btn.textContent = h.title;
        btn.setAttribute('data-tooltip', `Aller à : ${h.title}`);
        btn.addEventListener('mousedown', (e) => {
          if (e.button === 1) e.preventDefault();
        });
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const line = view.state.doc.line(h.lineIndex + 1);
          scrollHeadingIntoView(view, line.from);
        });

        li.appendChild(btn);
        ul.appendChild(li);
      }

      list.appendChild(ul);
      body.appendChild(list);
    }

    container.appendChild(body);
    container.addEventListener('dblclick', (e) => {
      e.preventDefault();
      focusBlockSource(view, this.from);
    });
    return container;
  }
}
