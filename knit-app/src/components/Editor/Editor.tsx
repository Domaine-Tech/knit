import React, { useEffect, useRef, useState } from 'react';
import type { EditorView } from '@codemirror/view';
import { crdtManager } from '../../crdt';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultStore } from '../../stores/vaultStore';
import type { ViewMode, LivePreviewDebugStats, EditorVariant } from '../../types';
import { networkStore } from '../../stores/networkStore';
import {
  createLivePreviewDebugExtension,
  livePreviewDebugCompartment,
} from './livePreviewDebugExtension';
import { LivePreviewDebugHUD } from './LivePreviewDebugHUD';
import { debugStore } from '../../stores/debugStore';
import { useDebugMode, useEditorLinks, useCodeMirrorEditor, useRegisterDebugStats } from '../../hooks';
import { fileStem, getFlatFiles, scrollHeadingIntoView, stripFrontmatterBody } from '../../utils';
import { EditorChrome } from './EditorChrome';
import { buildEditorContextMenu } from './buildEditorContextMenu';

interface EditorProps {
  content: string;
  path: string;
  viewMode?: ViewMode;
  /** `preview` = Hover Preview (Live Preview sans CRDT, chrome masqué). */
  variant?: EditorVariant;
  /** Mode lecture (Zen) : editable false, liens au clic simple. */
  readOnly?: boolean;
  isDirty?: boolean;
  initialLine?: number;
  onChange: (newContent: string) => void;
  onSave: () => void;
  onNavigateFile?: (targetPath: string) => void;
}

/** Primary hover note (CM LP) — distinct du nested HTML (~80 lignes). */
const PREVIEW_MAX_LINES = 280;

function truncateForPreview(raw: string): string {
  const stripped = stripFrontmatterBody(raw);
  const lines = stripped.split('\n');
  if (lines.length <= PREVIEW_MAX_LINES) return stripped;
  return `${lines.slice(0, PREVIEW_MAX_LINES).join('\n')}\n\n…`;
}

export const Editor: React.FC<EditorProps> = ({
  content,
  path,
  viewMode = 'visual',
  variant = 'page',
  readOnly = false,
  initialLine,
  onChange,
  onSave,
  onNavigateFile,
}) => {
  const isHoverPreview = variant === 'preview';
  const editorContent = isHoverPreview ? truncateForPreview(content) : content;

  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onChange);
  const initialContentRef = useRef(editorContent);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [backlinks, setBacklinks] = useState<string[]>([]);
  const [unlinkedMentions, setUnlinkedMentions] = useState<string[]>([]);
  const [isBacklinksPanelOpen, setIsBacklinksPanelOpen] = useState(false);
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const knownTagsRef = useRef(knownTags);
  const [, setTick] = useState(0);

  const [isFullWidth, setIsFullWidth] = useState(() => {
    if (isHoverPreview) return true;
    return localStorage.getItem('knit-reading-fullwidth') === 'true';
  });

  const [aiGhostActive, setAiGhostActive] = useState(false);

  const {
    isPreviewPinnedRef,
    handleNavigateLinkRef,
    showHoverPreviewRef,
    hideHoverPreviewRef,
  } = useEditorLinks({ path, viewRef, editorRef, enableSideEffects: !isHoverPreview });

  const handleToggleFullWidth = () => {
    if (isHoverPreview) return;
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
    if (isHoverPreview) return;
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
  }, [isDebugActive, viewMode, isHoverPreview]);

  useRegisterDebugStats(
    'editor',
    {
      path,
      viewMode,
      totalLines: debugStats?.totalLines ?? 0,
      stats: debugStats,
    },
    !isHoverPreview
  );

  useEffect(() => {
    knownTagsRef.current = knownTags;
  }, [knownTags]);

  useEffect(() => {
    if (isHoverPreview) return;
    vaultStore.getVaultTags().then((tags) => {
      setKnownTags(tags.map((t) => t.tag));
    });
  }, [content, isHoverPreview]);

  useEffect(() => {
    if (isHoverPreview) return;
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
  }, [isHoverPreview]);

  useEffect(() => {
    if (isHoverPreview) return;
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
  }, [toggleDebug, isHoverPreview]);

  useEffect(() => {
    if (isHoverPreview) return;
    return networkStore.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, [isHoverPreview]);

  useEffect(() => {
    onSaveRef.current = onSave;
    onChangeRef.current = onChange;
  }, [onSave, onChange]);

  // Remonter le contenu initial si le path / preview change
  useEffect(() => {
    initialContentRef.current = editorContent;
  }, [path, editorContent]);

  useEffect(() => {
    if (isHoverPreview) return;
    vaultStore.getBacklinks(path).then((bl) => {
      setBacklinks(bl);
    });

    const currentTitle = fileStem(path);
    if (currentTitle.length >= 3) {
      const allFiles = getFlatFiles(vaultStore.files);
      const unlinked: string[] = [];
      Promise.all(
        allFiles
          .filter((f) => f !== path)
          .slice(0, 15)
          .map(async (f) => {
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
  }, [path, content, isHoverPreview]);

  useCodeMirrorEditor({
    editorRef,
    viewRef,
    path,
    viewMode: isHoverPreview ? 'visual' : viewMode,
    editorVariant: variant,
    // Preview : branche dédiée (variant) ; Zen page : readOnly → visualLock + editable false
    readOnly: isHoverPreview ? true : readOnly,
    isFullWidth: isHoverPreview ? true : isFullWidth,
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
    if (isHoverPreview || !initialLine || initialLine <= 0) return;
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
  }, [initialLine, isHoverPreview]);

  useEffect(() => {
    if (isHoverPreview) return;
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
  }, [content, path, isHoverPreview]);

  const handleEditorContextMenu = (e: React.MouseEvent) => {
    if (isHoverPreview) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
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
      className={isHoverPreview ? 'knit-editor-hover-preview' : undefined}
      style={{
        flex: isHoverPreview ? 'none' : 1,
        height: isHoverPreview ? 'auto' : '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: isHoverPreview ? 'visible' : 'hidden',
        position: 'relative',
        boxShadow: !isHoverPreview && aiGhostActive ? 'inset 0 0 0 2px #8B5CF6' : 'none',
        transition: 'box-shadow 0.5s ease',
        minHeight: isHoverPreview ? 0 : undefined,
      }}
    >
      {!isHoverPreview && aiGhostActive && (
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

      {!isHoverPreview && (
        <EditorChrome
          path={path}
          content={content}
          backlinks={backlinks}
          unlinkedMentions={unlinkedMentions}
          isBacklinksPanelOpen={isBacklinksPanelOpen}
          onToggleBacklinksPanel={() => setIsBacklinksPanelOpen((p) => !p)}
          isFullWidth={isFullWidth}
          onToggleFullWidth={handleToggleFullWidth}
          onNavigateFile={onNavigateFile}
        />
      )}

      <div
        ref={editorRef}
        style={{
          width: '100%',
          flex: isHoverPreview ? 'none' : 1,
          height: isHoverPreview ? 'auto' : undefined,
          overflow: isHoverPreview ? 'visible' : 'hidden',
          fontSize: isHoverPreview ? 11.5 : undefined,
        }}
      />

      {!isHoverPreview && isDebugActive && viewMode === 'visual' && (
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
