/**
 * Logique pure du système de mise à jour (testable sans plugin Tauri).
 */

import type { UpdateProgress } from '../types/updater';

/** Cumule les chunks Progress ; conserve le total du Started. */
export function accumulateUpdateProgress(
  previous: UpdateProgress,
  event:
    | { kind: 'started'; contentLength: number | null }
    | { kind: 'progress'; chunkLength: number }
    | { kind: 'finished' }
): UpdateProgress {
  if (event.kind === 'started') {
    return { downloaded: 0, total: event.contentLength };
  }
  if (event.kind === 'progress') {
    return {
      downloaded: previous.downloaded + event.chunkLength,
      total: previous.total,
    };
  }
  return previous;
}

/** Pourcentage 0–100, ou null si total inconnu. */
export function updateProgressPercent(progress: UpdateProgress): number | null {
  if (progress.total == null || progress.total <= 0) return null;
  return Math.min(100, Math.round((progress.downloaded / progress.total) * 100));
}

/** Une version est ignorée si elle correspond exactement à la version skippée. */
export function isVersionSkipped(
  availableVersion: string,
  skippedVersion: string | null
): boolean {
  if (!skippedVersion) return false;
  return availableVersion.trim() === skippedVersion.trim();
}

/** Délai avant le premier contrôle automatique (ms). */
export const UPDATE_STARTUP_DELAY_MS = 8_000;

/** Intervalle entre contrôles périodiques (ms). */
export const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;

export const UPDATE_POLICY_KEY = 'knit-update-policy';
export const UPDATE_SKIP_KEY = 'knit-update-skip-version';
