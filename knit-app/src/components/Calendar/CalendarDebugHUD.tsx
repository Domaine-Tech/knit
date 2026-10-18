import React from 'react';
import { ViewDebugHUDShell } from '../Debug/ViewDebugHUDShell';
import type { CalendarDebugReport } from '../../types';

interface CalendarDebugHUDProps {
  report: CalendarDebugReport;
  onCopyJson: () => void;
  onDumpConsole: () => void;
  onClose: () => void;
}

export const CalendarDebugHUD: React.FC<CalendarDebugHUDProps> = ({
  report,
  onCopyJson,
  onDumpConsole,
  onClose,
}) => {
  return (
    <ViewDebugHUDShell
      title="Inspecteur Agenda"
      badges={[
        {
          label: `${report.eventsFiltered} / ${report.eventsTotal} événements`,
          tone: 'ok',
        },
        { label: report.viewMode },
        { label: `scope: ${report.scopeMode}` },
      ]}
      meta={
        <span style={{ fontSize: 11, color: 'var(--knit-text-muted)' }}>
          {report.cursorIso}
          {report.folderScope ? ` | dossier: ${report.folderScope}` : ''}
          {report.loading ? ' | chargement…' : ''}
          {` | filtre: ${report.filterMode}/${report.statusFilter}/${report.priorityFilter}`}
          {report.collaborator ? ` | @${report.collaborator}` : ''}
          {` | ${report.variant}`}
        </span>
      }
      filePath={report.path}
      onCopyJson={onCopyJson}
      onDumpConsole={onDumpConsole}
      onClose={onClose}
    />
  );
};
