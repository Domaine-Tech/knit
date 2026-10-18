import React, { type FormEvent } from 'react';
import type { RenameTarget } from '../../types';

export interface SidebarCreateFormProps {
  isCreatingFile: boolean;
  newFileName: string;
  setNewFileName: (value: string) => void;
  setIsCreatingFile: (value: boolean) => void;
  onSubmit: (e: FormEvent) => void;
}

export const SidebarCreateForm: React.FC<SidebarCreateFormProps> = ({
  isCreatingFile,
  newFileName,
  setNewFileName,
  setIsCreatingFile,
  onSubmit,
}) => {
  if (!isCreatingFile) return null;

  return (
    <form onSubmit={onSubmit} style={{ padding: '0 12px 8px 12px' }}>
      <input
        autoFocus
        type="text"
        className="knit-input"
        placeholder="nom-note.md..."
        value={newFileName}
        onChange={(e) => setNewFileName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setIsCreatingFile(false);
        }}
        style={{ width: '100%' }}
      />
    </form>
  );
};

export interface SidebarRenameModalProps {
  renameTarget: RenameTarget | null;
  setRenameTarget: React.Dispatch<React.SetStateAction<RenameTarget | null>>;
  onSubmit: (e: FormEvent) => void;
}

export const SidebarRenameModal: React.FC<SidebarRenameModalProps> = ({
  renameTarget,
  setRenameTarget,
  onSubmit,
}) => {
  if (!renameTarget) return null;

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
      onClick={() => setRenameTarget(null)}
    >
      <div
        style={{
          backgroundColor: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-md)',
          padding: '20px 24px',
          width: '440px',
          maxWidth: '90vw',
          boxShadow: 'var(--knit-shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 8px', fontSize: '15px', color: 'var(--knit-text)' }}>
          Renommer ou déplacer la note
        </h3>
        <p
          style={{
            margin: '0 0 16px',
            fontSize: '12px',
            color: 'var(--knit-text-muted)',
            lineHeight: '1.5',
          }}
        >
          Tous les liens Markdown et WikiLinks pointant vers cette note dans l'ensemble du coffre
          seront automatiquement recalculés et mis à jour.
        </p>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="knit-label" style={{ marginBottom: 6, display: 'block' }}>
              Nouveau chemin / nom du fichier :
            </label>
            <input
              className="knit-input"
              autoFocus
              type="text"
              value={renameTarget.newPath}
              onChange={(e) => setRenameTarget({ ...renameTarget, newPath: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setRenameTarget(null);
              }}
              style={{ width: '100%', fontFamily: 'var(--knit-font-mono)', fontSize: '13px' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button type="button" className="knit-btn" onClick={() => setRenameTarget(null)}>
              Annuler
            </button>
            <button type="submit" className="knit-btn knit-btn-primary">
              Refactoriser & Renommer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
