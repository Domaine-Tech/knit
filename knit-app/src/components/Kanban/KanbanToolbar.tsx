import React from 'react';
import type { KanbanFileInfo } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

interface KanbanToolbarProps {
  title: string;
  columnCount: number;
  totalCards: number;
  currentPath: string | null;
  availableKanbans: KanbanFileInfo[];
  isSwitcherOpen: boolean;
  searchFilter: string;
  onToggleSwitcher: () => void;
  onCloseSwitcher: () => void;
  onOpenFile: (path: string) => void;
  onRequestCreate: () => void;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onAddColumn: () => void;
  onSwitchToEditor?: () => void;
}

export const KanbanToolbar: React.FC<KanbanToolbarProps> = ({
  title,
  columnCount,
  totalCards,
  currentPath,
  availableKanbans,
  isSwitcherOpen,
  searchFilter,
  onToggleSwitcher,
  onCloseSwitcher,
  onOpenFile,
  onRequestCreate,
  onSearchChange,
  onClearSearch,
  onAddColumn,
  onSwitchToEditor,
}) => {
  return (
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
            {title || 'Tableau Kanban'}
          </h2>
        </div>

        <button
          type="button"
          className="knit-btn"
          onClick={onToggleSwitcher}
          title="Changer de tableau Kanban ou en créer un nouveau"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '3px 8px',
            height: 'auto',
            borderRadius: 'var(--knit-radius-xs)',
            backgroundColor: isSwitcherOpen ? 'var(--knit-surface-hover)' : 'transparent',
            fontSize: 11,
            color: 'var(--knit-text-secondary)',
          }}
        >
          <span>{currentPath ? currentPath.split('/').pop() : 'Choisir...'}</span>
          <DuotoneIcon name="chevron-down" size={11} />
        </button>

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
                  type="button"
                  onClick={() => {
                    onCloseSwitcher();
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
                  <span style={{ fontSize: 10, color: 'var(--knit-text-muted)' }}>{kb.path.split('/')[0]}</span>
                </button>
              ))}
            </div>
            <div style={{ borderTop: '1px solid var(--knit-border)', padding: '4px' }}>
              <button
                type="button"
                onClick={() => {
                  onCloseSwitcher();
                  onRequestCreate();
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

        <span
          style={{
            fontSize: 11,
            color: 'var(--knit-text-muted)',
            backgroundColor: 'var(--knit-surface-hover)',
            padding: '2px 8px',
            borderRadius: 'var(--knit-radius-xs)',
          }}
        >
          {columnCount} colonne{columnCount > 1 ? 's' : ''} • {totalCards} tâche{totalCards > 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="knit-input-group" style={{ width: 200 }}>
          <DuotoneIcon name="search" size={12} style={{ color: 'var(--knit-text-muted)' }} />
          <input
            type="text"
            className="knit-input-seamless"
            placeholder="Filtrer les tâches..."
            value={searchFilter}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{ fontSize: 11, width: '100%' }}
          />
          {searchFilter && (
            <button
              type="button"
              onClick={onClearSearch}
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

        <button
          type="button"
          className="knit-btn"
          onClick={onAddColumn}
          title="Ajouter une nouvelle colonne personnalisée au tableau"
          style={{ gap: 5, fontSize: 12 }}
        >
          <DuotoneIcon name="plus" size={12} />
          <span>Ajouter une colonne</span>
        </button>

        {onSwitchToEditor && (
          <button
            type="button"
            className="knit-btn"
            onClick={onSwitchToEditor}
            title="Afficher et éditer le fichier Markdown source"
            style={{ gap: 5, fontSize: 12, color: 'var(--knit-text-secondary)' }}
          >
            <DuotoneIcon name="file-markdown" size={12} />
            <span>Code Markdown</span>
          </button>
        )}
      </div>
    </div>
  );
};
