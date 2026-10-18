/**
 * JSON-Canvas minimal (B-031b) — stocké dans un fence ```canvas ou corps JSON.
 * Spec : https://jsoncanvas.org
 */

import type { CanvasData, CanvasEdge, CanvasNode } from '../types';

const NODE_TYPES = new Set(['text', 'file', 'link', 'group']);

const DEFAULT_CANVAS: CanvasData = {
  nodes: [
    {
      id: 'n1',
      type: 'text',
      x: 80,
      y: 80,
      width: 220,
      height: 100,
      text: 'Carte de départ',
    },
    {
      id: 'n2',
      type: 'text',
      x: 400,
      y: 160,
      width: 220,
      height: 100,
      text: 'Connectez vos idées',
    },
  ],
  edges: [{ id: 'e1', fromNode: 'n1', toNode: 'n2' }],
};

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseCanvasNode(raw: unknown, index: number): CanvasNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id ? o.id : `n${index}`;
  const type = typeof o.type === 'string' && NODE_TYPES.has(o.type) ? (o.type as CanvasNode['type']) : 'text';
  return {
    id,
    type,
    x: asFiniteNumber(o.x, 0),
    y: asFiniteNumber(o.y, 0),
    width: asFiniteNumber(o.width, 200),
    height: asFiniteNumber(o.height, 100),
    text: typeof o.text === 'string' ? o.text : undefined,
    file: typeof o.file === 'string' ? o.file : undefined,
    url: typeof o.url === 'string' ? o.url : undefined,
    label: typeof o.label === 'string' ? o.label : undefined,
    color: typeof o.color === 'string' ? o.color : undefined,
  };
}

function parseCanvasEdge(raw: unknown, index: number): CanvasEdge | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const fromNode = typeof o.fromNode === 'string' ? o.fromNode : '';
  const toNode = typeof o.toNode === 'string' ? o.toNode : '';
  if (!fromNode || !toNode) return null;
  return {
    id: typeof o.id === 'string' && o.id ? o.id : `e${index}`,
    fromNode,
    toNode,
    fromSide: typeof o.fromSide === 'string' ? o.fromSide : undefined,
    toSide: typeof o.toSide === 'string' ? o.toSide : undefined,
    label: typeof o.label === 'string' ? o.label : undefined,
  };
}

/** Valide et normalise un objet JSON vers CanvasData (sinon null). */
export function coerceCanvasData(raw: unknown): CanvasData | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const nodesRaw = Array.isArray(o.nodes) ? o.nodes : [];
  const edgesRaw = Array.isArray(o.edges) ? o.edges : [];
  const nodes = nodesRaw
    .map((n, i) => parseCanvasNode(n, i))
    .filter((n): n is CanvasNode => n !== null);
  const edges = edgesRaw
    .map((e, i) => parseCanvasEdge(e, i))
    .filter((e): e is CanvasEdge => e !== null);
  return { nodes, edges };
}

/** Extrait le JSON Canvas brut (fence ```canvas ou corps après FM), ou null. */
export function extractCanvasJsonRaw(content: string): string | null {
  const fence = content.match(/```canvas\r?\n([\s\S]*?)```/i);
  if (fence) return fence[1].trim();

  const fm = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const body = fm ? content.slice(fm[0].length).trim() : content.trim();
  return body.startsWith('{') ? body : null;
}

/** true si pas de JSON à parser, ou si le JSON est valide. */
export function isCanvasParseOk(content: string): boolean {
  const candidate = extractCanvasJsonRaw(content);
  if (!candidate) return true;
  try {
    return coerceCanvasData(JSON.parse(candidate)) !== null;
  } catch {
    return false;
  }
}

export function parseCanvasContent(content: string): CanvasData {
  const candidate = extractCanvasJsonRaw(content);
  if (!candidate) return structuredClone(DEFAULT_CANVAS);

  try {
    const coerced = coerceCanvasData(JSON.parse(candidate));
    return coerced ?? structuredClone(DEFAULT_CANVAS);
  } catch {
    return structuredClone(DEFAULT_CANVAS);
  }
}

export function serializeCanvasContent(original: string, data: CanvasData): string {
  const json = JSON.stringify(data, null, 2);
  const fm = original.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  const header = fm ? fm[0] : '---\ntype: canvas\n---\n\n';

  if (/```canvas/i.test(original)) {
    return original.replace(/```canvas\r?\n[\s\S]*?```/i, `\`\`\`canvas\n${json}\n\`\`\``);
  }
  return `${header}${json}\n`;
}
