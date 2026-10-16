import React, { useState, useEffect, useRef, useMemo } from 'react';
import { DuotoneIcon, type IconName } from '../Icons/DuotoneIcon';

export interface CommandItem {
  id: string;
  title: string;
  category: string;
  shortcut?: string;
  icon: IconName;
  action: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  commands,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase().trim();

    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.shortcut && c.shortcut.toLowerCase().includes(q))
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredCommands.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = filteredCommands[selectedIndex];
      if (target) {
        onClose();
        target.action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 580,
          maxWidth: '92vw',
          backgroundColor: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-md)',
          boxShadow: 'var(--knit-shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre de recherche */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <DuotoneIcon name="command" size={16} style={{ color: 'var(--knit-primary)' }} />
          <input
            ref={inputRef}
            type="text"
            className="knit-input-seamless"
            placeholder="Taper une commande... (Ctrl+P)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              fontSize: 14,
              color: 'var(--knit-text)',
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              padding: '2px 5px',
              borderRadius: 'var(--knit-radius-xs)',
              backgroundColor: 'var(--knit-surface-hover)',
              border: '1px solid var(--knit-border)',
              color: 'var(--knit-text-muted)',
              fontFamily: 'var(--knit-font-mono)',
            }}
          >
            Échap
          </kbd>
        </div>

        {/* Liste des commandes */}
        <div
          ref={listRef}
          style={{
            maxHeight: 360,
            overflowY: 'auto',
            padding: '6px 8px',
          }}
        >
          {filteredCommands.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--knit-text-muted)',
              }}
            >
              Aucune commande trouvée
            </div>
          ) : (
            filteredCommands.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => {
                    onClose();
                    cmd.action();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--knit-radius-sm)',
                    backgroundColor: isSelected ? 'var(--knit-surface-hover)' : 'transparent',
                    border: isSelected ? '1px solid var(--knit-border)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'background var(--knit-duration-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <DuotoneIcon
                      name={cmd.icon}
                      size={15}
                      style={{ color: isSelected ? 'var(--knit-primary)' : 'var(--knit-text-secondary)' }}
                    />
                    <div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: isSelected ? 600 : 500,
                          color: 'var(--knit-text)',
                        }}
                      >
                        {cmd.title}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--knit-text-muted)',
                          marginLeft: 8,
                        }}
                      >
                        {cmd.category}
                      </span>
                    </div>
                  </div>

                  {cmd.shortcut && (
                    <kbd
                      style={{
                        fontSize: 11,
                        padding: '2px 6px',
                        borderRadius: 'var(--knit-radius-xs)',
                        backgroundColor: 'var(--knit-bg)',
                        border: '1px solid var(--knit-border)',
                        color: 'var(--knit-text-secondary)',
                        fontFamily: 'var(--knit-font-mono)',
                      }}
                    >
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pied d'aide */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--knit-bg)',
            borderTop: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--knit-text-muted)',
          }}
        >
          <div>
            <kbd>↑↓</kbd> Naviguer • <kbd>↵</kbd> Exécuter
          </div>
          <span>{filteredCommands.length} action{filteredCommands.length > 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};
