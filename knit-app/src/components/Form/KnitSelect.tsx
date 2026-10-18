import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface KnitSelectOption {
  value: string;
  label: string;
}

export interface KnitSelectProps {
  value: string;
  options: KnitSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  'aria-label'?: string;
}

interface MenuCoords {
  top: number;
  left: number;
  minWidth: number;
}

/**
 * Liste déroulante Knit — même DA que les menus contextuels
 * (arrondis, surface, hover feutré, focus ring primary).
 */
export const KnitSelect: React.FC<KnitSelectProps> = ({
  value,
  options,
  onChange,
  className,
  style,
  disabled = false,
  'aria-label': ariaLabel,
}) => {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? value;

  const computeCoords = useCallback((): MenuCoords | null => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const rect = trigger.getBoundingClientRect();
    const pad = 8;
    const minWidth = Math.max(rect.width, 140);
    const estimatedHeight = Math.min(options.length * 32 + 12, 280);
    const spaceBelow = window.innerHeight - rect.bottom - pad;
    const placeAbove = spaceBelow < estimatedHeight && rect.top > spaceBelow;

    let top = placeAbove ? rect.top - estimatedHeight - 4 : rect.bottom + 4;
    let left = rect.left;
    if (left + minWidth > window.innerWidth - pad) {
      left = window.innerWidth - pad - minWidth;
    }
    if (left < pad) left = pad;
    if (top < pad) top = pad;

    return { top, left, minWidth };
  }, [options.length]);

  const close = useCallback(() => {
    setOpen(false);
    setCoords(null);
  }, []);

  const openMenu = useCallback(() => {
    if (disabled) return;
    const next = computeCoords();
    if (!next) return;
    const idx = Math.max(
      0,
      options.findIndex((o) => o.value === value)
    );
    setActiveIndex(idx);
    setCoords(next);
    setOpen(true);
  }, [computeCoords, disabled, options, value]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      close();
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        triggerRef.current?.focus();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const opt = options[activeIndex];
        if (opt) {
          onChange(opt.value);
          close();
          triggerRef.current?.focus();
        }
      }
    };
    const onScrollOrResize = (): void => close();

    window.addEventListener('mousedown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      window.removeEventListener('mousedown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, close, options, activeIndex, onChange]);

  useEffect(() => {
    if (!open || !menuRef.current) return;
    const active = menuRef.current.querySelector(
      `[data-index="${activeIndex}"]`
    ) as HTMLElement | null;
    active?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  return (
    <div
      ref={rootRef}
      className={['knit-select-root', open ? 'is-open' : '', className]
        .filter(Boolean)
        .join(' ')}
      style={style}
    >
      <button
        ref={triggerRef}
        type="button"
        className="knit-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onMouseDown={(e) => {
          if (e.button === 1) e.preventDefault();
        }}
        onClick={() => {
          if (open) close();
          else openMenu();
        }}
      >
        <span className="knit-select-value">{selectedLabel}</span>
        <span className="knit-select-chevron" aria-hidden="true">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open &&
        coords &&
        createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            className="knit-select-menu"
            role="listbox"
            style={{
              top: coords.top,
              left: coords.left,
              minWidth: coords.minWidth,
            }}
          >
            {options.map((opt, index) => {
              const selected = opt.value === value;
              const active = index === activeIndex;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  data-index={index}
                  data-value={opt.value}
                  className={[
                    'knit-select-option',
                    selected ? 'is-selected' : '',
                    active ? 'is-active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(opt.value);
                    close();
                    triggerRef.current?.focus();
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
};
