import { useCallback, useEffect, useRef, useState } from 'react';
import type { CanvasData } from '../types';
import { parseCanvasContent, serializeCanvasContent } from '../utils/canvasUtils';

export interface UseCanvasDocumentParams {
  path: string;
  content: string;
  onUpdateContent: (path: string, content: string) => void;
  readOnly?: boolean;
}

/**
 * Parse / sync / persist du document JSON-Canvas.
 */
export function useCanvasDocument({
  path,
  content,
  onUpdateContent,
  readOnly = false,
}: UseCanvasDocumentParams) {
  const [data, setData] = useState<CanvasData>(() => parseCanvasContent(content));
  const lastContentRef = useRef(content);

  useEffect(() => {
    if (content !== lastContentRef.current) {
      lastContentRef.current = content;
      queueMicrotask(() => {
        setData(parseCanvasContent(content));
      });
    }
  }, [content]);

  const writeContent = useCallback(
    (next: CanvasData) => {
      if (readOnly) return;
      onUpdateContent(path, serializeCanvasContent(content, next));
    },
    [content, onUpdateContent, path, readOnly]
  );

  const persist = useCallback(
    (next: CanvasData) => {
      setData(next);
      writeContent(next);
    },
    [writeContent]
  );

  return { data, setData, persist, writeContent };
}
