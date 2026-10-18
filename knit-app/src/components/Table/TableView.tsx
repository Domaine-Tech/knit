import React, { useState, useEffect } from 'react';
import { copyTextWithToast } from '../../utils';
import type { KanbanCard, TableRowItem } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { WikiLinkPills, TagPills } from '../Common/WikiLinkPills';
import { KnitSelect } from '../Form/KnitSelect';
import { toast } from '../../stores/toastStore';
import { contextMenu } from '../../stores/contextMenuStore';
import { debugStore } from '../../stores/debugStore';
import { TableDebugHUD } from './TableDebugHUD';
import { useKanbanBoard, useDebugMode, useTableRows } from '../../hooks';

interface TableViewProps {
  activeFilePath?: string | null;
  activeFileContent?: string;
  onUpdateContent: (path: string, content: string) => void;
  onOpenFile: (path: string) => void;
  onSwitchToEditor?: () => void;
}

export const TableView: React.FC<TableViewProps> = ({
  activeFilePath,
  activeFileContent = '',
  onUpdateContent,
  onOpenFile,
  onSwitchToEditor,
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

  // Intégration Mode Debug Global (US B-054)
  const { isDebugActive, toggleDebug } = useDebugMode();

  useEffect(() => {
    debugStore.registerTableStats(() => ({
      path: currentPath,
      rowsCount: allRows.length,
      filteredCount: filteredAndSortedRows.length,
      columns: ['Statut', 'Colonne', 'Tâche', 'Tags'],
      sortField,
      sortOrder,
    }));
    return () => {
      debugStore.unregisterTableStats();
    };
  }, [currentPath, allRows, filteredAndSortedRows, sortField, sortOrder]);

  const handleToggleTaskCheckbox = (row: TableRowItem) => {
    toggleCard(row.columnId, row.id);
  };

  const handleMoveTaskColumn = (cardId: string, currentColumnId: string, targetColumnId: string) => {
    if (currentColumnId === targetColumnId) return;
    const result = moveCard({ cardId, sourceColumnId: currentColumnId, targetColumnId });
    if (result.outcome === 'moved') {
      toast.success('Statut mis à jour', `Déplacé vers ${result.toColumn || 'colonne'}`);
    }
  };

  const handleDeleteTask = (row: TableRowItem) => {
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

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--knit-bg)',
        overflow: 'hidden',
      }}
    >
      {/* Barre d'outils du Tableau */}
      <div
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
        {/* Titre & Sélecteur de fichier */}
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
            {filteredAndSortedRows.length} ligne{filteredAndSortedRows.length > 1 ? 's' : ''}
          </span>
        </div>

        {/* Contrôles de filtrage, Recherche & Exports */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Recherche rapide */}
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

          {/* Filtre par Colonne */}
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

          {/* Bouton Ajouter Tâche */}
          <button
            onClick={() => {
              setIsAddingTask(true);
              setNewTaskColumnId(board.columns[0]?.id || '');
            }}
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

          {/* Exports */}
          <button
            onClick={handleExportCSV}
            title="Exporter la liste au format CSV"
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
            onClick={handleCopyMarkdownTable}
            title="Copier le tableau au format Markdown"
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
              title="Afficher et éditer le fichier Markdown source"
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

      {/* Formulaire modal ou inline d'ajout de tâche */}
      {isAddingTask && (
        <form
          onSubmit={handleAddTaskSubmit}
          style={{
            padding: '10px 18px',
            backgroundColor: 'var(--knit-surface-hover)',
            borderBottom: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <KnitSelect
            value={newTaskColumnId}
            onChange={setNewTaskColumnId}
            aria-label="Colonne de la nouvelle tâche"
            style={{ fontSize: 12, minWidth: 140 }}
            options={board.columns.map((c) => ({
              value: c.id,
              label: c.title,
            }))}
          />

          <input
            autoFocus
            type="text"
            className="knit-input"
            placeholder="Titre de la tâche (ex: Spécifications [[Specs]] #projet)..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            style={{ flex: 1, fontSize: 12 }}
          />

          <button type="submit" className="knit-btn knit-btn-primary" style={{ padding: '4px 12px', fontSize: 11 }}>
            Ajouter
          </button>
          <button type="button" className="knit-btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => setIsAddingTask(false)}>
            Annuler
          </button>
        </form>
      )}

      {/* Table principale */}
      <div style={{ flex: 1, overflow: 'auto', padding: '12px 18px' }}>
        <table
          style={{
            width: '100%',
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
                onClick={() => handleToggleSort('completed')}
                style={{ padding: '8px 10px', width: 44, cursor: 'pointer' }}
              >
                Fait {sortField === 'completed' && (sortOrder === 'asc' ? '↑' : '↓')}
                {isDebugActive && <span className="knit-debug-table-col-badge">bool</span>}
              </th>
              <th
                onClick={() => handleToggleSort('column')}
                style={{ padding: '8px 12px', width: 170, cursor: 'pointer' }}
              >
                Colonne / Statut {sortField === 'column' && (sortOrder === 'asc' ? '↑' : '↓')}
                {isDebugActive && <span className="knit-debug-table-col-badge">enum</span>}
              </th>
              <th
                onClick={() => handleToggleSort('title')}
                style={{ padding: '8px 12px', cursor: 'pointer' }}
              >
                Tâche {sortField === 'title' && (sortOrder === 'asc' ? '↑' : '↓')}
                {isDebugActive && <span className="knit-debug-table-col-badge">string</span>}
              </th>
              <th style={{ padding: '8px 12px', width: 180 }}>
                Tags
                {isDebugActive && <span className="knit-debug-table-col-badge">tags[]</span>}
              </th>
              <th style={{ padding: '8px 10px', width: 70, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedRows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: 'var(--knit-text-muted)' }}>
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
                  onContextMenu={(e) => {
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
                  <td style={{ padding: '10px 10px', verticalAlign: 'middle' }}>
                    <input
                      type="checkbox"
                      checked={row.completed}
                      onChange={() => handleToggleTaskCheckbox(row)}
                      style={{ cursor: 'pointer', accentColor: 'var(--knit-primary)' }}
                    />
                  </td>

                  {/* Colonne / Statut avec sélecteur direct */}
                  <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
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
                  </td>

                  {/* Titre & WikiLinks */}
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
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
                  <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                    <TagPills tags={row.tags} variant="table" />
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '10px 10px', textAlign: 'right', verticalAlign: 'middle' }}>
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
            void copyTextWithToast(
              JSON.stringify(filteredAndSortedRows, null, 2),
              'Données JSON copiées',
              `${filteredAndSortedRows.length} lignes copiées.`
            );
          }}
          onDumpConsole={() => {
            console.group('[TABLE DEBUG]');
            console.log('Lignes filtrées :', filteredAndSortedRows);
            console.table(filteredAndSortedRows);
            console.groupEnd();
            toast.info('Inspecteur Console', 'Données de la table affichées dans la console (F12).');
          }}
          onClose={toggleDebug}
        />
      )}
    </div>
  );
};
