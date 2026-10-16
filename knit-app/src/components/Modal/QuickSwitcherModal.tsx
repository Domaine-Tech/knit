import React, { useState, useEffect, useRef, useMemo } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import type { FileNode } from '../../stores/vaultStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

interface QuickSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (path: string, inNewTab?: boolean) => void;
}

interface FlattenedFile {
  path: string;
  name: string;
  parentDir: string;
}

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Aplatit l'arborescence des fichiers pour la recherche rapide
  const allFiles = useMemo(() => {
    const list: FlattenedFile[] = [];

    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.is_dir) {
          traverse(node.children);
        } else {
          const parts = node.path.split('/');
          const parentDir = parts.length > 1 ? parts.slice(0, -1).join('/') : '';
          list.push({
            path: node.path,
            name: node.name,
            parentDir,
          });
        }
      }
    };

    traverse(vaultStore.files);
    return list;
  }, []);

  const matchingFiles = useMemo(() => {
    if (!query.trim()) return allFiles.slice(0, 15);
    const q = query.toLowerCase().trim();

    return allFiles
      .filter((f) => f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [allFiles, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 20);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < matchingFiles.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : matchingFiles.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = matchingFiles[selectedIndex];
      if (target) {
        const inNewTab = e.ctrlKey || e.metaKey;
        onSelectFile(target.path, inNewTab);
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Défilement automatique vers l'élément sélectionné
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '15vh',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 560,
          maxWidth: '92vw',
          backgroundColor: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-md)',
          boxShadow: 'var(--knit-shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre de recherche Quick Switcher */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <DuotoneIcon name="search" size={16} style={{ color: 'var(--knit-primary)' }} />
          <input
            ref={inputRef}
            type="text"
            className="knit-input-seamless"
            placeholder="Sauter à une note... (Ctrl+O)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{
              flex: 1,
              fontSize: 14,
              color: 'var(--knit-text)',
            }}
          />
          <kbd
            style={{
              fontSize: 10,
              padding: '2px 5px',
              borderRadius: 'var(--knit-radius-xs)',
              backgroundColor: 'var(--knit-surface-hover)',
              border: '1px solid var(--knit-border)',
              color: 'var(--knit-text-muted)',
              fontFamily: 'var(--knit-font-mono)',
            }}
          >
            Échap
          </kbd>
        </div>

        {/* Liste des résultats */}
        <div
          ref={listRef}
          style={{
            maxHeight: 340,
            overflowY: 'auto',
            padding: '6px 8px',
          }}
        >
          {matchingFiles.length === 0 ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                fontSize: 13,
                color: 'var(--knit-text-muted)',
              }}
            >
              Aucun fichier correspondant
            </div>
          ) : (
            matchingFiles.map((f, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={f.path}
                  onClick={() => {
                    onSelectFile(f.path);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--knit-radius-sm)',
                    backgroundColor: isSelected ? 'var(--knit-surface-hover)' : 'transparent',
                    border: isSelected ? '1px solid var(--knit-border)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'background var(--knit-duration-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                    <DuotoneIcon
                      name="file-markdown"
                      size={15}
                      style={{ color: isSelected ? 'var(--knit-primary)' : 'var(--knit-text-secondary)' }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 500,
                        color: 'var(--knit-text)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {f.name}
                    </span>
                  </div>

                  {f.parentDir && (
                    <span
                      style={{
                        fontSize: 11,
                        color: 'var(--knit-text-muted)',
                        fontFamily: 'var(--knit-font-mono)',
                        marginLeft: 12,
                        flexShrink: 0,
                      }}
                    >
                      {f.parentDir}/
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Pied d'aide raccourcis */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--knit-bg)',
            borderTop: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'var(--knit-text-muted)',
          }}
        >
          <div>
            <kbd>↑↓</kbd> Naviguer • <kbd>↵</kbd> Ouvrir • <kbd>Ctrl+↵</kbd> Nouvel onglet
          </div>
          <span>{matchingFiles.length} note{matchingFiles.length > 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
};
