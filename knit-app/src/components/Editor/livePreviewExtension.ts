import { StateEffect, StateField, type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, type DecorationSet } from '@codemirror/view';
import { buildLivePreviewDecorations } from './livePreview/buildDecorations';
import { vaultStore } from '../../stores/vaultStore';

/** Force le recalcul des widgets knit-* quand l'index Frontmatter change */
export const refreshDynamicBlocksEffect = StateEffect.define<null>();

export function createLivePreviewPlugin(): Extension {
  const field = StateField.define<DecorationSet>({
    create(state) {
      return buildLivePreviewDecorations(state);
    },
    update(decorations, tr) {
      const needsRebuild =
        tr.docChanged ||
        tr.selection ||
        tr.effects.some((e) => e.is(refreshDynamicBlocksEffect));
      if (needsRebuild) {
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

  const indexSync = ViewPlugin.fromClass(
    class {
      private unsub: () => void;

      constructor(view: EditorView) {
        this.unsub = vaultStore.subscribeFrontmatterIndex(() => {
          // Préserver le scroll : le rebuild des widgets ne doit pas « téléporter »
          const scrollTop = view.scrollDOM.scrollTop;
          view.dispatch({ effects: refreshDynamicBlocksEffect.of(null) });
          requestAnimationFrame(() => {
            view.scrollDOM.scrollTop = scrollTop;
          });
        });
      }

      destroy() {
        this.unsub();
      }
    }
  );

  return [field, measureListener, indexSync];
}
