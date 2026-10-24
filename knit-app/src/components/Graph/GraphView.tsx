import React, { useMemo, useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import type { GraphDebugReport } from '../../types';
import { copyDebugJson, dumpDebugConsole } from '../../utils';
import {
  useDebugMode,
  useDelayedHoverPreview,
  useGraphViewport,
  useLocalGraphData,
  useRegisterDebugStats,
} from '../../hooks';
import { GraphDebugHUD } from './GraphDebugHUD';
import { DocViewChrome } from '../Workspace/DocViewChrome';

interface GraphViewProps {
  centerPath: string;
  onOpenFile: (path: string) => void;
  onClose?: () => void;
}

export const GraphView: React.FC<GraphViewProps> = ({ centerPath, onOpenFile, onClose }) => {
  const { isDebugActive, toggleDebug } = useDebugMode();
  const { data, backlinks, forceStepsRef, forceStepsRemaining } = useLocalGraphData(
    centerPath,
    isDebugActive
  );
  const {
    zoom,
    setZoom,
    pan,
    isDragging,
    graphHeight,
    isDraggingHeight,
    containerRef,
    dragging,
    dimensions,
    halfW,
    halfH,
    handleHeightResizeStart,
    resetView,
    resetHeight,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useGraphViewport();
  const hoverPreview = useDelayedHoverPreview(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleNodeMouseEnter = (ev: React.MouseEvent, n: { id: string; path: string }) => {
    if (dragging.current) return;
    setHoveredId(n.id);
    hoverPreview.schedule(n.path, ev.clientX, ev.clientY);
  };

  const handleNodeMouseMove = (ev: React.MouseEvent, n: { id: string; path: string }) => {
    if (dragging.current) return;
    hoverPreview.schedule(n.path, ev.clientX, ev.clientY);
  };

  const handleNodeMouseLeave = () => {
    setHoveredId(null);
    hoverPreview.cancel();
  };

  const handleNodeClick = (ev: React.MouseEvent, path: string) => {
    ev.stopPropagation();
    hoverPreview.cancel(true);
    onOpenFile(path);
  };

  const graphDebugReport = useMemo((): GraphDebugReport => {
    return {
      centerPath,
      nodesCount: data.nodes.length,
      edgesCount: data.edges.length,
      backlinksCount: backlinks.length,
      zoom,
      panX: pan.x,
      panY: pan.y,
      forceStepsRemaining,
      width: dimensions.width,
      height: graphHeight,
    };
  }, [
    centerPath,
    data.nodes.length,
    data.edges.length,
    backlinks.length,
    zoom,
    pan.x,
    pan.y,
    forceStepsRemaining,
    dimensions.width,
    graphHeight,
  ]);

  useRegisterDebugStats('graph', graphDebugReport);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        background: 'var(--knit-surface)',
        minWidth: 0,
      }}
    >
      <DocViewChrome
        icon="graph"
        title="Graphe local"
        subtitle={
          <span style={{ fontSize: 10, color: 'var(--knit-text-muted)' }}>
            {data.nodes.length} nœuds • {data.edges.length} liens
          </span>
        }
        trailing={
          <>
            <button
              type="button"
              className="knit-btn"
              onClick={resetView}
              style={{ fontSize: 10, padding: '2px 7px' }}
              data-tooltip="Recentrer la vue sur la note active"
            >
              Recentrer
            </button>
            <button
              type="button"
              className="knit-btn"
              onClick={() => setZoom((z) => Math.min(2.5, z * 1.25))}
              style={{ padding: '2px 6px' }}
              data-tooltip="Zoom avant (+25%)"
            >
              <DuotoneIcon name="plus" size={11} />
            </button>
            <button
              type="button"
              className="knit-btn"
              onClick={() => setZoom((z) => Math.max(0.3, z / 1.25))}
              style={{ padding: '2px 6px' }}
              data-tooltip="Zoom arrière (-25%)"
            >
              <DuotoneIcon name="minus" size={11} />
            </button>
            {onClose && (
              <button
                type="button"
                className="knit-btn"
                onClick={onClose}
                style={{ padding: 3 }}
                data-tooltip="Fermer le graphe local"
              >
                <DuotoneIcon name="close" size={12} />
              </button>
            )}
          </>
        }
      />

      <svg
        width="100%"
        height={graphHeight}
        viewBox={`-${halfW} -${halfH} ${halfW * 2} ${graphHeight}`}
        style={{
          width: '100%',
          height: graphHeight,
          touchAction: 'none',
          cursor: isDragging ? 'grabbing' : 'grab',
          background: 'var(--knit-bg)',
          display: 'block',
        }}
        onWheel={onWheel}
        onPointerDown={(e) => {
          hoverPreview.cancel(true);
          onPointerDown(e);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => {
          hoverPreview.cancel();
          onPointerUp();
        }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {data.edges.map((e, i) => {
            const a = data.nodes.find((n) => n.id === e.source);
            const b = data.nodes.find((n) => n.id === e.target);
            if (!a || !b) return null;
            const isHighlight =
              hoveredId && (a.id === hoveredId || b.id === hoveredId);
            return (
              <line
                key={i}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={isHighlight ? 'var(--knit-primary)' : 'var(--knit-border)'}
                strokeWidth={isHighlight ? 2 : 1.2}
                strokeOpacity={hoveredId ? (isHighlight ? 1 : 0.25) : 0.65}
              />
            );
          })}

          {data.nodes.map((n) => {
            const isCenter = n.id === centerPath;
            const isHovered = n.id === hoveredId;
            return (
              <g
                key={n.id}
                transform={`translate(${n.x}, ${n.y})`}
                onClick={(ev) => handleNodeClick(ev, n.path)}
                onMouseEnter={(ev) => handleNodeMouseEnter(ev, n)}
                onMouseMove={(ev) => handleNodeMouseMove(ev, n)}
                onMouseLeave={handleNodeMouseLeave}
                style={{ cursor: 'pointer' }}
              >
                <circle
                  cx={0}
                  cy={0}
                  r={isCenter ? (isHovered ? 16 : 14) : isHovered ? 12 : 9}
                  fill={
                    isCenter
                      ? 'var(--knit-primary)'
                      : isHovered
                        ? 'var(--knit-primary)'
                        : 'color-mix(in srgb, var(--knit-primary) 35%, var(--knit-surface))'
                  }
                  stroke={isHovered ? '#FFFFFF' : 'var(--knit-primary)'}
                  strokeWidth={isHovered ? 2.5 : isCenter ? 2 : 1}
                  style={{
                    transition: 'r 0.15s ease, fill 0.15s ease',
                    filter: isHovered ? 'drop-shadow(0 0 6px var(--knit-primary))' : 'none',
                  }}
                />
                <text
                  x={0}
                  y={isCenter ? 26 : 22}
                  textAnchor="middle"
                  fill={isHovered ? 'var(--knit-primary)' : 'var(--knit-text)'}
                  fontSize={isCenter || isHovered ? 11 : 10}
                  fontWeight={isCenter || isHovered ? 700 : 500}
                  style={{
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                >
                  {n.label.length > 20 ? `${n.label.slice(0, 18)}…` : n.label}
                </text>
                {isDebugActive && (isHovered || isCenter) && (
                  <text
                    x={0}
                    y={isCenter ? 38 : 34}
                    textAnchor="middle"
                    fill="var(--knit-text-muted)"
                    fontSize={8}
                    style={{ userSelect: 'none', pointerEvents: 'none' }}
                  >
                    #{n.id.length > 16 ? `${n.id.slice(0, 14)}…` : n.id}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div
        onMouseDown={handleHeightResizeStart}
        onDoubleClick={resetHeight}
        title="Glisser pour redimensionner la hauteur du graphe (Double-clic pour 400px)"
        style={{
          position: 'relative',
          height: 1,
          backgroundColor: 'var(--knit-border)',
          cursor: 'row-resize',
          zIndex: 10,
          width: '100%',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -3,
            bottom: -3,
            left: 0,
            right: 0,
            cursor: 'row-resize',
          }}
        />
        <div
          className="knit-resizer-line"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: isDraggingHeight ? 'var(--knit-primary)' : 'transparent',
            boxShadow: isDraggingHeight ? '0 0 6px var(--knit-primary)' : 'none',
            transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
          }}
        />
      </div>

      {isDebugActive && (
        <GraphDebugHUD
          report={graphDebugReport}
          onCopyJson={() => {
            void copyDebugJson(
              {
                report: { ...graphDebugReport, forceStepsRemaining: forceStepsRef.current },
                nodes: data.nodes.map((n) => ({ id: n.id, path: n.path, label: n.label })),
                edges: data.edges,
                backlinks,
              },
              'Rapport Graphe copié',
              `${data.nodes.length} nœud(s).`
            );
          }}
          onDumpConsole={() => {
            dumpDebugConsole(
              'GRAPH',
              { ...graphDebugReport, forceStepsRemaining: forceStepsRef.current },
              data.nodes,
              data.edges,
              backlinks
            );
          }}
          onClose={toggleDebug}
        />
      )}
    </div>
  );
};
