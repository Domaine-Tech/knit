import React, { useEffect, useRef } from 'react';
import { DuotoneIcon, type IconName } from '../Icons/DuotoneIcon';

export interface BaseSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  placeholder?: string;
  icon?: IconName;
  selectedIndex: number;
  totalItems: number;
  onSelectCurrent: () => void;
  onNavigateIndex: (newIndex: number) => void;
  footerHints?: React.ReactNode;
  children: React.ReactNode;
}

export const BaseSearchModal: React.FC<BaseSearchModalProps> = ({
  isOpen,
  onClose,
  query,
  onQueryChange,
  placeholder = 'Rechercher...',
  icon = 'search',
  selectedIndex,
  totalItems,
  onSelectCurrent,
  onNavigateIndex,
  footerHints,
  children,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNavigateIndex(selectedIndex < totalItems - 1 ? selectedIndex + 1 : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onNavigateIndex(selectedIndex > 0 ? selectedIndex - 1 : totalItems - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSelectCurrent();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '14vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: 580,
          maxWidth: '92vw',
          backgroundColor: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-lg)',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideDown 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Barre de saisie principale */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--knit-border)',
            gap: 12,
            backgroundColor: 'var(--knit-surface-hover)',
          }}
        >
          <DuotoneIcon name={icon} size={18} style={{ color: 'var(--knit-primary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              onNavigateIndex(0);
            }}
            placeholder={placeholder}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '15px',
              color: 'var(--knit-text)',
              fontFamily: 'inherit',
            }}
          />
          <kbd
            style={{
              padding: '2px 6px',
              backgroundColor: 'var(--knit-surface)',
              border: '1px solid var(--knit-border)',
              borderRadius: 'var(--knit-radius-sm)',
              fontSize: '11px',
              color: 'var(--knit-text-muted)',
              fontFamily: 'var(--knit-font-mono)',
            }}
          >
            Échap
          </kbd>
        </div>

        {/* Liste défilante des résultats */}
        <div
          ref={listRef}
          style={{
            maxHeight: '380px',
            overflowY: 'auto',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {children}
        </div>

        {/* Pied de modale & raccourcis */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 16px',
            borderTop: '1px solid var(--knit-border)',
            backgroundColor: 'var(--knit-bg)',
            fontSize: '11px',
            color: 'var(--knit-text-muted)',
            userSelect: 'none',
          }}
        >
          <div style={{ display: 'flex', gap: 14 }}>
            <span>
              <kbd style={{ padding: '1px 4px', background: 'var(--knit-surface)', border: '1px solid var(--knit-border)', borderRadius: 3, fontFamily: 'var(--knit-font-mono)' }}>↑↓</kbd> Naviguer
            </span>
            <span>
              <kbd style={{ padding: '1px 4px', background: 'var(--knit-surface)', border: '1px solid var(--knit-border)', borderRadius: 3, fontFamily: 'var(--knit-font-mono)' }}>↵</kbd> Valider
            </span>
            {footerHints}
          </div>
          <div>
            <span>{totalItems} résultat{totalItems > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
