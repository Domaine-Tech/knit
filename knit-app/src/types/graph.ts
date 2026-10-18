/**
 * Graphe local WikiLinks / backlinks (B-049).
 */

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
