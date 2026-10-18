import React from 'react';
import { ViewDebugHUDShell } from '../Debug/ViewDebugHUDShell';
import type { CanvasDebugReport } from '../../types';

interface CanvasDebugHUDProps {
  report: CanvasDebugReport;
  onCopyJson: () => void;
  onDumpConsole: () => void;
  onClose: () => void;
}

export const CanvasDebugHUD: React.FC<CanvasDebugHUDProps> = ({
  report,
  onCopyJson,
  onDumpConsole,
  onClose,
}) => {
  return (
    <ViewDebugHUDShell
      title="Inspecteur Canvas"
      badges={[
        {
          label: `${report.nodesCount} nœuds · ${report.edgesCount} liens`,
          tone: report.parseOk ? 'ok' : 'error',
        },
        { label: `zoom ${Math.round(report.zoom * 100)}%` },
      ]}
      meta={
        <span style={{ fontSize: 11, color: 'var(--knit-text-muted)' }}>
          pan ({Math.round(report.panX)}, {Math.round(report.panY)})
          {report.activeDragNodeId ? ` | drag: #${report.activeDragNodeId}` : ''}
          {!report.parseOk ? ' | parse invalide' : ''}
        </span>
      }
      filePath={report.path}
      onCopyJson={onCopyJson}
      onDumpConsole={onDumpConsole}
      onClose={onClose}
    />
  );
};
