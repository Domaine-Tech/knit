import React from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { tabStore } from '../../stores/tabStore';
import { vaultStore } from '../../stores/vaultStore';
import { docTypeToIconName, resolveFileDocType } from '../../utils';

export interface SidebarPinnedSectionProps {
  pinnedNotes: string[];
  isPinnedExpanded: boolean;
  setIsPinnedExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  activePath: string | null;
  filterText: string;
  onSelectFile: (path: string, preview: boolean) => void;
  onMiddleClickFile: (path: string) => void;
  togglePinNote: (path: string) => void;
  scheduleHover: (path: string, x: number, y: number) => void;
  cancelHover: (force?: boolean) => void;
}

export const SidebarPinnedSection: React.FC<SidebarPinnedSectionProps> = ({
  pinnedNotes,
  isPinnedExpanded,
  setIsPinnedExpanded,
  activePath,
  filterText,
  onSelectFile,
  onMiddleClickFile,
  togglePinNote,
  scheduleHover,
  cancelHover,
}) => {
  if (pinnedNotes.length === 0 || filterText.trim().length > 0) return null;

  return (
    <div style={{ marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--knit-border)' }}>
      <div
        onClick={() => setIsPinnedExpanded((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--knit-text-muted)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <DuotoneIcon name={isPinnedExpanded ? 'chevron-down' : 'chevron-right'} size={11} />
        <DuotoneIcon name="pin" size={11} style={{ color: 'var(--knit-primary)' }} />
        <span>FAVORIS ({pinnedNotes.length})</span>
      </div>

      {isPinnedExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 2 }}>
          {pinnedNotes.map((path) => {
            const name = path.split('/').pop() || path;
            const isNodeActive = path === activePath;
            return (
              <div
                key={`pinned-${path}`}
                onClick={() => {
                  cancelHover(true);
                  onSelectFile(path, false);
                }}
                onMouseEnter={(e) => {
                  if (!isNodeActive) {
                    e.currentTarget.style.backgroundColor = 'var(--knit-surface-hover)';
                  }
                  scheduleHover(path, e.clientX, e.clientY);
                }}
                onMouseMove={(e) => scheduleHover(path, e.clientX, e.clientY)}
                onMouseLeave={(e) => {
                  if (!isNodeActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                  cancelHover();
                }}
                onMouseDown={(e) => {
                  if (e.button === 1) e.preventDefault();
                }}
                onAuxClick={(e) => {
                  if (e.button === 1) {
                    e.preventDefault();
                    cancelHover(true);
                    onMiddleClickFile(path);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px 4px 18px',
                  borderRadius: 'var(--knit-radius-sm)',
                  backgroundColor: isNodeActive ? 'var(--knit-primary-alpha)' : 'transparent',
                  color: isNodeActive ? 'var(--knit-primary)' : 'var(--knit-text)',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: isNodeActive ? 600 : 400,
                  userSelect: 'none',
                }}
              >
                {(() => {
                  const openTab =
                    tabStore.tabs.find((t) => t.path === path) ||
                    tabStore.group2Tabs.find((t) => t.path === path);
                  const docType = resolveFileDocType(path, openTab?.docType, vaultStore.getDocType(path));
                  const iconName = docTypeToIconName(docType);
                  return (
                    <DuotoneIcon
                      name={iconName}
                      size={13}
                      style={iconName !== 'file-markdown' ? { color: 'var(--knit-primary)' } : undefined}
                    />
                  );
                })()}
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePinNote(path);
                  }}
                  data-tooltip="Retirer des favoris"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--knit-text-muted)',
                    cursor: 'pointer',
                    padding: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--knit-radius-xs)',
                  }}
                >
                  <DuotoneIcon name="close" size={10} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
