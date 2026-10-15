import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { search, searchKeymap, openSearchPanel } from '@codemirror/search';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

interface EditorProps {
  content: string;
  path: string;
  isDirty?: boolean;
  onChange: (newContent: string) => void;
  onSave: () => void;
}

export const Editor: React.FC<EditorProps> = ({
  content,
  path,
  onChange,
  onSave,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onChange);
  const initialContentRef = useRef(content);

  useEffect(() => {
    onSaveRef.current = onSave;
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!editorRef.current) return;

    // Thème CodeMirror 6 stylé avec les tokens Knit
    const knitEditorTheme = EditorView.theme({
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
        padding: '16px 24px',
      },
      '.cm-content': {
        caretColor: 'var(--knit-primary)',
        maxWidth: '860px',
        margin: '0 auto',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: 'var(--knit-primary)',
        borderLeftWidth: '2px',
      },
      '&.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: 'var(--knit-primary-alpha) !important',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--knit-surface)',
        color: 'var(--knit-text-muted)',
        borderRight: '1px solid var(--knit-border)',
        userSelect: 'none',
      },
      '.cm-activeLine': {
        backgroundColor: 'var(--knit-surface-hover)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--knit-surface-hover)',
        color: 'var(--knit-text)',
      },
      /* Barre de recherche CodeMirror stylée */
      '.cm-panels': {
        backgroundColor: 'var(--knit-surface)',
        color: 'var(--knit-text)',
        borderBottom: '1px solid var(--knit-border)',
      },
      '.cm-panels.cm-panels-top': {
        borderBottom: '1px solid var(--knit-border)',
      },
      '.cm-search': {
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '6px',
        padding: '8px 16px',
        backgroundColor: 'var(--knit-surface)',
        fontSize: '12px',
      },
      '.cm-search br': {
        width: '100%',
        height: '0px',
        margin: '0',
      },
      '.cm-search label': {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        userSelect: 'none',
        color: 'var(--knit-text-secondary)',
      },
      '.cm-search button[name="close"]': {
        marginLeft: 'auto',
      },
      '.cm-search input': {
        padding: '4px 8px',
        borderRadius: 'var(--knit-radius-sm)',
        border: '1px solid var(--knit-border)',
        backgroundColor: 'var(--knit-bg)',
        color: 'var(--knit-text)',
        outline: 'none',
      },
      '.cm-search input:focus': {
        borderColor: 'var(--knit-primary)',
      },
      '.cm-search button': {
        padding: '4px 10px',
        borderRadius: 'var(--knit-radius-sm)',
        border: '1px solid var(--knit-border)',
        backgroundColor: 'var(--knit-bg)',
        color: 'var(--knit-text)',
        cursor: 'pointer',
      },
      '.cm-search button:hover': {
        backgroundColor: 'var(--knit-surface-hover)',
      },
      '.cm-searchMatch': {
        backgroundColor: 'hsla(var(--knit-hue), 80%, 50%, 0.3)',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'hsla(var(--knit-hue), 80%, 50%, 0.6)',
      },
      /* Liens Markdown et URLs adaptés dynamiquement à la teinte du client */
      '.cm-content .cm-link, .cm-link, .tok-link': {
        color: 'var(--knit-primary) !important',
        textDecoration: 'underline',
      },
      '.cm-content .cm-url, .cm-url, .tok-url': {
        color: 'var(--knit-primary) !important',
        opacity: '0.85',
      },
    });

    // Style de coloration syntaxique propre à Knit connecté aux variables CSS
    const knitHighlightStyle = HighlightStyle.define([
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

    const customKeymap = keymap.of([
      {
        key: 'Mod-s',
        run: () => {
          if (onSaveRef.current) {
            onSaveRef.current();
          }
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
    ]);

    const state = EditorState.create({
      doc: initialContentRef.current,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        EditorView.lineWrapping,
        syntaxHighlighting(knitHighlightStyle, { fallback: true }),
        markdown(),
        search({ top: true }),
        customKeymap,
        keymap.of([...searchKeymap, ...historyKeymap, ...defaultKeymap]),
        knitEditorTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newText = update.state.doc.toString();
            onChangeRef.current(newText);
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [path]); // Recrée l'éditeur uniquement si on change de fichier

  // Si le contenu extérieur change sans que l'éditeur ait le focus
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== content) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: content },
        });
      }
    }
  }, [content]);

  return (
    <div
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div
        ref={editorRef}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
        }}
      />
    </div>
  );
};
