import React from 'react';
import { ViewDebugHUDShell } from '../Debug/ViewDebugHUDShell';

interface TableDebugHUDProps {
  rowsCount: number;
  filteredCount: number;
  columns: string[];
  sortField: string;
  sortOrder: string;
  filePath: string | null;
  onCopyJson: () => void;
  onDumpConsole: () => void;
  onClose: () => void;
}

export const TableDebugHUD: React.FC<TableDebugHUDProps> = ({
  rowsCount,
  filteredCount,
  columns,
  sortField,
  sortOrder,
  filePath,
  onCopyJson,
  onDumpConsole,
  onClose,
}) => {
  return (
    <ViewDebugHUDShell
      title="Inspecteur Table & Données"
      badges={[
        {
          label: `${filteredCount} / ${rowsCount} lignes | ${columns.length} colonnes`,
          tone: 'ok',
        },
      ]}
      meta={
        <span style={{ fontSize: 11, color: 'var(--knit-text-muted)' }}>
          Tri : {sortField} [{sortOrder.toUpperCase()}]
        </span>
      }
      filePath={filePath}
      onCopyJson={onCopyJson}
      onDumpConsole={onDumpConsole}
      onClose={onClose}
    />
  );
};
