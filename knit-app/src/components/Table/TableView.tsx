import React, { useMemo, useState } from 'react';
import { copyDebugJson, copyTextWithToast, dumpDebugConsole } from '../../utils';
import type { KanbanCard, TableRowItem } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { WikiLinkPills, TagPills } from '../Common/WikiLinkPills';
import { KnitSelect } from '../Form/KnitSelect';
import { toast } from '../../stores/toastStore';
import { contextMenu } from '../../stores/contextMenuStore';
import { TableDebugHUD } from './TableDebugHUD';
import { TableToolbar } from './TableToolbar';
import { TableAddTaskRow } from './TableAddTaskRow';
import { useKanbanBoard, useDebugMode, useRegisterDebugStats, useTableRows } from '../../hooks';

interface TableViewProps {
  activeFilePath?: string | null;
  activeFileContent?: string;
  onUpdateContent: (path: string, content: string) => void;
  onOpenFile: (path: string) => void;
  onSwitchToEditor?: () => void;
  /** Mode lecture (Zen / Hover) : pas d'édition. */
  readOnly?: boolean;
  /** Hover Preview uniquement : masquer la toolbar. */
  compactChrome?: boolean;
}

export const TableView: React.FC<TableViewProps> = ({
  activeFilePath,
  activeFileContent = '',
  onUpdateContent,
  onOpenFile,
  onSwitchToEditor,
  readOnly = false,
  compactChrome = false,
}) => {
  const { availableKanbans, currentPath, board, toggleCard, deleteCard, addCard, moveCard } = useKanbanBoard({
    activeFilePath,
    activeFileContent,
    onUpdateContent,
  });

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Formulaire d'ajout rapide de tâche dans le tableau
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskColumnId, setNewTaskColumnId] = useState('');

  const {
    allRows,
    filteredAndSortedRows,
    searchFilter,
    setSearchFilter,
    columnFilter,
    setColumnFilter,
    sortField,
    sortOrder,
    handleToggleSort,
  } = useTableRows(board);

  const { isDebugActive, toggleDebug } = useDebugMode();

  const tableDebugReport = useMemo(
    () => ({
      path: currentPath,
      rowsCount: allRows.length,
      filteredCount: filteredAndSortedRows.length,
      columns: ['Statut', 'Colonne', 'Tâche', 'Tags'] as string[],
      sortField,
      sortOrder,
    }),
    [currentPath, allRows.length, filteredAndSortedRows.length, sortField, sortOrder]
  );
  useRegisterDebugStats('table', tableDebugReport);

  const handleToggleTaskCheckbox = (row: TableRowItem) => {
    if (readOnly) return;
    toggleCard(row.columnId, row.id);
  };

  const handleMoveTaskColumn = (cardId: string, currentColumnId: string, targetColumnId: string) => {
    if (readOnly || currentColumnId === targetColumnId) return;
    const result = moveCard({ cardId, sourceColumnId: currentColumnId, targetColumnId });
    if (result.outcome === 'moved') {
      toast.success('Statut mis à jour', `Déplacé vers ${result.toColumn || 'colonne'}`);
    }
  };

  const handleDeleteTask = (row: TableRowItem) => {
    if (readOnly) return;
    deleteCard(row.columnId, row.id);
    toast.info('Tâche supprimée', row.title);
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;

    const colId = newTaskColumnId || (board.columns.length > 0 ? board.columns[0].id : '');
    if (!colId) return;

    const newCard: KanbanCard = {
      id: `card-${Date.now().toString().slice(-5)}`,
      title,
      completed: false,
      status: ' ',
      rawText: `- [ ] ${title}`,
    };

    addCard(colId, newCard);
    setNewTaskTitle('');
    setIsAddingTask(false);
    toast.success('Tâche ajoutée', title);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (allRows.length === 0) {
      toast.warning('Tableau vide', 'Aucune tâche à exporter');
      return;
    }

    const headers = ['Statut/Colonne', 'Titre', 'Fait', 'Tags', 'WikiLinks'];
    const csvLines = [headers.join(',')];

    for (const r of allRows) {
      const line = [
        `"${r.columnTitle.replace(/"/g, '""')}"`,
        `"${r.title.replace(/"/g, '""')}"`,
        r.completed ? 'Oui' : 'Non',
        `"${r.tags.join('; ')}"`,
        `"${r.wikiLinks.join('; ')}"`,
      ];
      csvLines.push(line.join(','));
    }

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${board.title || 'tableau'}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV réussi', `${allRows.length} tâche(s) exportée(s)`);
  };

  // Export Markdown Table
  const handleCopyMarkdownTable = () => {
    if (allRows.length === 0) return;

    let md = `| Statut | Tâche | Fait | Tags |\n|---|---|:---:|---|\n`;
    for (const r of allRows) {
      md += `| ${r.columnTitle} | ${r.title} | ${r.completed ? '[x]' : '[ ]'} | ${r.tags.map((t) => `#${t}`).join(' ')} |\n`;
    }

    void copyTextWithToast(md, 'Tableau Markdown copié', 'Presse-papier mis à jour');
  };

  const handleTableWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && e.deltaX === 0 && !e.shiftKey) {
      const container = e.currentTarget;
      const target = e.target as HTMLElement | null;
      const isOverHeader = Boolean(target?.closest('thead') || target?.tagName === 'TH');

      if (isOverHeader && container.scrollWidth > container.clientWidth) {
        container.scrollLeft += e.deltaY;
        e.preventDefault();
        return;
      }

      const atTop = container.scrollTop <= 0 && e.deltaY < 0;
      const atBottom =
        container.scrollTop + container.clientHeight >= container.scrollHeight - 1 &&
        e.deltaY > 0;
      if ((atTop || atBottom) && container.scrollWidth > container.clientWidth) {
        container.scrollLeft += e.deltaY;
      }
    }
  };

  return (
    <div
      className={`knit-table-view-container ${readOnly ? 'knit-view-readonly' : ''}`.trim()}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        backgroundColor: 'var(--knit-bg)',
        overflow: 'hidden',
      }}
    >
      {!compactChrome && (
        <TableToolbar
          board={board}
          currentPath={currentPath}
          availableKanbans={availableKanbans}
          filteredCount={filteredAndSortedRows.length}
          readOnly={readOnly}
          compactChrome={compactChrome}
          isSwitcherOpen={isSwitcherOpen}
          setIsSwitcherOpen={setIsSwitcherOpen}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          columnFilter={columnFilter}
          setColumnFilter={setColumnFilter}
          onOpenFile={onOpenFile}
          onStartAddTask={() => {
            setIsAddingTask(true);
            setNewTaskColumnId(board.columns[0]?.id || '');
          }}
          onExportCSV={handleExportCSV}
          onCopyMarkdownTable={handleCopyMarkdownTable}
          onSwitchToEditor={onSwitchToEditor}
        />
      )}

      {isAddingTask && (
        <TableAddTaskRow
          board={board}
          newTaskTitle={newTaskTitle}
          setNewTaskTitle={setNewTaskTitle}
          newTaskColumnId={newTaskColumnId}
          setNewTaskColumnId={setNewTaskColumnId}
          onSubmit={handleAddTaskSubmit}
          onCancel={() => setIsAddingTask(false)}
        />
      )}

      {/* Table principale */}
      <div
        className="knit-table-view-scroll"
        onWheel={handleTableWheel}
        style={{
          flex: 1,
          minHeight: 0,
          overflowX: 'auto',
          overflowY: 'auto',
          padding: readOnly ? '8px 10px' : '12px 18px',
        }}
      >
        <table
          style={{
            width: '100%',
            minWidth: 680,
            borderCollapse: 'collapse',
            fontSize: 12,
            textAlign: 'left',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: '2px solid var(--knit-border)',
                color: 'var(--knit-text-muted)',
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                userSelect: 'none',
              }}
            >
              <th
                onClick={readOnly ? undefined : () => handleToggleSort('completed')}
                style={{ padding: '8px 10px', width: 44, minWidth: 44, cursor: readOnly ? 'default' : 'pointer' }}
              >
                Fait {sortField === 'completed' && (sortOrder === 'asc' ? '↑' : '↓')}
                {isDebugActive && <span className="knit-debug-table-col-badge">bool</span>}
              </th>
              <th
                onClick={readOnly ? undefined : () => handleToggleSort('column')}
                style={{ padding: '8px 12px', width: 170, minWidth: 160, cursor: readOnly ? 'default' : 'pointer' }}
              >
                Colonne / Statut {sortField === 'column' && (sortOrder === 'asc' ? '↑' : '↓')}
                {isDebugActive && <span className="knit-debug-table-col-badge">enum</span>}
              </th>
              <th
                onClick={readOnly ? undefined : () => handleToggleSort('title')}
                style={{ padding: '8px 12px', minWidth: 280, cursor: readOnly ? 'default' : 'pointer' }}
              >
                Tâche {sortField === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                {isDebugActive && <span className="knit-debug-table-col-badge">string</span>}
              </th>
              <th style={{ padding: '8px 12px', width: 180, minWidth: 160 }}>
                Tags
                {isDebugActive && <span className="knit-debug-table-col-badge">tags[]</span>}
              </th>
              {!readOnly && (
                <th style={{ padding: '8px 10px', width: 70, minWidth: 70, textAlign: 'right' }}>Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length === 0 ? (
              <tr>
                <td colSpan={readOnly ? 4 : 5} style={{ padding: 24, textAlign: 'center', color: 'var(--knit-text-muted)' }}>
                  Aucune tâche ne correspond aux critères
                </td>
              </tr>
            ) : (
              filteredAndSortedRows.map((row) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: '1px solid var(--knit-border)',
                    transition: 'background var(--knit-duration-fast)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  onContextMenu={readOnly ? undefined : (e) => {
                    e.preventDefault();
                    contextMenu.show(e, [
                      ...board.columns.map((c) => ({
                        id: `move-to-${c.id}`,
                        label: `Déplacer vers "${c.title}"`,
                        icon: 'arrow-right' as const,
                        onClick: () => handleMoveTaskColumn(row.id, row.columnId, c.id),
                      })),
                      { id: 'div-t-1', divider: true },
                      {
                        id: 'delete-row',
                        label: 'Supprimer la tâche',
                        icon: 'trash' as const,
                        danger: true,
                        onClick: () => handleDeleteTask(row),
                      },
                    ]);
                  }}
                >
                  {/* Case à cocher */}
                  <td style={{ padding: '10px 10px', width: 44, minWidth: 44, verticalAlign: 'middle' }}>
                    <input
                      type="checkbox"
                      checked={row.completed}
                      disabled={readOnly}
                      onChange={readOnly ? undefined : () => handleToggleTaskCheckbox(row)}
                      style={{ cursor: readOnly ? 'default' : 'pointer', accentColor: 'var(--knit-primary)' }}
                    />
                  </td>

                  {/* Colonne / Statut */}
                  <td style={{ padding: '8px 12px', width: 170, minWidth: 160, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    {readOnly ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '2px 8px',
                          borderRadius: 'var(--knit-radius-xs, 4px)',
                          backgroundColor: 'var(--knit-surface-hover)',
                          fontSize: 11,
                          color: 'var(--knit-text)',
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            backgroundColor:
                              board.columns.find((c) => c.id === row.columnId)?.color || 'var(--knit-primary)',
                          }}
                        />
                        {row.columnTitle}
                      </span>
                    ) : (
                      <KnitSelect
                        value={row.columnId}
                        onChange={(nextCol) =>
                          handleMoveTaskColumn(row.id, row.columnId, nextCol)
                        }
                        aria-label="Colonne / statut"
                        style={{ fontSize: 11, minWidth: 120 }}
                        className="knit-table-status-select"
                        options={board.columns.map((col) => ({
                          value: col.id,
                          label: col.title,
                        }))}
                      />
                    )}
                  </td>

                  {/* Titre & WikiLinks */}
                  <td style={{ padding: '10px 12px', minWidth: 280, verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span
                        style={{
                          color: row.completed ? 'var(--knit-text-muted)' : 'var(--knit-text)',
                          textDecoration: row.completed ? 'line-through' : 'none',
                          fontSize: 13,
                        }}
                      >
                        {row.title}
                      </span>

                      {row.wikiLinks.length > 0 && (
                        <WikiLinkPills
                          links={row.wikiLinks}
                          onOpenFile={onOpenFile}
                          variant="table"
                        />
                      )}
                    </div>
                  </td>

                  {/* Tags */}
                  <td style={{ padding: '10px 12px', width: 180, minWidth: 160, verticalAlign: 'middle' }}>
                    <TagPills tags={row.tags} variant="table" />
                  </td>

                  {/* Actions */}
                  {!readOnly && (
                    <td style={{ padding: '10px 10px', width: 70, minWidth: 70, textAlign: 'right', verticalAlign: 'middle' }}>
                      <button
                        onClick={() => handleDeleteTask(row)}
                        title="Supprimer la tâche"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--knit-text-muted)',
                          padding: 3,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--knit-text-muted)')}
                      >
                        <DuotoneIcon name="trash" size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Inspecteur HUD en bas de la vue Table (Mode Debug Global) */}
      {isDebugActive && (
        <TableDebugHUD
          rowsCount={allRows.length}
          filteredCount={filteredAndSortedRows.length}
          columns={['Statut', 'Colonne', 'Tâche', 'Tags']}
          sortField={sortField}
          sortOrder={sortOrder}
          filePath={currentPath}
          onCopyJson={() => {
            void copyDebugJson(
              filteredAndSortedRows,
              'Données JSON copiées',
              `${filteredAndSortedRows.length} lignes copiées.`
            );
          }}
          onDumpConsole={() => {
            dumpDebugConsole('TABLE', filteredAndSortedRows);
            console.table(filteredAndSortedRows);
          }}
          onClose={toggleDebug}
        />
      )}
    </div>
  );
};
