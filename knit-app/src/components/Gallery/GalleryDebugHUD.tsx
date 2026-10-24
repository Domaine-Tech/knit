import React from 'react';
import { ViewDebugHUDShell } from '../Debug/ViewDebugHUDShell';
import type { GalleryDebugReport } from '../../types';

interface GalleryDebugHUDProps {
  report: GalleryDebugReport;
  onCopyJson: () => void;
  onDumpConsole: () => void;
  onClose: () => void;
}

export const GalleryDebugHUD: React.FC<GalleryDebugHUDProps> = ({
  report,
  onCopyJson,
  onDumpConsole,
  onClose,
}) => {
  return (
    <ViewDebugHUDShell
      title="Inspecteur Galerie"
      badges={[
        {
          label: `${report.cardsCount} cartes`,
          tone: report.cardsCount > 0 ? 'ok' : 'error',
        },
        { label: `source: ${report.source}` },
        { label: `${report.uniqueTags} tags` },
      ]}
      filePath={report.path}
      onCopyJson={onCopyJson}
      onDumpConsole={onDumpConsole}
      onClose={onClose}
    />
  );
};
