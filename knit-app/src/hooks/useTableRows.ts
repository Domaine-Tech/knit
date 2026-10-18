import { useMemo, useState, useCallback } from 'react';
import { parseCardMetadata } from '../utils';
import type { KanbanBoard, SortField, SortOrder, TableRowItem } from '../types';

/**
 * Aplatit un KanbanBoard en lignes de tableau, avec filtre et tri.
 */
export function useTableRows(board: KanbanBoard) {
  const [searchFilter, setSearchFilter] = useState('');
  const [columnFilter, setColumnFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('column');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const allRows: TableRowItem[] = useMemo(() => {
    const rows: TableRowItem[] = [];
    for (const col of board.columns) {
      for (const card of col.cards) {
        const meta = parseCardMetadata(card.title);
        rows.push({
          id: card.id,
          columnId: col.id,
          columnTitle: col.title,
          columnColor: col.color,
          title: meta.cleanTitle,
          completed: card.completed,
          tags: meta.tags,
          wikiLinks: meta.wikiLinks,
        });
      }
    }
    return rows;
  }, [board]);

  const filteredAndSortedRows = useMemo(() => {
    const q = searchFilter.toLowerCase().trim();

    return allRows
      .filter((row) => {
        if (columnFilter !== 'all' && row.columnId !== columnFilter) {
          return false;
        }
        if (q && !row.title.toLowerCase().includes(q) && !row.columnTitle.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortField === 'column') {
          cmp = a.columnTitle.localeCompare(b.columnTitle);
        } else if (sortField === 'title') {
          cmp = a.title.localeCompare(b.title);
        } else if (sortField === 'completed') {
          cmp = Number(a.completed) - Number(b.completed);
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [allRows, columnFilter, searchFilter, sortField, sortOrder]);

  const handleToggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField]);

  return {
    allRows,
    filteredAndSortedRows,
    searchFilter,
    setSearchFilter,
    columnFilter,
    setColumnFilter,
    sortField,
    sortOrder,
    handleToggleSort,
  };
}
