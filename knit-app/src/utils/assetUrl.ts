/**
 * Résolution des chemins médias Markdown (`assets/...`) vers une URL affichable
 * en Live Preview (data URL démo, Tauri `convertFileSrc`, ou URL distante).
 */

import { convertFileSrc } from '@tauri-apps/api/core';
import { DEMO_ASSET_URLS } from '../stores/demoVaultLoader';
import { vaultStore } from '../stores/vaultStore';
import { isTauriEnvironment } from './env';
import { normalizeRelPath } from './treeUtils';

const REMOTE_OR_DATA_RE = /^(https?:|data:|blob:|asset:|tauri:|\/\/)/i;

function guessMimeFromPath(relPath: string): string {
  const ext = relPath.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'svg':
      return 'image/svg+xml';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'png':
    default:
      return 'image/png';
  }
}

function contentToDisplayUrl(relPath: string, content: string): string {
  const trimmed = content.trim();
  if (REMOTE_OR_DATA_RE.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('./')) {
    return trimmed;
  }

  if (trimmed.startsWith('<svg') || trimmed.startsWith('<?xml')) {
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(trimmed)}`;
  }

  if (/^[A-Za-z0-9+/=\s]+$/.test(trimmed) && trimmed.length > 32) {
    const mime = guessMimeFromPath(relPath);
    return `data:${mime};base64,${trimmed.replace(/\s+/g, '')}`;
  }

  return trimmed;
}

function normalizeAssetRelPath(url: string): string {
  return normalizeRelPath(url.trim(), { stripAngles: true });
}

function isDemoVaultPath(vaultPath: string | null): boolean {
  if (!vaultPath) return true;
  return (
    vaultPath === 'Knit Demo Vault' || vaultPath === 'Knit Workspace (Web Dev)'
  );
}

function lookupBundledAsset(relPath: string): string | undefined {
  if (DEMO_ASSET_URLS[relPath]) {
    return DEMO_ASSET_URLS[relPath];
  }
  const lower = relPath.toLowerCase();
  for (const [key, value] of Object.entries(DEMO_ASSET_URLS)) {
    if (key.replace(/\\/g, '/').toLowerCase() === lower) {
      return value;
    }
  }
  return undefined;
}

/**
 * Transforme une URL Markdown d'image en src utilisable par `<img>`.
 */
export function resolveAssetUrl(url: string): string {
  const raw = url.trim().replace(/^<|>$/g, '');
  if (!raw) return raw;

  if (REMOTE_OR_DATA_RE.test(raw)) {
    return raw;
  }

  const relPath = normalizeAssetRelPath(raw);

  const bundled = lookupBundledAsset(relPath);
  if (bundled) {
    return bundled;
  }

  const local = vaultStore.getLocalContent(relPath);
  if (local) {
    return contentToDisplayUrl(relPath, local);
  }

  if (isTauriEnvironment() && vaultStore.currentVaultPath && !isDemoVaultPath(vaultStore.currentVaultPath)) {
    const absolute = vaultStore.getAbsolutePath(relPath);
    try {
      return convertFileSrc(absolute);
    } catch {
      return raw;
    }
  }

  return raw;
}
