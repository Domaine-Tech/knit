import React, { useState, useCallback, useMemo, useRef } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import { copyDebugJson, copyTextWithToast, dumpDebugConsole, slugify } from '../../utils';
import { COLUMN_ACCENT_COLORS } from '../../theme/theme';
import type { KanbanBoard, KanbanColumn as KanbanColumnModel, KanbanCard as KanbanCardModel } from '../../types';
import { toast } from '../../stores/toastStore';
import { KanbanDebugHUD } from './KanbanDebugHUD';
import { KanbanToolbar } from './KanbanToolbar';
import { KanbanColumn } from './KanbanColumn';
import { KanbanAddColumn } from './KanbanAddColumn';
import { KanbanCreateModal } from './KanbanCreateModal';
import { useKanbanBoard, useKanbanDnD, useDebugMode, useRegisterDebugStats } from '../../hooks';

interface KanbanViewProps {
  activeFilePath?: string | null;
  activeFileContent?: string;
  onUpdateContent: (path: string, content: string) => void;
  onOpenFile: (path: string) => void;
  onSwitchToEditor?: () => void;
  /** Mode lecture (Zen / Hover) : pas de DnD ni d'édition. */
  readOnly?: boolean;
  /** Hover Preview uniquement : masquer la toolbar (chrome compact). */
  compactChrome?: boolean;
}

export const KanbanView: React.FC<KanbanViewProps> = ({
  activeFilePath,
  activeFileContent = '',
  onUpdateContent,
  onOpenFile,
  onSwitchToEditor,
  readOnly = false,
  compactChrome = false,
}) => {
  const {
    availableKanbans,
    currentPath,
    board,
    boardRef,
    persistBoard,
    toggleCard,
    deleteCard,
    updateCardTitle,
    addCard,
    moveCard,
  } = useKanbanBoard({
    activeFilePath,
    activeFileContent,
    onUpdateContent,
  });

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const addColumnInputRef = useRef<HTMLInputElement>(null);
  const [addingCardInColumnId, setAddingCardInColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const addCardInputRef = useRef<HTMLInputElement>(null);
  const [renamingColumnId, setRenamingColumnId] = useState<string | null>(null);
  const [renamingColumnTitle, setRenamingColumnTitle] = useState('');
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardText, setEditingCardText] = useState('');
  const [isNewKanbanModalOpen, setIsNewKanbanModalOpen] = useState(false);
  const [newKanbanName, setNewKanbanName] = useState('');
  const [newKanbanFolder, setNewKanbanFolder] = useState('projet');

  const {
    draggedCard,
    dropTarget,
    setDropTarget,
    dragLogs,
    dragLogsRef,
    setDragLogs,
    handleDragStart,
    handleDragOverColumn,
    handleCardDragOver,
    handleDragEnd,
    handleDropOnCard,
    handleDropOnColumn,
  } = useKanbanDnD({ boardRef, moveCard });

  const handleAddColumnSubmit = (e: React.FormEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const title = newColumnTitle.trim();
    if (!title) {
      setIsAddingColumn(false);
      return;
    }
    const newColId = `col-${slugify(title) || 'col'}`;
    const color = COLUMN_ACCENT_COLORS[board.columns.length % COLUMN_ACCENT_COLORS.length];
    const newCol: KanbanColumnModel = { id: newColId, title, color, cards: [] };
    const updatedBoard: KanbanBoard = { ...board, columns: [...board.columns, newCol] };
    persistBoard(updatedBoard);
    setNewColumnTitle('');
    setIsAddingColumn(false);
    toast.success('Colonne créée', `Colonne "${title}" ajoutée`);
  };

  const handleRenameColumnSubmit = (columnId: string) => {
    if (readOnly) return;
    const title = renamingColumnTitle.trim();
    if (!title) {
      setRenamingColumnId(null);
      return;
    }
    persistBoard({
      ...board,
      columns: board.columns.map((c) => (c.id === columnId ? { ...c, title } : c)),
    });
    setRenamingColumnId(null);
    toast.info('Colonne renommée', title);
  };

  const handleDeleteColumn = (columnId: string, columnTitle: string, cardCount: number) => {
    if (readOnly) return;
    if (cardCount > 0) {
      if (!window.confirm(`Supprimer la colonne "${columnTitle}" et ses ${cardCount} tâche(s) ?`)) {
        return;
      }
    }
    persistBoard({ ...board, columns: board.columns.filter((c) => c.id !== columnId) });
    toast.success('Colonne supprimée', columnTitle);
  };

  const handleMoveColumn = (index: number, direction: 'left' | 'right') => {
    if (readOnly) return;
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= board.columns.length) return;
    const newCols = [...board.columns];
    const [moved] = newCols.splice(index, 1);
    newCols.splice(newIndex, 0, moved);
    persistBoard({ ...board, columns: newCols });
  };

  const handleAddCardSubmit = useCallback(
    (columnId: string, e: React.FormEvent) => {
      e.preventDefault();
      const title = newCardTitle.trim();
      if (!title) {
        setAddingCardInColumnId(null);
        return;
      }
      const baseSlug = slugify(title).slice(0, 30) || 'card';
      const newCard: KanbanCardModel = {
        id: `card-${baseSlug}-${Date.now().toString().slice(-4)}`,
        title,
        completed: false,
        status: ' ',
        rawText: `- [ ] ${title}`,
      };
      addCard(columnId, newCard);
      setNewCardTitle('');
      setTimeout(() => addCardInputRef.current?.focus(), 20);
      toast.success('Tâche ajoutée', title);
    },
    [newCardTitle, addCard]
  );

  const handleSaveCardEdit = (columnId: string, cardId: string) => {
    const title = editingCardText.trim();
    if (!title) {
      setEditingCardId(null);
      return;
    }
    updateCardTitle(columnId, cardId, title);
    setEditingCardId(null);
  };

  const handleDeleteCard = (columnId: string, cardId: string) => {
    deleteCard(columnId, cardId);
    toast.info('Tâche retirée', 'La tâche a été retirée du tableau');
  };

  const handleCreateKanbanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawName = newKanbanName.trim();
    if (!rawName) return;
    const cleanBase = rawName.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    const fileName = cleanBase.endsWith('.md') ? cleanBase : `${cleanBase}.md`;
    const folder = newKanbanFolder.trim() || 'projet';
    const relPath = `${folder}/${fileName}`;
    try {
      await vaultStore.createKanbanFile(relPath, rawName);
      setIsNewKanbanModalOpen(false);
      setNewKanbanName('');
      onOpenFile(relPath);
      toast.success('Tableau Kanban créé', relPath);
    } catch (err: unknown) {
      toast.error('Erreur de création', String(err));
    }
  };

  const focusAddColumn = () => {
    setIsAddingColumn(true);
    setTimeout(() => addColumnInputRef.current?.focus(), 30);
  };

  const filterQuery = searchFilter.toLowerCase().trim();
  const totalCards = board.columns.reduce((sum, c) => sum + c.cards.length, 0);
  const { isDebugActive, toggleDebug } = useDebugMode();
  const completedCount = useMemo(
    () => board.columns.reduce((sum, c) => sum + c.cards.filter((card) => card.completed).length, 0),
    [board]
  );

  const kanbanDebugReport = useMemo(
    () => ({
      path: currentPath,
      columnsCount: board.columns.length,
      totalCards,
      completedCount,
      columns: board.columns.map((c) => ({ id: c.id, title: c.title, cards: c.cards.length })),
    }),
    [currentPath, board, totalCards, completedCount]
  );
  useRegisterDebugStats('kanban', kanbanDebugReport);

  const handleBoardWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY !== 0 && e.deltaX === 0 && !e.shiftKey) {
      const target = e.target as HTMLElement | null;
      const scrollableCards = target?.closest('.knit-kanban-column-cards') as HTMLElement | null;
      if (scrollableCards && scrollableCards.scrollHeight > scrollableCards.clientHeight) {
        const atTop = scrollableCards.scrollTop === 0 && e.deltaY < 0;
        const atBottom =
          scrollableCards.scrollTop + scrollableCards.clientHeight >= scrollableCards.scrollHeight - 1 &&
          e.deltaY > 0;
        if (!atTop && !atBottom) return;
      }
      e.currentTarget.scrollLeft += e.deltaY;
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: 'var(--knit-bg)',
        overflow: 'hidden',
      }}
    >
      {!compactChrome && (
        <KanbanToolbar
          title={board.title}
          columnCount={board.columns.length}
          totalCards={totalCards}
          currentPath={currentPath}
          availableKanbans={availableKanbans}
          isSwitcherOpen={isSwitcherOpen}
          searchFilter={searchFilter}
          onToggleSwitcher={() => setIsSwitcherOpen((prev) => !prev)}
          onCloseSwitcher={() => setIsSwitcherOpen(false)}
          onOpenFile={onOpenFile}
          onRequestCreate={() => setIsNewKanbanModalOpen(true)}
          onSearchChange={setSearchFilter}
          onClearSearch={() => setSearchFilter('')}
          onAddColumn={readOnly ? () => undefined : focusAddColumn}
          onSwitchToEditor={onSwitchToEditor}
          readOnly={readOnly}
        />
      )}

      <div
        className={`knit-kanban-board-columns ${readOnly ? 'knit-view-readonly' : ''}`.trim()}
        onWheel={handleBoardWheel}
        onDragEnter={(e) => {
          if (readOnly) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDragOver={(e) => {
          if (readOnly) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        style={{
          flex: 1,
          display: 'flex',
          gap: 14,
          padding: 18,
          overflowX: 'auto',
          overflowY: 'hidden',
          alignItems: 'flex-start',
        }}
      >
        {board.columns.map((column, colIdx) => (
          <KanbanColumn
            key={column.id}
            column={column}
            colIdx={colIdx}
            columnCount={board.columns.length}
            filterQuery={filterQuery}
            isDebugActive={isDebugActive}
            readOnly={readOnly}
            renamingColumnId={renamingColumnId}
            renamingColumnTitle={renamingColumnTitle}
            addingCardInColumnId={addingCardInColumnId}
            newCardTitle={newCardTitle}
            addCardInputRef={addCardInputRef}
            editingCardId={editingCardId}
            editingCardText={editingCardText}
            draggedCard={draggedCard}
            dropTarget={dropTarget}
            onRenameTitleChange={setRenamingColumnTitle}
            onRenameSubmit={handleRenameColumnSubmit}
            onStartRename={(columnId, title) => {
              setRenamingColumnId(columnId);
              setRenamingColumnTitle(title);
            }}
            onCancelRename={() => setRenamingColumnId(null)}
            onMoveColumn={handleMoveColumn}
            onDeleteColumn={handleDeleteColumn}
            onStartAddCard={(columnId, resetTitle) => {
              setAddingCardInColumnId(columnId);
              if (resetTitle) setNewCardTitle('');
              setTimeout(() => addCardInputRef.current?.focus(), 20);
            }}
            onCancelAddCard={() => setAddingCardInColumnId(null)}
            onNewCardTitleChange={setNewCardTitle}
            onAddCardSubmit={handleAddCardSubmit}
            onOpenFile={onOpenFile}
            onToggleCard={toggleCard}
            onDeleteCard={handleDeleteCard}
            onStartEditCard={(cardId, title) => {
              setEditingCardId(cardId);
              setEditingCardText(title);
            }}
            onEditingCardTextChange={setEditingCardText}
            onSaveCard={handleSaveCardEdit}
            onCancelEditCard={() => setEditingCardId(null)}
            onDragStart={readOnly ? () => undefined : handleDragStart}
            onDragEnd={readOnly ? () => undefined : handleDragEnd}
            onDragOverColumn={readOnly ? () => undefined : handleDragOverColumn}
            onCardDragOver={readOnly ? () => undefined : handleCardDragOver}
            onDropOnCard={readOnly ? () => undefined : handleDropOnCard}
            onDropOnColumn={readOnly ? () => undefined : handleDropOnColumn}
            onClearDropTarget={(columnId) => {
              if (dropTarget?.columnId === columnId) setDropTarget(null);
            }}
          />
        ))}

        {!readOnly && (
          <KanbanAddColumn
            isAdding={isAddingColumn}
            title={newColumnTitle}
            inputRef={addColumnInputRef}
            onTitleChange={setNewColumnTitle}
            onSubmit={handleAddColumnSubmit}
            onCancel={() => setIsAddingColumn(false)}
            onStart={focusAddColumn}
          />
        )}
      </div>

      {isNewKanbanModalOpen && (
        <KanbanCreateModal
          name={newKanbanName}
          folder={newKanbanFolder}
          onNameChange={setNewKanbanName}
          onFolderChange={setNewKanbanFolder}
          onSubmit={handleCreateKanbanSubmit}
          onClose={() => setIsNewKanbanModalOpen(false)}
        />
      )}

      {isDebugActive && (
        <KanbanDebugHUD
          columnsCount={board.columns.length}
          cardsCount={totalCards}
          completedCount={completedCount}
          filePath={currentPath}
          dragLogs={dragLogs}
          onClearLogs={() => {
            dragLogsRef.current = [];
            setDragLogs([]);
          }}
          onCopyLogs={() => {
            const lines = dragLogs.map(
              (l) => `[${l.time}] [${l.action.toUpperCase()}] ${l.detail} (carte: "${l.cardTitle}" | id: ${l.cardId})`
            );
            void copyTextWithToast(
              lines.join('\n') || 'Aucun événement D&D enregistré.',
              'Logs D&D copiés',
              `${dragLogs.length} événement(s) copié(s) dans le presse-papier.`
            );
          }}
          onCopyJson={() => {
            void copyDebugJson(board, 'Structure JSON copiée', 'Le tableau Kanban a été copié.');
          }}
          onDumpConsole={() => {
            dumpDebugConsole('KANBAN', board, dragLogsRef.current);
            console.table(
              board.columns.map((c) => ({ id: c.id, title: c.title, cards: c.cards.length }))
            );
          }}
          onClose={toggleDebug}
        />
      )}
    </div>
  );
};
