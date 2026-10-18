import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';

import type { TooltipData } from '../../types';
import { computeTooltipPosition } from '../../utils';

export const TooltipContainer: React.FC = () => {
  const [data, setData] = useState<TooltipData | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const lastTargetRef = useRef<HTMLElement | null>(null);
  const latestMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isAlreadyShowingRef = useRef<boolean>(false);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Synchronisation du placement exact et du dégagement souris avant le premier paint
  useLayoutEffect(() => {
    if (!data || !tooltipRef.current) return;
    const el = tooltipRef.current;
    const tw = el.offsetWidth;
    const th = el.offsetHeight;

    const { left, top, placement } = computeTooltipPosition(
      data.targetRect,
      data.mouse,
      tw,
      th,
      data.preferredPos
    );

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.opacity = '1';
    el.setAttribute('data-placement', placement);
  }, [data]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      latestMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseOver = (e: MouseEvent) => {
      latestMouseRef.current = { x: e.clientX, y: e.clientY };

      const target = (e.target as HTMLElement | null)?.closest(
        '[data-tooltip], [title]'
      ) as HTMLElement | null;

      if (!target) return;

      // Interception du title natif pour éviter le tooltip jaune moche de l'OS
      if (target.hasAttribute('title')) {
        const titleVal = target.getAttribute('title') || '';
        if (titleVal.trim()) {
          target.removeAttribute('title');
          target.setAttribute('data-tooltip', titleVal);
        }
      }

      let text = target.getAttribute('data-tooltip');
      if (!text || !text.trim()) return;

      let shortcut = target.getAttribute('data-shortcut') || undefined;
      const preferredPos = (target.getAttribute('data-tooltip-pos') as TooltipData['preferredPos']) || 'top';

      // Extraction intelligente du raccourci entre parenthèses si présent dans le texte
      // Ex: "Copier le contexte IA au format <document> (Ctrl+Shift+C)"
      const parenMatch = text.match(/\s*\(((?:Ctrl|Shift|Alt|Cmd|⌘)[^)]+)\)\s*$/i);
      if (parenMatch) {
        if (!shortcut) {
          shortcut = parenMatch[1];
        }
        text = text.replace(parenMatch[0], '').trim();
      } else if (shortcut) {
        // Nettoie si le texte contenait quand même le raccourci redondant
        text = text.replace(new RegExp(`\\s*\\(${shortcut.replace(/[+*?^$.[\]{}()|\\/]/g, '\\$&')}\\)\\s*$`, 'i'), '').trim();
      }

      lastTargetRef.current = target;

      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
      }

      // Délai court si un tooltip est déjà actif (transition fluide entre boutons)
      const delay = isAlreadyShowingRef.current ? 40 : 200;

      showTimerRef.current = window.setTimeout(() => {
        if (!lastTargetRef.current) return;
        const rect = lastTargetRef.current.getBoundingClientRect();

        setData({
          text,
          shortcut,
          targetRect: rect,
          mouse: { ...latestMouseRef.current },
          preferredPos,
        });
        isAlreadyShowingRef.current = true;
      }, delay);
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (!lastTargetRef.current) return;
      // Vérifie si la souris a réellement quitté l'élément cible et non un de ses enfants
      const related = e.relatedTarget as Node | null;
      if (!related || !lastTargetRef.current.contains(related)) {
        hideTooltip();
      }
    };

    const hideTooltip = () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      lastTargetRef.current = null;
      setData(null);

      // Réinitialise la réactivité immédiate après un bref délai
      window.setTimeout(() => {
        if (!lastTargetRef.current) {
          isAlreadyShowingRef.current = false;
        }
      }, 250);
    };

    const handleWindowEvents = () => {
      hideTooltip();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideTooltip();
      }
    };

    window.addEventListener('mousemove', handleMouseMove, true);
    window.addEventListener('mouseover', handleMouseOver, true);
    window.addEventListener('mouseout', handleMouseOut, true);
    window.addEventListener('mousedown', handleWindowEvents, true);
    window.addEventListener('scroll', handleWindowEvents, true);
    window.addEventListener('resize', handleWindowEvents, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove, true);
      window.removeEventListener('mouseover', handleMouseOver, true);
      window.removeEventListener('mouseout', handleMouseOut, true);
      window.removeEventListener('mousedown', handleWindowEvents, true);
      window.removeEventListener('scroll', handleWindowEvents, true);
      window.removeEventListener('resize', handleWindowEvents, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  if (!data) return null;

  return (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        left: -9999,
        top: -9999,
        opacity: 0,
        zIndex: 100050,
        pointerEvents: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 8px',
        backgroundColor: 'var(--knit-surface)',
        color: 'var(--knit-text)',
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.25,
        borderRadius: 'var(--knit-radius-xs)',
        border: '1px solid var(--knit-border)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.32), 0 1px 3px rgba(0, 0, 0, 0.18)',
        maxWidth: 'min(420px, calc(100vw - 24px))',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        transition: 'opacity 80ms ease-out',
        animation: 'knitTooltipFadeIn 100ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.text}</span>
      {data.shortcut && (
        <kbd
          style={{
            fontFamily: 'inherit',
            fontSize: 10,
            fontWeight: 600,
            padding: '1px 5px',
            borderRadius: 3,
            backgroundColor: 'var(--knit-bg)',
            border: '1px solid var(--knit-border)',
            color: 'var(--knit-text-muted)',
            lineHeight: 1,
            letterSpacing: '0.02em',
            flexShrink: 0,
          }}
        >
          {data.shortcut}
        </kbd>
      )}

      <style>{`
        @keyframes knitTooltipFadeIn {
          from {
            opacity: 0;
            transform: scale(0.97) translateY(-2px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
