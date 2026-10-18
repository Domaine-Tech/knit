import React, { useState, useEffect, useRef } from 'react';
import { vaultStore } from '../../stores/vaultStore';
import type { FileSearchResult } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { useDelayedHoverPreview } from '../../hooks';

interface GlobalSearchPaneProps {
  onOpenFileAtLine: (path: string, line: number) => void;
}

export const GlobalSearchPane: React.FC<GlobalSearchPaneProps> = ({ onOpenFileAtLine }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FileSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverPreview = useDelayedHoverPreview(200);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (!searchQuery.trim()) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await vaultStore.searchVault(searchQuery);
        setResults(res);
        // Ouvre les premiers fichiers par défaut
        const initialExpanded: Record<string, boolean> = {};
        res.slice(0, 5).forEach((r) => {
          initialExpanded[r.rel_path] = true;
        });
        setExpandedFiles(initialExpanded);
      } finally {
        setIsSearching(false);
      }
    }, 120);
  };

  const toggleFile = (relPath: string) => {
    setExpandedFiles((prev) => ({
      ...prev,
      [relPath]: !prev[relPath],
    }));
  };

  const totalMatchesCount = results.reduce((acc, r) => acc + r.total_matches, 0);

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Barre de recherche */}
      <div style={{ padding: '8px 12px' }}>
        <div className="knit-input-group">
          <DuotoneIcon name="search" size={13} style={{ color: 'var(--knit-primary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            className="knit-input-seamless"
            placeholder="Rechercher partout... (tag:#, path:)"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ fontSize: 12, width: '100%' }}
          />
          {query && (
            <button
              onClick={() => handleSearch('')}
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

        {/* Compteur de résultats */}
        {query.trim() && (
          <div
            style={{
              marginTop: 6,
              fontSize: 11,
              color: 'var(--knit-text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {totalMatchesCount} résultat{totalMatchesCount > 1 ? 's' : ''} dans {results.length} note
              {results.length > 1 ? 's' : ''}
            </span>
            {isSearching && <span style={{ color: 'var(--knit-primary)' }}>Recherche...</span>}
          </div>
        )}
      </div>

      {/* Liste des résultats groupés par fichier */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 8px',
        }}
      >
        {!query.trim() ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--knit-text-muted)',
              lineHeight: 1.5,
            }}
          >
            Recherche globale dans l'ensemble des notes Markdown du coffre.
            <div style={{ marginTop: 8, fontSize: 11 }}>
              Filtres supportés : <code style={{ color: 'var(--knit-primary)' }}>tag:#p2p</code> ou{' '}
              <code style={{ color: 'var(--knit-primary)' }}>path:wiki/</code>
            </div>
          </div>
        ) : results.length === 0 ? (
          <div
            style={{
              padding: '24px 12px',
              textAlign: 'center',
              fontSize: 12,
              color: 'var(--knit-text-muted)',
            }}
          >
            Aucune correspondance pour "{query}"
          </div>
        ) : (
          results.map((res) => {
            const isExpanded = !!expandedFiles[res.rel_path];

            return (
              <div
                key={res.rel_path}
                style={{
                  marginBottom: 6,
                  borderRadius: 'var(--knit-radius-sm)',
                  backgroundColor: 'var(--knit-surface)',
                  border: '1px solid var(--knit-border)',
                  overflow: 'hidden',
                }}
              >
                {/* En-tête Fichier */}
                <div
                  onClick={() => toggleFile(res.rel_path)}
                  onMouseEnter={(e) =>
                    hoverPreview.schedule(res.rel_path, e.clientX, e.clientY)
                  }
                  onMouseMove={(e) =>
                    hoverPreview.schedule(res.rel_path, e.clientX, e.clientY)
                  }
                  onMouseLeave={() => hoverPreview.cancel()}
                  style={{
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none',
                    backgroundColor: isExpanded ? 'var(--knit-surface-hover)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                    <DuotoneIcon
                      name={isExpanded ? 'chevron-down' : 'chevron-right'}
                      size={12}
                      style={{ color: 'var(--knit-text-secondary)', flexShrink: 0 }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--knit-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      data-tooltip={res.rel_path}
                    >
                      {res.file_name}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      backgroundColor: 'var(--knit-primary-alpha)',
                      color: 'var(--knit-primary)',
                      padding: '1px 5px',
                      borderRadius: 'var(--knit-radius-xs)',
                    }}
                  >
                    {res.total_matches}
                  </span>
                </div>

                {/* Extraits de contexte (Snippets) */}
                {isExpanded && (
                  <div
                    style={{
                      borderTop: '1px solid var(--knit-border)',
                      backgroundColor: 'var(--knit-bg)',
                    }}
                  >
                    {res.snippets.map((snip, sIdx) => {
                      return (
                        <div
                          key={`${res.rel_path}-${sIdx}`}
                          onClick={() => {
                            hoverPreview.cancel();
                            onOpenFileAtLine(res.rel_path, snip.line_number);
                          }}
                          style={{
                            padding: '6px 10px 6px 16px',
                            borderBottom:
                              sIdx < res.snippets.length - 1 ? '1px solid var(--knit-border)' : 'none',
                            fontSize: 11,
                            cursor: 'pointer',
                            display: 'flex',
                            gap: 8,
                            alignItems: 'baseline',
                            transition: 'background var(--knit-duration-fast)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)';
                            hoverPreview.schedule(res.rel_path, e.clientX, e.clientY);
                          }}
                          onMouseMove={(e) =>
                            hoverPreview.schedule(res.rel_path, e.clientX, e.clientY)
                          }
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            hoverPreview.cancel();
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--knit-font-mono)',
                              fontSize: 10,
                              color: 'var(--knit-text-muted)',
                              flexShrink: 0,
                              width: 24,
                            }}
                          >
                            {snip.line_number}:
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--knit-font-mono)',
                              color: 'var(--knit-text)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {snip.line_content}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
