import React, { useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { KnitSelect } from '../Form/KnitSelect';
import type { KnitSelectOption } from '../../types';

interface QuickAddEventModalProps {
  initialDate: string;
  defaultRelPath: string;
  collaborators?: string[];
  onClose: () => void;
  onCreated: (event: {
    title: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    assignee?: string | null;
    priority?: 'p1' | 'p2' | 'p3' | null;
    targetPath: string;
  }) => Promise<void>;
}

export const QuickAddEventModal: React.FC<QuickAddEventModalProps> = ({
  initialDate,
  defaultRelPath,
  collaborators = [],
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [priority, setPriority] = useState<string>('none');
  const [assignee, setAssignee] = useState<string>('vault');
  const [targetPath, setTargetPath] = useState(defaultRelPath || `journal/${initialDate}.md`);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const priorityOptions: KnitSelectOption[] = [
    { value: 'none', label: 'Aucune priorité' },
    { value: 'p1', label: '!p1 — Haute / Urgente' },
    { value: 'p2', label: '!p2 — Moyenne' },
    { value: 'p3', label: '!p3 — Normale / Basse' },
  ];

  const assigneeOptions: KnitSelectOption[] = [
    { value: 'vault', label: '@vault (Tout le coffre)' },
    ...collaborators.map((c) => ({ value: c, label: `@${c}` })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setIsSubmitting(true);
    try {
      await onCreated({
        title: title.trim(),
        date,
        startTime: startTime.trim() || null,
        endTime: endTime.trim() || null,
        assignee: assignee === 'vault' ? 'vault' : assignee.trim() || null,
        priority: priority === 'none' ? null : (priority as 'p1' | 'p2' | 'p3'),
        targetPath: targetPath.trim() || defaultRelPath,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 440,
          maxWidth: '92vw',
          backgroundColor: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-md)',
          padding: 20,
          boxShadow: 'var(--knit-shadow-lg)',
          color: 'var(--knit-text)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <DuotoneIcon name="calendar" size={18} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Planifier une tâche ou événement</h3>
          <button
            type="button"
            className="knit-btn"
            onClick={onClose}
            style={{ marginLeft: 'auto', padding: 4, background: 'transparent', border: 'none' }}
          >
            <DuotoneIcon name="close" size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label className="knit-label" style={{ display: 'block', marginBottom: 4, fontSize: 12 }}>
              Titre de l'événement / tâche :
            </label>
            <input
              type="text"
              autoFocus
              className="knit-input"
              placeholder="Ex: Réunion de synchronisation, Finaliser maquettes..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', fontSize: 13 }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: 8 }}>
            <div>
              <label className="knit-label" style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                Date :
              </label>
              <input
                type="date"
                className="knit-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ width: '100%', fontSize: 12 }}
                required
              />
            </div>
            <div>
              <label className="knit-label" style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                Début (HH:mm) :
              </label>
              <input
                type="time"
                className="knit-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ width: '100%', fontSize: 12 }}
              />
            </div>
            <div>
              <label className="knit-label" style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                Fin (HH:mm) :
              </label>
              <input
                type="time"
                className="knit-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ width: '100%', fontSize: 12 }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label className="knit-label" style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                Priorité :
              </label>
              <KnitSelect
                value={priority}
                options={priorityOptions}
                onChange={setPriority}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label className="knit-label" style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
                Assigné :
              </label>
              <KnitSelect
                value={assignee}
                options={assigneeOptions}
                onChange={setAssignee}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div>
            <label className="knit-label" style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>
              Note cible d'enregistrement :
            </label>
            <input
              type="text"
              className="knit-input"
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              style={{ width: '100%', fontSize: 11, fontFamily: 'var(--knit-font-mono)' }}
              title="Fichier où la tâche sera insérée"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button type="button" className="knit-btn" onClick={onClose}>
              Annuler
            </button>
            <button
              type="submit"
              className="knit-btn knit-btn-primary"
              disabled={isSubmitting || !title.trim()}
              style={{ fontWeight: 600 }}
            >
              {isSubmitting ? 'Ajout en cours…' : 'Ajouter à l\'agenda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
