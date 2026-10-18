import React from 'react';
import { ViewDebugHUDShell } from '../Debug/ViewDebugHUDShell';
import type { GraphDebugReport } from '../../types';

interface GraphDebugHUDProps {
  report: GraphDebugReport;
  onCopyJson: () => void;
  onDumpConsole: () => void;
  onClose: () => void;
}

export const GraphDebugHUD: React.FC<GraphDebugHUDProps> = ({
  report,
  onCopyJson,
  onDumpConsole,
  onClose,
}) => {
  return (
    <ViewDebugHUDShell
      title="Inspecteur Graphe local"
      badges={[
        {
          label: `${report.nodesCount} nœuds · ${report.edgesCount} arêtes`,
          tone: 'ok',
        },
        { label: `${report.backlinksCount} backlinks` },
        { label: `force ${report.forceStepsRemaining}` },
      ]}
      meta={
        <span style={{ fontSize: 11, color: 'var(--knit-text-muted)' }}>
          zoom {Math.round(report.zoom * 100)}% | pan ({Math.round(report.panX)},{' '}
          {Math.round(report.panY)}) | {report.width}×{report.height}px
        </span>
      }
      filePath={report.centerPath}
      onCopyJson={onCopyJson}
      onDumpConsole={onDumpConsole}
      onClose={onClose}
    />
  );
};
