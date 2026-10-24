import { useRef, useState, type RefObject } from 'react';
import type { CanvasData, CanvasNode } from '../types';

export interface UseCanvasViewportParams {
  setData: React.Dispatch<React.SetStateAction<CanvasData>>;
  writeContent: (next: CanvasData) => void;
  readOnly?: boolean;
  onCancelHover?: () => void;
}

/**
 * Pan / zoom / drag de nœuds du Canvas immersif.
 */
export function useCanvasViewport({
  setData,
  writeContent,
  readOnly = false,
  onCancelHover,
}: UseCanvasViewportParams) {
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [activeDragNodeId, setActiveDragNodeId] = useState<string | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const spaceRef = useRef<HTMLDivElement>(null);

  const onNodePointerDown = (e: React.PointerEvent, node: CanvasNode) => {
    if (readOnly) return;
    e.stopPropagation();
    onCancelHover?.();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      id: node.id,
      ox: e.clientX / zoom - node.x - pan.x / zoom,
      oy: e.clientY / zoom - node.y - pan.y / zoom,
    };
    setActiveDragNodeId(node.id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const { id, ox, oy } = dragRef.current;
    const x = e.clientX / zoom - pan.x / zoom - ox;
    const y = e.clientY / zoom - pan.y / zoom - oy;
    setData((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    }));
  };

  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setActiveDragNodeId(null);
    setData((prev) => {
      if (!readOnly) {
        writeContent(prev);
      }
      return prev;
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.max(0.4, Math.min(2, z - e.deltaY * 0.001)));
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  return {
    pan,
    setPan,
    zoom,
    setZoom,
    activeDragNodeId,
    isDragOverCanvas,
    setIsDragOverCanvas,
    spaceRef: spaceRef as RefObject<HTMLDivElement | null>,
    onNodePointerDown,
    onPointerMove,
    onPointerUp,
    onWheel,
  };
}
