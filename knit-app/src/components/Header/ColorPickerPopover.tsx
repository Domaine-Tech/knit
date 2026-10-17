import React, { useEffect, useRef } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import type { PresetColor } from '../../types';

const PRESET_COLORS: PresetColor[] = [
  { name: 'Ambre Knit (Défaut)', hue: 35 },
  { name: 'Cuivre / Terracotta', hue: 20 },
  { name: 'Rouge Carmin', hue: 350 },
  { name: 'Rose / Magenta', hue: 310 },
  { name: 'Violet Nuit', hue: 270 },
  { name: 'Bleu Cobalt', hue: 220 },
  { name: 'Cyan Électrique', hue: 190 },
  { name: 'Émeraude / Menthe', hue: 155 },
  { name: 'Vert Sauge', hue: 125 },
];

interface ColorPickerPopoverProps {
  hue: number;
  onHueChange: (hue: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  hue,
  onHueChange,
  isOpen,
  onClose,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: 48,
        right: 48,
        width: 220,
        backgroundColor: 'var(--knit-surface)',
        border: '1px solid var(--knit-border)',
        borderRadius: 'var(--knit-radius-md)',
        boxShadow: 'var(--knit-shadow-lg)',
        padding: '14px',
        zIndex: 9999,
        userSelect: 'none',
        animation: 'popoverFadeIn 120ms ease',
      }}
    >
      {/* En-tête du sélecteur */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--knit-text)' }}>
          Couleur d'accent
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--knit-text-muted)',
            fontFamily: 'var(--knit-font-mono)',
          }}
        >
          {hue}°
        </span>
      </div>

      {/* Grille 3x3 de couleurs prédéfinies */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {PRESET_COLORS.map((preset) => {
          const isSelected = Math.abs(preset.hue - hue) <= 4;

          return (
            <button
              key={preset.name}
              onClick={() => onHueChange(preset.hue)}
              title={`${preset.name} (${preset.hue}°)`}
              style={{
                height: 34,
                borderRadius: 'var(--knit-radius-sm)',
                backgroundColor: `hsl(${preset.hue}, 55%, 55%)`,
                border: isSelected
                  ? '2px solid var(--knit-text)'
                  : '1px solid rgba(0, 0, 0, 0.15)',
                boxShadow: isSelected
                  ? '0 0 0 2px var(--knit-surface), var(--knit-shadow-sm)'
                  : 'var(--knit-shadow-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'transform var(--knit-transition-fast)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              {isSelected && (
                <DuotoneIcon
                  name="check"
                  size={14}
                  style={{ color: '#FFFFFF', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Séparateur */}
      <div
        style={{
          height: 1,
          backgroundColor: 'var(--knit-border)',
          margin: '10px 0',
        }}
      />

      {/* Barre de personnalisation en bas */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--knit-text-secondary)',
          }}
        >
          <span>Personnaliser</span>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: 'var(--knit-primary)',
              border: '1px solid var(--knit-border)',
            }}
          />
        </div>

        <input
          type="range"
          min="0"
          max="360"
          value={hue}
          onChange={(e) => onHueChange(parseInt(e.target.value, 10))}
          style={{
            width: '100%',
            height: 7,
            appearance: 'none',
            background: `linear-gradient(to right, 
              hsl(0, 60%, 50%), 
              hsl(60, 60%, 50%), 
              hsl(120, 60%, 50%), 
              hsl(180, 60%, 50%), 
              hsl(240, 60%, 50%), 
              hsl(300, 60%, 50%), 
              hsl(360, 60%, 50%))`,
            borderRadius: 4,
            cursor: 'pointer',
            outline: 'none',
          }}
        />
      </div>

      <style>{`
        @keyframes popoverFadeIn {
          from { opacity: 0; transform: translateY(-4px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
