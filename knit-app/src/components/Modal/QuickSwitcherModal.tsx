import React, { useState, useMemo, useCallback } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import { flattenFileNodes } from '../../utils/treeUtils';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { BaseSearchModal } from './BaseSearchModal';

interface QuickSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (path: string, inNewTab?: boolean) => void;
}

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Aplatit l'arborescence des fichiers pour la recherche rapide via treeUtils
  const allFiles = useMemo(() => {
    return flattenFileNodes(vaultStore.files);
  }, []);

  const matchingFiles = useMemo(() => {
    if (!query.trim()) return allFiles.slice(0, 15);
    const q = query.toLowerCase().trim();

    return allFiles
      .filter((f) => f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [allFiles, query]);

  const handleClose = useCallback(() => {
    setQuery('');
    setSelectedIndex(0);
    onClose();
  }, [onClose]);

  const handleSelectCurrent = useCallback(() => {
    const target = matchingFiles[selectedIndex];
    if (target) {
      onSelectFile(target.path, false);
      handleClose();
    }
  }, [matchingFiles, selectedIndex, onSelectFile, handleClose]);

  return (
    <BaseSearchModal
      isOpen={isOpen}
      onClose={handleClose}
      query={query}
      onQueryChange={setQuery}
      placeholder="Sauter à une note... (Ctrl+O)"
      icon="search"
      selectedIndex={selectedIndex}
      totalItems={matchingFiles.length}
      onSelectCurrent={handleSelectCurrent}
      onNavigateIndex={setSelectedIndex}
      footerHints={
        <span>
          <kbd style={{ padding: '1px 4px', background: 'var(--knit-surface)', border: '1px solid var(--knit-border)', borderRadius: 3, fontFamily: 'var(--knit-font-mono)' }}>Ctrl+↵</kbd> Nouvel onglet
        </span>
      }
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
                handleClose();
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
    </BaseSearchModal>
  );
};
