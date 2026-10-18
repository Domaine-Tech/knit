import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { contextMenu } from '../../stores/contextMenuStore';
import type { ContextMenuItem, ContextMenuState } from '../../types';
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
      const children = item.children
        ? getSanitizedMenuItems(item.children)
        : undefined;
      sanitized.push(
        children && children.length > 0
          ? { ...item, children }
          : { ...item, children: undefined }
      );
    }
  }

  if (sanitized.length > 0 && sanitized[sanitized.length - 1].divider) {
    sanitized.pop();
  }

  return sanitized;
};

interface SubmenuLayout {
  left: number;
  top: number;
}

const MenuPanel: React.FC<{
  items: ContextMenuItem[];
  onClose: () => void;
  panelRef?: React.RefObject<HTMLDivElement | null>;
  style?: React.CSSProperties;
}> = ({ items, onClose, panelRef, style }) => {
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const [submenuLayout, setSubmenuLayout] = useState<SubmenuLayout | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const submenuRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleCloseSubmenu = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpenSubmenuId(null);
      setSubmenuLayout(null);
    }, 120);
  };

  useEffect(() => () => clearCloseTimer(), []);

  const openSubmenu = (itemId: string) => {
    clearCloseTimer();
    setOpenSubmenuId(itemId);
  };

  useLayoutEffect(() => {
    if (!openSubmenuId) {
      setSubmenuLayout(null);
      return;
    }
    const trigger = itemRefs.current.get(openSubmenuId);
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const submenuWidth = 210;
    const estimatedHeight = 120;
    let left = rect.right + 4;
    let top = rect.top;

    if (left + submenuWidth > window.innerWidth - 8) {
      left = Math.max(8, rect.left - submenuWidth - 4);
    }
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - estimatedHeight - 8);
    }

    setSubmenuLayout({ left, top });
  }, [openSubmenuId]);

  const openItem = items.find((i) => i.id === openSubmenuId);
  const openChildren = openItem?.children;

  return (
    <div
      ref={panelRef}
      style={{
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
        ...style,
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onMouseLeave={scheduleCloseSubmenu}
    >
      {items.map((item, index) => {
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
        const hasChildren = Boolean(item.children && item.children.length > 0);
        const isSubmenuOpen = openSubmenuId === item.id;

        return (
          <button
            key={item.id || `item-${index}`}
            ref={(el) => {
              if (el) itemRefs.current.set(item.id, el);
              else itemRefs.current.delete(item.id);
            }}
            disabled={isDisabled}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onMouseEnter={() => {
              if (hasChildren) {
                openSubmenu(item.id);
              } else {
                scheduleCloseSubmenu();
              }
            }}
            onClick={() => {
              if (isDisabled || hasChildren) return;
              onClose();
              item.onClick?.();
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
              backgroundColor: isSubmenuOpen
                ? 'var(--knit-surface-hover)'
                : 'transparent',
              transition: 'background var(--knit-transition-fast), color var(--knit-transition-fast)',
            }}
            onMouseOver={(e) => {
              if (!isDisabled && !isSubmenuOpen) {
                e.currentTarget.style.backgroundColor = isDanger
                  ? 'rgba(239, 68, 68, 0.12)'
                  : 'var(--knit-surface-hover)';
              }
            }}
            onMouseOut={(e) => {
              if (!isDisabled && !isSubmenuOpen) {
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

            {hasChildren ? (
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--knit-text-muted)' }}>
                <DuotoneIcon name="chevron-right" size={12} />
              </span>
            ) : item.shortcut ? (
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
            ) : null}
          </button>
        );
      })}

      {openChildren && openChildren.length > 0 && submenuLayout && (
        <div
          ref={submenuRef}
          style={{ position: 'fixed', left: submenuLayout.left, top: submenuLayout.top, zIndex: 10001 }}
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleCloseSubmenu}
        >
          <MenuPanel items={openChildren} onClose={onClose} />
        </div>
      )}
    </div>
  );
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
        animation: 'contextMenuFadeIn 90ms ease-out',
      }}
    >
      <MenuPanel
        items={visibleItems}
        onClose={() => contextMenu.close()}
      />

      <style>{`
        @keyframes contextMenuFadeIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
