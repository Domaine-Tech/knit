/**
 * Parseurs purs pour la vue Galerie (B-031d).
 */

import type { FrontmatterIndexEntry, GalleryCard, GallerySource } from '../types';

export function parseGalleryItems(
  content: string,
  hostPath: string,
  indexedEntries: FrontmatterIndexEntry[] = []
): { cards: GalleryCard[]; source: GallerySource } {
  const cards: GalleryCard[] = [];
  let linkCount = 0;
  let assetCount = 0;

  const linkRe = /\[\[([^\]|#]+)(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^)]+\.md)\)/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = linkRe.exec(content)) !== null) {
    const path = (m[1] || m[4] || '').trim();
    const title = (m[2] || m[3] || path).trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    cards.push({ path: path.endsWith('.md') ? path : `${path}.md`, title, tags: [] });
    linkCount += 1;
  }

  const imgRe = /!\[([^\]]*)\]\((assets\/[^)]+)\)/g;
  while ((m = imgRe.exec(content)) !== null) {
    cards.push({
      path: hostPath,
      title: m[1] || m[2],
      banner: m[2],
      tags: ['image'],
    });
    assetCount += 1;
  }

  let usedIndex = false;
  if (cards.length === 0 && indexedEntries.length > 0) {
    usedIndex = true;
    for (const entry of indexedEntries.slice(0, 24)) {
      const banner = entry.fields?.banner || entry.fields?.image || undefined;
      const tags = (entry.fields?.tags || '')
        .replace(/[[\]]/g, '')
        .split(',')
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean);
      cards.push({
        path: entry.path,
        title: entry.title || entry.path,
        banner,
        tags,
        status: entry.fields?.statut,
      });
    }
  }

  let source: GallerySource = 'empty';
  if (usedIndex) source = 'index';
  else if (linkCount > 0 && assetCount > 0) source = 'mixed';
  else if (linkCount > 0) source = 'links';
  else if (assetCount > 0) source = 'assets';

  return { cards, source };
}
