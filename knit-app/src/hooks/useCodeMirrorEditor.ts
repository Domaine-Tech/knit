import { useEffect } from 'react';
import { EditorState, type Extension } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { search, searchKeymap } from '@codemirror/search';
import {
  syntaxHighlighting,
  foldGutter,
  foldKeymap,
} from '@codemirror/language';
import { yCollab } from 'y-codemirror.next';
import { crdtManager } from '../crdt';
import { vaultStore } from '../stores/vaultStore';
import { toast } from '../stores/toastStore';
import { tabStore } from '../stores/tabStore';
import { debugStore } from '../stores/debugStore';
import { createKnitAutocompletion } from '../components/Editor/autocomplete';
import { createMermaidInlinePlugin } from '../components/Editor/mermaidExtension';
import { createLivePreviewPlugin } from '../components/Editor/livePreviewExtension';
import { livePreviewVisualLockFacet } from '../utils/livePreviewVisualLock';
import {
  createAutoWrapKeymap,
  createTableNavKeymap,
} from '../components/Editor/smartUxExtension';
import { createTableHelperExtension } from '../components/Editor/tableHelperExtension';
import {
  createLivePreviewDebugExtension,
  livePreviewDebugCompartment,
} from '../components/Editor/livePreviewDebugExtension';
import {
  getFlatFiles,
  findLinkAtCoords,
  packageContextForAI,
  shouldNavigateOnLinkClick,
} from '../utils';
import {
  createKnitEditorTheme,
  knitHighlightStyle,
  knitPhrases,
  createCustomEditorKeymap,
} from '../components/Editor/editorTheme';
import type { MutableRefObject } from 'react';
import type { UseCodeMirrorEditorParams } from '../types';

/** Handlers clic liens — Ctrl/Cmd ou mode lecture (clic simple). */
function createModClickLinkHandlers(
  handleNavigateLinkRef: MutableRefObject<(target: string, view?: EditorView) => void | Promise<void>>
) {
  const tryNavigate = (event: MouseEvent, view: EditorView): boolean => {
    if (!shouldNavigateOnLinkClick(event)) return false;
    const targetEl = (event.target as HTMLElement | null)?.closest(
      '[data-target]'
    ) as HTMLElement | null;
    const link =
      targetEl?.getAttribute('data-target') ||
      findLinkAtCoords(event.clientX, event.clientY, view);
    if (!link) return false;
    event.preventDefault();
    event.stopPropagation();
    void handleNavigateLinkRef.current(link, view);
    return true;
  };
  return {
    mousedown: (event: MouseEvent, view: EditorView) => tryNavigate(event, view),
    click: (event: MouseEvent, view: EditorView) => tryNavigate(event, view),
  };
}

/**
 * Bootstrap CodeMirror 6 : extensions, CRDT yCollab (page), Smart Paste, auto-save 250ms.
 * Variante `preview` : Live Preview lecture seule, sans Yjs ni autosave.
 */
export function useCodeMirrorEditor({
  editorRef,
  viewRef,
  path,
  viewMode,
  editorVariant = 'page',
  readOnly = false,
  isFullWidth,
  initialContentRef,
  onSaveRef,
  onChangeRef,
  saveTimerRef,
  knownTagsRef,
  isDebugActiveRef,
  handleNavigateLinkRef,
  showHoverPreviewRef,
  hideHoverPreviewRef,
  isPreviewPinnedRef,
}: UseCodeMirrorEditorParams): void {
  const isHoverPreview = editorVariant === 'preview';

  useEffect(() => {
    if (!editorRef.current) return;

    const knitEditorTheme = createKnitEditorTheme(isFullWidth || isHoverPreview);
    const extensions: Extension[] = [];

    const modClickHandlers = createModClickLinkHandlers(handleNavigateLinkRef);

    if (isHoverPreview) {
      // Aperçu hover : Live Preview lecture visuelle verrouillée (pas de bascule source),
      // readOnly, zéro CRDT. Liens au clic simple ; boutons (copier…) restent actifs.
      extensions.push(
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        livePreviewVisualLockFacet.of(true),
        highlightSpecialChars(),
        drawSelection(),
        EditorView.lineWrapping,
        syntaxHighlighting(knitHighlightStyle, { fallback: true }),
        markdown(),
        knitPhrases,
        knitEditorTheme,
        createMermaidInlinePlugin(),
        createLivePreviewPlugin(),
        EditorView.domEventHandlers(modClickHandlers)
      );
    } else {
      const ytext = crdtManager.initDocument(path, initialContentRef.current);
      const awareness = crdtManager.getAwareness(path);

      const customKeymap = createCustomEditorKeymap({
        onSave: () => {
          if (onSaveRef.current) {
            onSaveRef.current();
          }
        },
        onToggleViewMode: () => {
          tabStore.toggleViewMode();
        },
        onPackageAI: () => {
          packageContextForAI(path, viewRef.current?.state.doc.toString() || '');
        },
      });

      extensions.push(
        lineNumbers(),
        foldGutter(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        drawSelection(),
        EditorView.lineWrapping,
        syntaxHighlighting(knitHighlightStyle, { fallback: true }),
        markdown(),
        knitPhrases,
        search({ top: true }),
        customKeymap,
        createAutoWrapKeymap(),
        createTableNavKeymap(),
        createTableHelperExtension(),
        keymap.of([...foldKeymap, ...searchKeymap, ...historyKeymap, ...defaultKeymap]),
        knitEditorTheme,
        livePreviewDebugCompartment.of(
          isDebugActiveRef.current && viewMode === 'visual'
            ? createLivePreviewDebugExtension(() => debugStore.toggle())
            : []
        ),
        createKnitAutocompletion({
          getFiles: () => getFlatFiles(vaultStore.files),
          getTags: () => knownTagsRef.current,
          currentPath: path,
          getContent: () => viewRef.current?.state.doc.toString() || '',
        }),
        yCollab(ytext, awareness)
      );

      // Mode Zen / lecture : pas d'édition + même verrou visuel LP que le Hover Preview
      if (readOnly) {
        extensions.push(
          EditorState.readOnly.of(true),
          EditorView.editable.of(false),
          livePreviewVisualLockFacet.of(true)
        );
      }

      if (viewMode === 'visual') {
        extensions.push(createMermaidInlinePlugin());
        extensions.push(createLivePreviewPlugin());
      }

      extensions.push(
        EditorView.domEventHandlers({
          ...modClickHandlers,
          mousemove: (event, view) => {
            if (isPreviewPinnedRef.current) return;

            const targetEl = (event.target as HTMLElement | null)?.closest(
              '[data-target]'
            ) as HTMLElement | null;
            if (targetEl) {
              const link = targetEl.getAttribute('data-target');
              if (link) {
                showHoverPreviewRef.current(link, event.clientX, event.clientY);
                return;
              }
            }

            if ((event.target as HTMLElement | null)?.closest('.knit-rendered-table-card')) {
              hideHoverPreviewRef.current();
              return;
            }

            const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
            if (pos !== null) {
              const link = findLinkAtCoords(event.clientX, event.clientY, view);
              if (link) {
                showHoverPreviewRef.current(link, event.clientX, event.clientY);
                return;
              }
            }
            hideHoverPreviewRef.current();
          },
          paste: (event, view) => {
            const sel = view.state.selection.main;
            const clipboardText = event.clipboardData?.getData('text/plain');

            if (clipboardText && !sel.empty) {
              const cleanUrl = clipboardText.trim();
              if (/^https?:\/\/[^\s]+$/.test(cleanUrl)) {
                event.preventDefault();
                const selectedText = view.state.sliceDoc(sel.from, sel.to);
                const mdLink = `[${selectedText}](${cleanUrl})`;
                view.dispatch({
                  changes: { from: sel.from, to: sel.to, insert: mdLink },
                  selection: { anchor: sel.from + mdLink.length },
                });
                toast.success('Smart Paste', `Lien appliqué sur "${selectedText}"`);
                return true;
              }
            }

            const items = event.clipboardData?.items;
            if (items) {
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
                      const hint =
                        file.name && file.name !== 'image.png'
                          ? file.name
                          : `paste-${Date.now()}.png`;
                      const assetRelPath = await vaultStore.saveAsset(base64, hint);

                      const selectedText = sel.empty
                        ? ''
                        : view.state.sliceDoc(sel.from, sel.to);
                      const label = selectedText || file.name || 'Image';
                      const mdImg = `![${label}](${assetRelPath})`;

                      view.dispatch({
                        changes: { from: sel.from, to: sel.to, insert: mdImg },
                        selection: { anchor: sel.from + mdImg.length },
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
            }
            return false;
          },
        }),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || readOnly) return;
          const newText = update.state.doc.toString();
          onChangeRef.current(newText);

          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
          }
          saveTimerRef.current = setTimeout(async () => {
            try {
              await vaultStore.writeFile(path, newText);
              tabStore.markClean(path);
            } catch (err) {
              console.warn('Erreur auto-sauvegarde 250ms :', err);
            }
          }, 250);
        })
      );
    }

    try {
      const docText = initialContentRef.current;
      // Curseur hors frontmatter → widget propriétés LP (page et hover preview)
      let initialAnchor = 0;
      const fmMatch = docText.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
      if (fmMatch) {
        initialAnchor = Math.min(docText.length, fmMatch[0].length);
      }

      const state = EditorState.create({
        doc: docText,
        selection: { anchor: initialAnchor },
        extensions,
      });

      const view = new EditorView({
        state,
        parent: editorRef.current,
      });

      viewRef.current = view;
    } catch (err) {
      console.error('Erreur montage CodeMirror EditorView :', err);
    }

    return () => {
      if (!isHoverPreview && saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        if (viewRef.current) {
          try {
            const curDoc = viewRef.current.state.doc.toString();
            vaultStore.writeFile(path, curDoc).catch(() => {});
            tabStore.markClean(path);
          } catch {
            // Ignorer
          }
        }
      }
      if (viewRef.current) {
        try {
          viewRef.current.destroy();
        } catch {
          // Ignorer
        }
        viewRef.current = null;
      }
    };
  }, [
    path,
    viewMode,
    editorVariant,
    readOnly,
    isFullWidth,
    isHoverPreview,
    editorRef,
    viewRef,
    initialContentRef,
    onSaveRef,
    onChangeRef,
    saveTimerRef,
    knownTagsRef,
    isDebugActiveRef,
    handleNavigateLinkRef,
    showHoverPreviewRef,
    hideHoverPreviewRef,
    isPreviewPinnedRef,
  ]);
}
