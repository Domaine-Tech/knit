import React, { useEffect, useState, useRef, useLayoutEffect } from 'react';

interface TooltipData {
  text: string;
  shortcut?: string;
  targetRect: DOMRect;
  mouse: { x: number; y: number };
  preferredPos: 'top' | 'bottom' | 'left' | 'right';
}

interface ComputedPosition {
  left: number;
  top: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Calcule une position intelligente pour le tooltip garantissant :
 * 1. Zéro débordement hors de l'écran (left >= padX et right <= window.innerWidth - padX).
 * 2. Dégagement absolu de la souris (le curseur ne chevauche jamais le texte).
 * 3. Basculement vertical automatique si l'élément est proche du bord supérieur ou inférieur.
 */
function computeTooltipPosition(
  targetRect: DOMRect,
  mouse: { x: number; y: number },
  tw: number,
  th: number,
  preferredPos: 'top' | 'bottom' | 'left' | 'right'
): ComputedPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const padX = 12; // Marge minimale par rapport aux bords latéraux de l'écran
  const padY = 8;  // Marge minimale par rapport aux bords supérieur et inférieur
  const gap = 8;   // Espace minimal entre l'élément cible et le tooltip
  const cursorSafety = 24; // Dégagement vers le bas pour dépasser la flèche du curseur OS (~19px)

  let placement = preferredPos;

  if (placement === 'top' || placement === 'bottom') {
    const spaceAbove = targetRect.top;
    const spaceBelow = vh - targetRect.bottom;
    const neededHeight = th + gap + padY;

    // Si on est dans le haut de l'écran (barre d'en-tête, barre d'outils, < 65px)
    // ou qu'il n'y a pas assez d'espace au-dessus, basculer proprement en dessous
    if (placement === 'top') {
      if ((spaceAbove < 65 || spaceAbove < neededHeight) && spaceBelow >= neededHeight) {
        placement = 'bottom';
      }
    } else if (placement === 'bottom') {
      if (spaceBelow < neededHeight && spaceAbove >= neededHeight) {
        placement = 'top';
      }
    }

    let top = 0;
    if (placement === 'top') {
      // Au-dessus : le bas du tooltip doit être au-dessus du haut de la cible ET au-dessus de la souris
      const targetLimit = targetRect.top - gap;
      const mouseLimit = mouse.y > 0 ? mouse.y - 12 : targetLimit;
      const bottomEdge = Math.min(targetLimit, mouseLimit);
      top = bottomEdge - th;

      // Clamping strict dans le viewport
      if (top < padY) {
        top = padY;
      }
    } else {
      // En-dessous : le haut du tooltip doit être sous le bas de la cible ET sous la pointe de la souris + marge
      const targetLimit = targetRect.bottom + gap;
      const mouseLimit = mouse.y > 0 ? mouse.y + cursorSafety : targetLimit;
      top = Math.max(targetLimit, mouseLimit);

      // Clamping strict dans le viewport
      if (top + th > vh - padY) {
        top = vh - padY - th;
      }
    }

    // Centrage horizontal par défaut sur la cible
    let idealLeft = targetRect.left + (targetRect.width - tw) / 2;

    // Clamping horizontal strict : le tooltip ne peut JAMAIS dépasser de l'écran
    const minLeft = padX;
    const maxLeft = Math.max(padX, vw - tw - padX);
    const left = Math.max(minLeft, Math.min(maxLeft, idealLeft));

    return { left, top, placement };
  } else {
    // placement === 'left' || placement === 'right'
    const spaceLeft = targetRect.left;
    const spaceRight = vw - targetRect.right;
    const neededWidth = tw + gap + padX;

    if (placement === 'left' && spaceLeft < neededWidth && spaceRight >= neededWidth) {
      placement = 'right';
    } else if (placement === 'right' && spaceRight < neededWidth && spaceLeft >= neededWidth) {
      placement = 'left';
    }

    let left = 0;
    if (placement === 'left') {
      left = targetRect.left - gap - tw;
      if (left < padX) left = padX;
    } else {
      left = targetRect.right + gap;
      if (left + tw > vw - padX) {
        left = vw - padX - tw;
      }
    }

    let idealTop = targetRect.top + (targetRect.height - th) / 2;
    const top = Math.max(padY, Math.min(vh - th - padY, idealTop));

    return { left, top, placement };
  }
}

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
        zIndex: 11000,
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
