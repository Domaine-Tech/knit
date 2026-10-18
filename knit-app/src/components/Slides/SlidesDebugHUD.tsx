import React from 'react';
import { ViewDebugHUDShell } from '../Debug/ViewDebugHUDShell';
import type { SlidesDebugReport } from '../../types';

interface SlidesDebugHUDProps {
  report: SlidesDebugReport;
  onCopyJson: () => void;
  onDumpConsole: () => void;
  onClose: () => void;
}

export const SlidesDebugHUD: React.FC<SlidesDebugHUDProps> = ({
  report,
  onCopyJson,
  onDumpConsole,
  onClose,
}) => {
  return (
    <ViewDebugHUDShell
      title="Inspecteur Diaporama"
      badges={[
        {
          label:
            report.slidesCount === 0
              ? '0 diapos'
              : `${report.index + 1} / ${report.slidesCount}`,
          tone: report.slidesCount > 0 ? 'ok' : 'error',
        },
        { label: `${report.currentChars} car.` },
        { label: `${report.separatorsCount} séparateurs ---` },
      ]}
      meta={
        report.fullscreen ? (
          <span style={{ fontSize: 11, color: 'var(--knit-text-muted)' }}>plein écran</span>
        ) : undefined
      }
      onCopyJson={onCopyJson}
      onDumpConsole={onDumpConsole}
      onClose={onClose}
    />
  );
};
