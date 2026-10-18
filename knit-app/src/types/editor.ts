import type { RefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import type { IconName } from './ui';

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
  onSave?: () => void;
  onToggleViewMode?: () => void;
  onPackageAI?: () => void;
}
