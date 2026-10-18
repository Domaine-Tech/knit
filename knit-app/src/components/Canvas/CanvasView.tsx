import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { toast } from '../../stores/toastStore';
import { copyDebugJson, dumpDebugConsole, fileStem } from '../../utils';
import { useDebugMode, useDelayedHoverPreview, useRegisterDebugStats } from '../../hooks';
import type { CanvasData, CanvasDebugReport, CanvasNode } from '../../types';
import {
  isCanvasParseOk,
  parseCanvasContent,
  serializeCanvasContent,
} from '../../utils/canvasUtils';
import { CanvasDebugHUD } from './CanvasDebugHUD';
import { DocViewChrome } from '../Workspace/DocViewChrome';

interface CanvasViewProps {
  path: string;
  content: string;
  onUpdateContent: (path: string, content: string) => void;
  onOpenFile: (path: string) => void;
  onSwitchToEditor?: () => void;
  /** Mode lecture (Zen / Hover) : pas de DnD / édition nœuds. */
  readOnly?: boolean;
  /** Hover Preview uniquement : masquer la toolbar. */
  compactChrome?: boolean;
}

export const CanvasView: React.FC<CanvasViewProps> = ({
  path,
  content,
  onUpdateContent,
  onOpenFile,
  onSwitchToEditor,
  readOnly = false,
  compactChrome = false,
}) => {
  const [data, setData] = useState<CanvasData>(() => parseCanvasContent(content));
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(1);
  const [activeDragNodeId, setActiveDragNodeId] = useState<string | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const dragRef = useRef<{ id: string; ox: number; oy: number } | null>(null);
  const spaceRef = useRef<HTMLDivElement>(null);
  const lastContentRef = useRef(content);
  const hoverPreview = useDelayedHoverPreview(0);

  useEffect(() => {
    if (content !== lastContentRef.current) {
      lastContentRef.current = content;
      queueMicrotask(() => {
        setData(parseCanvasContent(content));
      });
    }
  }, [content]);

  const persist = useCallback(
    (next: CanvasData) => {
      setData(next);
      if (readOnly) return;
      onUpdateContent(path, serializeCanvasContent(content, next));
    },
    [content, onUpdateContent, path, readOnly]
  );

  const onNodePointerDown = (e: React.PointerEvent, node: CanvasNode) => {
    if (readOnly) return;
    e.stopPropagation();
    hoverPreview.cancel(true);
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
        onUpdateContent(path, serializeCanvasContent(content, prev));
      }
      return prev;
    });
  };

  const { isDebugActive, toggleDebug } = useDebugMode();
  const parseOk = useMemo(() => isCanvasParseOk(content), [content]);

  const canvasDebugReport = useMemo((): CanvasDebugReport => {
    return {
      path,
      nodesCount: data.nodes.length,
      edgesCount: data.edges.length,
      panX: pan.x,
      panY: pan.y,
      zoom,
      activeDragNodeId,
      parseOk,
    };
  }, [path, data.nodes.length, data.edges.length, pan.x, pan.y, zoom, activeDragNodeId, parseOk]);

  useRegisterDebugStats('canvas', canvasDebugReport);

  const addCard = () => {
    const id = `n${Date.now()}`;
    const next: CanvasData = {
      ...data,
      nodes: [
        ...data.nodes,
        {
          id,
          type: 'text',
          x: 120 + data.nodes.length * 24,
          y: 120 + data.nodes.length * 16,
          width: 200,
          height: 90,
          text: 'Nouvelle carte',
        },
      ],
    };
    persist(next);
  };

  return (
    <div
      className={readOnly ? 'knit-view-readonly' : undefined}
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <DocViewChrome
        icon="canvas"
        title="Canvas"
        compactChrome={compactChrome}
        onSwitchToEditor={onSwitchToEditor}
      >
        {!readOnly && (
          <button type="button" className="knit-btn" onClick={addCard} style={{ fontSize: 11 }}>
            Ajouter une carte
          </button>
        )}
        <button
          type="button"
          className="knit-btn"
          onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
          style={{ fontSize: 11 }}
        >
          +
        </button>
        <button
          type="button"
          className="knit-btn"
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.1))}
          style={{ fontSize: 11 }}
        >
          −
        </button>
      </DocViewChrome>

      <div
        ref={spaceRef}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (!isDragOverCanvas) setIsDragOverCanvas(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOverCanvas(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOverCanvas(false);
          const droppedPath =
            e.dataTransfer.getData('application/knit-file') ||
            e.dataTransfer.getData('text/plain');
          if (!droppedPath) return;

          const rect = spaceRef.current?.getBoundingClientRect();
          const clientX = e.clientX - (rect?.left ?? 0);
          const clientY = e.clientY - (rect?.top ?? 0);
          const x = Math.round((clientX - pan.x) / zoom);
          const y = Math.round((clientY - pan.y) / zoom);

          const cleanName = fileStem(droppedPath) || droppedPath;
          const id = `node-${Date.now()}`;
          const newNode: CanvasNode = {
            id,
            type: 'file',
            file: droppedPath,
            text: cleanName,
            x,
            y,
            width: 220,
            height: 90,
          };
          const nextData: CanvasData = {
            ...data,
            nodes: [...data.nodes, newNode],
          };
          persist(nextData);
          toast.success('Note ajoutée au Canvas', cleanName);
        }}
        style={{
          flex: 1,
          overflow: 'hidden',
          position: 'relative',
          background:
            'radial-gradient(circle at 1px 1px, var(--knit-border) 1px, transparent 0)',
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          cursor: activeDragNodeId ? 'grabbing' : 'grab',
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setZoom((z) => Math.max(0.4, Math.min(2, z - e.deltaY * 0.001)));
          } else {
            setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
          }
        }}
      >
        {isDragOverCanvas && (
          <div
            style={{
              position: 'absolute',
              inset: 16,
              border: '2px dashed var(--knit-primary)',
              borderRadius: 'var(--knit-radius-lg)',
              backgroundColor: 'rgba(234, 179, 8, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              color: 'var(--knit-primary)',
              fontSize: 15,
              fontWeight: 600,
              pointerEvents: 'none',
              zIndex: 50,
              boxShadow: '0 0 20px var(--knit-primary-alpha)',
            }}
          >
            <DuotoneIcon name="plus" size={20} />
            <span>Déposer la note sur le Canvas pour créer une carte</span>
          </div>
        )}

        <svg
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {data.edges.map((edge) => {
            const from = data.nodes.find((n) => n.id === edge.fromNode);
            const to = data.nodes.find((n) => n.id === edge.toNode);
            if (!from || !to) return null;
            const x1 = pan.x + (from.x + from.width / 2) * zoom;
            const y1 = pan.y + (from.y + from.height / 2) * zoom;
            const x2 = pan.x + (to.x + to.width / 2) * zoom;
            const y2 = pan.y + (to.y + to.height / 2) * zoom;
            return (
              <g key={edge.id}>
                <defs>
                  <marker
                    id={`arrow-${edge.id}`}
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 Z" fill="var(--knit-primary)" />
                  </marker>
                </defs>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="var(--knit-primary)"
                  strokeWidth={2}
                  markerEnd={`url(#arrow-${edge.id})`}
                  opacity={0.7}
                />
              </g>
            );
          })}
        </svg>

        {data.nodes.map((node) => {
          const isDragged = activeDragNodeId === node.id;
          return (
            <div
              key={node.id}
              onPointerDown={(e) => onNodePointerDown(e, node)}
              onMouseEnter={(e) => {
                if (activeDragNodeId || !node.file) return;
                hoverPreview.schedule(node.file, e.clientX, e.clientY);
              }}
              onMouseMove={(e) => {
                if (activeDragNodeId || !node.file) return;
                hoverPreview.schedule(node.file, e.clientX, e.clientY);
              }}
              onMouseLeave={() => hoverPreview.cancel()}
              onDoubleClick={() => {
                if (node.file) {
                  hoverPreview.cancel(true);
                  onOpenFile(node.file);
                }
              }}
              style={{
                position: 'absolute',
                left: pan.x + node.x * zoom,
                top: pan.y + node.y * zoom,
                width: node.width * zoom,
                minHeight: node.height * zoom,
                padding: 10 * zoom,
                borderRadius: 'var(--knit-radius-md)',
                border: isDragged
                  ? '2px solid var(--knit-primary)'
                  : '1px solid var(--knit-border)',
                background: 'var(--knit-surface)',
                boxShadow: isDragged
                  ? '0 0 16px var(--knit-primary-alpha), 0 8px 24px rgba(0,0,0,0.35)'
                  : '0 1px 3px color-mix(in srgb, #000 8%, transparent)',
                fontSize: 13 * zoom,
                cursor: isDragged ? 'grabbing' : 'grab',
                userSelect: 'none',
                zIndex: isDragged ? 25 : 2,
                opacity: isDragged ? 0.95 : 1,
                transition:
                  'box-shadow var(--knit-duration-fast), border-color var(--knit-duration-fast)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>{node.text || node.label || node.file || node.url || 'Carte'}</span>
                {isDebugActive && (
                  <span className="knit-debug-view-badge">#{node.id.slice(-6)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isDebugActive && (
        <CanvasDebugHUD
          report={canvasDebugReport}
          onCopyJson={() => {
            void copyDebugJson(
              { report: canvasDebugReport, data },
              'Rapport Canvas copié',
              `${data.nodes.length} nœud(s).`
            );
          }}
          onDumpConsole={() => {
            dumpDebugConsole('CANVAS', canvasDebugReport, data);
          }}
          onClose={toggleDebug}
        />
      )}
    </div>
  );
};
