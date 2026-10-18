/**
 * JSON-Canvas minimal (B-031b) — domaine coffre.
 * Spec : https://jsoncanvas.org
 */

export interface CanvasNode {
  id: string;
  type: 'text' | 'file' | 'link' | 'group';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  file?: string;
  url?: string;
  label?: string;
  color?: string;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: string;
  toSide?: string;
  label?: string;
}

export interface CanvasData {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}
