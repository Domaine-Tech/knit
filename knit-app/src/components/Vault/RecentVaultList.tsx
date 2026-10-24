import React, { useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultRegistry } from '../../stores/vaultRegistry';
import { toast } from '../../stores/toastStore';
import type { RegisteredVault } from '../../types';

export interface RecentVaultListProps {
  vaults: RegisteredVault[];
  busy?: boolean;
  /** Chemin du coffre actuellement ouvert (badge « Ouvert »). */
  currentPath?: string | null;
  emptyLabel?: React.ReactNode;
  onOpen: (entry: RegisteredVault) => void;
  /** Afficher le menu contextuel par ligne (ouvrir / copier / retirer). */
  showItemContextMenu?: boolean;
}

const iconWrap: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 'var(--knit-radius-sm)',
  backgroundColor: 'var(--knit-bg)',
  border: '1px solid var(--knit-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

export const RecentVaultList: React.FC<RecentVaultListProps> = ({
  vaults,
  busy = false,
  currentPath = null,
  emptyLabel = (
    <>
      Aucun coffre récent.
      <br />
      Créez-en un ou ouvrez un dossier.
    </>
  ),
  onOpen,
  showItemContextMenu = true,
}) => {
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);

  if (vaults.length === 0) {
    return (
      <div
        style={{
          padding: '18px 12px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--knit-text-muted)',
          lineHeight: 1.45,
        }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {vaults.map((entry) => {
        const active = Boolean(currentPath && entry.path === currentPath);
        const hovered = hoveredPath === entry.path;
        return (
          <button
            key={entry.path}
            type="button"
            disabled={busy}
            onClick={() => onOpen(entry)}
            onMouseEnter={() => setHoveredPath(entry.path)}
            onMouseLeave={() => setHoveredPath(null)}
            onMouseDown={(e) => {
              if (e.button === 1) e.preventDefault();
            }}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                vaultRegistry.remove(entry.path);
                toast.info('Coffre retiré de la liste');
              }
            }}
            onContextMenu={
              showItemContextMenu
                ? (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    contextMenu.show(e, [
                      {
                        id: 'open',
                        label: 'Ouvrir',
                        icon: 'folder-open',
                        onClick: () => onOpen(entry),
                      },
                      {
                        id: 'copy',
                        label: 'Copier le chemin',
                        icon: 'copy',
                        onClick: () => void navigator.clipboard.writeText(entry.path),
                      },
                      {
                        id: 'remove',
                        label: 'Retirer de la liste',
                        icon: 'trash',
                        onClick: () => {
                          vaultRegistry.remove(entry.path);
                          toast.info('Coffre retiré de la liste');
                        },
                      },
                    ]);
                  }
                : undefined
            }
            data-tooltip="Clic molette : retirer de la liste"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              borderRadius: 'var(--knit-radius-md)',
              border: '1px solid',
              borderColor: active
                ? 'color-mix(in srgb, var(--knit-primary) 45%, var(--knit-border))'
                : hovered
                  ? 'var(--knit-border)'
                  : 'transparent',
              backgroundColor: active
                ? 'color-mix(in srgb, var(--knit-primary) 10%, var(--knit-bg))'
                : hovered
                  ? 'var(--knit-surface-hover)'
                  : 'transparent',
              cursor: busy ? 'not-allowed' : 'pointer',
              position: 'relative',
              boxShadow: active ? 'inset 3px 0 0 var(--knit-primary)' : 'none',
            }}
          >
            <div
              style={{
                ...iconWrap,
                color: active
                  ? 'var(--knit-primary)'
                  : entry.isDemo
                    ? 'var(--knit-primary)'
                    : 'var(--knit-text-secondary)',
              }}
            >
              <DuotoneIcon name={entry.isDemo ? 'knit' : 'folder'} size={15} />
            </div>
            <span
              style={{
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
                flex: 1,
                gap: 2,
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 13,
                    color: 'var(--knit-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.name}
                </span>
                {active && (
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 10,
                      fontWeight: 650,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                      color: 'var(--knit-primary)',
                      backgroundColor:
                        'color-mix(in srgb, var(--knit-primary) 14%, transparent)',
                      border:
                        '1px solid color-mix(in srgb, var(--knit-primary) 28%, transparent)',
                      borderRadius: 'var(--knit-radius-xs)',
                      padding: '1px 6px',
                    }}
                  >
                    Ouvert
                  </span>
                )}
              </span>
              <span
                style={{
                  fontSize: 11,
                  lineHeight: 1.35,
                  color: 'var(--knit-text-secondary)',
                  fontFamily: 'var(--knit-font-mono)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {entry.path}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
};
