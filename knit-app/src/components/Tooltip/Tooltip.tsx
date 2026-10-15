import React from 'react';

export interface TooltipProps {
  content: string;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactElement<React.HTMLAttributes<HTMLElement>>;
}

/**
 * Composant Tooltip déclaratif Knit.
 * Associe les attributs data-tooltip, data-shortcut et data-tooltip-pos
 * à son élément enfant pour un rendu via le TooltipContainer global.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  shortcut,
  position = 'bottom',
  children,
}) => {
  return React.cloneElement(children, {
    'data-tooltip': content,
    ...(shortcut ? { 'data-shortcut': shortcut } : {}),
    ...(position ? { 'data-tooltip-pos': position } : {}),
  } as React.HTMLAttributes<HTMLElement>);
};
