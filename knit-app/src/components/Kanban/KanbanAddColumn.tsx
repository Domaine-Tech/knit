import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

interface KanbanAddColumnProps {
  isAdding: boolean;
  title: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onTitleChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onStart: () => void;
}

export const KanbanAddColumn: React.FC<KanbanAddColumnProps> = ({
  isAdding,
  title,
  inputRef,
  onTitleChange,
  onSubmit,
  onCancel,
  onStart,
}) => (
  <div
    style={{
      width: 280,
      minWidth: 280,
      backgroundColor: 'var(--knit-surface)',
      border: '1px dashed var(--knit-border)',
      borderRadius: 'var(--knit-radius-md)',
      padding: 12,
      display: 'flex',
      flexDirection: 'column',
    }}
  >
    {isAdding ? (
      <form onSubmit={onSubmit}>
        <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--knit-text)' }}>Nouvelle colonne</h4>
        <input
          ref={inputRef}
          type="text"
          className="knit-input"
          placeholder="Ex: En attente, Revue de code, Bloqué..."
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onCancel();
          }}
          style={{ width: '100%', fontSize: 12, marginBottom: 8 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
          <button type="button" className="knit-btn" style={{ padding: '3px 8px', fontSize: 11 }} onClick={onCancel}>
            Annuler
          </button>
          <button type="submit" className="knit-btn knit-btn-primary" style={{ padding: '3px 8px', fontSize: 11 }}>
            Créer la colonne
          </button>
        </div>
      </form>
    ) : (
      <button
        type="button"
        onClick={onStart}
        style={{
          width: '100%',
          height: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          background: 'none',
          border: 'none',
          color: 'var(--knit-text-muted)',
          cursor: 'pointer',
          borderRadius: 'var(--knit-radius-sm)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--knit-primary)';
          e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--knit-text-muted)';
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <DuotoneIcon name="plus" size={18} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>Ajouter une colonne</span>
      </button>
    )}
  </div>
);
