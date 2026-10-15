import React, { useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import type { ThemeMode } from '../../theme/theme';
import { ColorPickerPopover } from './ColorPickerPopover';

interface HeaderProps {
  theme: ThemeMode;
  hue: number;
  onThemeToggle: () => void;
  onHueChange: (newHue: number) => void;
  onSave: () => void;
  canSave: boolean;
  onTriggerDemoSync: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  hue,
  onThemeToggle,
  onHueChange,
  onSave,
  canSave,
  onTriggerDemoSync,
}) => {
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  return (
    <header
      style={{
        height: 44,
        backgroundColor: 'var(--knit-bg)',
        borderBottom: '1px solid var(--knit-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        userSelect: 'none',
        flexShrink: 0,
      }}
    >
      {/* Marque Knit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: 'var(--knit-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            fontWeight: 800,
            fontSize: 14,
            boxShadow: 'var(--knit-shadow-sm)',
          }}
        >
          🧶
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>
            Knit
          </span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--knit-text-muted)',
              fontFamily: 'var(--knit-font-mono)',
            }}
          >
            v0.1.0 (Sprint 1)
          </span>
        </div>
      </div>

      {/* Contrôles du centre : actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          onClick={onSave}
          disabled={!canSave}
          title="Enregistrer (Ctrl+S)"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: canSave ? 'var(--knit-primary)' : 'var(--knit-surface)',
            color: canSave ? '#FFFFFF' : 'var(--knit-text-muted)',
            border: '1px solid var(--knit-border)',
            fontSize: 12,
            fontWeight: 600,
            cursor: canSave ? 'pointer' : 'default',
            transition: 'all var(--knit-transition-fast)',
          }}
        >
          <DuotoneIcon name="save" size={13} />
          <span>Sauvegarder</span>
        </button>

        <button
          onClick={onTriggerDemoSync}
          title="Simuler un événement de synchronisation P2P / Agent IA"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: 'var(--knit-surface)',
            color: 'var(--knit-text)',
            border: '1px solid var(--knit-border)',
            fontSize: 12,
            transition: 'all var(--knit-transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface)')}
        >
          <DuotoneIcon name="sync" size={13} />
          <span>Simuler Sync</span>
        </button>
      </div>

      {/* Contrôles de droite : Thème et slider Hue */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Sélecteur de couleur d'accent (dot cliquable avec popover 3x3 + slider) */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setIsColorPickerOpen((prev) => !prev)}
            title={`Couleur d'accent (${hue}°) — Cliquez pour ouvrir la palette`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 8px',
              borderRadius: 'var(--knit-radius-sm)',
              backgroundColor: isColorPickerOpen ? 'var(--knit-surface-hover)' : 'transparent',
              border: '1px solid var(--knit-border)',
              cursor: 'pointer',
              transition: 'all var(--knit-transition-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
            onMouseLeave={(e) => {
              if (!isColorPickerOpen) e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: 'var(--knit-primary)',
                border: '1px solid var(--knit-border)',
                flexShrink: 0,
              }}
            />
            <DuotoneIcon name="slider" size={13} style={{ color: 'var(--knit-text-secondary)' }} />
          </button>

          <ColorPickerPopover
            hue={hue}
            onHueChange={onHueChange}
            isOpen={isColorPickerOpen}
            onClose={() => setIsColorPickerOpen(false)}
          />
        </div>

        {/* Toggle Theme sombre / clair */}
        <button
          onClick={onThemeToggle}
          title={theme === 'dark' ? 'Basculer en thème clair' : 'Basculer en thème sombre'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 'var(--knit-radius-sm)',
            backgroundColor: 'var(--knit-surface)',
            border: '1px solid var(--knit-border)',
            color: 'var(--knit-text)',
            transition: 'background var(--knit-transition-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--knit-surface)')}
        >
          <DuotoneIcon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
        </button>
      </div>
    </header>
  );
};
