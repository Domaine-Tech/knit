import React from 'react';

/** Indicateur de position de drop entre chips (vues semaine / jour). */
export const CalendarDropIndicator: React.FC = () => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      height: 4,
      margin: '-2px 0',
      pointerEvents: 'none',
      position: 'relative',
      zIndex: 10,
    }}
  >
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: 'var(--knit-primary)',
        boxShadow: '0 0 8px var(--knit-primary)',
        flexShrink: 0,
        marginLeft: 1,
      }}
    />
    <div
      style={{
        flex: 1,
        height: 2.5,
        backgroundColor: 'var(--knit-primary)',
        borderRadius: 2,
        boxShadow: '0 0 8px var(--knit-primary)',
        marginLeft: -1,
      }}
    />
  </div>
);
