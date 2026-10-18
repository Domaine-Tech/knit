import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import type { IconName } from '../../types';

export interface DocViewChromeProps {
  icon: IconName;
  title: string;
  /** Sous-titre / compteur à droite du titre. */
  subtitle?: React.ReactNode;
  compactChrome?: boolean;
  onSwitchToEditor?: () => void;
  /** Actions centrales (ex. zoom, ajouter). */
  children?: React.ReactNode;
  /** Groupe d'actions à droite (avant le bouton Source). */
  trailing?: React.ReactNode;
}

/**
 * Barre d'outils commune des vues immersives (Canvas / Gallery / Slides) :
 * icône, titre, actions, bouton Source, masquage hover (`compactChrome`).
 */
export const DocViewChrome: React.FC<DocViewChromeProps> = ({
  icon,
  title,
  subtitle,
  compactChrome = false,
  onSwitchToEditor,
  children,
  trailing,
}) => {
  const showTrailing = Boolean(trailing || onSwitchToEditor);

  return (
    <div
      className={compactChrome ? 'knit-hover-chrome-hide' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid var(--knit-border)',
      }}
    >
      <DuotoneIcon name={icon} size={16} />
      <strong style={{ fontSize: 13 }}>{title}</strong>
      {subtitle}
      {children}
      {showTrailing && (
        <div
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          {trailing}
          {onSwitchToEditor && (
            <button
              type="button"
              className="knit-btn"
              onClick={onSwitchToEditor}
              style={{ fontSize: 11 }}
            >
              Source
            </button>
          )}
        </div>
      )}
    </div>
  );
};
