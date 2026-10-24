import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

export const WizardHeader: React.FC<{
  title: string;
  step: string;
  onBack: () => void;
}> = ({ title, step, onBack }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 18,
    }}
  >
    <button type="button" className="knit-btn" onClick={onBack} data-tooltip="Retour">
      <DuotoneIcon name="chevron-left" size={14} />
      Retour
    </button>
    <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
    <div style={{ fontSize: 12, color: 'var(--knit-text-muted)' }}>{step}</div>
  </div>
);
