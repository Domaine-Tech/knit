import { WidgetType, type EditorView } from '@codemirror/view';

function getCalloutIcon(type: string): string {
  switch (type) {
    case 'tip':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
    case 'warning':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    case 'important':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    case 'caution':
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    case 'note':
    default:
      return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }
}

export class CalloutHeaderWidget extends WidgetType {
  private type: string;
  private title: string;
  private from: number;

  constructor(type: string, title: string, from: number) {
    super();
    this.type = type;
    this.title = title || type.charAt(0).toUpperCase() + type.slice(1);
    this.from = from;
  }

  eq(other: CalloutHeaderWidget) {
    return other.type === this.type && other.title === this.title && other.from === this.from;
  }

  toDOM(view: EditorView): HTMLElement {
    const header = document.createElement('div');
    header.className = 'knit-callout-header-content';

    const iconSpan = document.createElement('span');
    iconSpan.className = 'knit-callout-icon';
    iconSpan.innerHTML = getCalloutIcon(this.type);

    const titleSpan = document.createElement('span');
    titleSpan.className = 'knit-callout-title';
    titleSpan.textContent = this.title;

    header.appendChild(iconSpan);
    header.appendChild(titleSpan);

    header.onclick = () => {
      view.dispatch({ selection: { anchor: this.from } });
      view.focus();
    };

    return header;
  }
}
