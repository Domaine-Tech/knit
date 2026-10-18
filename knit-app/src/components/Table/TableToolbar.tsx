import React from 'react';
import type { KanbanBoard, KanbanFileInfo } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { KnitSelect } from '../Form/KnitSelect';

export interface TableToolbarProps {
  board: KanbanBoard;
  currentPath: string | null;
  availableKanbans: KanbanFileInfo[];
  filteredCount: number;
  readOnly: boolean;
  compactChrome: boolean;
  isSwitcherOpen: boolean;
  setIsSwitcherOpen: React.Dispatch<React.SetStateAction<boolean>>;
  searchFilter: string;
  setSearchFilter: (value: string) => void;
  columnFilter: string;
  setColumnFilter: (value: string) => void;
  onOpenFile: (path: string) => void;
  onStartAddTask: () => void;
  onExportCSV: () => void;
  onCopyMarkdownTable: () => void;
  onSwitchToEditor?: () => void;
}

export const TableToolbar: React.FC<TableToolbarProps> = ({
  board,
  currentPath,
  availableKanbans,
  filteredCount,
  readOnly,
  compactChrome,
  isSwitcherOpen,
  setIsSwitcherOpen,
  searchFilter,
  setSearchFilter,
  columnFilter,
  setColumnFilter,
  onOpenFile,
  onStartAddTask,
  onExportCSV,
  onCopyMarkdownTable,
  onSwitchToEditor,
}) => (
  <div
    className={compactChrome ? 'knit-hover-chrome-hide' : undefined}
    style={{
      padding: '10px 18px',
      backgroundColor: 'var(--knit-surface)',
      borderBottom: '1px solid var(--knit-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <DuotoneIcon name="table" size={20} style={{ color: 'var(--knit-primary)' }} />
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--knit-text)' }}>
          {board.title || 'Vue Tableau'}
        </h2>
      </div>

      <button
        onClick={() => setIsSwitcherOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 8px',
          borderRadius: 'var(--knit-radius-xs)',
          backgroundColor: isSwitcherOpen ? 'var(--knit-surface-hover)' : 'transparent',
          border: '1px solid var(--knit-border)',
          fontSize: 11,
          color: 'var(--knit-text-secondary)',
          cursor: 'pointer',
        }}
      >
        <span>{currentPath ? currentPath.split('/').pop() : 'Choisir...'}</span>
        <DuotoneIcon name="chevron-down" size={11} />
      </button>

      {isSwitcherOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 6,
            width: 240,
            backgroundColor: 'var(--knit-surface)',
            border: '1px solid var(--knit-border)',
            borderRadius: 'var(--knit-radius-sm)',
            boxShadow: 'var(--knit-shadow-lg)',
            zIndex: 100,
            padding: '4px 0',
          }}
        >
          {availableKanbans.map((kb) => (
            <button
              key={kb.path}
              onClick={() => {
                setIsSwitcherOpen(false);
                onOpenFile(kb.path);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                border: 'none',
                backgroundColor: kb.path === currentPath ? 'var(--knit-primary-alpha)' : 'transparent',
                color: kb.path === currentPath ? 'var(--knit-primary)' : 'var(--knit-text)',
                fontSize: 12,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <DuotoneIcon name="kanban" size={13} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {kb.title}
              </span>
            </button>
          ))}
        </div>
      )}

      <span
        style={{
          fontSize: 11,
          color: 'var(--knit-text-muted)',
          backgroundColor: 'var(--knit-surface-hover)',
          padding: '2px 8px',
          borderRadius: 'var(--knit-radius-xs)',
        }}
      >
        {filteredCount} ligne{filteredCount > 1 ? 's' : ''}
      </span>
    </div>

    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div className="knit-input-group" style={{ width: 190 }}>
        <DuotoneIcon name="search" size={12} style={{ color: 'var(--knit-text-muted)' }} />
        <input
          type="text"
          className="knit-input-seamless"
          placeholder="Rechercher..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          style={{ fontSize: 11, width: '100%' }}
        />
      </div>

      <KnitSelect
        value={columnFilter}
        onChange={setColumnFilter}
        aria-label="Filtrer par colonne"
        style={{ fontSize: 11, minWidth: 140 }}
        options={[
          { value: 'all', label: 'Toutes les colonnes' },
          ...board.columns.map((col) => ({
            value: col.id,
            label: `${col.title} (${col.cards.length})`,
          })),
        ]}
      />

      {!readOnly && (
        <button
          onClick={onStartAddTask}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 9px',
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: 'var(--knit-surface)',
            border: '1px solid var(--knit-border)',
            color: 'var(--knit-text)',
            fontSize: 11,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <DuotoneIcon name="plus" size={11} />
          <span>Nouvelle tâche</span>
        </button>
      )}

      <button
        onClick={onExportCSV}
        data-tooltip="Exporter la liste au format CSV"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          borderRadius: 'var(--knit-radius-sm)',
          backgroundColor: 'transparent',
          border: '1px solid var(--knit-border)',
          color: 'var(--knit-text-secondary)',
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        <DuotoneIcon name="download" size={11} />
        <span>CSV</span>
      </button>

      <button
        onClick={onCopyMarkdownTable}
        data-tooltip="Copier le tableau au format Markdown"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 8px',
          borderRadius: 'var(--knit-radius-sm)',
          backgroundColor: 'transparent',
          border: '1px solid var(--knit-border)',
          color: 'var(--knit-text-secondary)',
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        <DuotoneIcon name="copy" size={11} />
        <span>Tableau MD</span>
      </button>

      {onSwitchToEditor && (
        <button
          onClick={onSwitchToEditor}
          data-tooltip="Afficher et éditer le fichier Markdown source"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '4px 8px',
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: 'transparent',
            border: '1px solid var(--knit-border)',
            color: 'var(--knit-text-secondary)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          <DuotoneIcon name="file-markdown" size={11} />
          <span>Markdown</span>
        </button>
      )}
    </div>
  </div>
);
