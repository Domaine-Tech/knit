import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import type { TagInfo } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

interface TagExplorerPaneProps {
  onSelectFile: (path: string) => void;
}

export const TagExplorerPane: React.FC<TagExplorerPaneProps> = ({ onSelectFile }) => {
  const [tags, setTags] = useState<TagInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const loadTags = useCallback(async () => {
    try {
      const items = await vaultStore.getVaultTags();
      setTags(items);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTags();
    const unsub = vaultStore.subscribe(() => {
      loadTags();
    });
    return () => unsub();
  }, [loadTags]);

  const filteredTags = useMemo(() => {
    if (!filterText.trim()) return tags;
    const q = filterText.toLowerCase();
    return tags.filter((t) => t.tag.toLowerCase().includes(q));
  }, [tags, filterText]);

  // Notes correspondant aux tags sélectionnés (ET logique si plusieurs sélectionnés)
  const matchingFiles = useMemo(() => {
    if (selectedTags.length === 0) return [];

    let intersection: string[] | null = null;
    for (const tagStr of selectedTags) {
      const found = tags.find((t) => t.tag === tagStr);
      const filesForTag = found ? found.files : [];

      if (intersection === null) {
        intersection = [...filesForTag];
      } else {
        intersection = intersection.filter((f) => filesForTag.includes(f));
      }
    }

    return intersection || [];
  }, [selectedTags, tags]);

  const handleTagClick = (tag: string, isMulti: boolean) => {
    if (isMulti) {
      setSelectedTags((prev) =>
        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      );
    } else {
      setSelectedTags((prev) =>
        prev.length === 1 && prev[0] === tag ? [] : [tag]
      );
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Barre de filtre des tags */}
      <div style={{ padding: '8px 12px' }}>
        <div className="knit-input-group">
          <DuotoneIcon name="tag" size={13} style={{ color: 'var(--knit-primary)', flexShrink: 0 }} />
          <input
            type="text"
            className="knit-input-seamless"
            placeholder="Filtrer les tags..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ fontSize: 12, width: '100%' }}
          />
          {filterText && (
            <button
              onClick={() => setFilterText('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--knit-text-muted)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <DuotoneIcon name="close" size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Nuage / Liste de tags */}
      <div
        style={{
          padding: '6px 12px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          maxHeight: 200,
          overflowY: 'auto',
          borderBottom: selectedTags.length > 0 ? '1px solid var(--knit-border)' : 'none',
        }}
      >
        {filteredTags.length === 0 ? (
          <div
            style={{
              padding: 16,
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--knit-text-muted)',
              width: '100%',
            }}
          >
            {isLoading ? 'Chargement des tags...' : 'Aucun tag trouvé'}
          </div>
        ) : (
          filteredTags.map((t) => {
            const isSelected = selectedTags.includes(t.tag);
            return (
              <button
                key={t.tag}
                onClick={(e) => handleTagClick(t.tag, e.ctrlKey || e.metaKey)}
                title={`Cliquer pour filtrer • Ctrl+Clic pour sélection multiple (${t.count} notes)`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: 'var(--knit-radius-xs)',
                  backgroundColor: isSelected
                    ? 'var(--knit-primary)'
                    : 'var(--knit-surface)',
                  color: isSelected ? '#FFFFFF' : 'var(--knit-text)',
                  border: isSelected
                    ? '1px solid var(--knit-primary)'
                    : '1px solid var(--knit-border)',
                  fontSize: 11,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all var(--knit-duration-fast)',
                }}
              >
                <span>#{t.tag}</span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    opacity: isSelected ? 0.9 : 0.6,
                    backgroundColor: isSelected
                      ? 'rgba(255, 255, 255, 0.25)'
                      : 'var(--knit-surface-hover)',
                    padding: '1px 4px',
                    borderRadius: 3,
                  }}
                >
                  {t.count}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Notes filtrées correspondant aux tags sélectionnés */}
      {selectedTags.length > 0 && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--knit-text-secondary)',
              backgroundColor: 'var(--knit-surface-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {matchingFiles.length} note{matchingFiles.length > 1 ? 's' : ''} avec{' '}
              {selectedTags.map((t) => `#${t}`).join(' + ')}
            </span>
            <button
              onClick={() => setSelectedTags([])}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--knit-text-muted)',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              Effacer
            </button>
          </div>

          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '6px 8px',
            }}
          >
            {matchingFiles.map((fileRel) => {
              const name = fileRel.split('/').pop() || fileRel;
              return (
                <div
                  key={fileRel}
                  onClick={() => onSelectFile(fileRel)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    borderRadius: 'var(--knit-radius-sm)',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'var(--knit-text)',
                    transition: 'background var(--knit-duration-fast)',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <DuotoneIcon name="file-markdown" size={14} style={{ color: 'var(--knit-primary)' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
