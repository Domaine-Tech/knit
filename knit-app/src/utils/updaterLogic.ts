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

/**
 * Fenêtre d’inactivité : si la dernière activité clavier/souris est plus récente,
 * l’utilisateur est considéré « en train de travailler » → pas d’install auto silencieuse.
 */
export const UPDATE_BUSY_IDLE_MS = 45_000;

export const UPDATE_POLICY_KEY = 'knit-update-policy';
export const UPDATE_SKIP_KEY = 'knit-update-skip-version';

/** true si une activité a eu lieu dans les `idleMs` dernières millisecondes. */
export function isUserBusy(
  lastActivityAt: number | null,
  now: number = Date.now(),
  idleMs: number = UPDATE_BUSY_IDLE_MS
): boolean {
  if (lastActivityAt == null) return false;
  return now - lastActivityAt < idleMs;
}

/**
 * Traduit / humanise les erreurs brutes du plugin updater (souvent en anglais).
 * Cas typique dépôt privé : latest.json inaccessible publiquement → 404 / JSON invalide.
 */
export function formatUpdateError(raw: string | null | undefined): string {
  if (!raw || !raw.trim()) {
    return 'Impossible de vérifier les mises à jour pour le moment.';
  }
  const msg = raw.trim();
  const lower = msg.toLowerCase();

  if (
    lower.includes('valid release json') ||
    lower.includes('release json') ||
    lower.includes('could not fetch') ||
    lower.includes('failed to fetch') ||
    lower.includes('404') ||
    lower.includes('not found')
  ) {
    return (
      'Impossible de joindre le manifeste de mise à jour (latest.json). ' +
      'Si le dépôt GitHub est privé, l’endpoint n’est pas accessible sans authentification — ' +
      'rendez le dépôt public ou hébergez latest.json sur une URL publique.'
    );
  }

  if (
    lower.includes('network') ||
    lower.includes('dns') ||
    lower.includes('timed out') ||
    lower.includes('timeout') ||
    lower.includes('connection')
  ) {
    return 'Réseau indisponible ou trop lent. Vérifiez votre connexion puis réessayez.';
  }

  if (
    lower.includes('signature') ||
    lower.includes('minisign') ||
    lower.includes('ed25519') ||
    lower.includes('invalid key')
  ) {
    return 'La signature de la mise à jour est invalide. L’installation a été bloquée par sécurité.';
  }

  // Déjà en français (messages Knit) : laisser tel quel
  if (/[àâäéèêëïîôùûüç]/i.test(msg) || msg.startsWith('Mises à jour') || msg.startsWith('Aucune ')) {
    return msg;
  }

  return `Vérification impossible : ${msg}`;
}
