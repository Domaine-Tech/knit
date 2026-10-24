import { vaultStore } from './vaultStore';
import { flattenFileNodes } from '../utils';

import type {
  AppViewMode,
  VaultProfilingRecommendation,
  VaultProfilingReport,
  GlobalDebugReport,
  DebugStatsKey,
} from '../types';
import { DEBUG_REPORT_SECTIONS } from '../types';

type DebugListener = () => void;
type StatsProvider = () => unknown;
type StatsForKey<K extends DebugStatsKey> = GlobalDebugReport[K];

class DebugStore {
  private _isActive: boolean = (() => {
    try {
      if (typeof window !== 'undefined') {
        return sessionStorage.getItem('knit_debug_active') === 'true';
      }
    } catch {
      // Ignorer si indisponible
    }
    return false;
  })();
  private _activeView: AppViewMode = 'editor';
  private _isBenchmarking: boolean = false;
  private _latestProfilingReport: VaultProfilingReport | null = null;
  private listeners: Set<DebugListener> = new Set();
  private statsProviders = new Map<DebugStatsKey, StatsProvider>();

  constructor() {
    this.setupWindowBridge();
  }

  public get isActive(): boolean {
    return this._isActive;
  }

  public get activeView(): AppViewMode {
    return this._activeView;
  }

  public get isBenchmarking(): boolean {
    return this._isBenchmarking;
  }

  public get latestProfilingReport(): VaultProfilingReport | null {
    return this._latestProfilingReport;
  }

  public setActiveView(view: AppViewMode) {
    if (this._activeView !== view) {
      this._activeView = view;
      this.notify();
    }
  }

  public subscribe(listener: DebugListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err: unknown) {
        console.error('[DebugStore] Erreur notification listener:', err);
      }
    });
  }

  private persistActiveState() {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('knit_debug_active', String(this._isActive));
      }
    } catch {
      // Ignorer si non accessible
    }
  }

  public toggle(): boolean {
    this._isActive = !this._isActive;
    this.persistActiveState();
    this.notify();
    window.dispatchEvent(
      new CustomEvent('knit-debug-toggled', {
        detail: { isActive: this._isActive, view: this._activeView },
      })
    );
    return this._isActive;
  }

  public setDebug(active: boolean) {
    if (this._isActive !== active) {
      this._isActive = active;
      this.persistActiveState();
      this.notify();
      window.dispatchEvent(
        new CustomEvent('knit-debug-toggled', {
          detail: { isActive: this._isActive, view: this._activeView },
        })
      );
    }
  }

  public registerStats<K extends DebugStatsKey>(
    key: K,
    provider: () => StatsForKey<K>
  ): void {
    this.statsProviders.set(key, provider as StatsProvider);
  }

  public unregisterStats(key: DebugStatsKey): void {
    this.statsProviders.delete(key);
  }

  private readStats<K extends DebugStatsKey>(key: K): StatsForKey<K> {
    const provider = this.statsProviders.get(key);
    if (!provider) return null as StatsForKey<K>;
    return provider() as StatsForKey<K>;
  }

  /**
   * Lance un benchmark complet de profiling sur le coffre actif :
   * Mesure l'I/O disque/réseau, le temps de parcours d'arborescence,
   * la vitesse de construction de l'index d'autocomplétion, et détecte
   * les goulots d'étranglement (partages SMB/NFS, coffres volumineux).
   */
  public async runVaultBenchmark(): Promise<VaultProfilingReport> {
    this._isBenchmarking = true;
    this.notify();

    const t0 = performance.now();
    const vaultPath = vaultStore.currentVaultPath || 'Knit Demo Vault';
    const isUNC = vaultPath.startsWith('\\\\') || vaultPath.startsWith('//');

    // 1. Parcours de l'arborescence
    const tTree0 = performance.now();
    const treeNodes = vaultStore.files;
    const treeWalkMs = Math.round((performance.now() - tTree0) * 10) / 10;

    const flatFiles = flattenFileNodes(treeNodes).map((f) => f.path);
    const totalFilesCount = flatFiles.length;
    const mdFiles = flatFiles.filter((f) => f.endsWith('.md') || f.endsWith('.markdown'));
    const markdownFilesCount = mdFiles.length;

    // 2. Index d'autocomplétion (KnitSuggestIndex)
    const tSuggest0 = performance.now();
    const suggestData = await vaultStore.getSuggestIndex();
    const suggestIndexMs = Math.round((performance.now() - tSuggest0) * 10) / 10;
    const indexedHeadingsCount = suggestData.headings.length;
    const indexedTagsCount = suggestData.tags.length;

    // 3. Collecte des tâches Markdown
    const tTasks0 = performance.now();
    const tasks = await vaultStore.getVaultTasks();
    const tasksCollectMs = Math.round((performance.now() - tTasks0) * 10) / 10;
    const indexedTasksCount = tasks.length;

    // 4. Collecte des tags
    const tTags0 = performance.now();
    await vaultStore.getVaultTags();
    const tagsCollectMs = Math.round((performance.now() - tTags0) * 10) / 10;

    // 5. Échantillonnage de la latence I/O par lecture unitaire de fichiers
    const sampleFiles = mdFiles.slice(0, 5);
    const tIo0 = performance.now();
    for (const sf of sampleFiles) {
      try {
        await vaultStore.readFile(sf);
      } catch {
        // Ignorer
      }
    }
    const sampleIoTotal = performance.now() - tIo0;
    const sampleIoReadMs =
      sampleFiles.length > 0
        ? Math.round((sampleIoTotal / sampleFiles.length) * 10) / 10
        : 0.5;

    const totalTimeMs = Math.round((performance.now() - t0) * 10) / 10;
    const totalTimeSec = Math.max(0.001, totalTimeMs / 1000);
    const throughputDocsPerSec = Math.round((markdownFilesCount / totalTimeSec) * 10) / 10;
    const averageLatencyPerDocMs =
      markdownFilesCount > 0
        ? Math.round((totalTimeMs / markdownFilesCount) * 10) / 10
        : 0;

    // Détection du type de stockage et latence
    let storageType: 'local_ssd' | 'network_share' | 'slow_disk' = 'local_ssd';
    let storageLabel = 'Stockage Local NVMe / SSD Rapide';

    if (isUNC || sampleIoReadMs > 12) {
      storageType = 'network_share';
      storageLabel = isUNC
        ? 'Partage Réseau UNC (SMB / CIFS / NFS)'
        : 'Partage Réseau distant (latence I/O > 12ms/doc)';
    } else if (sampleIoReadMs > 4) {
      storageType = 'slow_disk';
      storageLabel = 'Disque dur mécanique (HDD) ou support externe USB';
    }

    // Recommandations d'optimisations automatisées
    const recommendations: VaultProfilingRecommendation[] = [];

    if (storageType === 'network_share') {
      recommendations.push({
        severity: 'urgent',
        title: 'Optimisation Partage Réseau requise (SMB / NFS)',
        description:
          'Latence réseau détectée par appel I/O. Recommandation : Activer la persistance du cache binaire (.knit/cache/suggest.bin) avec invalidation incrémentale par hachage mtime plutôt que de rescanner les fichiers distants.',
      });
      recommendations.push({
        severity: 'warning',
        title: 'Parallélisation par lots (Batch I/O Rayon)',
        description:
          'Exécuter les lectures de fichiers en parallèle (threadpool Rayon côté Rust) pour saturer la bande passante réseau et réduire le temps d\'attente total par un facteur 4x à 10x.',
      });
    }

    if (totalFilesCount > 2000) {
      recommendations.push({
        severity: 'warning',
        title: 'Coffre volumineux (> 2 000 fichiers)',
        description:
          'Indexation incrémentale par événement de FileWatcher conseillée : seul le fichier modifié ou créé doit être réindexé en mémoire.',
      });
    }

    if (suggestIndexMs < 15 && storageType === 'local_ssd') {
      recommendations.push({
        severity: 'info',
        title: 'Excellentes performances locales',
        description: `Indexation de ${markdownFilesCount} documents terminée en ${suggestIndexMs}ms (${throughputDocsPerSec} docs/s). Aucune latence perceptible pour l'utilisateur.`,
      });
    }

    const report: VaultProfilingReport = {
      timestamp: new Date().toISOString(),
      vaultPath,
      storageType,
      storageLabel,
      treeWalkMs,
      suggestIndexMs,
      tasksCollectMs,
      tagsCollectMs,
      sampleIoReadMs,
      totalTimeMs,
      totalFilesCount,
      markdownFilesCount,
      indexedHeadingsCount,
      indexedTagsCount,
      indexedTasksCount,
      throughputDocsPerSec,
      averageLatencyPerDocMs,
      recommendations,
    };

    this._latestProfilingReport = report;
    this._isBenchmarking = false;
    this.notify();
    return report;
  }

  public generateReport(): GlobalDebugReport {
    return {
      timestamp: new Date().toISOString(),
      isDebugActive: this._isActive,
      activeView: this._activeView,
      editor: this.readStats('editor'),
      kanban: this.readStats('kanban'),
      table: this.readStats('table'),
      calendar: this.readStats('calendar'),
      canvas: this.readStats('canvas'),
      slides: this.readStats('slides'),
      gallery: this.readStats('gallery'),
      graph: this.readStats('graph'),
      image: this.readStats('image'),
      profiler: this._latestProfilingReport,
    };
  }

  private setupWindowBridge() {
    if (typeof window === 'undefined') return;

    const existing = window.__KNIT_DEBUG__ || {};

    window.__KNIT_DEBUG__ = {
      ...existing,
      get isActive() {
        return debugStore.isActive;
      },
      get activeView() {
        return debugStore.activeView;
      },
      get isBenchmarking() {
        return debugStore.isBenchmarking;
      },
      get latestReport() {
        return debugStore.latestProfilingReport;
      },
      toggle: () => debugStore.toggle(),
      setDebug: (active: boolean) => debugStore.setDebug(active),
      runBenchmark: async () => {
        console.log('[KNIT PROFILER] Lancement du benchmark d\'indexation...');
        const report = await debugStore.runVaultBenchmark();
        console.group('[KNIT PROFILER BENCHMARK REPORT]');
        console.log(`Stockage : ${report.storageLabel}`);
        console.log(`Documents : ${report.markdownFilesCount} Markdown (${report.totalFilesCount} au total)`);
        console.log(`Temps total : ${report.totalTimeMs} ms (${report.throughputDocsPerSec} docs/s)`);
        console.log(`Arborescence : ${report.treeWalkMs} ms | Autocomplétion : ${report.suggestIndexMs} ms`);
        console.log(`Tâches : ${report.tasksCollectMs} ms | Tags : ${report.tagsCollectMs} ms`);
        console.log(`Latence I/O échantillon : ${report.sampleIoReadMs} ms / doc`);
        console.group('Recommandations d\'optimisation :');
        report.recommendations.forEach((r) => {
          console.log(`[${r.severity.toUpperCase()}] ${r.title}: ${r.description}`);
        });
        console.groupEnd();
        console.groupEnd();
        return report;
      },
      dumpReport: () => {
        const report = debugStore.generateReport();
        console.group('[KNIT GLOBAL DEBUG REPORT]');
        console.log(`Actif : ${report.isDebugActive ? 'OUI' : 'NON'}`);
        console.log(`Vue courante : ${report.activeView}`);
        console.log(`Horodatage : ${report.timestamp}`);
        for (const section of DEBUG_REPORT_SECTIONS) {
          const data = report[section.key];
          if (data == null) continue;
          console.group(section.label);
          console.log(data);
          console.groupEnd();
        }
        console.groupEnd();
        return report;
      },
    };
  }
}

export const debugStore = new DebugStore();
