import React, { useCallback, useEffect, useMemo, useState } from 'react';
import diff from 'fast-diff';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { contextMenu } from '../../stores/contextMenuStore';
import { crdtManager } from '../../crdt';
import { tabStore } from '../../stores/tabStore';
import { toast } from '../../stores/toastStore';
import type { DocSnapshot } from '../../types';

export const HistoryPane: React.FC = () => {
  const [path, setPath] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<DocSnapshot[]>([]);
  const [selected, setSelected] = useState<DocSnapshot | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    const active =
      tabStore.activeGroupId === 2 && tabStore.isSplit
        ? tabStore.group2Tabs.find((t) => t.id === tabStore.activeGroup2TabId)
        : tabStore.tabs.find((t) => t.id === tabStore.activeTabId);
    const docPath = active?.path ?? null;
    setPath(docPath);
    if (!docPath) {
      setSnapshots([]);
      setSelected(null);
      return;
    }
    setLoading(true);
    try {
      const list = await crdtManager.listDocSnapshots(docPath);
      setSnapshots(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return tabStore.subscribe(() => {
      void refresh();
    });
  }, [refresh]);

  const currentText = useMemo(() => {
    if (!path) return '';
    try {
      return crdtManager.getYText(path).toString();
    } catch {
      return '';
    }
  }, [path]);

  const selectedText = useMemo(() => {
    if (!selected?.yjs_snapshot_base64) return '';
    try {
      return crdtManager.textFromSnapshotBase64(selected.yjs_snapshot_base64);
    } catch {
      return '';
    }
  }, [selected]);

  const diffParts = useMemo(() => {
    if (!selected) return [];
    return diff(selectedText, currentText);
  }, [selected, selectedText, currentText]);

  const restore = async (snap: DocSnapshot) => {
    if (!path || !snap.yjs_snapshot_base64) return;
    try {
      crdtManager.restoreDocFromSnapshot(path, snap.yjs_snapshot_base64);
      toast.success('Version restaurée', snap.snapshot_id);
      await refresh();
    } catch (e: unknown) {
      toast.error(String(e));
    }
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      onContextMenu={(e) => {
        e.preventDefault();
        contextMenu.show(e, [
          {
            id: 'refresh',
            label: 'Actualiser l’historique',
            icon: 'sync',
            onClick: () => void refresh(),
          },
        ]);
      }}
    >
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid var(--knit-border)',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        Historique
        {path && (
          <div
            style={{
              fontWeight: 400,
              fontSize: 11,
              color: 'var(--knit-text-muted)',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {path}
          </div>
        )}
      </div>
      <div style={{ flex: '0 0 40%', overflow: 'auto', borderBottom: '1px solid var(--knit-border)' }}>
        {!path && (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--knit-text-muted)' }}>
            Ouvrez une note pour voir ses snapshots.
          </div>
        )}
        {loading && (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--knit-text-muted)' }}>
            Chargement…
          </div>
        )}
        {!loading && path && snapshots.length === 0 && (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--knit-text-muted)' }}>
            Aucun snapshot compacté pour ce document.
          </div>
        )}
        {snapshots.map((snap) => (
          <div
            key={snap.snapshot_id}
            onClick={() => setSelected(snap)}
            onMouseDown={(e) => {
              if (e.button === 1) e.preventDefault();
            }}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                void restore(snap);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              contextMenu.show(e, [
                {
                  id: 'restore',
                  label: 'Restaurer cette version',
                  icon: 'download',
                  onClick: () => void restore(snap),
                },
                {
                  id: 'copy-id',
                  label: 'Copier l’identifiant',
                  icon: 'copy',
                  onClick: () => void navigator.clipboard.writeText(snap.snapshot_id),
                },
              ]);
            }}
            style={{
              padding: '8px 10px',
              cursor: 'pointer',
              background:
                selected?.snapshot_id === snap.snapshot_id
                  ? 'var(--knit-surface-hover)'
                  : 'transparent',
              fontSize: 12,
              borderBottom: '1px solid var(--knit-border)',
            }}
            data-tooltip="Clic molette : restaurer"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <DuotoneIcon name="sync" size={12} />
              <strong>{snap.snapshot_id.slice(0, 12)}…</strong>
            </div>
            <div style={{ color: 'var(--knit-text-muted)', fontSize: 11 }}>
              {new Date(snap.created_at_sec * 1000).toLocaleString('fr-FR')}
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: 10, fontSize: 11, fontFamily: 'var(--knit-font-mono)' }}>
        {selected ? (
          <>
            <button
              type="button"
              className="knit-btn knit-btn-primary"
              style={{ marginBottom: 8 }}
              onClick={() => void restore(selected)}
            >
              Restaurer cette version
            </button>
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {diffParts.map((part, i) => {
                const [kind, text] = part;
                if (kind === 0) {
                  return <span key={i}>{text}</span>;
                }
                if (kind === 1) {
                  return (
                    <span
                      key={i}
                      style={{ background: 'hsla(140, 50%, 40%, 0.25)', color: 'inherit' }}
                    >
                      {text}
                    </span>
                  );
                }
                return (
                  <span
                    key={i}
                    style={{
                      background: 'hsla(0, 60%, 45%, 0.22)',
                      textDecoration: 'line-through',
                      color: 'inherit',
                    }}
                  >
                    {text}
                  </span>
                );
              })}
            </div>
          </>
        ) : (
          <span style={{ color: 'var(--knit-text-muted)' }}>
            Sélectionnez une version pour comparer le diff.
          </span>
        )}
      </div>
    </div>
  );
};
