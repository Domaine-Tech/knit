/**
 * Types du système de mise à jour in-app (Tauri updater).
 * Préférence machine (localStorage) — jamais dans `.knitshare` ni Markdown.
 */

/** Politique de contrôle et d'installation. */
export type UpdatePolicy = 'auto' | 'notify' | 'manual';

/** États exposés à l'UI. */
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'upToDate'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'failed';

export interface KnitUpdateInfo {
  version: string;
  body: string | null;
  date: string | null;
}

export interface UpdateProgress {
  downloaded: number;
  total: number | null;
}

/** Instantané lu par l'en-tête et les paramètres. */
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

export function parseUpdatePolicy(
  raw: string | null | undefined,
  fallback: UpdatePolicy = 'auto'
): UpdatePolicy {
  return raw === 'auto' || raw === 'notify' || raw === 'manual' ? raw : fallback;
}
