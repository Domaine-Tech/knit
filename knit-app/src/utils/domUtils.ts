import type { ComputedPosition } from '../types';

/**
 * Utilitaires universels d'interaction DOM et calculs de disposition (layout) pour Knit
 */

/**
 * Calcule une position intelligente pour le tooltip garantissant :
 * 1. Zéro débordement hors de l'écran (left >= padX et right <= window.innerWidth - padX).
 * 2. Dégagement absolu de la souris (le curseur ne chevauche jamais le texte).
 * 3. Basculement vertical automatique si l'élément est proche du bord supérieur ou inférieur.
 */
export function computeTooltipPosition(
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
    const idealLeft = targetRect.left + (targetRect.width - tw) / 2;

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

    const idealTop = targetRect.top + (targetRect.height - th) / 2;
    const top = Math.max(padY, Math.min(vh - th - padY, idealTop));

    return { left, top, placement };
  }
}
