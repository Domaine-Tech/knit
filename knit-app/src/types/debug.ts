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

export interface GlobalDebugReport {
  timestamp: string;
  isDebugActive: boolean;
  activeView: AppViewMode;
  editor?: EditorDebugReport | null;
  kanban?: unknown;
  table?: unknown;
  profiler?: VaultProfilingReport | null;
}

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
