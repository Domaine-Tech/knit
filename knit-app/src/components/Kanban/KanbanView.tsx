import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import {
  parseCardMetadata,
  adaptCardStatusToColumn,
  COLUMN_ACCENT_COLORS,
} from '../../utils/kanbanParser';
import type {
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  TaskStatus,
} from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { toast } from '../../stores/toastStore';
import { contextMenu } from '../../stores/contextMenuStore';
import { debugStore, useDebugMode } from '../../stores/debugStore';
import { KanbanDebugHUD } from './KanbanDebugHUD';

interface KanbanViewProps {
  activeFilePath?: string | null;
  activeFileContent?: string;
  onUpdateContent: (path: string, content: string) => void;
  onOpenFile: (path: string) => void;
  onSwitchToEditor?: () => void;
}

import { useKanbanBoard } from '../../hooks';

export const KanbanView: React.FC<KanbanViewProps> = ({
  activeFilePath,
  activeFileContent = '',
  onUpdateContent,
  onOpenFile,
  onSwitchToEditor,
}) => {
  const { availableKanbans, currentPath, board, persistBoard } = useKanbanBoard({
    activeFilePath,
    activeFileContent,
    onUpdateContent,
  });

  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Recherche / Filtre textuel dans les cartes
  const [searchFilter, setSearchFilter] = useState('');

  // États pour l'ajout d'une nouvelle colonne
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const addColumnInputRef = useRef<HTMLInputElement>(null);

  // États pour l'ajout d'une nouvelle carte (par colonne)
  const [addingCardInColumnId, setAddingCardInColumnId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const addCardInputRef = useRef<HTMLInputElement>(null);

  // États de renommage inline d'une colonne
  const [renamingColumnId, setRenamingColumnId] = useState<string | null>(null);
  const [renamingColumnTitle, setRenamingColumnTitle] = useState('');

  // États de renommage inline d'une carte
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editingCardText, setEditingCardText] = useState('');

  // Modale de création d'un nouveau fichier Kanban
  const [isNewKanbanModalOpen, setIsNewKanbanModalOpen] = useState(false);
  const [newKanbanName, setNewKanbanName] = useState('');
  const [newKanbanFolder, setNewKanbanFolder] = useState('projet');

  // Drag and Drop
  const [draggedCard, setDraggedCard] = useState<{ cardId: string; sourceColumnId: string } | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Gestion de l'ajout d'une nouvelle colonne personnalisée
  const handleAddColumnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newColumnTitle.trim();
    if (!title) {
      setIsAddingColumn(false);
      return;
    }

    const newColId = `col-${board.columns.length}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'col'}`;
    const color = COLUMN_ACCENT_COLORS[board.columns.length % COLUMN_ACCENT_COLORS.length];
    const newCol: KanbanColumn = {
      id: newColId,
      title,
      color,
      cards: [],
    };

    const updatedBoard: KanbanBoard = {
      ...board,
      columns: [...board.columns, newCol],
    };

    persistBoard(updatedBoard);
    setNewColumnTitle('');
    setIsAddingColumn(false);
    toast.success('Colonne créée', `Colonne "${title}" ajoutée`);
  };

  // Renommage d'une colonne
  const handleRenameColumnSubmit = (columnId: string) => {
    const title = renamingColumnTitle.trim();
    if (!title) {
      setRenamingColumnId(null);
      return;
    }

    const updatedCols = board.columns.map((c) => (c.id === columnId ? { ...c, title } : c));
    persistBoard({ ...board, columns: updatedCols });
    setRenamingColumnId(null);
    toast.info('Colonne renommée', title);
  };

  // Suppression d'une colonne
  const handleDeleteColumn = (columnId: string, columnTitle: string, cardCount: number) => {
    if (cardCount > 0) {
      if (!window.confirm(`Supprimer la colonne "${columnTitle}" et ses ${cardCount} tâche(s) ?`)) {
        return;
      }
    }

    const updatedCols = board.columns.filter((c) => c.id !== columnId);
    persistBoard({ ...board, columns: updatedCols });
    toast.success('Colonne supprimée', columnTitle);
  };

  // Déplacement d'une colonne (gauche / droite)
  const handleMoveColumn = (index: number, direction: 'left' | 'right') => {
    const newIndex = direction === 'left' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= board.columns.length) return;

    const newCols = [...board.columns];
    const [moved] = newCols.splice(index, 1);
    newCols.splice(newIndex, 0, moved);

    persistBoard({ ...board, columns: newCols });
  };

  // Ajout d'une carte dans une colonne
  const handleAddCardSubmit = useCallback(
    (columnId: string, e: React.FormEvent) => {
      e.preventDefault();
      const title = newCardTitle.trim();
      if (!title) {
        setAddingCardInColumnId(null);
        return;
      }

      const newCard: KanbanCard = {
        id: `card-${Date.now().toString().slice(-5)}`,
        title,
        completed: false,
        status: ' ',
        rawText: `- [ ] ${title}`,
      };

      const updatedCols = board.columns.map((col) => {
        if (col.id === columnId) {
          return { ...col, cards: [...col.cards, newCard] };
        }
        return col;
      });

      persistBoard({ ...board, columns: updatedCols });
      setNewCardTitle('');
      // On conserve le focus pour ajouter rapidement plusieurs cartes
      setTimeout(() => addCardInputRef.current?.focus(), 20);
      toast.success('Tâche ajoutée', title);
    },
    [newCardTitle, board, persistBoard]
  );

  // Bascule de la case à cocher d'une carte
  const handleToggleCardCheckbox = (columnId: string, cardId: string) => {
    const updatedCols = board.columns.map((col) => {
      if (col.id !== columnId) return col;
      return {
        ...col,
        cards: col.cards.map((c) => {
          if (c.id !== cardId) return c;
          const nextCompleted = !c.completed;
          return {
            ...c,
            completed: nextCompleted,
            status: (nextCompleted ? 'x' : ' ') as TaskStatus,
          };
        }),
      };
    });

    persistBoard({ ...board, columns: updatedCols });
  };

  // Modification du texte d'une carte
  const handleSaveCardEdit = (columnId: string, cardId: string) => {
    const title = editingCardText.trim();
    if (!title) {
      setEditingCardId(null);
      return;
    }

    const updatedCols = board.columns.map((col) => {
      if (col.id !== columnId) return col;
      return {
        ...col,
        cards: col.cards.map((c) => (c.id === cardId ? { ...c, title } : c)),
      };
    });

    persistBoard({ ...board, columns: updatedCols });
    setEditingCardId(null);
  };

  // Suppression d'une carte
  const handleDeleteCard = (columnId: string, cardId: string) => {
    const updatedCols = board.columns.map((col) => {
      if (col.id !== columnId) return col;
      return {
        ...col,
        cards: col.cards.filter((c) => c.id !== cardId),
      };
    });

    persistBoard({ ...board, columns: updatedCols });
    toast.info('Tâche retirée', 'La tâche a été retirée du tableau');
  };

  // Drag and Drop de cartes entre colonnes
  const handleDragStart = (e: React.DragEvent, columnId: string, cardId: string) => {
    setDraggedCard({ cardId, sourceColumnId: columnId });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardId);
  };

  const handleDragOverColumn = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumnId !== columnId) {
      setDragOverColumnId(columnId);
    }
  };

  const handleDropOnColumn = (targetColumnId: string) => {
    if (!draggedCard) return;
    const { cardId, sourceColumnId } = draggedCard;
    setDragOverColumnId(null);
    setDraggedCard(null);

    if (sourceColumnId === targetColumnId) return;

    // Récupérer la carte source
    const sourceCol = board.columns.find((c) => c.id === sourceColumnId);
    const cardToMove = sourceCol?.cards.find((c) => c.id === cardId);
    if (!cardToMove) return;

    // Colonne cible et adaptation bijective du statut (- [ ] -> - [/] -> - [x])
    const targetCol = board.columns.find((c) => c.id === targetColumnId);
    const updatedCard: KanbanCard = adaptCardStatusToColumn(cardToMove, targetCol?.title || '');

    const updatedCols = board.columns.map((col) => {
      if (col.id === sourceColumnId) {
        return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
      }
      if (col.id === targetColumnId) {
        return { ...col, cards: [...col.cards, updatedCard] };
      }
      return col;
    });

    persistBoard({ ...board, columns: updatedCols });
    toast.success('Tâche déplacée', `Déplacée vers "${targetCol?.title || 'nouvelle colonne'}"`);
  };

  // Création d'un nouveau fichier Kanban
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

  // Cartes filtrées
  const filterQuery = searchFilter.toLowerCase().trim();
  const totalCards = board.columns.reduce((sum, c) => sum + c.cards.length, 0);

  // Intégration Mode Debug Global (US B-054)
  const { isDebugActive, toggleDebug } = useDebugMode();
  const completedCount = useMemo(() => {
    return board.columns.reduce(
      (sum, c) => sum + c.cards.filter((card) => card.completed).length,
      0
    );
  }, [board]);

  useEffect(() => {
    debugStore.registerKanbanStats(() => ({
      path: currentPath,
      columnsCount: board.columns.length,
      totalCards,
      completedCount,
      columns: board.columns.map((c) => ({ id: c.id, title: c.title, cards: c.cards.length })),
    }));
    return () => {
      debugStore.unregisterKanbanStats();
    };
  }, [currentPath, board, totalCards, completedCount]);

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
      {/* Barre d'outils supérieure du Kanban */}
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
        {/* Titre du tableau & Sélecteur de fichiers Kanban */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <DuotoneIcon name="kanban" size={20} style={{ color: 'var(--knit-primary)' }} />
            <h2
              style={{
                fontSize: 15,
                fontWeight: 700,
                margin: 0,
                color: 'var(--knit-text)',
                letterSpacing: '-0.01em',
              }}
            >
              {board.title || 'Tableau Kanban'}
            </h2>
          </div>

          {/* Bouton sélecteur de fichier Kanban */}
          <button
            onClick={() => setIsSwitcherOpen((prev) => !prev)}
            title="Changer de tableau Kanban ou en créer un nouveau"
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

          {/* Menu déroulant des Kanbans du coffre */}
          {isSwitcherOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: 6,
                width: 260,
                backgroundColor: 'var(--knit-surface)',
                border: '1px solid var(--knit-border)',
                borderRadius: 'var(--knit-radius-sm)',
                boxShadow: 'var(--knit-shadow-lg)',
                zIndex: 100,
                padding: '4px 0',
              }}
            >
              <div
                style={{
                  padding: '6px 12px',
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--knit-text-muted)',
                  borderBottom: '1px solid var(--knit-border)',
                }}
              >
                Tableaux Kanban du coffre
              </div>

              <div style={{ maxHeight: 220, overflowY: 'auto' }}>
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
                      fontWeight: kb.path === currentPath ? 600 : 400,
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (kb.path !== currentPath) e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      if (kb.path !== currentPath) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <DuotoneIcon name="kanban" size={13} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {kb.title}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--knit-text-muted)' }}>
                      {kb.path.split('/')[0]}
                    </span>
                  </button>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--knit-border)', padding: '4px' }}>
                <button
                  onClick={() => {
                    setIsSwitcherOpen(false);
                    setIsNewKanbanModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 10px',
                    borderRadius: 'var(--knit-radius-xs)',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: 'var(--knit-primary)',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <DuotoneIcon name="plus" size={12} />
                  <span>Nouveau tableau Kanban...</span>
                </button>
              </div>
            </div>
          )}

          {/* Badge décompte */}
          <span
            style={{
              fontSize: 11,
              color: 'var(--knit-text-muted)',
              backgroundColor: 'var(--knit-surface-hover)',
              padding: '2px 8px',
              borderRadius: 'var(--knit-radius-xs)',
            }}
          >
            {board.columns.length} colonne{board.columns.length > 1 ? 's' : ''} • {totalCards} tâche{totalCards > 1 ? 's' : ''}
          </span>
        </div>

        {/* Contrôles de droite : Recherche, Ajout de colonne, Bascule Éditeur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Recherche rapide dans les cartes */}
          <div className="knit-input-group" style={{ width: 200 }}>
            <DuotoneIcon name="search" size={12} style={{ color: 'var(--knit-text-muted)' }} />
            <input
              type="text"
              className="knit-input-seamless"
              placeholder="Filtrer les tâches..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{ fontSize: 11, width: '100%' }}
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--knit-text-muted)',
                  cursor: 'pointer',
                  padding: 1,
                }}
              >
                <DuotoneIcon name="close" size={10} />
              </button>
            )}
          </div>

          {/* Bouton Ajouter une colonne */}
          <button
            onClick={() => {
              setIsAddingColumn(true);
              setTimeout(() => addColumnInputRef.current?.focus(), 30);
            }}
            title="Ajouter une nouvelle colonne personnalisée au tableau"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              borderRadius: 'var(--knit-radius-sm)',
              backgroundColor: 'var(--knit-surface)',
              border: '1px solid var(--knit-border)',
              color: 'var(--knit-text)',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface)')}
          >
            <DuotoneIcon name="plus" size={12} />
            <span>Ajouter une colonne</span>
          </button>

          {/* Bouton bascule vers le code Markdown brut */}
          {onSwitchToEditor && (
            <button
              onClick={onSwitchToEditor}
              title="Afficher et éditer le fichier Markdown source"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                borderRadius: 'var(--knit-radius-sm)',
                backgroundColor: 'transparent',
                border: '1px solid var(--knit-border)',
                color: 'var(--knit-text-secondary)',
                fontSize: 12,
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <DuotoneIcon name="file-markdown" size={12} />
              <span>Code Markdown</span>
            </button>
          )}
        </div>
      </div>

      {/* Conteneur horizontal des colonnes Kanban */}
      <div
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
        {board.columns.map((column, colIdx) => {
          const isOver = dragOverColumnId === column.id;
          const matchingCards = column.cards.filter((card) => {
            if (!filterQuery) return true;
            return card.title.toLowerCase().includes(filterQuery);
          });

          return (
            <div
              key={column.id}
              onDragOver={(e) => handleDragOverColumn(e, column.id)}
              onDrop={() => handleDropOnColumn(column.id)}
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
              {/* En-tête de colonne */}
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
                      onChange={(e) => setRenamingColumnTitle(e.target.value)}
                      onBlur={() => handleRenameColumnSubmit(column.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameColumnSubmit(column.id);
                        if (e.key === 'Escape') setRenamingColumnId(null);
                      }}
                      style={{ padding: '2px 6px', fontSize: 12, width: '100%' }}
                    />
                  ) : (
                    <span
                      onDoubleClick={() => {
                        setRenamingColumnId(column.id);
                        setRenamingColumnTitle(column.title);
                      }}
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

                  {isDebugActive && (
                    <span className="knit-debug-kanban-col-badge">
                      #{column.id}
                    </span>
                  )}
                </div>

                {/* Actions de colonne */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  {colIdx > 0 && (
                    <button
                      onClick={() => handleMoveColumn(colIdx, 'left')}
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

                  {colIdx < board.columns.length - 1 && (
                    <button
                      onClick={() => handleMoveColumn(colIdx, 'right')}
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
                    onClick={(e) => {
                      e.preventDefault();
                      contextMenu.show(e, [
                        {
                          id: `rename-col-${column.id}`,
                          label: 'Renommer la colonne...',
                          icon: 'edit' as const,
                          onClick: () => {
                            setRenamingColumnId(column.id);
                            setRenamingColumnTitle(column.title);
                          },
                        },
                        {
                          id: `add-card-${column.id}`,
                          label: 'Ajouter une tâche ici...',
                          icon: 'plus' as const,
                          onClick: () => {
                            setAddingCardInColumnId(column.id);
                            setTimeout(() => addCardInputRef.current?.focus(), 20);
                          },
                        },
                        { id: 'div-col-1', divider: true },
                        {
                          id: `del-col-${column.id}`,
                          label: 'Supprimer la colonne',
                          icon: 'trash' as const,
                          danger: true,
                          onClick: () => handleDeleteColumn(column.id, column.title, column.cards.length),
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

              {/* Liste des cartes déplaçables */}
              <div
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
                {matchingCards.map((card) => {
                  const meta = parseCardMetadata(card.title);
                  const isEditing = editingCardId === card.id;

                  return (
                    <div
                      key={card.id}
                      draggable={!isEditing}
                      onDragStart={(e) => handleDragStart(e, column.id, card.id)}
                      style={{
                        padding: '9px 11px',
                        backgroundColor: 'var(--knit-bg)',
                        border: '1px solid var(--knit-border)',
                        borderRadius: 'var(--knit-radius-sm)',
                        boxShadow: 'var(--knit-shadow-xs)',
                        cursor: isEditing ? 'default' : 'grab',
                        transition: 'border-color var(--knit-duration-fast)',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--knit-border-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--knit-border)';
                      }}
                    >
                      {isEditing ? (
                        <div>
                          <textarea
                            autoFocus
                            className="knit-input"
                            value={editingCardText}
                            onChange={(e) => setEditingCardText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveCardEdit(column.id, card.id);
                              }
                              if (e.key === 'Escape') setEditingCardId(null);
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
                              onClick={() => setEditingCardId(null)}
                            >
                              Annuler
                            </button>
                            <button
                              type="button"
                              className="knit-btn knit-btn-primary"
                              style={{ padding: '2px 8px', fontSize: 11 }}
                              onClick={() => handleSaveCardEdit(column.id, card.id)}
                            >
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                            {/* Case à cocher */}
                            <input
                              type="checkbox"
                              checked={card.completed}
                              onChange={() => handleToggleCardCheckbox(column.id, card.id)}
                              style={{
                                marginTop: 3,
                                cursor: 'pointer',
                                accentColor: 'var(--knit-primary)',
                              }}
                            />

                            {/* Titre et contenu de la carte */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span
                                onDoubleClick={() => {
                                  setEditingCardId(card.id);
                                  setEditingCardText(card.title);
                                }}
                                style={{
                                  fontSize: 13,
                                  lineHeight: 1.4,
                                  color: card.completed ? 'var(--knit-text-muted)' : 'var(--knit-text)',
                                  textDecoration: card.completed ? 'line-through' : 'none',
                                  wordBreak: 'break-word',
                                  cursor: 'text',
                                }}
                              >
                                {meta.cleanTitle}
                              </span>

                              {/* WikiLinks cliquables */}
                              {meta.wikiLinks.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                                  {meta.wikiLinks.map((link) => {
                                    const [target, alias] = link.split('|');
                                    const targetClean = target.trim();
                                    const displayName = (alias || targetClean).trim();
                                    const filePath = targetClean.endsWith('.md') ? targetClean : `${targetClean}.md`;
                                    return (
                                      <button
                                        key={link}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenFile(filePath);
                                        }}
                                        title={`Ouvrir la note [[${displayName}]] (Ctrl + Clic ou Clic)`}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: 3,
                                          padding: '1px 6px',
                                          borderRadius: 4,
                                          backgroundColor: 'var(--knit-primary-alpha)',
                                          border: '1px solid var(--knit-primary)',
                                          color: 'var(--knit-primary)',
                                          fontSize: 11,
                                          cursor: 'pointer',
                                        }}
                                      >
                                        <span>[[{displayName}]]</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Tags pills */}
                              {meta.tags.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                                  {meta.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      style={{
                                        fontSize: 10,
                                        padding: '1px 5px',
                                        borderRadius: 3,
                                        backgroundColor: 'var(--knit-surface-hover)',
                                        color: 'var(--knit-text-secondary)',
                                        border: '1px solid var(--knit-border)',
                                      }}
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {isDebugActive && (
                                <div style={{ marginTop: 4 }}>
                                  <span className="knit-debug-kanban-card-badge">
                                    #{card.id.slice(-6)}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Bouton supprimer carte */}
                            <button
                              onClick={() => handleDeleteCard(column.id, card.id)}
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
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Formulaire inline d'ajout de carte */}
                {addingCardInColumnId === column.id ? (
                  <form
                    onSubmit={(e) => handleAddCardSubmit(column.id, e)}
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
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setAddingCardInColumnId(null);
                      }}
                      style={{ width: '100%', fontSize: 12, marginBottom: 6 }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        type="button"
                        className="knit-btn"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                        onClick={() => setAddingCardInColumnId(null)}
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        className="knit-btn knit-btn-primary"
                        style={{ padding: '2px 8px', fontSize: 11 }}
                      >
                        Ajouter
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => {
                      setAddingCardInColumnId(column.id);
                      setNewCardTitle('');
                      setTimeout(() => addCardInputRef.current?.focus(), 20);
                    }}
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
        })}

        {/* Colonne d'ajout "+ Ajouter une colonne" */}
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
          {isAddingColumn ? (
            <form onSubmit={handleAddColumnSubmit}>
              <h4 style={{ margin: '0 0 8px', fontSize: 13, color: 'var(--knit-text)' }}>
                Nouvelle colonne
              </h4>
              <input
                ref={addColumnInputRef}
                type="text"
                className="knit-input"
                placeholder="Ex: En attente, Revue de code, Bloqué..."
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setIsAddingColumn(false);
                }}
                style={{ width: '100%', fontSize: 12, marginBottom: 8 }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button
                  type="button"
                  className="knit-btn"
                  style={{ padding: '3px 8px', fontSize: 11 }}
                  onClick={() => setIsAddingColumn(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="knit-btn knit-btn-primary"
                  style={{ padding: '3px 8px', fontSize: 11 }}
                >
                  Créer la colonne
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => {
                setIsAddingColumn(true);
                setTimeout(() => addColumnInputRef.current?.focus(), 30);
              }}
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
      </div>

      {/* Modale de création d'un nouveau fichier Kanban */}
      {isNewKanbanModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setIsNewKanbanModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--knit-surface)',
              border: '1px solid var(--knit-border)',
              borderRadius: 'var(--knit-radius-md)',
              padding: '22px 26px',
              width: 440,
              maxWidth: '90vw',
              boxShadow: 'var(--knit-shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: 16, color: 'var(--knit-text)' }}>
              Nouveau tableau Kanban
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--knit-text-muted)', lineHeight: 1.5 }}>
              Créez un fichier Markdown dédié pour gérer un projet, vos tâches personnelles ou celles de votre équipe.
            </p>

            <form onSubmit={handleCreateKanbanSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label className="knit-label" style={{ marginBottom: 4, display: 'block' }}>
                  Titre du tableau :
                </label>
                <input
                  autoFocus
                  className="knit-input"
                  type="text"
                  placeholder="Ex: Kanban Projet Refonte, Kanban Perso..."
                  value={newKanbanName}
                  onChange={(e) => setNewKanbanName(e.target.value)}
                  style={{ width: '100%', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="knit-label" style={{ marginBottom: 4, display: 'block' }}>
                  Dossier de destination :
                </label>
                <select
                  className="knit-select"
                  value={newKanbanFolder}
                  onChange={(e) => setNewKanbanFolder(e.target.value)}
                  style={{ width: '100%', fontSize: 12 }}
                >
                  <option value="projet">projet/</option>
                  <option value="perso">perso/</option>
                  <option value="equipe">equipe/</option>
                  <option value="">(Racine du coffre)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="knit-btn"
                  onClick={() => setIsNewKanbanModalOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="knit-btn knit-btn-primary"
                  disabled={!newKanbanName.trim()}
                >
                  Créer le tableau Kanban
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspecteur HUD en bas de la vue Kanban (Mode Debug Global) */}
      {isDebugActive && (
        <KanbanDebugHUD
          columnsCount={board.columns.length}
          cardsCount={totalCards}
          completedCount={completedCount}
          filePath={currentPath}
          onCopyJson={() => {
            navigator.clipboard.writeText(JSON.stringify(board, null, 2)).then(() => {
              toast.success('Structure JSON copiée', 'Le tableau Kanban a été copié.');
            });
          }}
          onDumpConsole={() => {
            console.group('[KANBAN DEBUG]');
            console.log('Board :', board);
            console.table(board.columns.map((c) => ({ id: c.id, title: c.title, cards: c.cards.length })));
            console.groupEnd();
            toast.info('Inspecteur Console', 'Données Kanban affichées dans la console (F12).');
          }}
          onClose={toggleDebug}
        />
      )}
    </div>
  );
};
