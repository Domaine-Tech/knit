import React, { useEffect, useRef, useState } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { search, searchKeymap, openSearchPanel } from '@codemirror/search';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { yCollab } from 'y-codemirror.next';
import { crdtManager } from '../../crdt/crdtManager';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultStore } from '../../stores/vaultStore';
import type { FrontmatterDoc } from '../../stores/vaultStore';
import { toast } from '../../stores/toastStore';
import { tabStore } from '../../stores/tabStore';

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
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [frontmatter, setFrontmatter] = useState<FrontmatterDoc | null>(null);
  const [backlinks, setBacklinks] = useState<string[]>([]);

  useEffect(() => {
    onSaveRef.current = onSave;
    onChangeRef.current = onChange;
  });

  // Détection & parsing dynamique du frontmatter YAML
  useEffect(() => {
    vaultStore.parseFrontmatter(content).then((fm) => {
      setFrontmatter(fm);
    });
  }, [content]);

  // Détection des backlinks (références entrantes vers cette note)
  useEffect(() => {
    vaultStore.getBacklinks(path).then((bl) => {
      setBacklinks(bl);
    });
  }, [path, content]);

  useEffect(() => {
    if (!editorRef.current) return;

    // Initialisation du document Yjs partagé pour ce fichier
    const ytext = crdtManager.initDocument(path, initialContentRef.current);

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
      /* Sélection active ou inactive : toujours à la couleur d'accent du client */
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-selectionLayer .cm-selectionBackground': {
        backgroundColor: 'var(--knit-primary-alpha) !important',
      },
      '& ::selection, ::selection': {
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
      /* Surlignage dynamique des correspondances de recherche */
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
        EditorState.phrases.of({
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
        }),
        search({ top: true }),
        customKeymap,
        keymap.of([...searchKeymap, ...historyKeymap, ...defaultKeymap]),
        knitEditorTheme,
        // Connexion CRDT Yjs avec yCollab
        yCollab(ytext, null),
        EditorView.domEventHandlers({
          mousedown: (event, view) => {
            if (event.button === 2) {
              const sel = view.state.selection.main;
              if (!sel.empty) {
                if (sel.from === 0 && sel.to === view.state.doc.length) {
                  if (!view.hasFocus) {
                    view.focus();
                  }
                  return true;
                }
                const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
                if (pos !== null && pos >= sel.from && pos <= sel.to) {
                  if (!view.hasFocus) {
                    view.focus();
                  }
                  return true;
                }
              }
            }
            return false;
          },
          // Gestion du collage d'images depuis le presse-papier (Ctrl+V) -> assets/
          paste: (event, view) => {
            const items = event.clipboardData?.items;
            if (!items) return false;

            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;

                const reader = new FileReader();
                reader.onload = async () => {
                  try {
                    const base64 = reader.result as string;
                    const hint = file.name && file.name !== 'image.png' ? file.name : `paste-${Date.now()}.png`;
                    const assetRelPath = await vaultStore.saveAsset(base64, hint);

                    const pos = view.state.selection.main.from;
                    const mdImg = `![${file.name || 'Image'}](${assetRelPath})`;
                    view.dispatch({
                      changes: { from: pos, insert: mdImg },
                      selection: { anchor: pos + mdImg.length },
                    });
                    toast.success('Image enregistrée', `Ajoutée dans ${assetRelPath}`);
                  } catch (err: unknown) {
                    toast.error('Erreur collage image', String(err));
                  }
                };
                reader.readAsDataURL(file);
                return true;
              }
            }
            return false;
          },
          // Gestion du glisser-déposer de fichiers images -> assets/
          drop: (event, view) => {
            const files = event.dataTransfer?.files;
            if (!files || files.length === 0) return false;

            const imageFiles: File[] = [];
            for (let i = 0; i < files.length; i++) {
              if (files[i].type.startsWith('image/')) {
                imageFiles.push(files[i]);
              }
            }

            if (imageFiles.length === 0) return false;

            event.preventDefault();
            const coords = view.posAtCoords({ x: event.clientX, y: event.clientY });
            let pos = coords !== null ? coords : view.state.selection.main.from;

            for (const file of imageFiles) {
              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  const base64 = reader.result as string;
                  const assetRelPath = await vaultStore.saveAsset(base64, file.name);
                  const mdImg = `![${file.name}](${assetRelPath})\n`;
                  view.dispatch({
                    changes: { from: pos, insert: mdImg },
                    selection: { anchor: pos + mdImg.length },
                  });
                  pos += mdImg.length;
                  toast.success('Image importée', `Enregistrée dans ${assetRelPath}`);
                } catch (err: unknown) {
                  toast.error('Erreur import image', String(err));
                }
              };
              reader.readAsDataURL(file);
            }
            return true;
          },
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const newText = update.state.doc.toString();
            onChangeRef.current(newText);

            // Auto-sauvegarde debounced (< 150ms) protégée par le WriteGuard backend
            if (saveTimerRef.current) {
              clearTimeout(saveTimerRef.current);
            }
            saveTimerRef.current = setTimeout(() => {
              vaultStore.writeFile(path, newText);
            }, 120);
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
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
      view.destroy();
      viewRef.current = null;
    };
  }, [path]);

  // Si le contenu extérieur change sans que l'éditeur ait le focus
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== content) {
        crdtManager.applyExternalContent(path, content);
      }
    }
  }, [content, path]);

  const handleEditorContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const view = viewRef.current;
    const selection = view
      ? view.state.sliceDoc(
          view.state.selection.main.from,
          view.state.selection.main.to
        )
      : '';
    const hasSelection = selection.length > 0;

    const absPath = vaultStore.getAbsolutePath(path);
    const fileName = path.split('/').pop() || path;
    const mdLink = `[${fileName.replace(/\.md$/, '')}](${path})`;

    contextMenu.show(e, [
      ...(hasSelection
        ? [
            {
              id: 'cut',
              label: 'Couper',
              icon: 'copy' as const,
              shortcut: 'Ctrl+X',
              onClick: () => {
                if (view) {
                  navigator.clipboard.writeText(selection);
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
              icon: 'copy' as const,
              shortcut: 'Ctrl+C',
              onClick: () => {
                navigator.clipboard.writeText(selection);
              },
            },
          ]
        : []),
      {
        id: 'paste',
        label: 'Coller',
        icon: 'clipboard' as const,
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
              toast.error('Presse-papier inaccessible', 'Autorisation refusée par le système');
            }
          }
        },
      },
      {
        id: 'select-all',
        label: 'Tout sélectionner',
        icon: 'check' as const,
        shortcut: 'Ctrl+A',
        onClick: () => {
          if (view) {
            view.dispatch({
              selection: { anchor: 0, head: view.state.doc.length },
            });
            view.focus();
          }
        },
      },
      { id: 'div-edit-1', divider: true },
      {
        id: 'find',
        label: 'Rechercher...',
        icon: 'search' as const,
        shortcut: 'Ctrl+F',
        onClick: () => {
          if (view) openSearchPanel(view);
        },
      },
      {
        id: 'save',
        label: 'Sauvegarder',
        icon: 'save' as const,
        shortcut: 'Ctrl+S',
        onClick: () => {
          if (onSaveRef.current) onSaveRef.current();
        },
      },
      { id: 'div-edit-2', divider: true },
      {
        id: 'reveal-file',
        label: "Révéler dans l'explorateur",
        icon: 'external-link' as const,
        onClick: () => {
          vaultStore.revealInExplorer(path);
        },
      },
      {
        id: 'copy-rel-path',
        label: 'Copier le chemin relatif',
        icon: 'copy' as const,
        onClick: () => {
          navigator.clipboard.writeText(path);
          toast.info('Chemin relatif copié', path);
        },
      },
      {
        id: 'copy-abs-path',
        label: 'Copier le chemin absolu',
        icon: 'copy' as const,
        onClick: () => {
          navigator.clipboard.writeText(absPath);
          toast.info('Chemin absolu copié', absPath);
        },
      },
      {
        id: 'copy-md-link',
        label: 'Copier le lien Markdown',
        icon: 'link' as const,
        onClick: () => {
          navigator.clipboard.writeText(mdLink);
          toast.info('Lien Markdown copié', mdLink);
        },
      },
    ]);
  };

  // Bascule dynamique du statut en conservant le reste du Markdown
  const handleCycleStatus = async () => {
    if (!frontmatter || !frontmatter.fields['statut']) return;
    const current = frontmatter.fields['statut'].trim();
    const next = current === 'a-faire' ? 'en-cours' : current === 'en-cours' ? 'termine' : 'a-faire';
    const updated = await vaultStore.updateFrontmatter(content, 'statut', next);
    onChangeRef.current(updated);
    if (viewRef.current) {
      const curDoc = viewRef.current.state.doc.toString();
      viewRef.current.dispatch({
        changes: { from: 0, to: curDoc.length, insert: updated },
      });
    }
    await vaultStore.writeFile(path, updated);
    toast.info('Statut de la tâche mis à jour', `${current} → ${next}`);
  };

  const getStatusBadgeStyle = (statut?: string): React.CSSProperties => {
    switch (statut) {
      case 'termine':
        return {
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          color: '#22c55e',
          borderColor: 'rgba(34, 197, 94, 0.3)',
        };
      case 'en-cours':
        return {
          backgroundColor: 'var(--knit-primary-alpha)',
          color: 'var(--knit-primary)',
          borderColor: 'var(--knit-primary)',
        };
      default:
        return {
          backgroundColor: 'var(--knit-surface-hover)',
          color: 'var(--knit-text-muted)',
          borderColor: 'var(--knit-border)',
        };
    }
  };

  return (
    <div
      onContextMenu={handleEditorContextMenu}
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Barre d'en-tête Frontmatter YAML & Backlinks dynamique et interactive */}
      {(frontmatter?.has_frontmatter || backlinks.length > 0) && (
        <div
          style={{
            padding: '6px 24px',
            backgroundColor: 'var(--knit-surface)',
            borderBottom: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: '12px',
            userSelect: 'none',
            flexWrap: 'wrap',
          }}
        >
          {frontmatter?.fields['id'] && (
            <span
              style={{
                fontFamily: 'var(--knit-font-mono)',
                color: 'var(--knit-text-muted)',
                backgroundColor: 'var(--knit-surface-hover)',
                padding: '2px 6px',
                borderRadius: 'var(--knit-radius-xs)',
              }}
            >
              #{frontmatter.fields['id']}
            </span>
          )}

          {frontmatter?.fields['statut'] && (
            <button
              onClick={handleCycleStatus}
              data-tooltip="Cliquer pour changer l'état"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '2px 8px',
                borderRadius: 'var(--knit-radius-sm)',
                border: '1px solid',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--knit-font-sans)',
                transition: 'all var(--knit-duration-fast)',
                ...getStatusBadgeStyle(frontmatter.fields['statut']),
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'currentColor',
                }}
              />
              {frontmatter.fields['statut']}
            </button>
          )}

          {frontmatter?.fields['priorite'] && (
            <span
              style={{
                padding: '2px 6px',
                borderRadius: 'var(--knit-radius-xs)',
                backgroundColor: 'var(--knit-surface-hover)',
                color: 'var(--knit-text-secondary)',
                fontSize: '11px',
              }}
            >
              Priorité : <strong>{frontmatter.fields['priorite']}</strong>
            </span>
          )}

          {frontmatter?.fields['assigne'] && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                color: 'var(--knit-text-secondary)',
                fontSize: '11px',
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  backgroundColor: 'var(--knit-primary)',
                  color: '#fff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '9px',
                  fontWeight: 700,
                }}
              >
                {frontmatter.fields['assigne'].slice(0, 2).toUpperCase()}
              </span>
              {frontmatter.fields['assigne']}
            </span>
          )}

          {frontmatter?.fields['tags'] && (
            <span
              style={{
                color: 'var(--knit-text-muted)',
                fontSize: '11px',
              }}
            >
              🏷️ {frontmatter.fields['tags']}
            </span>
          )}

          {backlinks.length > 0 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                marginLeft: 'auto',
                fontSize: '11px',
                color: 'var(--knit-text-muted)',
              }}
            >
              <span>🔗 {backlinks.length} référence{backlinks.length > 1 ? 's' : ''} :</span>
              {backlinks.slice(0, 3).map((bl) => {
                const name = bl.split('/').pop()?.replace(/\.md$/, '') || bl;
                return (
                  <button
                    key={bl}
                    onClick={() => {
                      vaultStore.readFile(bl).then((c) => {
                        tabStore.openTab(bl, false, c);
                      });
                    }}
                    data-tooltip={`Ouvrir "${bl}"`}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '1px 6px',
                      borderRadius: 'var(--knit-radius-xs)',
                      backgroundColor: 'var(--knit-surface-hover)',
                      color: 'var(--knit-primary)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontFamily: 'var(--knit-font-mono)',
                      fontWeight: 600,
                    }}
                  >
                    {name}
                  </button>
                );
              })}
              {backlinks.length > 3 && <span>+{backlinks.length - 3}</span>}
            </div>
          )}
        </div>
      )}

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
