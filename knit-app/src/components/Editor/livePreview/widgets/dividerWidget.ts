import { WidgetType } from '@codemirror/view';

/**
 * 4. Séparateur horizontal (---)
 */
export class DividerWidget extends WidgetType {
  eq(_other: DividerWidget) {
    return true;
  }

  get estimatedHeight(): number {
    return 28;
  }

  toDOM(): HTMLElement {
    const hr = document.createElement('div');
    hr.className = 'knit-preview-hr';
    return hr;
  }
}
