import React, { useEffect, useState, useRef } from 'react';

interface TooltipState {
  text: string;
  shortcut?: string;
  x: number;
  y: number;
  position: 'top' | 'bottom' | 'left' | 'right';
  visible: boolean;
}

export const TooltipContainer: React.FC = () => {
  const [state, setState] = useState<TooltipState | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const lastTargetRef = useRef<HTMLElement | null>(null);
  const isAlreadyShowingRef = useRef<boolean>(false);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest(
        '[data-tooltip], [title]'
      ) as HTMLElement | null;

      if (!target) return;

      // Si le composant a un attribut title natif, on le capture pour interdire le tooltip OS moche
      if (target.hasAttribute('title')) {
        const titleVal = target.getAttribute('title') || '';
        if (titleVal.trim()) {
          target.removeAttribute('title');
          target.setAttribute('data-tooltip', titleVal);

          // Extraction automatique des raccourcis du type "(Ctrl+S)" ou "(Ctrl+W)"
          const shortcutMatch = titleVal.match(/\((Ctrl\+[A-Za-z0-9+]+|Shift\+[A-Za-z0-9+]+|Alt\+[A-Za-z0-9+]+)\)/);
          if (shortcutMatch) {
            target.setAttribute('data-shortcut', shortcutMatch[1]);
            const cleanedText = titleVal.replace(shortcutMatch[0], '').trim();
            target.setAttribute('data-tooltip', cleanedText);
          }
        }
      }

      const text = target.getAttribute('data-tooltip');
      if (!text) return;

      const shortcut = target.getAttribute('data-shortcut') || undefined;
      const preferredPos = (target.getAttribute('data-tooltip-pos') as TooltipState['position']) || 'top';

      lastTargetRef.current = target;

      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
      }

      // Si un tooltip est déjà actif sur un autre élément, affichage quasi-instantané (40ms)
      const delay = isAlreadyShowingRef.current ? 40 : 220;

      showTimerRef.current = window.setTimeout(() => {
        if (!lastTargetRef.current) return;
        const rect = lastTargetRef.current.getBoundingClientRect();

        let pos = preferredPos;
        let x = rect.left + rect.width / 2;
        let y = rect.top - 8;

        if (pos === 'top') {
          // Si trop près du bord supérieur de la fenêtre, basculer proprement en dessous
          if (rect.top - 36 < 0) {
            pos = 'bottom';
            y = rect.bottom + 8;
          } else {
            y = rect.top - 8;
          }
        } else if (pos === 'bottom') {
          // Si trop près du bord inférieur, basculer au-dessus
          if (rect.bottom + 36 > window.innerHeight) {
            pos = 'top';
            y = rect.top - 8;
          } else {
            y = rect.bottom + 8;
          }
        } else if (pos === 'left') {
          x = rect.left - 8;
          y = rect.top + rect.height / 2;
        } else if (pos === 'right') {
          x = rect.right + 8;
          y = rect.top + rect.height / 2;
        }

        // Évite le débordement horizontal hors de la fenêtre
        x = Math.max(70, Math.min(window.innerWidth - 70, x));

        setState({
          text,
          shortcut,
          x,
          y,
          position: pos,
          visible: true,
        });
        isAlreadyShowingRef.current = true;
      }, delay);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest('[data-tooltip]');
      if (target && target === lastTargetRef.current) {
        hideTooltip();
      }
    };

    const hideTooltip = () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
      lastTargetRef.current = null;
      setState(null);
      // Réinitialise la réactivité immédiate après un bref délai
      window.setTimeout(() => {
        if (!lastTargetRef.current) {
          isAlreadyShowingRef.current = false;
        }
      }, 300);
    };

    const handleWindowEvents = () => {
      hideTooltip();
    };

    window.addEventListener('mouseover', handleMouseOver, true);
    window.addEventListener('mouseout', handleMouseOut, true);
    window.addEventListener('mousedown', handleWindowEvents, true);
    window.addEventListener('scroll', handleWindowEvents, true);

    return () => {
      window.removeEventListener('mouseover', handleMouseOver, true);
      window.removeEventListener('mouseout', handleMouseOut, true);
      window.removeEventListener('mousedown', handleWindowEvents, true);
      window.removeEventListener('scroll', handleWindowEvents, true);
    };
  }, []);

  if (!state || !state.visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: state.x,
        top: state.y,
        transform:
          state.position === 'top'
            ? 'translate(-50%, -100%)'
            : state.position === 'bottom'
            ? 'translate(-50%, 0)'
            : state.position === 'left'
            ? 'translate(-100%, -50%)'
            : 'translate(0, -50%)',
        zIndex: 11000,
        pointerEvents: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 7px',
        backgroundColor: 'var(--knit-surface)',
        color: 'var(--knit-text)',
        fontSize: 11,
        fontWeight: 500,
        lineHeight: 1.2,
        borderRadius: 'var(--knit-radius-xs)',
        border: '1px solid var(--knit-border)',
        boxShadow: 'var(--knit-shadow-md)',
        whiteSpace: 'nowrap',
        userSelect: 'none',
        animation: 'knitTooltipIn 120ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <span>{state.text}</span>
      {state.shortcut && (
        <kbd
          style={{
            fontFamily: 'inherit',
            fontSize: 10,
            fontWeight: 600,
            padding: '1px 4px',
            borderRadius: 2,
            backgroundColor: 'var(--knit-bg)',
            border: '1px solid var(--knit-border)',
            color: 'var(--knit-text-muted)',
            lineHeight: 1,
            letterSpacing: '0.02em',
          }}
        >
          {state.shortcut}
        </kbd>
      )}

      <style>{`
        @keyframes knitTooltipIn {
          from {
            opacity: 0;
            transform: ${
              state.position === 'top'
                ? 'translate(-50%, -90%) scale(0.96)'
                : state.position === 'bottom'
                ? 'translate(-50%, -10%) scale(0.96)'
                : state.position === 'left'
                ? 'translate(-90%, -50%) scale(0.96)'
                : 'translate(-10%, -50%) scale(0.96)'
            };
          }
          to {
            opacity: 1;
            transform: ${
              state.position === 'top'
                ? 'translate(-50%, -100%) scale(1)'
                : state.position === 'bottom'
                ? 'translate(-50%, 0) scale(1)'
                : state.position === 'left'
                ? 'translate(-100%, -50%) scale(1)'
                : 'translate(0, -50%) scale(1)'
            };
          }
        }
      `}</style>
    </div>
  );
};
