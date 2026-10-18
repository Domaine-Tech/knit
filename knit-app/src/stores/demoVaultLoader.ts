import type { FileNode } from '../types';

/**
 * Chargeur dynamique du coffre de démonstration Knit
 * Alimenté directement par les vrais fichiers du dossier demo_vault/ à la racine.
 * Vite injecte automatiquement leur contenu (Markdown brut, médias) au build/dev.
 * ZÉRO duplication de texte Markdown dans le code TypeScript !
 */

// Import dynamique de tous les fichiers Markdown de demo_vault
const rawMarkdownModules = import.meta.glob('../../../demo_vault/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// SVG en brut → data URL (affichage fiable hors dépendance au serveur Vite)
const svgRawModules = import.meta.glob('../../../demo_vault/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Autres médias → URL Vite
const rasterUrlModules = import.meta.glob('../../../demo_vault/**/*.{png,jpg,jpeg,webp,gif}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const DEMO_CONTENTS: Record<string, string> = {};

/** Chemins relatifs vault → URL affichable (<img src>). */
export const DEMO_ASSET_URLS: Record<string, string> = {};

const rootNodes: Record<string, FileNode> = {};

/** Normalise les clés Vite (Windows `\` ou chemins absolus) vers un chemin vault relatif. */
function normalizeDemoRelPath(moduleKey: string): string {
  const normalized = moduleKey.replace(/\\/g, '/');
  const marker = '/demo_vault/';
  const idx = normalized.lastIndexOf(marker);
  if (idx >= 0) {
    return normalized.slice(idx + marker.length).replace(/^\/+/, '');
  }
  // Fallback relatif `../../../demo_vault/...`
  const relMarker = 'demo_vault/';
  const relIdx = normalized.lastIndexOf(relMarker);
  if (relIdx >= 0) {
    return normalized.slice(relIdx + relMarker.length).replace(/^\/+/, '');
  }
  return normalized.replace(/^\/+/, '');
}

function svgToDataUrl(svg: string): string {
  // Purge les caractères de contrôle (hors tab/LF/CR) qui cassent le rendu <img>
  const cleaned = svg.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleaned)}`;
}

function getOrCreateDirNode(parts: string[]): FileNode {
  let currentPath = '';
  let parentNode: FileNode | null = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    currentPath = currentPath ? `${currentPath}/${part}` : part;

    if (i === 0) {
      if (!rootNodes[part]) {
        rootNodes[part] = {
          id: part,
          name: part,
          path: currentPath,
          is_dir: true,
          children: [],
        };
      }
      parentNode = rootNodes[part];
    } else if (parentNode) {
      let child: FileNode | undefined = parentNode.children.find((c: FileNode) => c.name === part);
      if (!child) {
        child = {
          id: currentPath,
          name: part,
          path: currentPath,
          is_dir: true,
          children: [],
        };
        parentNode.children.push(child);
      }
      parentNode = child;
    }
  }

  return parentNode!;
}

/** mtime démo déterministe (répartition sur ~14 jours) pour tri / affichage relatif. */
function demoMtimeMs(relPath: string): number {
  let h = 0;
  for (let i = 0; i < relPath.length; i++) {
    h = (h * 31 + relPath.charCodeAt(i)) >>> 0;
  }
  return Date.now() - (h % (14 * 86_400_000));
}

function registerFileNode(relPath: string, extension: string): void {
  const parts = relPath.split('/');
  const fileName = parts.pop()!;

  const fileNode: FileNode = {
    id: relPath,
    name: fileName,
    path: relPath,
    is_dir: false,
    extension,
    mtime_ms: demoMtimeMs(relPath),
    children: [],
  };

  if (parts.length === 0) {
    rootNodes[fileName] = fileNode;
  } else {
    const dirNode = getOrCreateDirNode(parts);
    if (!dirNode.children.some((c) => c.path === relPath)) {
      dirNode.children.push(fileNode);
    }
  }
}

function fileNameExtension(relPath: string): string {
  const name = relPath.split('/').pop() ?? '';
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1) : '';
}

function registerAsset(relPath: string, displayUrl: string): void {
  DEMO_ASSET_URLS[relPath] = displayUrl;
  if (!(relPath in DEMO_CONTENTS)) {
    DEMO_CONTENTS[relPath] = displayUrl;
  }
  registerFileNode(relPath, fileNameExtension(relPath) || 'bin');
}

for (const [moduleKey, content] of Object.entries(rawMarkdownModules)) {
  const relPath = normalizeDemoRelPath(moduleKey);
  DEMO_CONTENTS[relPath] = content;
  registerFileNode(relPath, fileNameExtension(relPath) || 'md');
}

for (const [moduleKey, svg] of Object.entries(svgRawModules)) {
  const relPath = normalizeDemoRelPath(moduleKey);
  registerAsset(relPath, svgToDataUrl(svg));
}

for (const [moduleKey, assetUrl] of Object.entries(rasterUrlModules)) {
  const relPath = normalizeDemoRelPath(moduleKey);
  registerAsset(relPath, assetUrl);
}

export const DEMO_FILES: FileNode[] = Object.values(rootNodes).sort((a, b) => {
  if (a.name === 'accueil.md') return -1;
  if (b.name === 'accueil.md') return 1;
  if (a.is_dir && !b.is_dir) return -1;
  if (!a.is_dir && b.is_dir) return 1;
  return a.name.localeCompare(b.name);
});

if (import.meta.hot) {
  // Muter les objets exportés en place : les importateurs (assetUrl, vaultStore)
  // conservent la même référence — indispensable pour que les data URLs d'images
  // restent visibles après HMR sans rechargement complet de la fenêtre.
  import.meta.hot.accept((newMod) => {
    if (!newMod) return;
    const nextAssets = newMod.DEMO_ASSET_URLS as Record<string, string>;
    const nextContents = newMod.DEMO_CONTENTS as Record<string, string>;
    const nextFiles = newMod.DEMO_FILES as FileNode[];

    for (const key of Object.keys(DEMO_ASSET_URLS)) {
      delete DEMO_ASSET_URLS[key];
    }
    Object.assign(DEMO_ASSET_URLS, nextAssets);

    for (const key of Object.keys(DEMO_CONTENTS)) {
      delete DEMO_CONTENTS[key];
    }
    Object.assign(DEMO_CONTENTS, nextContents);

    DEMO_FILES.length = 0;
    DEMO_FILES.push(...nextFiles);
  });
}
