import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import type { TaskCard } from '../../stores/vaultStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { toast } from '../../stores/toastStore';
import { contextMenu } from '../../stores/contextMenuStore';

interface TableViewProps {
  onOpenTask: (path: string) => void;
}

type SortField = 'id' | 'titre' | 'statut' | 'priorite' | 'assigne' | 'echeance';
type SortOrder = 'asc' | 'desc';

export const TableView: React.FC<TableViewProps> = ({ onOpenTask }) => {
  const [tasks, setTasks] = useState<TaskCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

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

  // Assignés uniques
  const assignees = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      if (t.assigne) set.add(t.assigne.trim());
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Statuts uniques
  const statuses = useMemo(() => {
    const set = new Set<string>(['a-faire', 'en-cours', 'termine']);
    tasks.forEach((t) => {
      if (t.statut) set.add(t.statut.toLowerCase().trim());
    });
    return Array.from(set).sort();
  }, [tasks]);

  // Filtrage et Tri
  const filteredAndSortedTasks = useMemo(() => {
    const filtered = tasks.filter((t) => {
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matches =
          t.titre.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (statusFilter !== 'all') {
        if ((t.statut || '').toLowerCase() !== statusFilter) return false;
      }

      if (priorityFilter !== 'all') {
        if ((t.priorite || '').toLowerCase() !== priorityFilter) return false;
      }

      if (assigneeFilter !== 'all') {
        if ((t.assigne || '').trim() !== assigneeFilter) return false;
      }

      return true;
    });

    const priorityRank: Record<string, number> = {
      critique: 4,
      haute: 3,
      moyenne: 2,
      basse: 1,
    };

    return filtered.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'id') {
        cmp = a.id.localeCompare(b.id, undefined, { numeric: true });
      } else if (sortField === 'titre') {
        cmp = a.titre.localeCompare(b.titre);
      } else if (sortField === 'statut') {
        cmp = a.statut.localeCompare(b.statut);
      } else if (sortField === 'priorite') {
        const pA = priorityRank[a.priorite?.toLowerCase() || ''] || 0;
        const pB = priorityRank[b.priorite?.toLowerCase() || ''] || 0;
        cmp = pA - pB;
      } else if (sortField === 'assigne') {
        cmp = (a.assigne || '').localeCompare(b.assigne || '');
      } else if (sortField === 'echeance') {
        cmp = (a.echeance || '').localeCompare(b.echeance || '');
      }

      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [tasks, searchFilter, statusFilter, priorityFilter, assigneeFilter, sortField, sortOrder]);

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Titre', 'Statut', 'Priorité', 'Assigné', 'Sprint', 'Échéance', 'Tags', 'Chemin'];
    const rows = filteredAndSortedTasks.map((t) => [
      `"${t.id}"`,
      `"${t.titre.replace(/"/g, '""')}"`,
      `"${t.statut}"`,
      `"${t.priorite || ''}"`,
      `"${t.assigne || ''}"`,
      `"${t.sprint || ''}"`,
      `"${t.echeance || ''}"`,
      `"${t.tags.join(', ')}"`,
      `"${t.rel_path}"`,
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `taches-knit-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export CSV réussi', `${filteredAndSortedTasks.length} tâches exportées`);
  };

  // Export Markdown
  const handleExportMarkdown = async () => {
    const mdLines = [
      '| ID | Titre | Statut | Priorité | Assigné | Échéance |',
      '|---|---|---|---|---|---|',
      ...filteredAndSortedTasks.map(
        (t) =>
          `| ${t.id} | [${t.titre}](${t.rel_path}) | ${t.statut} | ${t.priorite || '—'} | ${t.assigne || '—'} | ${t.echeance || '—'} |`
      ),
    ];
    const mdTable = mdLines.join('\n');
    await navigator.clipboard.writeText(mdTable);
    toast.success('Tableau Markdown copié', 'Le tableau a été copié dans le presse-papier');
  };

  const getPriorityBadge = (p?: string) => {
    if (!p) return <span style={{ color: 'var(--knit-text-muted)' }}>—</span>;
    const lower = p.toLowerCase();
    let color = 'var(--knit-text-muted)';
    let dot = '⚪';

    if (lower === 'critique') {
      color = '#EF4444';
      dot = '🔴';
    } else if (lower === 'haute') {
      color = '#F59E0B';
      dot = '🟠';
    } else if (lower === 'moyenne') {
      color = '#EAB308';
      dot = '🟡';
    } else if (lower === 'basse') {
      color = '#10B981';
      dot = '🟢';
    }

    return (
      <span style={{ color, fontSize: 11, fontWeight: 600 }}>
        {dot} {p}
      </span>
    );
  };

  const getStatusBadge = (s?: string) => {
    const lower = (s || '').toLowerCase();
    let bg = 'var(--knit-surface-hover)';
    let color = 'var(--knit-text-muted)';

    if (lower === 'termine') {
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#10B981';
    } else if (lower === 'en-cours') {
      bg = 'var(--knit-primary-alpha)';
      color = 'var(--knit-primary)';
    }

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 8px',
          borderRadius: 'var(--knit-radius-xs)',
          backgroundColor: bg,
          color,
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'capitalize',
        }}
      >
        {s || '—'}
      </span>
    );
  };

  const handleRowContextMenu = (e: React.MouseEvent, task: TaskCard) => {
    e.preventDefault();
    e.stopPropagation();

    contextMenu.show(e, [
      {
        id: 'open-task',
        label: 'Ouvrir la note',
        icon: 'file-markdown' as const,
        onClick: () => onOpenTask(task.rel_path),
      },
      { id: 'div-row-1', divider: true },
      {
        id: 'copy-link',
        label: 'Copier le lien Markdown',
        icon: 'link' as const,
        onClick: () => {
          const link = `[${task.titre}](${task.rel_path})`;
          navigator.clipboard.writeText(link);
          toast.info('Lien copié', link);
        },
      },
      {
        id: 'copy-id',
        label: "Copier l'identifiant",
        icon: 'copy' as const,
        onClick: () => {
          navigator.clipboard.writeText(task.id);
          toast.info('ID copié', task.id);
        },
      },
      { id: 'div-row-2', divider: true },
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
      {/* Barre d'outils Tableau */}
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
            <DuotoneIcon name="table" size={20} />
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--knit-text)' }}>
              Vue Tableau des Tâches
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
            {isLoading ? 'Chargement...' : `${filteredAndSortedTasks.length} ligne${filteredAndSortedTasks.length > 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Contrôles de filtrage & Exports */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div className="knit-input-group" style={{ width: 220 }}>
            <DuotoneIcon name="search" size={13} style={{ color: 'var(--knit-text-muted)' }} />
            <input
              type="text"
              className="knit-input-seamless"
              placeholder="Recherche en direct (<50ms)..."
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

          {/* Filtre Statut */}
          <select
            className="knit-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ fontSize: 12, padding: '4px 8px' }}
          >
            <option value="all">Tous statuts</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

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

          {/* Boutons d'export */}
          <button
            className="knit-btn"
            onClick={handleExportCSV}
            title="Exporter les tâches filtrées au format CSV"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <DuotoneIcon name="download" size={13} />
            <span>CSV</span>
          </button>

          <button
            className="knit-btn"
            onClick={handleExportMarkdown}
            title="Copier le tableau Markdown dans le presse-papier"
            style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}
          >
            <DuotoneIcon name="copy" size={13} />
            <span>Markdown</span>
          </button>
        </div>
      </div>

      {/* Contenu de la table */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: 'var(--knit-surface)',
            borderRadius: 'var(--knit-radius-md)',
            overflow: 'hidden',
            border: '1px solid var(--knit-border)',
            boxShadow: 'var(--knit-shadow-sm)',
            fontSize: 13,
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: 'var(--knit-surface-hover)',
                borderBottom: '1px solid var(--knit-border)',
                userSelect: 'none',
              }}
            >
              <th
                onClick={() => handleToggleSort('id')}
                style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: 100,
                  color: 'var(--knit-text-secondary)',
                  fontWeight: 600,
                }}
              >
                ID {sortField === 'id' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                onClick={() => handleToggleSort('titre')}
                style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  color: 'var(--knit-text-secondary)',
                  fontWeight: 600,
                }}
              >
                Titre {sortField === 'titre' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                onClick={() => handleToggleSort('statut')}
                style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: 120,
                  color: 'var(--knit-text-secondary)',
                  fontWeight: 600,
                }}
              >
                Statut {sortField === 'statut' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                onClick={() => handleToggleSort('priorite')}
                style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: 110,
                  color: 'var(--knit-text-secondary)',
                  fontWeight: 600,
                }}
              >
                Priorité {sortField === 'priorite' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                onClick={() => handleToggleSort('assigne')}
                style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: 120,
                  color: 'var(--knit-text-secondary)',
                  fontWeight: 600,
                }}
              >
                Assigné {sortField === 'assigne' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                onClick={() => handleToggleSort('echeance')}
                style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  width: 110,
                  color: 'var(--knit-text-secondary)',
                  fontWeight: 600,
                }}
              >
                Échéance {sortField === 'echeance' && (sortOrder === 'asc' ? '▲' : '▼')}
              </th>
              <th
                style={{
                  padding: '10px 14px',
                  textAlign: 'left',
                  color: 'var(--knit-text-secondary)',
                  fontWeight: 600,
                }}
              >
                Tags
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTasks.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: 32,
                    textAlign: 'center',
                    color: 'var(--knit-text-muted)',
                  }}
                >
                  Aucune tâche ne correspond aux critères
                </td>
              </tr>
            ) : (
              filteredAndSortedTasks.map((task) => {
                const isSelected = selectedTaskId === task.id;
                return (
                  <tr
                    key={task.id}
                    onClick={() => onOpenTask(task.rel_path)}
                    onContextMenu={(e) => handleRowContextMenu(e, task)}
                    onMouseEnter={() => setSelectedTaskId(task.id)}
                    onMouseLeave={() => setSelectedTaskId(null)}
                    style={{
                      borderBottom: '1px solid var(--knit-border)',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--knit-surface-hover)' : 'transparent',
                      transition: 'background var(--knit-duration-fast)',
                    }}
                  >
                    <td
                      style={{
                        padding: '10px 14px',
                        fontFamily: 'var(--knit-font-mono)',
                        fontSize: 12,
                        color: 'var(--knit-text-muted)',
                      }}
                    >
                      #{task.id}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontWeight: 500,
                        color: 'var(--knit-text)',
                      }}
                    >
                      {task.titre}
                    </td>
                    <td style={{ padding: '10px 14px' }}>{getStatusBadge(task.statut)}</td>
                    <td style={{ padding: '10px 14px' }}>{getPriorityBadge(task.priorite)}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--knit-text-secondary)' }}>
                      {task.assigne ? `👤 ${task.assigne}` : '—'}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        color: 'var(--knit-text-muted)',
                        fontSize: 12,
                      }}
                    >
                      {task.echeance || '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {task.tags.map((t) => (
                          <span
                            key={t}
                            style={{
                              fontSize: 10,
                              color: 'var(--knit-primary)',
                              backgroundColor: 'var(--knit-bg)',
                              border: '1px solid var(--knit-border)',
                              padding: '1px 5px',
                              borderRadius: 'var(--knit-radius-xs)',
                            }}
                          >
                            #{t}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
