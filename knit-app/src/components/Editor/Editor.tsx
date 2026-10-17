import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EditorState } from '@codemirror/state';
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
import { crdtManager } from '../../crdt/crdtManager';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultStore } from '../../stores/vaultStore';
import { toast } from '../../stores/toastStore';
import { tabStore, type ViewMode } from '../../stores/tabStore';
import { networkStore } from '../../stores/networkStore';
import { createKnitAutocompletion } from './autocomplete';
import { createMermaidInlinePlugin } from './mermaidExtension';
import { createLivePreviewPlugin } from './livePreviewExtension';
import {
  createAutoWrapKeymap,
  createTableNavKeymap,
  packageContextForAI,
} from './smartUxExtension';
import {
  createLivePreviewDebugExtension,
  livePreviewDebugCompartment,
  type LivePreviewDebugStats,
} from './livePreviewDebugExtension';
import { LivePreviewDebugHUD } from './LivePreviewDebugHUD';
import { debugStore, useDebugMode } from '../../stores/debugStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { getFlatFiles } from '../../utils/markdownUtils';
import {
  copyRelativePath,
  copyAbsolutePath,
  copyMarkdownLink,
} from '../../utils/clipboardUtils';
import { useEditorLinks, findLinkAtCoords } from './useEditorLinks';
import {
  createKnitEditorTheme,
  knitHighlightStyle,
  knitPhrases,
  createCustomEditorKeymap,
} from './editorTheme';

interface EditorProps {
  content: string;
  path: string;
  viewMode?: ViewMode;
  isDirty?: boolean;
  initialLine?: number;
  onChange: (newContent: string) => void;
  onSave: () => void;
  onNavigateFile?: (targetPath: string) => void;
}

export const Editor: React.FC<EditorProps> = ({
  content,
  path,
  viewMode = 'visual',
  initialLine,
  onChange,
  onSave,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onChange);
  const initialContentRef = useRef(content);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [backlinks, setBacklinks] = useState<string[]>([]);
  const [unlinkedMentions, setUnlinkedMentions] = useState<string[]>([]);
  const [isBacklinksPanelOpen, setIsBacklinksPanelOpen] = useState(false);
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const knownTagsRef = useRef<string[]>(knownTags);
  const [, setTick] = useState(0);

  // Confort de lecture : 760px par défaut vs Pleine Largeur (US B-030e)
  const [isFullWidth, setIsFullWidth] = useState(() => {
    return localStorage.getItem('knit-reading-fullwidth') === 'true';
  });

  // Curseur Fantôme IA (US B-044) : Violet #8B5CF6 avec fade-out 1.5s
  const [aiGhostActive, setAiGhostActive] = useState(false);

  // Gestion unifiée des liens, navigation et info-bulles Hover Preview via hook extrait
  const {
    hoverPreview,
    handleNavigateLinkRef,
    showHoverPreviewRef,
    hideHoverPreviewRef,
  } = useEditorLinks({ path, viewRef, editorRef });

  const handleToggleFullWidth = () => {
    const next = !isFullWidth;
    setIsFullWidth(next);
    localStorage.setItem('knit-reading-fullwidth', String(next));
    setTimeout(() => {
      viewRef.current?.requestMeasure();
    }, 10);
  };

  // Mode Debug Global (Inspecteur Live Viewer & Éditeur)
  const { isDebugActive, toggleDebug } = useDebugMode();
  const isDebugActiveRef = useRef(isDebugActive);
  useEffect(() => {
    isDebugActiveRef.current = isDebugActive;
  }, [isDebugActive]);
  const [debugStats, setDebugStats] = useState<LivePreviewDebugStats | null>(null);

  // Synchronisation du compartiment CodeMirror réactif quand isDebugActive change
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: livePreviewDebugCompartment.reconfigure(
          isDebugActive && viewMode === 'visual'
            ? createLivePreviewDebugExtension(() => debugStore.toggle())
            : []
        ),
      });
      viewRef.current.requestMeasure();
    }
  }, [isDebugActive, viewMode]);

  // Enregistrement des métriques de l'éditeur dans le debugStore global
  useEffect(() => {
    debugStore.registerEditorStats(() => ({
      path,
      viewMode,
      totalLines: viewRef.current?.state.doc.lines ?? 0,
      stats: debugStats,
    }));
    return () => {
      debugStore.unregisterEditorStats();
    };
  }, [path, viewMode, debugStats]);

  useEffect(() => {
    knownTagsRef.current = knownTags;
  }, [knownTags]);

  useEffect(() => {
    vaultStore.getVaultTags().then((tags) => {
      setKnownTags(tags.map((t) => t.tag));
    });
  }, [content]);

  // Indicateur visuel de navigation de lien lors du maintien de Ctrl / Meta
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        editorRef.current?.classList.add('knit-ctrl-active');
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        editorRef.current?.classList.remove('knit-ctrl-active');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Écoute des événements de débogage HUD CodeMirror
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;

    const onDebugUpdate = (e: Event) => {
      const custom = e as CustomEvent<LivePreviewDebugStats>;
      if (custom.detail) {
        setDebugStats(custom.detail);
      }
    };
    const onToggleDebugEvent = () => {
      toggleDebug();
    };

    el.addEventListener('knit-live-debug-update', onDebugUpdate);
    window.addEventListener('knit-toggle-live-debug', onToggleDebugEvent);

    return () => {
      el.removeEventListener('knit-live-debug-update', onDebugUpdate);
      window.removeEventListener('knit-toggle-live-debug', onToggleDebugEvent);
    };
  }, [toggleDebug]);

  useEffect(() => {
    return networkStore.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  useEffect(() => {
    onSaveRef.current = onSave;
    onChangeRef.current = onChange;
  }, [onSave, onChange]);
  useEffect(() => {
    vaultStore.getBacklinks(path).then((bl) => {
      setBacklinks(bl);
    });

    // Détection des mentions non liées (textes mentionnant le titre de cette note sans crochets)
    const currentTitle = path.split('/').pop()?.replace(/\.md$/, '') || '';
    if (currentTitle.length >= 3) {
      const allFiles = getFlatFiles(vaultStore.files);
      const unlinked: string[] = [];
      Promise.all(
        allFiles.filter((f) => f !== path).slice(0, 15).map(async (f) => {
          try {
            const fc = await vaultStore.readFile(f);
            if (fc.includes(currentTitle) && !fc.includes(`[[${currentTitle}`)) {
              unlinked.push(f);
            }
          } catch {
            // ignore
          }
        })
      ).then(() => {
        setUnlinkedMentions(unlinked);
      });
    }
  }, [path, content]);

  useEffect(() => {
    if (!editorRef.current) return;

    // Initialisation du document Yjs partagé pour ce fichier et son awareness collaboratif
    const ytext = crdtManager.initDocument(path, initialContentRef.current);
    const awareness = crdtManager.getAwareness(path);

    // Thème CodeMirror 6 stylé avec les tokens Knit et respect de la largeur saine
    const knitEditorTheme = createKnitEditorTheme(isFullWidth);

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

    const extensions = [
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
      keymap.of([...foldKeymap, ...searchKeymap, ...historyKeymap, ...defaultKeymap]),
      knitEditorTheme,
      // Mode Debug Live Viewer (Compartment CodeMirror réactif)
      livePreviewDebugCompartment.of(
        isDebugActiveRef.current && viewMode === 'visual'
          ? createLivePreviewDebugExtension(() => debugStore.toggle())
          : []
      ),
      // Autocomplétion omni-trigger unifiée
      createKnitAutocompletion({
        getFiles: () => getFlatFiles(vaultStore.files),
        getTags: () => knownTagsRef.current,
        currentPath: path,
        getContent: () => viewRef.current?.state.doc.toString() || '',
      }),
      // CRDT Yjs avec yCollab
      yCollab(ytext, awareness),
    ];

    // En mode Visuel : ajouter Mermaid inline et Live Preview Obsidian
    if (viewMode === 'visual') {
      extensions.push(createMermaidInlinePlugin());
      extensions.push(createLivePreviewPlugin());
    }

    extensions.push(
      EditorView.domEventHandlers({
        mousedown: (event, view) => {
          if (event.ctrlKey || event.metaKey) {
            const targetEl = (event.target as HTMLElement | null)?.closest('[data-target]') as HTMLElement | null;
            const link = targetEl?.getAttribute('data-target') || findLinkAtCoords(event.clientX, event.clientY, view);
            if (link) {
              event.preventDefault();
              event.stopPropagation();
              handleNavigateLinkRef.current(link, view);
              return true;
            }
          }
          return false;
        },
        click: (event, view) => {
          if (event.ctrlKey || event.metaKey) {
            const targetEl = (event.target as HTMLElement | null)?.closest('[data-target]') as HTMLElement | null;
            const link = targetEl?.getAttribute('data-target') || findLinkAtCoords(event.clientX, event.clientY, view);
            if (link) {
              event.preventDefault();
              event.stopPropagation();
              handleNavigateLinkRef.current(link, view);
              return true;
            }
          }
          return false;
        },
        mousemove: (event, view) => {
          // 1. Détection prioritaire par attribut data-target (tables ou marks live preview)
          const targetEl = (event.target as HTMLElement | null)?.closest('[data-target]') as HTMLElement | null;
          if (targetEl) {
            const link = targetEl.getAttribute('data-target');
            if (link) {
              showHoverPreviewRef.current(link, event.clientX, event.clientY);
              return;
            }
          }

          // 2. Si on est dans le corps d'un tableau rendu sans être sur un data-target, masquer le hover
          if ((event.target as HTMLElement | null)?.closest('.knit-rendered-table-card')) {
            hideHoverPreviewRef.current();
            return;
          }

          // 3. Détection par coordonnées dans le texte source / CodeMirror
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
        // Smart Paste (URL sur sélection / Image)
        paste: (event, view) => {
          const sel = view.state.selection.main;
          const clipboardText = event.clipboardData?.getData('text/plain');

          // Smart Paste 1 : Si du texte est sélectionné et qu'on colle une URL
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

          // Smart Paste 2 : Collage d'image
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
                    const hint = file.name && file.name !== 'image.png' ? file.name : `paste-${Date.now()}.png`;
                    const assetRelPath = await vaultStore.saveAsset(base64, hint);

                    const selectedText = sel.empty ? '' : view.state.sliceDoc(sel.from, sel.to);
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
        if (update.docChanged) {
          const newText = update.state.doc.toString();
          onChangeRef.current(newText);

          // Flush disque atomique temporisé à 250ms avec WriteGuard backend (Sprint 6 DoD 9)
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
        }
      })
    );

    try {
      // Positionnement initial du curseur :
      // Si le document possède un Frontmatter (--- ... ---), positionner le curseur APRES le frontmatter
      // pour que la carte des propriétés YAML reste affichée dès l'ouverture sans être masquée par le curseur sur la ligne 1 !
      const docText = initialContentRef.current;
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
      if (saveTimerRef.current) {
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
  }, [path, viewMode, isFullWidth, handleNavigateLinkRef, showHoverPreviewRef, hideHoverPreviewRef]);

  // Positionnement dynamique sur la ligne demandée
  useEffect(() => {
    if (!initialLine || initialLine <= 0) return;
    const view = viewRef.current;
    if (!view) return;

    const timer = setTimeout(() => {
      try {
        const totalLines = view.state.doc.lines;
        const targetLineNum = Math.min(Math.max(1, initialLine), totalLines);
        const lineInfo = view.state.doc.line(targetLineNum);
        view.dispatch({
          selection: { anchor: lineInfo.from },
          scrollIntoView: true,
        });
        view.focus();
      } catch {
        // ignore
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [initialLine]);

  // Si le contenu extérieur change (ex: synchronisation IA externe) -> Curseur Fantôme IA (B-044)
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== content) {
        crdtManager.applyExternalContent(path, content);
        // Activer l'effet visuel du Curseur Fantôme IA (#8B5CF6) pendant 1.5s
        setAiGhostActive(true);
        const t = setTimeout(() => setAiGhostActive(false), 1500);
        return () => clearTimeout(t);
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
              toast.error('Presse-papier inaccessible', 'Autorisation refusée');
            }
          }
        },
      },
      {
        id: 'package-ai',
        label: 'Copier le contexte IA de la note',
        icon: 'command' as const,
        shortcut: 'Ctrl+Shift+C',
        onClick: () => {
          packageContextForAI(path, content);
        },
      },
      { id: 'div-edit-1', divider: true },
      {
        id: 'toggle-mode',
        label: viewMode === 'visual' ? 'Basculer en Code Source brut' : 'Basculer en Vue Live Preview',
        icon: 'file-markdown' as const,
        shortcut: 'Ctrl+E',
        onClick: () => tabStore.toggleViewMode(),
      },
      {
        id: 'toggle-width',
        label: isFullWidth ? 'Largeur de lecture saine (760px)' : 'Mode Pleine Largeur',
        icon: 'slider' as const,
        onClick: handleToggleFullWidth,
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
          copyRelativePath(path);
        },
      },
      {
        id: 'copy-abs-path',
        label: 'Copier le chemin absolu',
        icon: 'copy' as const,
        onClick: () => {
          copyAbsolutePath(absPath);
        },
      },
      {
        id: 'copy-md-link',
        label: 'Copier le lien Markdown',
        icon: 'link' as const,
        onClick: () => {
          copyMarkdownLink(path);
        },
      },
    ]);
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
        boxShadow: aiGhostActive ? 'inset 0 0 0 2px #8B5CF6' : 'none',
        transition: 'box-shadow 0.5s ease',
      }}
    >
      {/* Curseur Fantôme IA (B-044) : Badge discret lors d'une intervention IA */}
      {aiGhostActive && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 20,
            zIndex: 20,
            backgroundColor: '#8B5CF6',
            color: '#FFFFFF',
            padding: '3px 10px',
            borderRadius: 'var(--knit-radius-sm)',
            fontSize: '11px',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            animation: 'fadeIn 0.2s',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
          Ghost Cursor IA actif
        </div>
      )}

      {/* Barre rétroliens & confort (US B-053) */}
      {(backlinks.length > 0 || unlinkedMentions.length > 0) && (
        <div
          style={{
            padding: '4px 20px',
            backgroundColor: 'var(--knit-surface)',
            borderBottom: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '12px',
            userSelect: 'none',
          }}
        >
          <button
            onClick={() => setIsBacklinksPanelOpen((p) => !p)}
            data-tooltip="Afficher l'inspecteur des rétroliens"
            style={{
              background: isBacklinksPanelOpen ? 'var(--knit-primary-alpha)' : 'none',
              border: '1px solid var(--knit-border)',
              padding: '2px 8px',
              borderRadius: 'var(--knit-radius-xs)',
              color: isBacklinksPanelOpen ? 'var(--knit-primary)' : 'var(--knit-text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <DuotoneIcon name="link" size={12} />
            <span>
              {backlinks.length} lié{backlinks.length > 1 ? 's' : ''}
              {unlinkedMentions.length > 0 ? ` • ${unlinkedMentions.length} non lié(s)` : ''}
            </span>
          </button>

          <button
            onClick={handleToggleFullWidth}
            data-tooltip={isFullWidth ? 'Basculer en centré (760px)' : 'Basculer en pleine largeur'}
            style={{
              background: 'none',
              border: '1px solid var(--knit-border)',
              padding: '2px 7px',
              borderRadius: 'var(--knit-radius-xs)',
              color: 'var(--knit-text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <DuotoneIcon name="slider" size={12} />
            <span>{isFullWidth ? 'Pleine largeur' : '760px'}</span>
          </button>

          <button
            onClick={() => packageContextForAI(path, content)}
            data-tooltip="Copier le contexte IA au format <document>"
            data-shortcut="Ctrl+Shift+C"
            style={{
              background: 'none',
              border: '1px solid var(--knit-border)',
              padding: '2px 8px',
              borderRadius: 'var(--knit-radius-xs)',
              color: 'var(--knit-primary)',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <DuotoneIcon name="command" size={12} />
            <span>Packager IA</span>
          </button>
        </div>
      )}

      {/* Inspecteur déroulant des Rétroliens (Backlinks Panel) */}
      {isBacklinksPanelOpen && (
        <div
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--knit-surface)',
            borderBottom: '1px solid var(--knit-border)',
            display: 'flex',
            gap: 24,
            fontSize: '12px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--knit-text-secondary)', marginBottom: 6 }}>
              <DuotoneIcon name="link" size={13} style={{ color: 'var(--knit-primary)' }} />
              <span>Mentions liées ({backlinks.length})</span>
            </div>
            {backlinks.length === 0 ? (
              <div style={{ color: 'var(--knit-text-muted)', fontSize: 11 }}>Aucune note ne lie ce document.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {backlinks.map((bl) => (
                  <button
                    key={bl}
                    onClick={() => {
                      vaultStore.readFile(bl).then((c) => tabStore.openTab(bl, false, c));
                    }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--knit-radius-xs)',
                      backgroundColor: 'var(--knit-surface-hover)',
                      border: '1px solid var(--knit-border)',
                      color: 'var(--knit-primary)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontFamily: 'var(--knit-font-mono)',
                    }}
                  >
                    {bl}
                  </button>
                ))}
              </div>
            )}
          </div>

          {unlinkedMentions.length > 0 && (
            <div style={{ flex: 1, borderLeft: '1px solid var(--knit-border)', paddingLeft: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--knit-text-secondary)', marginBottom: 6 }}>
                <DuotoneIcon name="search" size={13} style={{ color: 'var(--knit-text-muted)' }} />
                <span>Mentions non liées ({unlinkedMentions.length})</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {unlinkedMentions.map((um) => (
                  <button
                    key={um}
                    onClick={() => {
                      vaultStore.readFile(um).then((c) => tabStore.openTab(um, false, c));
                    }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--knit-radius-xs)',
                      backgroundColor: 'var(--knit-surface-hover)',
                      border: '1px dashed var(--knit-border)',
                      color: 'var(--knit-text-muted)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontFamily: 'var(--knit-font-mono)',
                    }}
                  >
                    {um}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteneur CodeMirror 6 */}
      <div
        ref={editorRef}
        style={{
          width: '100%',
          flex: 1,
          overflow: 'hidden',
        }}
      />

      {/* Hover Preview Tooltip flottant (US B-053) via React Portal vers document.body */}
      {hoverPreview &&
        createPortal(
          <div
            className="knit-floating-hover-preview"
            style={{
              position: 'fixed',
              left: hoverPreview.x,
              top: hoverPreview.y,
              zIndex: 99999,
              width: 360,
              maxWidth: '90vw',
              padding: '12px 14px',
              backgroundColor: 'var(--knit-surface, #1e1e24)',
              border: '1px solid var(--knit-border, #333)',
              borderRadius: 'var(--knit-radius-md, 8px)',
              boxShadow: '0 8px 28px rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none',
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--knit-text, #fff)',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--knit-primary, #6366f1)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <DuotoneIcon name={hoverPreview.icon || 'file-markdown'} size={14} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{hoverPreview.target}</span>
            </div>
            <div
              className="knit-hover-preview-body"
              dangerouslySetInnerHTML={{ __html: hoverPreview.htmlSnippet }}
              style={{
                maxHeight: 140,
                overflowY: 'hidden',
                fontSize: 11.5,
                lineHeight: 1.45,
                color: 'var(--knit-text-secondary, #ccc)',
              }}
            />
          </div>,
          document.body
        )}

      {/* Inspecteur HUD en bas de l'éditeur (Mode Debug Global) */}
      {isDebugActive && viewMode === 'visual' && (
        <LivePreviewDebugHUD
          stats={debugStats}
          onToggle={toggleDebug}
          onRequestMeasure={() => {
            viewRef.current?.requestMeasure();
          }}
        />
      )}
    </div>
  );
};
