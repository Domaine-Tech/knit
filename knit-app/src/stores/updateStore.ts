/**
 * Store machine des mises à jour in-app (politique localStorage, skip, orchestration).
 */
import { invoke } from '@tauri-apps/api/core';
import { isTauriEnvironment } from '../utils/env';
import {
  checkForUpdates,
  clearPendingUpdate,
  downloadAndInstallUpdate,
  relaunchApp,
} from '../utils/updater';
import {
  UPDATE_INTERVAL_MS,
  UPDATE_POLICY_KEY,
  UPDATE_SKIP_KEY,
  UPDATE_STARTUP_DELAY_MS,
  formatUpdateError,
  isUserBusy,
  isVersionSkipped,
} from '../utils/updaterLogic';
import { toast } from './toastStore';
import {
  parseUpdatePolicy,
  type KnitUpdateInfo,
  type UpdatePolicy,
  type UpdateProgress,
  type UpdateStatus,
} from '../types/updater';

type UpdateListener = () => void;

export interface UpdateStoreSnapshot {
  status: UpdateStatus;
  policy: UpdatePolicy;
  currentVersion: string | null;
  available: KnitUpdateInfo | null;
  progress: UpdateProgress;
  lastCheckedAt: number | null;
  error: string | null;
  modalOpen: boolean;
  skippedVersion: string | null;
}

class UpdateStore {
  private status: UpdateStatus = 'idle';
  private policy: UpdatePolicy = 'auto';
  private currentVersion: string | null = null;
  private available: KnitUpdateInfo | null = null;
  private progress: UpdateProgress = { downloaded: 0, total: null };
  private lastCheckedAt: number | null = null;
  private error: string | null = null;
  private modalOpen = false;
  private skippedVersion: string | null = null;
  private listeners: Set<UpdateListener> = new Set();
  private checkInFlight: Promise<void> | null = null;
  private installInFlight = false;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private startupTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;
  /** Évite de spam toast/download pour la même version en mode auto. */
  private autoHandledVersion: string | null = null;
  /**
   * Soft-dismiss session (« Plus tard ») : version pour laquelle on ne rouvre
   * pas toast/modale en contrôle silencieux jusqu'au prochain lancement.
   */
  private dismissedUntilRelaunchVersion: string | null = null;
  /** Dernier état synchronisé vers l'entrée tray « Redémarrer ». */
  private lastTrayRelaunchEnabled: boolean | null = null;
  /** Dernière activité clavier/souris (ms epoch) — pour éviter l’install auto en pleine frappe. */
  private lastActivityAt: number | null = null;
  private activityCleanup: (() => void) | null = null;
  private activityThrottleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.policy = this.readPolicy();
    this.skippedVersion = this.readSkipped();
  }

  private touchActivity = (): void => {
    if (this.activityThrottleTimer != null) return;
    this.lastActivityAt = Date.now();
    this.activityThrottleTimer = setTimeout(() => {
      this.activityThrottleTimer = null;
    }, 1_000);
  };

  private bindActivityTracking(): void {
    if (typeof window === 'undefined' || this.activityCleanup) return;
    const opts: AddEventListenerOptions = { capture: true, passive: true };
    const events = ['keydown', 'pointerdown', 'pointermove', 'wheel', 'touchstart'] as const;
    for (const ev of events) {
      window.addEventListener(ev, this.touchActivity, opts);
    }
    this.activityCleanup = () => {
      for (const ev of events) {
        window.removeEventListener(ev, this.touchActivity, opts);
      }
    };
  }

  private unbindActivityTracking(): void {
    this.activityCleanup?.();
    this.activityCleanup = null;
    if (this.activityThrottleTimer != null) {
      clearTimeout(this.activityThrottleTimer);
      this.activityThrottleTimer = null;
    }
  }

  /** L’utilisateur a interagi récemment (éditeur, souris, etc.). */
  public isUserCurrentlyBusy(): boolean {
    return isUserBusy(this.lastActivityAt);
  }

  private promptUserToConfirmUpdate(version: string): void {
    toast.info(
      'Mise à jour disponible',
      `Knit ${version} est prêt à être préparé. Confirmez pour télécharger sans interrompre votre travail.`
    );
    this.modalOpen = true;
    this.notify();
  }

  public subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.syncTrayRelaunchEnabled();
    this.listeners.forEach((l) => l());
  }

  private syncTrayRelaunchEnabled(): void {
    if (!isTauriEnvironment()) return;
    const enabled = this.status === 'ready';
    if (this.lastTrayRelaunchEnabled === enabled) return;
    this.lastTrayRelaunchEnabled = enabled;
    void invoke('set_tray_relaunch_enabled', { enabled }).catch(() => {
      /* tray optionnel */
    });
  }

  public getSnapshot(): UpdateStoreSnapshot {
    return {
      status: this.status,
      policy: this.policy,
      currentVersion: this.currentVersion,
      available: this.available,
      progress: this.progress,
      lastCheckedAt: this.lastCheckedAt,
      error: this.error,
      modalOpen: this.modalOpen,
      skippedVersion: this.skippedVersion,
    };
  }

  private readPolicy(): UpdatePolicy {
    try {
      return parseUpdatePolicy(localStorage.getItem(UPDATE_POLICY_KEY));
    } catch {
      return 'auto';
    }
  }

  private readSkipped(): string | null {
    try {
      return localStorage.getItem(UPDATE_SKIP_KEY);
    } catch {
      return null;
    }
  }

  public setPolicy(policy: UpdatePolicy): void {
    this.policy = policy;
    try {
      localStorage.setItem(UPDATE_POLICY_KEY, policy);
    } catch {
      /* ignore quota */
    }
    this.notify();
    this.restartPeriodicIfNeeded();
  }

  public openModal(): void {
    this.modalOpen = true;
    this.notify();
  }

  public closeModal(): void {
    this.modalOpen = false;
    this.notify();
  }

  /** « Plus tard » : ferme la modale sans ignorer la version jusqu'au prochain lancement. */
  public dismissForSession(): void {
    if (this.available) {
      this.dismissedUntilRelaunchVersion = this.available.version;
    }
    this.modalOpen = false;
    this.notify();
  }

  public skipCurrentVersion(): void {
    if (!this.available) return;
    this.skippedVersion = this.available.version;
    try {
      localStorage.setItem(UPDATE_SKIP_KEY, this.available.version);
    } catch {
      /* ignore */
    }
    clearPendingUpdate();
    this.available = null;
    this.status = 'idle';
    this.modalOpen = false;
    this.error = null;
    this.dismissedUntilRelaunchVersion = null;
    this.notify();
  }

  /**
   * Démarre le contrôle différé + intervalle (idempotent). Appeler une fois au boot Tauri.
   */
  public startBackgroundChecks(): void {
    if (this.started || !isTauriEnvironment()) return;
    this.started = true;
    this.bindActivityTracking();

    if (this.policy !== 'manual') {
      this.startupTimer = setTimeout(() => {
        void this.check({ silent: true });
      }, UPDATE_STARTUP_DELAY_MS);
    }

    this.restartPeriodicIfNeeded();
  }

  public stopBackgroundChecks(): void {
    if (this.startupTimer != null) {
      clearTimeout(this.startupTimer);
      this.startupTimer = null;
    }
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.unbindActivityTracking();
    this.started = false;
  }

  private restartPeriodicIfNeeded(): void {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (!this.started || !isTauriEnvironment()) return;
    if (this.policy === 'manual') return;
    this.intervalId = setInterval(() => {
      void this.check({ silent: true });
    }, UPDATE_INTERVAL_MS);
  }

  /**
   * @param silent — pas de toast « à jour » ; comportement auto/notify selon politique.
   * @param force — ignore la politique manual pour un contrôle explicite (Paramètres / tray).
   */
  public async check(options?: { silent?: boolean; force?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    const force = options?.force ?? false;

    if (!isTauriEnvironment()) {
      this.status = 'idle';
      this.error = null;
      this.notify();
      if (!silent) {
        toast.info(
          'Mises à jour',
          'Disponible dans l’application installée.'
        );
      }
      return;
    }

    if (!force && this.policy === 'manual' && silent) {
      return;
    }

    if (this.checkInFlight) {
      await this.checkInFlight;
      return;
    }

    this.checkInFlight = this.runCheck(silent);
    try {
      await this.checkInFlight;
    } finally {
      this.checkInFlight = null;
    }
  }

  private async runCheck(silent: boolean): Promise<void> {
    this.status = 'checking';
    this.error = null;
    this.notify();

    const result = await checkForUpdates();
    this.currentVersion = result.currentVersion;
    this.lastCheckedAt = Date.now();

    if (!result.ok) {
      const friendly = formatUpdateError(result.error);
      this.status = 'failed';
      this.error = friendly;
      this.available = null;
      this.notify();
      if (!silent) {
        toast.error('Vérification impossible', friendly);
      }
      return;
    }

    if (!result.available) {
      this.status = 'upToDate';
      this.available = null;
      this.error = null;
      this.notify();
      if (!silent) {
        toast.info('À jour', `Knit ${result.currentVersion} est la dernière version.`);
      }
      return;
    }

    if (isVersionSkipped(result.update.version, this.skippedVersion)) {
      this.status = 'idle';
      this.available = null;
      this.error = null;
      clearPendingUpdate();
      this.notify();
      if (!silent) {
        toast.info(
          'Version ignorée',
          `Knit ${result.update.version} a été ignorée. Changez la préférence ou attendez une version ultérieure.`
        );
      }
      return;
    }

    this.available = result.update;
    this.status = 'available';
    this.error = null;
    this.notify();

    const softDismissed =
      silent && this.dismissedUntilRelaunchVersion === result.update.version;

    if (this.policy === 'auto') {
      if (this.autoHandledVersion === result.update.version) {
        return;
      }
      // En pleine activité : demander validation (comme notify) au lieu d’installer en silence.
      if (this.isUserCurrentlyBusy()) {
        if (!softDismissed) {
          this.promptUserToConfirmUpdate(result.update.version);
        }
        return;
      }
      this.autoHandledVersion = result.update.version;
      void this.install({ silent: true });
      return;
    }

    if (softDismissed) {
      /* bandeau possible ; pas de toast / modale jusqu'au prochain lancement */
      return;
    }

    if (this.policy === 'notify' || !silent) {
      this.promptUserToConfirmUpdate(result.update.version);
    } else if (silent && this.policy === 'manual') {
      /* pas de notification auto */
    } else if (silent) {
      toast.info('Mise à jour disponible', `Version ${result.update.version}`);
    }
  }

  public async install(options?: { silent?: boolean }): Promise<void> {
    const silent = options?.silent ?? false;
    if (this.installInFlight) return;
    if (!this.available) return;

    this.installInFlight = true;
    this.status = 'downloading';
    this.progress = { downloaded: 0, total: null };
    this.error = null;
    this.notify();

    const result = await downloadAndInstallUpdate((p) => {
      this.progress = p;
      this.notify();
    });

    this.installInFlight = false;

    if (!result.ok) {
      const friendly = formatUpdateError(result.error);
      this.status = 'failed';
      this.error = friendly;
      this.notify();
      toast.error('Mise à jour échouée', friendly);
      return;
    }

    this.status = 'ready';
    this.dismissedUntilRelaunchVersion = null;
    this.notify();

    const version = this.available?.version ?? 'nouvelle version';
    toast.show({
      type: 'success',
      title: `Knit ${version} est prêt`,
      message: 'Redémarrez pour appliquer la mise à jour.',
      duration: 0,
      action: {
        label: 'Redémarrer',
        onClick: () => {
          void this.relaunch();
        },
      },
    });

    if (!silent) {
      this.modalOpen = true;
      this.notify();
    }
  }

  public async relaunch(): Promise<void> {
    await relaunchApp();
  }

  /** Tray : ne redémarre que si une mise à jour est prête. */
  public async relaunchIfReady(): Promise<void> {
    if (this.status !== 'ready') {
      toast.info('Mises à jour', 'Aucune mise à jour à appliquer.');
      return;
    }
    await relaunchApp();
  }
}

export const updateStore = new UpdateStore();
