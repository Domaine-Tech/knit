import type { GallerySource } from './gallery';
import type { AppViewMode, ViewMode } from './views';

/**
 * Types relatifs aux diagnostics de performance, profiling et HUD de debug
 */

export interface VaultProfilingRecommendation {
  severity: 'info' | 'warning' | 'urgent';
  title: string;
  description: string;
}

export interface VaultProfilingReport {
  timestamp: string;
  vaultPath: string;
  storageType: 'local_ssd' | 'network_share' | 'slow_disk';
  storageLabel: string;

  // Timing metrics (ms)
  treeWalkMs: number;
  suggestIndexMs: number;
  tasksCollectMs: number;
  tagsCollectMs: number;
  sampleIoReadMs: number;
  totalTimeMs: number;

  // Volume metrics
  totalFilesCount: number;
  markdownFilesCount: number;
  indexedHeadingsCount: number;
  indexedTagsCount: number;
  indexedTasksCount: number;

  // Throughput & Latency
  throughputDocsPerSec: number;
  averageLatencyPerDocMs: number;

  recommendations: VaultProfilingRecommendation[];
}

export interface LineDebugInfo {
  lineNum: number;
  lineTop: number;
  lineHeight: number;
  gutterTop: number;
  gutterHeight: number;
  delta: number;
  isMismatch: boolean;
  textSnippet: string;
}

export interface WidgetDebugInfo {
  type: string;
  domHeight: number;
  offsetTop: number;
}

export interface LivePreviewDebugStats {
  totalLines: number;
  visibleLines: number;
  mismatches: LineDebugInfo[];
  lines: LineDebugInfo[];
  widgets: WidgetDebugInfo[];
  timestamp: number;
}

export interface EditorDebugReport {
  path: string;
  viewMode: ViewMode;
  totalLines: number;
  stats: LivePreviewDebugStats | null;
}

export interface KanbanDragLog {
  id: string;
  time: string;
  action: 'reorder' | 'move' | 'no-op' | 'abort';
  cardTitle: string;
  cardId: string;
  fromColumn: string;
  toColumn: string;
  fromIndex: number;
  toIndex: number;
  detail: string;
}

export interface KanbanDebugReport {
  path: string | null;
  columnsCount: number;
  totalCards: number;
  completedCount: number;
  columns: Array<{ id: string; title: string; cards: number }>;
}

export interface TableDebugReport {
  path: string | null;
  rowsCount: number;
  filteredCount: number;
  columns: string[];
  sortField: string | null;
  sortOrder: 'asc' | 'desc' | string | null;
}

/** Badge d'en-tête partagé des HUD debug de vue. */
export interface ViewDebugHUDBadge {
  label: string;
  tone?: 'ok' | 'error' | 'neutral';
}

export interface CalendarDebugReport {
  path: string | null;
  variant: 'page' | 'modal';
  viewMode: string;
  scopeMode: string;
  folderScope: string;
  cursorIso: string;
  eventsTotal: number;
  eventsFiltered: number;
  filterMode: string;
  statusFilter: string;
  priorityFilter: string;
  collaborator: string;
  loading: boolean;
}

export interface CanvasDebugReport {
  path: string;
  nodesCount: number;
  edgesCount: number;
  panX: number;
  panY: number;
  zoom: number;
  activeDragNodeId: string | null;
  parseOk: boolean;
}

export interface SlidesDebugReport {
  slidesCount: number;
  index: number;
  currentChars: number;
  fullscreen: boolean;
  separatorsCount: number;
}

export interface GalleryDebugReport {
  path: string;
  cardsCount: number;
  source: GallerySource;
  uniqueTags: number;
  draggedIndex: number | null;
  targetIndex: number | null;
}

export interface GraphDebugReport {
  centerPath: string;
  nodesCount: number;
  edgesCount: number;
  backlinksCount: number;
  zoom: number;
  panX: number;
  panY: number;
  forceStepsRemaining: number;
  width: number;
  height: number;
}

export interface ImageDebugReport {
  path: string;
  resolvedUrl: string;
  failed: boolean;
  naturalWidth: number | null;
  naturalHeight: number | null;
  extension: string;
}

/** Clés des providers de stats enregistrés par les vues. */
export type DebugStatsKey =
  | 'editor'
  | 'kanban'
  | 'table'
  | 'calendar'
  | 'canvas'
  | 'slides'
  | 'gallery'
  | 'graph'
  | 'image';

export interface GlobalDebugReport {
  timestamp: string;
  isDebugActive: boolean;
  activeView: AppViewMode;
  editor?: EditorDebugReport | null;
  kanban?: KanbanDebugReport | null;
  table?: TableDebugReport | null;
  calendar?: CalendarDebugReport | null;
  canvas?: CanvasDebugReport | null;
  slides?: SlidesDebugReport | null;
  gallery?: GalleryDebugReport | null;
  graph?: GraphDebugReport | null;
  image?: ImageDebugReport | null;
  profiler?: VaultProfilingReport | null;
}

/** Libellés console pour `dumpReport` (ordre d'affichage). */
export const DEBUG_REPORT_SECTIONS: ReadonlyArray<{
  key: keyof GlobalDebugReport;
  label: string;
}> = [
  { key: 'editor', label: 'Éditeur Markdown (CodeMirror 6)' },
  { key: 'kanban', label: 'Vue Kanban' },
  { key: 'table', label: 'Vue Table' },
  { key: 'calendar', label: 'Vue Agenda' },
  { key: 'canvas', label: 'Vue Canvas' },
  { key: 'slides', label: 'Vue Diaporama' },
  { key: 'gallery', label: 'Vue Galerie' },
  { key: 'graph', label: 'Vue Graphe local' },
  { key: 'image', label: 'Vue Image' },
  { key: 'profiler', label: 'Profilage Coffre & Indexation' },
];

export interface KnitDebugGlobal {
  isActive?: boolean;
  activeView?: AppViewMode;
  isBenchmarking?: boolean;
  latestReport?: VaultProfilingReport | null;
  dumpReport?: () => void;
  getStats?: () => LivePreviewDebugStats | null;
  getView?: () => unknown;
  requestMeasure?: () => void;
  toggle?: () => void;
  [key: string]: unknown;
}

declare global {
  interface Window {
    __KNIT_DEBUG__?: KnitDebugGlobal;
  }
}
