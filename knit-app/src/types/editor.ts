import type { MutableRefObject, RefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import type { IconName } from './ui';
import type { ViewMode } from './views';

/**
 * Types relatifs à l'éditeur CodeMirror 6, liens et autocomplétion de Knit
 */

export interface HoverPreviewData {
  x: number;
  y: number;
  target: string;
  htmlSnippet: string;
  icon?: IconName;
}

export interface AutocompleteSourceProps {
  getFiles: () => string[];
  getTags: () => string[];
  currentPath?: string;
  getContent?: () => string;
}

export interface UseEditorLinksProps {
  path: string;
  viewRef: RefObject<EditorView | null>;
  editorRef: RefObject<HTMLDivElement | null>;
}

export interface KeymapCallbacks {
  onSave: () => void;
  onToggleViewMode: () => void;
  onPackageAI: () => void;
}

/** Paramètres du hook `useCodeMirrorEditor` (bootstrap CM6 + CRDT). */
export interface UseCodeMirrorEditorParams {
  editorRef: RefObject<HTMLDivElement | null>;
  viewRef: MutableRefObject<EditorView | null>;
  path: string;
  viewMode: ViewMode;
  isFullWidth: boolean;
  initialContentRef: MutableRefObject<string>;
  onSaveRef: MutableRefObject<() => void>;
  onChangeRef: MutableRefObject<(newContent: string) => void>;
  saveTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  knownTagsRef: MutableRefObject<string[]>;
  isDebugActiveRef: MutableRefObject<boolean>;
  handleNavigateLinkRef: MutableRefObject<
    (target: string, view?: EditorView) => void | Promise<void>
  >;
  showHoverPreviewRef: MutableRefObject<(target: string, x: number, y: number) => void>;
  hideHoverPreviewRef: MutableRefObject<(force?: boolean) => void>;
  isPreviewPinnedRef: MutableRefObject<boolean>;
}
