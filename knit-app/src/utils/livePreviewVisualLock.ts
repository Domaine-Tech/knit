import { Facet, type EditorState } from '@codemirror/state';

/**
 * Contrat lecture partagé — Hover Preview et Mode Zen (Ctrl+Shift+F) :
 * widgets Live Preview toujours affichés (pas de bascule source au clic).
 * Contrôles interactifs (copier, liens, details) restent actifs.
 * Différences hover-only : strip FM, chrome compact, portal (hors de ce facet).
 */
export const livePreviewVisualLockFacet = Facet.define<boolean, boolean>({
  combine: (values) => values.some(Boolean),
});

export function isLivePreviewVisualLocked(state: EditorState): boolean {
  return state.facet(livePreviewVisualLockFacet);
}
