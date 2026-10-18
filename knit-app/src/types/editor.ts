import type { MutableRefObject, RefObject } from 'react';
import type { EditorView } from '@codemirror/view';
import type { IconName } from './ui';
import type { DocType, ViewMode } from './views';

/**
 * Types relatifs à l'éditeur CodeMirror 6, liens et autocomplétion de Knit
 */

/** Variante éditeur : page (onglet + CRDT) ou preview (hover, sans Yjs). */
export type EditorVariant = 'page' | 'preview';

export interface HoverPreviewData {
  /** Coin haut-gauche du panneau (calculé). */
  x: number;
  y: number;
  /** Coordonnées curseur (fenêtre root) — source unique du placement. */
  originX: number;
  originY: number;
  target: string;
  /** Stubs (URL, dossier, ancre) — absent quand une vue DocType React est montée. */
  htmlSnippet?: string;
  icon?: IconName;
  /** Type Doc-Driven pour monter la même vue que l'onglet. */
  docType?: DocType;
  /** Contenu Markdown (fichiers vault). */
  content?: string;
}

/** Payload sans coordonnées (résolution async avant placement souris). */
export type HoverPreviewPayload = Omit<
  HoverPreviewData,
  'x' | 'y' | 'originX' | 'originY'
>;

/** Détail CustomEvent `knit-hover-link` (CM / widgets). */
export type KnitHoverLinkDetail =
  | { target: string; x: number; y: number }
  | { force: true }
  | null;

export interface ClampPreviewPositionOptions {
  /** Largeur immersive selon le DocType (si `width` absent). */
  docType?: DocType;
  /** Largeur mesurée du panneau (sinon largeur DocType / défaut). */
  width?: number;
  /** Hauteur mesurée du panneau (sinon estimation). */
  height?: number;
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
  /** false = Hover Preview (pas de leave/wheel éditeur). */
  enableSideEffects?: boolean;
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
  /** `preview` = Live Preview lecture seule sans Yjs (Hover Preview). */
  editorVariant?: EditorVariant;
  /** Mode lecture (Zen) : editable false, CRDT réception seule. */
  readOnly?: boolean;
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
