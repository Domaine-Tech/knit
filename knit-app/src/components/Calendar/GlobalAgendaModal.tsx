import React, { useEffect } from 'react';
import type { CalendarOpenFileOpts } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { CalendarView } from './CalendarView';

interface GlobalAgendaModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  onOpenFile: (path: string, line?: number, opts?: CalendarOpenFileOpts) => void;
}

/**
 * Agenda global du coffre — modale immersive quasi plein écran (pas un onglet fichier).
 * Les notes `type: calendar` restent des onglets DocumentPane.
 */
export const GlobalAgendaModal: React.FC<GlobalAgendaModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  onOpenFile,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Agenda global"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(2px)',
        padding: 8,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--knit-bg)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-md)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden',
          minHeight: 0,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderBottom: '1px solid var(--knit-border)',
            background: 'var(--knit-surface)',
            flexShrink: 0,
          }}
        >
          <DuotoneIcon name="calendar" size={16} style={{ color: 'var(--knit-primary)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, color: 'var(--knit-text)' }}>
            Agenda global
          </span>
          <button
            type="button"
            className="knit-btn"
            onClick={onClose}
            data-tooltip="Fermer l'agenda"
            data-shortcut="Esc"
            style={{ padding: 4 }}
          >
            <DuotoneIcon name="x" size={14} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden', display: 'flex' }}>
          <CalendarView
            activeFilePath={null}
            initialDate={initialDate}
            variant="modal"
            onOpenFile={(path, line, opts) => {
              onClose();
              onOpenFile(path, line, opts);
            }}
          />
        </div>
      </div>
    </div>
  );
};
