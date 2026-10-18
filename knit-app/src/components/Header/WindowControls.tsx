import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { isTauriEnvironment } from '../../utils';

interface WindowControlsCSSProperties extends React.CSSProperties {
  WebkitAppRegion?: 'drag' | 'no-drag';
}

export const WindowControls: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const isTauri = isTauriEnvironment();

  useEffect(() => {
    if (!isTauri) return;

    try {
      const appWindow = getCurrentWindow();
      appWindow.isMaximized().then(setIsMaximized).catch(() => {});

      const unlistenPromise = appWindow.listen('tauri://resize', async () => {
        try {
          const max = await appWindow.isMaximized();
          setIsMaximized(max);
        } catch {
          // ignore
        }
      });

      return () => {
        unlistenPromise.then((unlisten) => unlisten());
      };
    } catch {
      // ignore
    }
  }, [isTauri]);

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await getCurrentWindow().minimize();
    } catch (err) {
      console.warn('Erreur minimize :', err);
    }
  };

  const handleToggleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const appWindow = getCurrentWindow();
      await appWindow.toggleMaximize();
      const max = await appWindow.isMaximized();
      setIsMaximized(max);
    } catch (err) {
      console.warn('Erreur toggleMaximize :', err);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await getCurrentWindow().close();
    } catch (err) {
      console.warn('Erreur close :', err);
    }
  };

  if (!isTauri && typeof window !== 'undefined' && !('__TAURI_INTERNALS__' in window)) {
    return null;
  }

  const btnBaseStyle: WindowControlsCSSProperties = {
    width: 46,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: 0,
    color: 'var(--knit-text-secondary)',
    cursor: 'pointer',
    transition: 'background-color 80ms ease, color 80ms ease',
    outline: 'none',
    padding: 0,
    margin: 0,
    WebkitAppRegion: 'no-drag',
  };

  const containerStyle: WindowControlsCSSProperties = {
    display: 'flex',
    alignItems: 'stretch',
    height: '100%',
    margin: 0,
    padding: 0,
    WebkitAppRegion: 'no-drag',
  };

  return (
    <div
      style={containerStyle}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* Bouton Réduire */}
      <button
        onClick={handleMinimize}
        aria-label="Réduire"
        style={btnBaseStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)';
          e.currentTarget.style.color = 'var(--knit-text)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--knit-text-secondary)';
        }}
      >
        <svg width="10" height="1" viewBox="0 0 10 1" fill="none">
          <line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>

      {/* Bouton Agrandir / Restaurer */}
      <button
        onClick={handleToggleMaximize}
        aria-label={isMaximized ? 'Restaurer' : 'Agrandir'}
        style={btnBaseStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)';
          e.currentTarget.style.color = 'var(--knit-text)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--knit-text-secondary)';
        }}
      >
        {isMaximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            {/* Double rectangle façon Windows 11 Restore */}
            <path d="M2.5 0.5H9.5V7.5" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
            <rect x="0.5" y="2.5" width="7" height="7" stroke="currentColor" strokeWidth="1" fill="transparent" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            {/* Rectangle unique Agrandir */}
            <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" fill="transparent" />
          </svg>
        )}
      </button>

      {/* Bouton Fermer */}
      <button
        onClick={handleClose}
        aria-label="Fermer"
        style={btnBaseStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#E81123';
          e.currentTarget.style.color = '#FFFFFF';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--knit-text-secondary)';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.backgroundColor = '#C42B1C';
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
};
