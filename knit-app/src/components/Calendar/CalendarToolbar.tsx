import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { KnitSelect } from '../Form/KnitSelect';
import type {
  CalendarFilterMode,
  CalendarPriorityFilter,
  CalendarScopeMode,
  CalendarStatusFilter,
  CalendarViewMode,
  KnitSelectOption,
} from '../../types';
import { priorityAccentColor } from '../../utils';

export interface CalendarToolbarProps {
  isModal: boolean;
  compactChrome: boolean;
  folderScope: string;
  scopeMode: CalendarScopeMode;
  setScopeMode: (mode: CalendarScopeMode) => void;
  viewMode: CalendarViewMode;
  setViewMode: (mode: CalendarViewMode) => void;
  filterMode: CalendarFilterMode;
  setFilterMode: (mode: CalendarFilterMode) => void;
  statusFilter: CalendarStatusFilter;
  setStatusFilter: (mode: CalendarStatusFilter) => void;
  priorityFilter: CalendarPriorityFilter;
  setPriorityFilter: (mode: CalendarPriorityFilter) => void;
  collaborator: string;
  setCollaborator: (value: string) => void;
  collaboratorOptions: KnitSelectOption[];
  navLabel: string;
  loading: boolean;
  filteredCount: number;
  todayIso: string;
  onShiftCursor: (delta: number) => void;
  onGoToday: () => void;
  onQuickAdd: (iso: string) => void;
  onSwitchToEditor?: () => void;
}

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  isModal,
  compactChrome,
  folderScope,
  scopeMode,
  setScopeMode,
  viewMode,
  setViewMode,
  filterMode,
  setFilterMode,
  statusFilter,
  setStatusFilter,
  priorityFilter,
  setPriorityFilter,
  collaborator,
  setCollaborator,
  collaboratorOptions,
  navLabel,
  loading,
  filteredCount,
  todayIso,
  onShiftCursor,
  onGoToday,
  onQuickAdd,
  onSwitchToEditor,
}) => (
  <>
    <div
      className={compactChrome ? 'knit-hover-chrome-hide' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: isModal ? '6px 10px' : '8px 12px',
        borderBottom: '1px solid var(--knit-border)',
        flexWrap: 'wrap',
        flexShrink: 0,
      }}
    >
      {!isModal && (
        <>
          <DuotoneIcon name="calendar" size={16} />
          <strong style={{ fontSize: 13 }}>
            {folderScope && scopeMode === 'scoped' ? `Agenda : ${folderScope}` : 'Agenda Global'}
          </strong>
        </>
      )}

      {folderScope ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: isModal ? 0 : 6 }}>
          <span
            style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 'var(--knit-radius-xs)',
              background:
                scopeMode === 'scoped' ? 'var(--knit-primary-alpha)' : 'var(--knit-surface)',
              color: scopeMode === 'scoped' ? 'var(--knit-primary)' : 'var(--knit-text-muted)',
              border: '1px solid var(--knit-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <DuotoneIcon name="folder" size={12} />
            <span>{scopeMode === 'scoped' ? `Projet (${folderScope})` : 'Tout le coffre'}</span>
          </span>
          <button
            type="button"
            className="knit-btn"
            onClick={() => setScopeMode(scopeMode === 'scoped' ? 'vault' : 'scoped')}
            style={{ fontSize: 11, padding: '2px 8px' }}
            data-tooltip={
              scopeMode === 'scoped'
                ? 'Élargir la vue à tout le coffre'
                : 'Restreindre au dossier projet'
            }
          >
            {scopeMode === 'scoped' ? 'Afficher tout le coffre' : `Restreindre à ${folderScope}`}
          </button>
        </div>
      ) : !isModal ? (
        <span
          style={{
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 'var(--knit-radius-xs)',
            background: 'var(--knit-surface)',
            color: 'var(--knit-text-muted)',
            border: '1px solid var(--knit-border)',
          }}
        >
          Coffre complet
        </span>
      ) : null}

      <div style={{ display: 'flex', gap: 4, marginLeft: isModal ? 0 : 8 }}>
        {(
          [
            ['month', 'Mois'],
            ['week', 'Semaine'],
            ['day', 'Jour'],
            ['list', 'Liste'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="knit-btn"
            onClick={() => setViewMode(id)}
            style={{
              fontSize: 11,
              padding: '2px 8px',
              background: viewMode === id ? 'var(--knit-primary-alpha)' : 'var(--knit-surface)',
              color: viewMode === id ? 'var(--knit-primary)' : 'var(--knit-text-secondary)',
              border: '1px solid var(--knit-border)',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="knit-btn knit-btn-primary"
        onClick={() => onQuickAdd(todayIso)}
        style={{ fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
        data-tooltip="Ajouter une tâche ou un événement à l'agenda"
      >
        <DuotoneIcon name="plus" size={12} />
        <span>Ajouter</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
        <button
          type="button"
          className="knit-btn"
          onClick={() => onShiftCursor(-1)}
          data-tooltip="Précédent"
        >
          <DuotoneIcon name="chevron-left" size={14} />
        </button>
        <span
          style={{
            fontSize: 12,
            minWidth: 140,
            textAlign: 'center',
            textTransform: 'capitalize',
          }}
        >
          {navLabel}
        </span>
        <button
          type="button"
          className="knit-btn"
          onClick={() => onShiftCursor(1)}
          data-tooltip="Suivant"
        >
          <DuotoneIcon name="chevron-right" size={14} />
        </button>
        <button type="button" className="knit-btn" onClick={onGoToday} style={{ fontSize: 11 }}>
          Aujourd&apos;hui
        </button>
        {onSwitchToEditor && (
          <button
            type="button"
            className="knit-btn"
            onClick={onSwitchToEditor}
            data-tooltip="Code source"
            style={{ fontSize: 11 }}
          >
            Source
          </button>
        )}
      </div>
    </div>

    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: isModal ? '4px 10px' : '6px 12px',
        borderBottom: '1px solid var(--knit-border)',
        fontSize: 12,
        flexWrap: 'wrap',
        backgroundColor: 'var(--knit-surface)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: 'var(--knit-text-muted)', fontSize: 11 }}>Cible :</span>
        {(
          [
            ['all', 'Tout'],
            ['mine-vault', 'Moi & Vault'],
            ['collaborator', 'Collaborateur'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="knit-btn"
            onClick={() => setFilterMode(id)}
            style={{
              fontSize: 11,
              padding: '2px 7px',
              background: filterMode === id ? 'var(--knit-primary-alpha)' : 'transparent',
              border: '1px solid var(--knit-border)',
              color: filterMode === id ? 'var(--knit-primary)' : 'inherit',
            }}
          >
            {label}
          </button>
        ))}
        {filterMode === 'collaborator' && (
          <KnitSelect
            value={collaborator}
            options={collaboratorOptions}
            onChange={setCollaborator}
            style={{ minWidth: 140, fontSize: 11 }}
          />
        )}
      </div>

      <div style={{ width: 1, height: 16, backgroundColor: 'var(--knit-border)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: 'var(--knit-text-muted)', fontSize: 11 }}>Statut :</span>
        {(
          [
            ['all', 'Tous'],
            ['todo', 'À faire'],
            ['done', 'Terminées'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="knit-btn"
            onClick={() => setStatusFilter(id)}
            style={{
              fontSize: 11,
              padding: '2px 7px',
              background: statusFilter === id ? 'var(--knit-primary-alpha)' : 'transparent',
              border: '1px solid var(--knit-border)',
              color: statusFilter === id ? 'var(--knit-primary)' : 'inherit',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 16, backgroundColor: 'var(--knit-border)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ color: 'var(--knit-text-muted)', fontSize: 11 }}>Priorité :</span>
        {(
          [
            ['all', 'Toutes'],
            ['p1', '!p1'],
            ['p2', '!p2'],
            ['p3', '!p3'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className="knit-btn"
            onClick={() => setPriorityFilter(id)}
            style={{
              fontSize: 11,
              padding: '2px 7px',
              background: priorityFilter === id ? 'var(--knit-primary-alpha)' : 'transparent',
              border: '1px solid var(--knit-border)',
              color:
                id === 'p1' && priorityFilter === id
                  ? priorityAccentColor('p1')
                  : priorityFilter === id
                    ? 'var(--knit-primary)'
                    : 'inherit',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <span style={{ marginLeft: 'auto', color: 'var(--knit-text-muted)', fontSize: 11 }}>
        {loading ? 'Chargement…' : `${filteredCount} événement(s)`}
      </span>
    </div>
  </>
);
