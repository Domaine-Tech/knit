import { EditorView, keymap } from '@codemirror/view';
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { openSearchPanel } from '@codemirror/search';
import { EditorState } from '@codemirror/state';

/**
 * Thème CodeMirror 6 stylé avec les tokens Knit CSS et support de la largeur saine (760px vs pleine largeur)
 */
export function createKnitEditorTheme(isFullWidth: boolean) {
  return EditorView.theme({
    '&': {
      height: '100%',
      backgroundColor: 'var(--knit-surface)',
      color: 'var(--knit-text)',
      fontSize: '14px',
      fontFamily: 'var(--knit-font-mono)',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
      lineHeight: '1.6',
      padding: '0',
    },
    '.cm-content': {
      caretColor: 'var(--knit-primary)',
      maxWidth: isFullWidth ? '100%' : '760px',
      margin: '0 auto',
      padding: isFullWidth ? '16px 32px' : '16px 20px',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'var(--knit-primary)',
      borderLeftWidth: '2px',
    },
    '.cm-cursorLayer': {
      zIndex: '10 !important',
      pointerEvents: 'none !important',
    },
    '.cm-selectionLayer': {
      zIndex: '5 !important',
      pointerEvents: 'none !important',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-selectionLayer .cm-selectionBackground': {
      backgroundColor: 'hsla(var(--knit-hue), 70%, 55%, 0.35) !important',
      opacity: '1 !important',
    },
    '& ::selection, ::selection': {
      backgroundColor: 'hsla(var(--knit-hue), 70%, 55%, 0.35) !important',
    },
    '.cm-gutters': {
      backgroundColor: 'var(--knit-surface)',
      color: 'var(--knit-text-muted)',
      borderRight: '1px solid var(--knit-border)',
      paddingRight: '6px',
      userSelect: 'none',
    },
    '.cm-gutterElement': {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingRight: '4px',
      boxSizing: 'border-box',
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--knit-surface-hover)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'var(--knit-surface-hover)',
      color: 'var(--knit-text)',
    },
    '.cm-foldGutter span': {
      color: 'var(--knit-text-muted)',
      cursor: 'pointer',
      fontSize: '11px',
    },
    '.cm-foldGutter span:hover': {
      color: 'var(--knit-primary)',
    },
    '.cm-searchMatch': {
      backgroundColor: 'hsla(var(--knit-hue), 80%, 50%, 0.3)',
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: 'hsla(var(--knit-hue), 80%, 50%, 0.6)',
    },
    '.cm-content .cm-link, .cm-link, .tok-link': {
      color: 'var(--knit-primary) !important',
      textDecoration: 'underline',
    },
    '.cm-content .cm-url, .cm-url, .tok-url': {
      color: 'var(--knit-primary) !important',
      opacity: '0.85',
    },
    '.cm-tooltip.cm-tooltip-autocomplete': {
      backgroundColor: 'var(--knit-surface) !important',
      border: '1px solid var(--knit-border) !important',
      borderRadius: 'var(--knit-radius-md) !important',
      boxShadow: 'var(--knit-shadow-lg) !important',
      color: 'var(--knit-text) !important',
      fontFamily: 'var(--knit-font) !important',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected="true"], .cm-tooltip-autocomplete ul li.cm-completionSelected': {
      backgroundColor: 'var(--knit-primary-alpha) !important',
      color: 'var(--knit-text) !important',
    },
    '.cm-tooltip-autocomplete ul li:hover:not([aria-selected="true"]):not(.cm-completionSelected)': {
      backgroundColor: 'var(--knit-surface-hover) !important',
    },
    '.cm-completionMatchedText': {
      color: 'var(--knit-primary) !important',
      fontWeight: '700 !important',
    },
    '.cm-completionDetail': {
      color: 'var(--knit-text-muted) !important',
      fontFamily: 'var(--knit-font-mono) !important',
    },
  });
}

/**
 * Style de coloration syntaxique propre à Knit connecté aux variables CSS
 */
export const knitHighlightStyle = HighlightStyle.define([
  { tag: tags.link, color: 'var(--knit-primary)', textDecoration: 'underline' },
  { tag: tags.url, color: 'var(--knit-primary)', opacity: '0.85' },
  { tag: tags.heading, color: 'var(--knit-text)', fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.keyword, color: 'var(--knit-primary)' },
  { tag: tags.atom, color: 'var(--knit-primary-hover)' },
  { tag: tags.bool, color: 'var(--knit-primary-hover)' },
  { tag: tags.meta, color: 'var(--knit-text-muted)' },
  { tag: tags.comment, color: 'var(--knit-text-muted)', fontStyle: 'italic' },
  { tag: tags.monospace, color: 'var(--knit-text)' },
  { tag: tags.quote, color: 'var(--knit-text-secondary)', fontStyle: 'italic' },
  { tag: tags.contentSeparator, color: 'var(--knit-border)' },
]);

/**
 * Traduction française des libellés du panneau de recherche CodeMirror 6
 */
export const knitPhrases = EditorState.phrases.of({
  'Find': 'Rechercher...',
  'Replace': 'Remplacer par...',
  'next': 'Suivant',
  'previous': 'Précédent',
  'all': 'Tout',
  'match case': 'Casse',
  'by word': 'Mot entier',
  'regexp': 'RegEx',
  'replace': 'Remplacer',
  'replace all': 'Tout remplacer',
  'close': 'Fermer',
});

interface KeymapCallbacks {
  onSave: () => void;
  onToggleViewMode: () => void;
  onPackageAI: () => void;
}

/**
 * Crée le keymap des raccourcis spécifiques à l'éditeur Knit (Ctrl+S, Ctrl+F, Ctrl+H, Ctrl+E, Ctrl+Shift+C)
 */
export function createCustomEditorKeymap(callbacks: KeymapCallbacks) {
  return keymap.of([
    {
      key: 'Mod-s',
      run: () => {
        callbacks.onSave();
        return true;
      },
    },
    {
      key: 'Mod-f',
      run: openSearchPanel,
    },
    {
      key: 'Mod-h',
      run: (view) => {
        openSearchPanel(view);
        setTimeout(() => {
          const replaceInput = view.dom.querySelector('.cm-search input[name="replace"]') as HTMLInputElement | null;
          if (replaceInput) {
            replaceInput.focus();
            replaceInput.select();
          }
        }, 20);
        return true;
      },
    },
    {
      key: 'Mod-e',
      run: () => {
        callbacks.onToggleViewMode();
        return true;
      },
    },
    {
      key: 'Mod-Shift-c',
      run: () => {
        callbacks.onPackageAI();
        return true;
      },
    },
  ]);
}
