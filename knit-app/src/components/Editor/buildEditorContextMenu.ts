import type { EditorView } from '@codemirror/view';
import type { ContextMenuItem, ViewMode } from '../../types';
import { vaultStore } from '../../stores/vaultStore';
import { toast } from '../../stores/toastStore';
import { tabStore } from '../../stores/tabStore';
import {
  buildPathCopyMenuItem,
  packageContextForAI,
  copyTextWithToast,
} from '../../utils';

export interface BuildEditorContextMenuDeps {
  path: string;
  content: string;
  view: EditorView | null;
  viewMode: ViewMode;
  isFullWidth: boolean;
  onToggleFullWidth: () => void;
}

/**
 * Construit les items du menu contextuel de l'éditeur (copie, collage, modes, chemins).
 */
export function buildEditorContextMenu(
  deps: BuildEditorContextMenuDeps
): ContextMenuItem[] {
  const { path, content, view, viewMode, isFullWidth, onToggleFullWidth } = deps;

  const selection = view
    ? view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)
    : '';
  const hasSelection = selection.length > 0;
  const absPath = vaultStore.getAbsolutePath(path);

  const selectionItems: ContextMenuItem[] = hasSelection
    ? [
        {
          id: 'cut',
          label: 'Couper',
          icon: 'copy',
          shortcut: 'Ctrl+X',
          onClick: () => {
            if (view) {
              void copyTextWithToast(selection, 'Texte coupé');
              const sel = view.state.selection.main;
              view.dispatch({
                changes: { from: sel.from, to: sel.to, insert: '' },
              });
            }
          },
        },
        {
          id: 'copy',
          label: 'Copier',
          icon: 'copy',
          shortcut: 'Ctrl+C',
          onClick: () => {
            void copyTextWithToast(selection, 'Texte copié');
          },
        },
      ]
    : [];

  return [
    ...selectionItems,
    {
      id: 'paste',
      label: 'Coller',
      icon: 'clipboard',
      shortcut: 'Ctrl+V',
      onClick: async () => {
        if (view) {
          try {
            const text = await navigator.clipboard.readText();
            if (text) {
              const sel = view.state.selection.main;
              view.dispatch({
                changes: { from: sel.from, to: sel.to, insert: text },
                selection: { anchor: sel.from + text.length },
              });
              view.focus();
            }
          } catch {
            toast.error('Presse-papier inaccessible', 'Autorisation refusée');
          }
        }
      },
    },
    {
      id: 'package-ai',
      label: 'Copier le contexte IA de la note',
      icon: 'command',
      shortcut: 'Ctrl+Shift+C',
      onClick: () => {
        packageContextForAI(path, content);
      },
    },
    { id: 'div-edit-1', divider: true },
    {
      id: 'toggle-mode',
      label:
        viewMode === 'visual'
          ? 'Basculer en Code Source brut'
          : 'Basculer en Vue Live Preview',
      icon: 'file-markdown',
      shortcut: 'Ctrl+E',
      onClick: () => tabStore.toggleViewMode(),
    },
    {
      id: 'toggle-width',
      label: isFullWidth ? 'Largeur de lecture saine (760px)' : 'Mode Pleine Largeur',
      icon: 'slider',
      onClick: onToggleFullWidth,
    },
    { id: 'div-edit-2', divider: true },
    {
      id: 'reveal-file',
      label: "Révéler dans l'explorateur",
      icon: 'external-link',
      onClick: () => {
        vaultStore.revealInExplorer(path);
      },
    },
    buildPathCopyMenuItem({
      relPath: path,
      absPath,
      includeMarkdownLink: true,
    }),
  ];
}
