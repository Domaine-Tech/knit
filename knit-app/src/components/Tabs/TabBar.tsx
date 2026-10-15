import React, { useState } from 'react';
import type { Tab } from '../../stores/tabStore';
import { tabStore } from '../../stores/tabStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string | null;
  onNewNote?: () => void;
}

export const TabBar: React.FC<TabBarProps> = ({ tabs, activeTabId, onNewNote }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Gestion du clic molette (middle click: button === 1)
  const handleMouseDown = (e: React.MouseEvent, tabId: string) => {
    if (e.button === 1) {
      // Clic molette -> Fermer immédiatement l'onglet
      e.preventDefault();
      e.stopPropagation();
      tabStore.closeTab(tabId);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      tabStore.reorderTabs(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 38,
        backgroundColor: 'var(--knit-bg)',
        borderBottom: '1px solid var(--knit-border)',
        overflowX: 'auto',
        overflowY: 'hidden',
        userSelect: 'none',
        paddingLeft: 4,
        paddingRight: 8,
      }}
      onDoubleClick={(e) => {
        // Double clic sur zone vide crée une nouvelle note
        if (e.target === e.currentTarget && onNewNote) {
          onNewNote();
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 2 }}>
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId;

          return (
            <div
              key={tab.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(index)}
              onMouseDown={(e) => handleMouseDown(e, tab.id)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault();
                  e.stopPropagation();
                  tabStore.closeTab(tab.id);
                }
              }}
              onClick={() => tabStore.setActiveTab(tab.id)}
              onDoubleClick={() => tabStore.pinTab(tab.id)}
              title={`${tab.path}${tab.isPreview ? ' (Mode aperçu - Double-clic pour figer)' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 32,
                padding: '0 10px',
                borderRadius: 'var(--knit-radius-sm) var(--knit-radius-sm) 0 0',
                backgroundColor: isActive ? 'var(--knit-surface)' : 'transparent',
                borderLeft: '1px solid transparent',
                borderRight: '1px solid transparent',
                borderTop: isActive ? '2px solid var(--knit-primary)' : '2px solid transparent',
                borderBottom: isActive ? '1px solid var(--knit-surface)' : 'none',
                color: isActive ? 'var(--knit-text)' : 'var(--knit-text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                transition: 'background var(--knit-transition-fast), color var(--knit-transition-fast)',
                maxWidth: 220,
                minWidth: 100,
                position: 'relative',
                top: 1,
              }}
            >
              <DuotoneIcon name="file-markdown" size={14} />

              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  fontStyle: tab.isPreview ? 'italic' : 'normal',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.title}
              </span>

              {tab.isDirty && (
                <div
                  title="Modifications non sauvegardées"
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    backgroundColor: 'var(--knit-primary)',
                    flexShrink: 0,
                  }}
                />
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  tabStore.closeTab(tab.id);
                }}
                title="Fermer (Ctrl+W ou clic molette)"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 2,
                  borderRadius: 'var(--knit-radius-xs)',
                  color: 'inherit',
                  opacity: isActive ? 0.8 : 0.4,
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.opacity = isActive ? '0.8' : '0.4')
                }
              >
                <DuotoneIcon name="close" size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {onNewNote && (
        <button
          onClick={onNewNote}
          title="Nouvelle note (Ctrl+N ou double-clic sur la barre)"
          style={{
            marginLeft: 4,
            padding: 4,
            borderRadius: 'var(--knit-radius-xs)',
            color: 'var(--knit-text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--knit-text)')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'var(--knit-text-secondary)')
          }
        >
          <DuotoneIcon name="plus" size={14} />
        </button>
      )}
    </div>
  );
};
