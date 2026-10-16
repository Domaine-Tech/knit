import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import type { TaskCard } from '../../stores/vaultStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { toast } from '../../stores/toastStore';
import { contextMenu } from '../../stores/contextMenuStore';

interface KanbanViewProps {
  onOpenTask: (path: string) => void;
}

interface ColumnDef {
  id: string;
  label: string;
  color: string;
  accentBg: string;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { id: 'a-faire', label: 'À faire', color: 'var(--knit-text-secondary)', accentBg: 'var(--knit-surface-hover)' },
  { id: 'en-cours', label: 'En cours', color: 'var(--knit-primary)', accentBg: 'var(--knit-primary-alpha)' },
  { id: 'termine', label: 'Terminé', color: '#10B981', accentBg: 'rgba(16, 185, 129, 0.15)' },
];

export const KanbanView: React.FC<KanbanViewProps> = ({ onOpenTask }) => {
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskColumn, setNewTaskColumn] = useState('a-faire');

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await vaultStore.getVaultTasks();
      setTasks(items);
    } catch (err: unknown) {
      toast.error('Erreur chargement tâches', String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTasks();
    const unsub = vaultStore.subscribe(() => {
      loadTasks();
    });
    return () => unsub();
  }, [loadTasks]);

  // Découverte dynamique de colonnes additionnelles si présentes dans les tâches
  const columns = useMemo(() => {
    const knownIds = new Set(DEFAULT_COLUMNS.map((c) => c.id));
    const extraCols: ColumnDef[] = [];

    tasks.forEach((t) => {
      const s = (t.statut || 'a-faire').toLowerCase().trim();
      if (!knownIds.has(s) && s) {
        knownIds.add(s);
        extraCols.push({
          id: s,
          label: s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '),
          color: 'var(--knit-text)',
          accentBg: 'var(--knit-surface-hover)',
        });
      }
    });

    return [...DEFAULT_COLUMNS, ...extraCols];
  }, [tasks]);

  // Liste des assignés uniques pour le filtre
  const assignees = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.assigne) set.add(t.assigne.trim());
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Tâches filtrées
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesQuery =
          t.titre.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.snippet.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matchesQuery) return false;
      }

      if (priorityFilter !== 'all') {
        if ((t.priorite || '').toLowerCase() !== priorityFilter) return false;
      }

      if (assigneeFilter !== 'all') {
        if ((t.assigne || '').trim() !== assigneeFilter) return false;
      }

      return true;
    });
  }, [tasks, searchFilter, priorityFilter, assigneeFilter]);

  // Déplacement d'une carte vers un nouveau statut
  const handleMoveTask = async (task: TaskCard, newStatus: string) => {
    if (task.statut.toLowerCase() === newStatus.toLowerCase()) return;

    // Mise à jour optimiste immédiate dans l'état local
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, statut: newStatus } : t))
    );

    try {
      await vaultStore.updateTaskStatus(task.rel_path, newStatus);
      toast.success(
        'Statut mis à jour',
        `"${task.titre}" déplacé vers ${newStatus}`
      );
    } catch (err: unknown) {
      toast.error('Erreur mise à jour statut', String(err));
      loadTasks();
    }
  };

  // Drag & Drop
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    setDraggedTaskId(null);

    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    await handleMoveTask(task, colId);
  };

  // Menu contextuel sur une carte de tâche
  const handleCardContextMenu = (e: React.MouseEvent, task: TaskCard) => {
    e.preventDefault();
    e.stopPropagation();

    contextMenu.show(e, [
      {
        id: 'open-task',
        label: 'Ouvrir la note',
        icon: 'file-markdown' as const,
        onClick: () => onOpenTask(task.rel_path),
      },
      { id: 'div-card-1', divider: true },
      {
        id: 'status-todo',
        label: 'Marquer "À faire"',
        icon: 'file-text' as const,
        onClick: () => handleMoveTask(task, 'a-faire'),
      },
      {
        id: 'status-progress',
        label: 'Marquer "En cours"',
        icon: 'sync' as const,
        onClick: () => handleMoveTask(task, 'en-cours'),
      },
      {
        id: 'status-done',
        label: 'Marquer "Terminé"',
        icon: 'check' as const,
        onClick: () => handleMoveTask(task, 'termine'),
      },
      { id: 'div-card-2', divider: true },
      {
        id: 'copy-path',
        label: 'Copier le chemin relatif',
        icon: 'copy' as const,
        onClick: () => {
          navigator.clipboard.writeText(task.rel_path);
          toast.info('Chemin copié', task.rel_path);
        },
      },
      {
        id: 'delete-task',
        label: 'Déplacer dans la corbeille',
        icon: 'trash' as const,
        onClick: async () => {
          try {
            await vaultStore.trashPath(task.rel_path);
            toast.success('Tâche supprimée', task.titre);
            loadTasks();
          } catch (err: unknown) {
            toast.error('Erreur suppression', String(err));
          }
        },
      },
    ]);
  };

  const handleCreateNewTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTaskTitle.trim();
    if (!title) return;

    const taskNum = Date.now().toString().slice(-4);
    const id = `task-${taskNum}`;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const relPath = `projet/taches/${id}-${slug || 'tache'}.md`;

    const initialContent = `---
id: ${id}
type: tache
titre: ${title}
statut: ${newTaskColumn}
priorite: moyenne
assigne: Moi
tags: [projet]
---

# ${title}

## Description
Nouvelle tâche créée depuis le Kanban.
`;

    try {
      await vaultStore.createFile(relPath, initialContent);
      setIsNewTaskModalOpen(false);
      setNewTaskTitle('');
      toast.success('Tâche créée', relPath);
      await loadTasks();
    } catch (err: unknown) {
      toast.error('Erreur création tâche', String(err));
    }
  };

  const getPriorityBadge = (p?: string) => {
    if (!p) return null;
    const lower = p.toLowerCase();
    let bg = 'var(--knit-surface-hover)';
    let color = 'var(--knit-text-muted)';
    let dot = '⚪';

    if (lower === 'critique') {
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#EF4444';
      dot = '🔴';
    } else if (lower === 'haute') {
      bg = 'rgba(245, 158, 11, 0.15)';
      color = '#F59E0B';
      dot = '🟠';
    } else if (lower === 'moyenne') {
      bg = 'rgba(234, 179, 8, 0.15)';
      color = '#EAB308';
      dot = '🟡';
    } else if (lower === 'basse') {
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#10B981';
      dot = '🟢';
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 6px',
          borderRadius: 'var(--knit-radius-xs)',
          backgroundColor: bg,
          color,
          fontSize: 10,
          fontWeight: 600,
        }}
      >
        <span>{dot}</span>
        <span>{p}</span>
      </span>
    );
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
      {/* Barre d'outils Kanban */}
      <div
        style={{
          padding: '12px 20px',
          backgroundColor: 'var(--knit-surface)',
          borderBottom: '1px solid var(--knit-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DuotoneIcon name="kanban" size={20} />
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--knit-text)' }}>
              Tableau Kanban
            </h2>
          </div>
          <span
            style={{
              fontSize: 11,
              color: 'var(--knit-text-muted)',
              backgroundColor: 'var(--knit-surface-hover)',
              padding: '2px 8px',
              borderRadius: 'var(--knit-radius-xs)',
            }}
          >
            {isLoading ? 'Chargement...' : `${filteredTasks.length} tâche${filteredTasks.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Filtres & Recherche rapide */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="knit-input-group" style={{ width: 220 }}>
            <DuotoneIcon name="search" size={13} style={{ color: 'var(--knit-text-muted)' }} />
            <input
              type="text"
              className="knit-input-seamless"
              placeholder="Filtrer les tâches..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              style={{ fontSize: 12, width: '100%' }}
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--knit-text-muted)',
                  cursor: 'pointer',
                  padding: 2,
                }}
              >
                <DuotoneIcon name="close" size={11} />
              </button>
            )}
          </div>

          {/* Filtre Priorité */}
          <select
            className="knit-select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px' }}
          >
            <option value="all">Toutes priorités</option>
            <option value="critique">🔴 Critique</option>
            <option value="haute">🟠 Haute</option>
            <option value="moyenne">🟡 Moyenne</option>
            <option value="basse">🟢 Basse</option>
          </select>

          {/* Filtre Assigné */}
          {assignees.length > 0 && (
            <select
              className="knit-select"
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              style={{ fontSize: 12, padding: '4px 8px' }}
            >
              <option value="all">Tous assignés</option>
              {assignees.map((a) => (
                <option key={a} value={a}>
                  👤 {a}
                </option>
              ))}
            </select>
          )}

          <button
            className="knit-btn knit-btn-primary"
            onClick={() => {
              setNewTaskColumn('a-faire');
              setIsNewTaskModalOpen(true);
            }}
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <DuotoneIcon name="plus" size={13} />
            <span>Nouvelle tâche</span>
          </button>
        </div>
      </div>

      {/* Conteneur des colonnes Kanban */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          gap: 16,
          padding: 20,
          overflowX: 'auto',
          overflowY: 'hidden',
          alignItems: 'flex-start',
        }}
      >
        {columns.map((col) => {
          const colTasks = filteredTasks.filter(
            (t) => (t.statut || 'a-faire').toLowerCase().trim() === col.id
          );
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              style={{
                width: 310,
                minWidth: 310,
                maxHeight: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: isOver ? 'var(--knit-surface-hover)' : 'var(--knit-surface)',
                border: isOver
                  ? '1px dashed var(--knit-primary)'
                  : '1px solid var(--knit-border)',
                borderRadius: 'var(--knit-radius-md)',
                boxShadow: isOver ? '0 0 12px var(--knit-primary-alpha)' : 'var(--knit-shadow-sm)',
                transition: 'all var(--knit-duration-fast)',
              }}
            >
              {/* En-tête de colonne */}
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--knit-border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  userSelect: 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: col.color,
                    }}
                  />
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--knit-text)' }}>
                    {col.label}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--knit-text-muted)',
                      backgroundColor: 'var(--knit-bg)',
                      padding: '1px 6px',
                      borderRadius: 'var(--knit-radius-xs)',
                    }}
                  >
                    {colTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => {
                    setNewTaskColumn(col.id);
                    setIsNewTaskModalOpen(true);
                  }}
                  title={`Ajouter une tâche dans ${col.label}`}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--knit-text-muted)',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    borderRadius: 'var(--knit-radius-xs)',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--knit-text)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--knit-text-muted)')}
                >
                  <DuotoneIcon name="plus" size={13} />
                </button>
              </div>

              {/* Cartes de tâches */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  minHeight: 120,
                }}
              >
                {colTasks.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 12px',
                      textAlign: 'center',
                      fontSize: 12,
                      color: 'var(--knit-text-muted)',
                      border: '1px dashed var(--knit-border)',
                      borderRadius: 'var(--knit-radius-sm)',
                    }}
                  >
                    Aucune tâche ici
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const isDragging = draggedTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => onOpenTask(task.rel_path)}
                        onContextMenu={(e) => handleCardContextMenu(e, task)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onOpenTask(task.rel_path);
                          } else if (e.key === ' ') {
                            e.preventDefault();
                            // Cycle status on Space
                            const next =
                              task.statut === 'a-faire'
                                ? 'en-cours'
                                : task.statut === 'en-cours'
                                ? 'termine'
                                : 'a-faire';
                            handleMoveTask(task, next);
                          }
                        }}
                        style={{
                          backgroundColor: 'var(--knit-bg)',
                          border: '1px solid var(--knit-border)',
                          borderRadius: 'var(--knit-radius-sm)',
                          padding: '12px 14px',
                          cursor: 'grab',
                          opacity: isDragging ? 0.4 : 1,
                          transform: isDragging ? 'scale(0.98)' : 'none',
                          boxShadow: 'var(--knit-shadow-sm)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                          transition: 'all var(--knit-duration-fast)',
                          outline: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--knit-primary)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--knit-border)';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        {/* Ligne ID et Priorité */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--knit-font-mono)',
                              fontSize: 11,
                              color: 'var(--knit-text-muted)',
                              fontWeight: 600,
                            }}
                          >
                            #{task.id}
                          </span>
                          {getPriorityBadge(task.priorite)}
                        </div>

                        {/* Titre */}
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--knit-text)',
                            lineHeight: 1.4,
                          }}
                        >
                          {task.titre}
                        </div>

                        {/* Snippet descriptif si présent */}
                        {task.snippet && (
                          <div
                            style={{
                              fontSize: 11,
                              color: 'var(--knit-text-secondary)',
                              lineHeight: 1.4,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {task.snippet}
                          </div>
                        )}

                        {/* Tags et Assigné */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: 4,
                            paddingTop: 8,
                            borderTop: '1px solid var(--knit-border)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              flexWrap: 'wrap',
                            }}
                          >
                            {task.tags.map((t) => (
                              <span
                                key={t}
                                style={{
                                  fontSize: 10,
                                  color: 'var(--knit-primary)',
                                  backgroundColor: 'var(--knit-surface)',
                                  border: '1px solid var(--knit-border)',
                                  padding: '1px 5px',
                                  borderRadius: 'var(--knit-radius-xs)',
                                }}
                              >
                                #{t}
                              </span>
                            ))}
                          </div>

                          {task.assigne && (
                            <div
                              title={`Assigné à : ${task.assigne}`}
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                backgroundColor: 'var(--knit-primary)',
                                color: '#FFFFFF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 9,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {task.assigne.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modale de création d'une nouvelle tâche */}
      {isNewTaskModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setIsNewTaskModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: 'var(--knit-surface)',
              border: '1px solid var(--knit-border)',
              borderRadius: 'var(--knit-radius-md)',
              padding: '20px 24px',
              width: 440,
              maxWidth: '90vw',
              boxShadow: 'var(--knit-shadow-lg)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: 16, color: 'var(--knit-text)' }}>
              Nouvelle tâche
            </h3>
            <form onSubmit={handleCreateNewTaskSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label className="knit-label" style={{ display: 'block', marginBottom: 6 }}>
                  Titre de la tâche :
                </label>
                <input
                  autoFocus
                  type="text"
                  className="knit-input"
                  placeholder="Ex: Implémenter l'export Markdown..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label className="knit-label" style={{ display: 'block', marginBottom: 6 }}>
                  Colonne initiale :
                </label>
                <select
                  className="knit-select"
                  value={newTaskColumn}
                  onChange={(e) => setNewTaskColumn(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  className="knit-btn"
                  onClick={() => setIsNewTaskModalOpen(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="knit-btn knit-btn-primary">
                  Créer la tâche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
