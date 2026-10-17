import { useState, useRef, useCallback } from 'react';

export function useResizablePanels() {
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('knit-sidebar-width') || '250', 10);
    } catch {
      return 250;
    }
  });
  const [isDraggingSidebar, setIsDraggingSidebar] = useState<boolean>(false);

  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      return parseFloat(localStorage.getItem('knit-split-ratio') || '0.5');
    } catch {
      return 0.5;
    }
  });
  const [isDraggingSplit, setIsDraggingSplit] = useState<boolean>(false);
  const splitContainerRef = useRef<HTMLDivElement | null>(null);

  const handleSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSidebar(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(600, moveEvent.clientX));
      setSidebarWidth(newWidth);
      localStorage.setItem('knit-sidebar-width', newWidth.toString());
    };

    const onMouseUp = () => {
      setIsDraggingSidebar(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleSplitResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplit(true);

    const onMouseMove = (moveEvent: MouseEvent) => {
      const container = splitContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const newRatio = (moveEvent.clientX - rect.left) / rect.width;
      const clamped = Math.max(0.18, Math.min(0.82, newRatio));
      setSplitRatio(clamped);
      localStorage.setItem('knit-split-ratio', clamped.toString());
    };

    const onMouseUp = () => {
      setIsDraggingSplit(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  const resetSidebarWidth = useCallback(() => {
    setSidebarWidth(250);
    localStorage.setItem('knit-sidebar-width', '250');
  }, []);

  const resetSplitRatio = useCallback(() => {
    setSplitRatio(0.5);
    localStorage.setItem('knit-split-ratio', '0.5');
  }, []);

  return {
    sidebarWidth,
    isDraggingSidebar,
    handleSidebarResizeStart,
    resetSidebarWidth,
    splitRatio,
    isDraggingSplit,
    splitContainerRef,
    handleSplitResizeStart,
    resetSplitRatio,
  };
}
