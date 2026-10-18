import React from 'react';
import type { KanbanCard as KanbanCardModel, KanbanColumn as KanbanColumnModel } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { contextMenu } from '../../stores/contextMenuStore';
import { KanbanCard } from './KanbanCard';
import type { KanbanDragInfo, KanbanDropSlot } from '../../types';

const KanbanDropIndicator: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      height: 4,
      margin: '-2px 0',
      pointerEvents: 'none',
      position: 'relative',
      zIndex: 10,
    }}
  >
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: 'var(--knit-primary)',
        boxShadow: '0 0 8px var(--knit-primary)',
        flexShrink: 0,
        marginLeft: 1,
      }}
    />
    <div
      style={{
        flex: 1,
        height: 2.5,
        backgroundColor: 'var(--knit-primary)',
        borderRadius: 2,
        boxShadow: '0 0 8px var(--knit-primary)',
        marginLeft: -1,
      }}
    />
  </div>
);

interface KanbanColumnProps {
  column: KanbanColumnModel;
  colIdx: number;
  columnCount: number;
  filterQuery: string;
  isDebugActive: boolean;
  renamingColumnId: string | null;
  renamingColumnTitle: string;
  addingCardInColumnId: string | null;
  newCardTitle: string;
  addCardInputRef: React.RefObject<HTMLInputElement | null>;
  editingCardId: string | null;
  editingCardText: string;
  draggedCard: KanbanDragInfo | null;
  dropTarget: KanbanDropSlot | null;
  onRenameTitleChange: (value: string) => void;
  onRenameSubmit: (columnId: string) => void;
  onStartRename: (columnId: string, title: string) => void;
  onCancelRename: () => void;
  onMoveColumn: (index: number, direction: 'left' | 'right') => void;
  onDeleteColumn: (columnId: string, title: string, cardCount: number) => void;
  onStartAddCard: (columnId: string, resetTitle: boolean) => void;
  onCancelAddCard: () => void;
  onNewCardTitleChange: (value: string) => void;
  onAddCardSubmit: (columnId: string, e: React.FormEvent) => void;
  onOpenFile: (path: string) => void;
  onToggleCard: (columnId: string, cardId: string) => void;
  onDeleteCard: (columnId: string, cardId: string) => void;
  onStartEditCard: (cardId: string, title: string) => void;
  onEditingCardTextChange: (value: string) => void;
  onSaveCard: (columnId: string, cardId: string) => void;
  onCancelEditCard: () => void;
  onDragStart: (e: React.DragEvent, columnId: string, cardId: string) => void;
  onDragEnd: () => void;
  onDragOverColumn: (e: React.DragEvent, columnId: string) => void;
  onCardDragOver: (e: React.DragEvent, columnId: string, cardIndex: number) => void;
  onDropOnCard: (e: React.DragEvent, columnId: string, cardIndex: number) => void;
  onDropOnColumn: (e: React.DragEvent, columnId: string) => void;
  onClearDropTarget: (columnId: string) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  colIdx,
  columnCount,
  filterQuery,
  isDebugActive,
  renamingColumnId,
  renamingColumnTitle,
  addingCardInColumnId,
  newCardTitle,
  addCardInputRef,
  editingCardId,
  editingCardText,
  draggedCard,
  dropTarget,
  onRenameTitleChange,
  onRenameSubmit,
  onStartRename,
  onCancelRename,
  onMoveColumn,
  onDeleteColumn,
  onStartAddCard,
  onCancelAddCard,
  onNewCardTitleChange,
  onAddCardSubmit,
  onOpenFile,
  onToggleCard,
  onDeleteCard,
  onStartEditCard,
  onEditingCardTextChange,
  onSaveCard,
  onCancelEditCard,
  onDragStart,
  onDragEnd,
  onDragOverColumn,
  onCardDragOver,
  onDropOnCard,
  onDropOnColumn,
  onClearDropTarget,
}) => {
  const isOver = dropTarget?.columnId === column.id;
  const matchingCards = column.cards.filter((card) => {
    if (!filterQuery) return true;
    return card.title.toLowerCase().includes(filterQuery);
  });

  const isSameColumn = draggedCard?.sourceColumnId === column.id;
  const sourceIndex = isSameColumn
    ? column.cards.findIndex((c) => c.id === draggedCard?.cardId)
    : -1;
  const isSelfDrop =
    isSameColumn && (dropTarget?.index === sourceIndex || dropTarget?.index === sourceIndex + 1);
  const shouldShowIndicator =
    dropTarget?.columnId === column.id && !isSelfDrop && Boolean(draggedCard);

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDragOver={(e) => onDragOverColumn(e, column.id)}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          onClearDropTarget(column.id);
        }
      }}
      onDrop={(e) => onDropOnColumn(e, column.id)}
      style={{
        width: 300,
        minWidth: 300,
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: isOver ? 'var(--knit-surface-hover)' : 'var(--knit-surface)',
        border: isOver ? '1px dashed var(--knit-primary)' : '1px solid var(--knit-border)',
        borderRadius: 'var(--knit-radius-md)',
        boxShadow: isOver ? '0 0 12px var(--knit-primary-alpha)' : 'var(--knit-shadow-sm)',
        transition: 'all var(--knit-duration-fast)',
      }}
    >
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--knit-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: column.color || 'var(--knit-primary)',
              flexShrink: 0,
            }}
          />
          {renamingColumnId === column.id ? (
            <input
              autoFocus
              type="text"
              className="knit-input"
              value={renamingColumnTitle}
              onChange={(e) => onRenameTitleChange(e.target.value)}
              onBlur={() => onRenameSubmit(column.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRenameSubmit(column.id);
                if (e.key === 'Escape') onCancelRename();
              }}
              style={{ padding: '2px 6px', fontSize: 12, width: '100%' }}
            />
          ) : (
            <span
              onDoubleClick={() => onStartRename(column.id, column.title)}
              title="Double-cliquez pour renommer la colonne"
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--knit-text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                cursor: 'text',
              }}
            >
              {column.title}
            </span>
          )}
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--knit-text-muted)',
              backgroundColor: 'var(--knit-surface-hover)',
              padding: '1px 6px',
              borderRadius: 10,
              flexShrink: 0,
            }}
          >
            {column.cards.length}
          </span>
          {isDebugActive && <span className="knit-debug-kanban-col-badge">#{column.id}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {colIdx > 0 && (
            <button
              type="button"
              onClick={() => onMoveColumn(colIdx, 'left')}
              title="Déplacer la colonne à gauche"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--knit-text-muted)',
                padding: 3,
                cursor: 'pointer',
                borderRadius: 3,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--knit-text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--knit-text-muted)')}
            >
              <DuotoneIcon name="chevron-left" size={12} />
            </button>
          )}
          {colIdx < columnCount - 1 && (
            <button
              type="button"
              onClick={() => onMoveColumn(colIdx, 'right')}
              title="Déplacer la colonne à droite"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--knit-text-muted)',
                padding: 3,
                cursor: 'pointer',
                borderRadius: 3,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--knit-text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--knit-text-muted)')}
            >
              <DuotoneIcon name="chevron-right" size={12} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              contextMenu.show(e, [
                {
                  id: `rename-col-${column.id}`,
                  label: 'Renommer la colonne...',
                  icon: 'edit',
                  onClick: () => onStartRename(column.id, column.title),
                },
                {
                  id: `add-card-${column.id}`,
                  label: 'Ajouter une tâche ici...',
                  icon: 'plus',
                  onClick: () => onStartAddCard(column.id, false),
                },
                { id: 'div-col-1', divider: true },
                {
                  id: `del-col-${column.id}`,
                  label: 'Supprimer la colonne',
                  icon: 'trash',
                  danger: true,
                  onClick: () => onDeleteColumn(column.id, column.title, column.cards.length),
                },
              ]);
            }}
            title="Options de colonne"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--knit-text-muted)',
              padding: 3,
              cursor: 'pointer',
              borderRadius: 3,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--knit-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--knit-text-muted)')}
          >
            <DuotoneIcon name="slider" size={12} />
          </button>
        </div>
      </div>

      <div
        onDragEnter={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDragOver={(e) => onDragOverColumn(e, column.id)}
        onDrop={(e) => onDropOnColumn(e, column.id)}
        style={{
          flex: 1,
          padding: '8px 10px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflowY: 'auto',
          minHeight: 120,
        }}
      >
        {matchingCards.length === 0 && dropTarget?.columnId === column.id && draggedCard && (
          <div
            style={{
              padding: '20px 12px',
              border: '2px dashed var(--knit-primary)',
              borderRadius: 'var(--knit-radius-sm)',
              backgroundColor: 'rgba(234, 179, 8, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: 'var(--knit-primary)',
              fontSize: 12,
              fontWeight: 600,
              pointerEvents: 'none',
            }}
          >
            <DuotoneIcon name="plus" size={16} />
            <span>Déposer la tâche ici</span>
          </div>
        )}

        {matchingCards.map((card: KanbanCardModel, cardIdx) => (
          <React.Fragment key={card.id}>
            {shouldShowIndicator && dropTarget?.index === cardIdx && <KanbanDropIndicator />}
            <KanbanCard
              card={card}
              columnId={column.id}
              isEditing={editingCardId === card.id}
              editingText={editingCardText}
              isDragged={draggedCard?.cardId === card.id}
              pointerEventsLocked={Boolean(draggedCard)}
              isDebugActive={isDebugActive}
              onOpenFile={onOpenFile}
              onToggle={() => onToggleCard(column.id, card.id)}
              onDelete={() => onDeleteCard(column.id, card.id)}
              onStartEdit={() => onStartEditCard(card.id, card.title)}
              onEditingTextChange={onEditingCardTextChange}
              onSave={() => onSaveCard(column.id, card.id)}
              onCancelEdit={onCancelEditCard}
              onDragStart={(e) => onDragStart(e, column.id, card.id)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => onCardDragOver(e, column.id, cardIdx)}
              onDrop={(e) => onDropOnCard(e, column.id, cardIdx)}
            />
          </React.Fragment>
        ))}

        {shouldShowIndicator && dropTarget?.index === matchingCards.length && matchingCards.length > 0 && (
          <KanbanDropIndicator />
        )}

        {addingCardInColumnId === column.id ? (
          <form
            onSubmit={(e) => onAddCardSubmit(column.id, e)}
            style={{
              padding: 8,
              backgroundColor: 'var(--knit-bg)',
              border: '1px solid var(--knit-primary)',
              borderRadius: 'var(--knit-radius-sm)',
            }}
          >
            <input
              ref={addCardInputRef}
              type="text"
              className="knit-input"
              placeholder="Nom de la tâche (ex: Spécifications [[Specs]] #projet)..."
              value={newCardTitle}
              onChange={(e) => onNewCardTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onCancelAddCard();
              }}
              style={{ width: '100%', fontSize: 12, marginBottom: 6 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button
                type="button"
                className="knit-btn"
                style={{ padding: '2px 8px', fontSize: 11 }}
                onClick={onCancelAddCard}
              >
                Annuler
              </button>
              <button type="submit" className="knit-btn knit-btn-primary" style={{ padding: '2px 8px', fontSize: 11 }}>
                Ajouter
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => onStartAddCard(column.id, true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '6px 8px',
              borderRadius: 'var(--knit-radius-xs)',
              border: '1px dashed var(--knit-border)',
              backgroundColor: 'transparent',
              color: 'var(--knit-text-muted)',
              fontSize: 12,
              cursor: 'pointer',
              marginTop: 4,
              transition: 'all var(--knit-duration-fast)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--knit-primary)';
              e.currentTarget.style.color = 'var(--knit-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--knit-border)';
              e.currentTarget.style.color = 'var(--knit-text-muted)';
            }}
          >
            <DuotoneIcon name="plus" size={12} />
            <span>Ajouter une tâche</span>
          </button>
        )}
      </div>
    </div>
  );
};

