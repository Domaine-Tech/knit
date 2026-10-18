import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import { tabStore } from '../../stores/tabStore';
import { flattenFileNodes, docTypeToIconName, resolveFileDocType } from '../../utils';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { useDelayedHoverPreview } from '../../hooks';
import { BaseSearchModal } from './BaseSearchModal';

interface QuickSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFile: (path: string, inNewTab?: boolean) => void;
}

function quickSwitcherPreviewCoords(): { x: number; y: number } {
  return {
    x: Math.min(window.innerWidth - 400, window.innerWidth / 2 + 260),
    y: Math.max(48, window.innerHeight * 0.22),
  };
}

export const QuickSwitcherModal: React.FC<QuickSwitcherModalProps> = ({
  isOpen,
  onClose,
  onSelectFile,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const hoverPreview = useDelayedHoverPreview(180);

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

  useEffect(() => {
    if (!isOpen) {
      hoverPreview.cancel(true);
      return;
    }
    const target = matchingFiles[selectedIndex];
    if (!target) {
      hoverPreview.cancel(true);
      return;
    }
    const { x, y } = quickSwitcherPreviewCoords();
    hoverPreview.schedule(target.path, x, y);
  }, [isOpen, selectedIndex, matchingFiles, hoverPreview]);

  const handleClose = useCallback(() => {
    hoverPreview.cancel(true);
    setQuery('');
    setSelectedIndex(0);
    onClose();
  }, [hoverPreview, onClose]);

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
                {(() => {
                  const openTab =
                    tabStore.tabs.find((t) => t.path === f.path) ||
                    tabStore.group2Tabs.find((t) => t.path === f.path);
                  const docType = resolveFileDocType(f.path, openTab?.docType, vaultStore.getDocType(f.path));
                  const iconName = docTypeToIconName(docType);
                  return (
                    <DuotoneIcon
                      name={iconName}
                      size={15}
                      style={{
                        color: iconName !== 'file-markdown' || isSelected
                          ? 'var(--knit-primary)'
                          : 'var(--knit-text-secondary)',
                      }}
                    />
                  );
                })()}
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
