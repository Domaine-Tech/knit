import React, { useEffect, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { crdtManager } from '../../crdt';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultStore } from '../../stores/vaultStore';
import type { ViewMode, LivePreviewDebugStats } from '../../types';
import { networkStore } from '../../stores/networkStore';
import {
  createLivePreviewDebugExtension,
  livePreviewDebugCompartment,
} from './livePreviewDebugExtension';
import { LivePreviewDebugHUD } from './LivePreviewDebugHUD';
import { debugStore } from '../../stores/debugStore';
import { useDebugMode, useEditorLinks, useCodeMirrorEditor } from '../../hooks';
import { getFlatFiles, scrollHeadingIntoView } from '../../utils';
import { EditorChrome } from './EditorChrome';
import { HoverPreviewPortal } from './HoverPreviewPortal';
import { buildEditorContextMenu } from './buildEditorContextMenu';

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

  const {
    hoverPreview,
    nestedHoverPreview,
    isPreviewPinned,
    isPreviewPinnedRef,
    setPreviewHovered,
    showNestedHoverPreview,
    hideNestedHoverPreview,
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

  const { isDebugActive, toggleDebug } = useDebugMode();
  const isDebugActiveRef = useRef(isDebugActive);
  useEffect(() => {
    isDebugActiveRef.current = isDebugActive;
  }, [isDebugActive]);
  const [debugStats, setDebugStats] = useState<LivePreviewDebugStats | null>(null);

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

  useCodeMirrorEditor({
    editorRef,
    viewRef,
    path,
    viewMode,
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
  });

  useEffect(() => {
    if (!initialLine || initialLine <= 0) return;
    const view = viewRef.current;
    if (!view) return;

    const timer = setTimeout(() => {
      try {
        const totalLines = view.state.doc.lines;
        const targetLineNum = Math.min(Math.max(1, initialLine), totalLines);
        const lineInfo = view.state.doc.line(targetLineNum);
        scrollHeadingIntoView(view, lineInfo.from);
      } catch {
        // ignore
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [initialLine]);

  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== content) {
        crdtManager.applyExternalContent(path, content);
        setAiGhostActive(true);
        const t = setTimeout(() => setAiGhostActive(false), 1500);
        return () => clearTimeout(t);
      }
    }
  }, [content, path]);

  const handleEditorContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    contextMenu.show(
      e,
      buildEditorContextMenu({
        path,
        content,
        view: viewRef.current,
        viewMode,
        isFullWidth,
        onToggleFullWidth: handleToggleFullWidth,
      })
    );
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

      <EditorChrome
        path={path}
        content={content}
        backlinks={backlinks}
        unlinkedMentions={unlinkedMentions}
        isBacklinksPanelOpen={isBacklinksPanelOpen}
        onToggleBacklinksPanel={() => setIsBacklinksPanelOpen((p) => !p)}
        isFullWidth={isFullWidth}
        onToggleFullWidth={handleToggleFullWidth}
      />

      <div
        ref={editorRef}
        style={{
          width: '100%',
          flex: 1,
          overflow: 'hidden',
        }}
      />

      <HoverPreviewPortal
        hoverPreview={hoverPreview}
        nestedHoverPreview={nestedHoverPreview}
        isPreviewPinned={isPreviewPinned}
        setPreviewHovered={setPreviewHovered}
        showNestedHoverPreview={showNestedHoverPreview}
        hideNestedHoverPreview={hideNestedHoverPreview}
        hideHoverPreview={(force) => hideHoverPreviewRef.current(force)}
        onNavigate={(target) => {
          void handleNavigateLinkRef.current(target, viewRef.current || undefined);
        }}
      />

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
