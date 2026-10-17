import React, { useState, useMemo, useCallback } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { BaseSearchModal } from './BaseSearchModal';
import type { CommandItem } from '../../types';

export type { CommandItem };

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

  const handleClose = useCallback(() => {
    setQuery('');
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  const handleSelectCurrent = useCallback(() => {
    const target = filteredCommands[selectedIndex];
    if (target) {
      handleClose();
      target.action();
    }
  }, [filteredCommands, selectedIndex, handleClose]);

  return (
    <BaseSearchModal
      isOpen={isOpen}
      onClose={handleClose}
      query={query}
      onQueryChange={setQuery}
      placeholder="Taper une commande... (Ctrl+P)"
      icon="command"
      selectedIndex={selectedIndex}
      totalItems={filteredCommands.length}
      onSelectCurrent={handleSelectCurrent}
      onNavigateIndex={setSelectedIndex}
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
                handleClose();
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
    </BaseSearchModal>
  );
};
