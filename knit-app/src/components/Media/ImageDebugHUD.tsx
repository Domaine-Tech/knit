import React from 'react';
import { ViewDebugHUDShell } from '../Debug/ViewDebugHUDShell';
import type { ImageDebugReport } from '../../types';

interface ImageDebugHUDProps {
  report: ImageDebugReport;
  onCopyJson: () => void;
  onDumpConsole: () => void;
  onClose: () => void;
}

export const ImageDebugHUD: React.FC<ImageDebugHUDProps> = ({
  report,
  onCopyJson,
  onDumpConsole,
  onClose,
}) => {
  const dim =
    report.naturalWidth != null && report.naturalHeight != null
      ? `${report.naturalWidth}×${report.naturalHeight}`
      : 'dimensions inconnues';

  return (
    <ViewDebugHUDShell
      title="Inspecteur Image"
      badges={[
        {
          label: report.failed ? 'chargement échoué' : 'OK',
          tone: report.failed ? 'error' : 'ok',
        },
        { label: report.extension || '?' },
        { label: dim },
      ]}
      meta={
        <span
          style={{
            fontSize: 11,
            color: 'var(--knit-text-muted)',
            maxWidth: 320,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          data-tooltip={report.resolvedUrl}
        >
          {report.resolvedUrl || '(URL vide)'}
        </span>
      }
      filePath={report.path}
      onCopyJson={onCopyJson}
      onDumpConsole={onDumpConsole}
      onClose={onClose}
    />
  );
};
