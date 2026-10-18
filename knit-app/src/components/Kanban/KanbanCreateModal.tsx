import React from 'react';

interface KanbanCreateModalProps {
  name: string;
  folder: string;
  onNameChange: (value: string) => void;
  onFolderChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const KanbanCreateModal: React.FC<KanbanCreateModalProps> = ({
  name,
  folder,
  onNameChange,
  onFolderChange,
  onSubmit,
  onClose,
}) => {
  return (
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
      onClick={onClose}
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
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label className="knit-label" style={{ marginBottom: 4, display: 'block' }}>
              Titre du tableau :
            </label>
            <input
              autoFocus
              className="knit-input"
              type="text"
              placeholder="Ex: Kanban Projet Refonte, Kanban Perso..."
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              style={{ width: '100%', fontSize: 13 }}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label className="knit-label" style={{ marginBottom: 4, display: 'block' }}>
              Dossier de destination :
            </label>
            <select
              className="knit-select"
              value={folder}
              onChange={(e) => onFolderChange(e.target.value)}
              style={{ width: '100%', fontSize: 12 }}
            >
              <option value="projet">projet/</option>
              <option value="perso">perso/</option>
              <option value="equipe">equipe/</option>
              <option value="">(Racine du coffre)</option>
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="knit-btn" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="knit-btn knit-btn-primary" disabled={!name.trim()}>
              Créer le tableau Kanban
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
