import React, { useEffect, useState, useRef } from 'react';
import { contextMenu } from '../../stores/contextMenuStore';
import type { ContextMenuItem, ContextMenuState } from '../../stores/contextMenuStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

// Masque complètement les actions non disponibles et purge les séparateurs orphelins/doublons
const getSanitizedMenuItems = (rawItems: ContextMenuItem[]): ContextMenuItem[] => {
  const activeOnly = rawItems.filter((item) => !item.disabled);

  const sanitized: ContextMenuItem[] = [];
  for (const item of activeOnly) {
    if (item.divider) {
      if (sanitized.length > 0 && !sanitized[sanitized.length - 1].divider) {
        sanitized.push(item);
      }
    } else {
      sanitized.push(item);
    }
  }

  if (sanitized.length > 0 && sanitized[sanitized.length - 1].divider) {
    sanitized.pop();
  }

  return sanitized;
};

export const ContextMenuContainer: React.FC = () => {
  const [menuState, setMenuState] = useState<ContextMenuState>(contextMenu.state);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return contextMenu.subscribe((state) => {
      setMenuState(state);
    });
  }, []);

  useEffect(() => {
    if (!menuState.isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        contextMenu.close();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        contextMenu.close();
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuState.isOpen]);

  const visibleItems = getSanitizedMenuItems(menuState.items);
  if (!menuState.isOpen || visibleItems.length === 0) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: menuState.x,
        top: menuState.y,
        zIndex: 10000,
        minWidth: 205,
        backgroundColor: 'var(--knit-surface)',
        border: '1px solid var(--knit-border)',
        borderRadius: 'var(--knit-radius-md)',
        boxShadow: 'var(--knit-shadow-lg)',
        padding: '5px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        userSelect: 'none',
        animation: 'contextMenuFadeIn 90ms ease-out',
      }}
      onContextMenu={(e) => {
        // Empêche de rouvrir le menu natif à l'intérieur du menu contextuel
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {visibleItems.map((item, index) => {
        if (item.divider) {
          return (
            <div
              key={`divider-${index}`}
              style={{
                height: 1,
                backgroundColor: 'var(--knit-border)',
                margin: '4px 6px',
              }}
            />
          );
        }

        const isDanger = item.danger;
        const isDisabled = item.disabled;

        return (
          <button
            key={item.id || `item-${index}`}
            disabled={isDisabled}
            onClick={() => {
              if (isDisabled) return;
              contextMenu.close();
              if (item.onClick) {
                item.onClick();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '6px 10px',
              borderRadius: 'var(--knit-radius-sm)',
              fontSize: 12,
              fontWeight: 500,
              color: isDisabled
                ? 'var(--knit-text-muted)'
                : isDanger
                ? '#EF4444'
                : 'var(--knit-text)',
              opacity: isDisabled ? 0.5 : 1,
              cursor: isDisabled ? 'default' : 'pointer',
              textAlign: 'left',
              transition: 'background var(--knit-transition-fast), color var(--knit-transition-fast)',
            }}
            onMouseEnter={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.backgroundColor = isDanger
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'var(--knit-surface-hover)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isDisabled) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {item.icon && (
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <DuotoneIcon name={item.icon} size={14} />
              </span>
            )}

            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>

            {item.shortcut && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 11,
                  color: 'var(--knit-text-muted)',
                  fontFamily: 'var(--knit-font-mono)',
                  paddingLeft: 8,
                }}
              >
                {item.shortcut}
              </span>
            )}
          </button>
        );
      })}

      <style>{`
        @keyframes contextMenuFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
