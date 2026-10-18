import React from 'react';
import type { KanbanBoard } from '../../types';
import { KnitSelect } from '../Form/KnitSelect';

export interface TableAddTaskRowProps {
  board: KanbanBoard;
  newTaskTitle: string;
  setNewTaskTitle: (value: string) => void;
  newTaskColumnId: string;
  setNewTaskColumnId: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export const TableAddTaskRow: React.FC<TableAddTaskRowProps> = ({
  board,
  newTaskTitle,
  setNewTaskTitle,
  newTaskColumnId,
  setNewTaskColumnId,
  onSubmit,
  onCancel,
}) => (
  <form
    onSubmit={onSubmit}
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
    <button type="button" className="knit-btn" style={{ padding: '4px 10px', fontSize: 11 }} onClick={onCancel}>
      Annuler
    </button>
  </form>
);
