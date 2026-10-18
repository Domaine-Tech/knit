import React from 'react';
import type { KanbanCard as KanbanCardModel } from '../../types';
import { parseCardMetadata } from '../../utils';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { TagPills, WikiLinkPills } from '../Common/WikiLinkPills';

interface KanbanCardProps {
  card: KanbanCardModel;
  columnId: string;
  isEditing: boolean;
  editingText: string;
  isDragged: boolean;
  pointerEventsLocked: boolean;
  isDebugActive: boolean;
  readOnly?: boolean;
  onOpenFile: (path: string) => void;
  onToggle: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onEditingTextChange: (value: string) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  card,
  isEditing,
  editingText,
  isDragged,
  pointerEventsLocked,
  isDebugActive,
  readOnly = false,
  onOpenFile,
  onToggle,
  onDelete,
  onStartEdit,
  onEditingTextChange,
  onSave,
  onCancelEdit,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) => {
  const meta = parseCardMetadata(card.title);

  return (
    <div
      data-knit-card="true"
      draggable={!readOnly && !isEditing}
      onDragStart={readOnly ? undefined : onDragStart}
      onDragEnd={readOnly ? undefined : onDragEnd}
      onDragEnter={
        readOnly
          ? undefined
          : (e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }
      }
      onDragOver={readOnly ? undefined : onDragOver}
      onDrop={readOnly ? undefined : onDrop}
      style={{
        padding: '9px 11px',
        backgroundColor: 'var(--knit-bg)',
        border: '1px solid var(--knit-border)',
        borderRadius: 'var(--knit-radius-sm)',
        boxShadow: 'var(--knit-shadow-xs)',
        cursor: isEditing ? 'default' : readOnly ? 'default' : 'grab',
        opacity: isDragged ? 0.35 : 1,
        transition: 'border-color var(--knit-duration-fast), opacity var(--knit-duration-fast)',
        position: 'relative',
        overflow: 'visible',
        userSelect: isEditing ? 'text' : 'none',
      }}
      onMouseEnter={(e) => {
        if (!readOnly) e.currentTarget.style.borderColor = 'var(--knit-border-hover)';
      }}
      onMouseLeave={(e) => {
        if (!readOnly) e.currentTarget.style.borderColor = 'var(--knit-border)';
      }}
    >
      <div style={{ pointerEvents: pointerEventsLocked ? 'none' : 'auto' }}>
        {isEditing ? (
          <div>
            <textarea
              autoFocus
              className="knit-input"
              value={editingText}
              onChange={(e) => onEditingTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onSave();
                }
                if (e.key === 'Escape') onCancelEdit();
              }}
              style={{
                width: '100%',
                minHeight: 50,
                fontSize: 12,
                resize: 'vertical',
                marginBottom: 6,
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button
                type="button"
                className="knit-btn"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={onCancelEdit}
              >
                Annuler
              </button>
              <button
                type="button"
                className="knit-btn knit-btn-primary"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={onSave}
              >
                Enregistrer
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <input
                type="checkbox"
                className="knit-checkbox"
                checked={card.completed}
                disabled={readOnly}
                onChange={readOnly ? undefined : onToggle}
                style={{ marginTop: 3, cursor: readOnly ? 'default' : 'pointer' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span
                  onDoubleClick={readOnly ? undefined : onStartEdit}
                  style={{
                    fontSize: 13,
                    lineHeight: 1.4,
                    color: card.completed ? 'var(--knit-text-muted)' : 'var(--knit-text)',
                    textDecoration: card.completed ? 'line-through' : 'none',
                    wordBreak: 'break-word',
                    cursor: isEditing ? 'text' : readOnly ? 'default' : 'grab',
                    userSelect: isEditing ? 'text' : 'none',
                  }}
                >
                  {meta.cleanTitle}
                </span>
                <WikiLinkPills links={meta.wikiLinks} onOpenFile={onOpenFile} variant="kanban" />
                <TagPills tags={meta.tags} variant="kanban" />
                {isDebugActive && (
                  <div style={{ marginTop: 4 }}>
                    <span className="knit-debug-kanban-card-badge">#{card.id.slice(-6)}</span>
                  </div>
                )}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={onDelete}
                  title="Retirer la tâche"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--knit-text-muted)',
                    padding: 2,
                    cursor: 'pointer',
                    opacity: 0.6,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                >
                  <DuotoneIcon name="close" size={11} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
