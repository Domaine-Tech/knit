/**
 * Construction d'un graphe local WikiLinks / backlinks (B-049).
 */

import type { GraphData, GraphEdge, GraphNode } from '../types';
import { extractWikiTargets } from './markdownUtils';
import { fileStem } from './treeUtils';

export { extractWikiTargets };

export function buildLocalGraph(
  centerPath: string,
  contents: Record<string, string>,
  backlinks: string[]
): GraphData {
  const nodesMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  const ensure = (path: string, label?: string): GraphNode => {
    const existing = nodesMap.get(path);
    if (existing) return existing;
    const angle = Math.random() * Math.PI * 2;
    const r = 40 + Math.random() * 120;
    const node: GraphNode = {
      id: path,
      label: label || fileStem(path) || path,
      path,
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      vx: 0,
      vy: 0,
    };
    nodesMap.set(path, node);
    return node;
  };

  const center = ensure(centerPath);
  center.x = 0;
  center.y = 0;

  const centerContent = contents[centerPath] || '';
  for (const t of extractWikiTargets(centerContent)) {
    const resolved =
      Object.keys(contents).find(
        (p) =>
          p === t ||
          p.endsWith(`/${t}`) ||
          p.endsWith(`/${t}.md`) ||
          p.replace(/\.md$/, '') === t ||
          fileStem(p) === t
      ) || `${t}.md`;
    ensure(resolved, t);
    edges.push({ source: centerPath, target: resolved });
  }

  for (const bl of backlinks) {
    ensure(bl);
    edges.push({ source: bl, target: centerPath });
  }

  return { nodes: Array.from(nodesMap.values()), edges };
}

/** Une itération de simulation force-directed simplifiée. */
export function stepForce(data: GraphData, centerId: string): void {
  const nodes = data.nodes;
  const k = 80;

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const force = (k * k) / dist;
      dx = (dx / dist) * force * 0.02;
      dy = (dy / dist) * force * 0.02;
      a.vx -= dx;
      a.vy -= dy;
      b.vx += dx;
      b.vy += dy;
    }
  }

  for (const e of data.edges) {
    const a = nodes.find((n) => n.id === e.source);
    const b = nodes.find((n) => n.id === e.target);
    if (!a || !b) continue;
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
    const force = (dist - k) * 0.05;
    dx = (dx / dist) * force;
    dy = (dy / dist) * force;
    a.vx += dx;
    a.vy += dy;
    b.vx -= dx;
    b.vy -= dy;
  }

  for (const n of nodes) {
    if (n.id === centerId) {
      n.x = 0;
      n.y = 0;
      n.vx = 0;
      n.vy = 0;
      continue;
    }
    n.vx *= 0.85;
    n.vy *= 0.85;
    n.x += n.vx;
    n.y += n.vy;
  }
}
