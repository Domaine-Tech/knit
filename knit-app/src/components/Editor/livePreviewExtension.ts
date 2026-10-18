import { StateField, type Extension } from '@codemirror/state';
import { EditorView, type DecorationSet } from '@codemirror/view';
import { buildLivePreviewDecorations } from './livePreview/buildDecorations';

export function createLivePreviewPlugin(): Extension {
  const field = StateField.define<DecorationSet>({
    create(state) {
      return buildLivePreviewDecorations(state);
    },
    update(decorations, tr) {
      if (tr.docChanged || tr.selection) {
        return buildLivePreviewDecorations(tr.state);
      }
      return decorations.map(tr.changes);
    },
    provide: (f) => EditorView.decorations.from(f),
  });

  const measureListener = EditorView.updateListener.of((update) => {
    if (update.docChanged || update.geometryChanged) {
      update.view.requestMeasure();
    }
  });

  return [field, measureListener];
}
