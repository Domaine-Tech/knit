import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Pan / zoom / redimensionnement hauteur du panneau graphe local.
 */
export function useGraphViewport() {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [graphHeight, setGraphHeight] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('knit-graph-height') || '400', 10);
    } catch {
      return 400;
    }
  });
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: 400,
  }));

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        setDimensions({
          width: Math.round(rect.width),
          height: graphHeight,
        });
      }
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [graphHeight]);

  const handleHeightResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingHeight(true);
      const startY = e.clientY;
      const startH = graphHeight;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaY = moveEvent.clientY - startY;
        const nextH = Math.max(180, Math.min(850, startH + deltaY));
        setGraphHeight(nextH);
        localStorage.setItem('knit-graph-height', String(nextH));
      };

      const onMouseUp = () => {
        setIsDraggingHeight(false);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    },
    [graphHeight]
  );

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const resetHeight = useCallback(() => {
    setGraphHeight(400);
    localStorage.setItem('knit-graph-height', '400');
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(2.5, z - e.deltaY * 0.001)));
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    setIsDragging(true);
    last.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = (e.clientX - last.current.x) / zoom;
    const dy = (e.clientY - last.current.y) / zoom;
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    last.current = { x: e.clientX, y: e.clientY };
  }, [zoom]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    setIsDragging(false);
  }, []);

  return {
    zoom,
    setZoom,
    pan,
    isDragging,
    graphHeight,
    isDraggingHeight,
    containerRef,
    dragging,
    dimensions,
    halfW: Math.max(dimensions.width / 2, 200),
    halfH: graphHeight / 2,
    handleHeightResizeStart,
    resetView,
    resetHeight,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  };
}
