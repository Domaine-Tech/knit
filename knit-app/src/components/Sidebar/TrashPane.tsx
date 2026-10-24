import React, { useCallback, useEffect, useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultStore } from '../../stores/vaultStore';
import { toast } from '../../stores/toastStore';
import type { TrashRecord } from '../../types';

export const TrashPane: React.FC = () => {
  const [items, setItems] = useState<TrashRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await vaultStore.listTrash());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) {
      setPreview(null);
      return;
    }
    void vaultStore.readTrashPreview(selectedId).then(setPreview);
  }, [selectedId]);

  const handleRestore = async (id: string) => {
    try {
      const path = await vaultStore.restoreTrash(id);
      toast.success('Restauré', path);
      setSelectedId(null);
      await refresh();
    } catch (e: unknown) {
      toast.error(String(e));
    }
  };

  const handlePurge = async (id: string) => {
    await vaultStore.purgeTrashItem(id);
    toast.info('Supprimé définitivement');
    if (selectedId === id) setSelectedId(null);
    await refresh();
  };

  const handleEmpty = async () => {
    const n = await vaultStore.purgeAllTrash();
    toast.info('Corbeille vidée', `${n} élément(s)`);
    setSelectedId(null);
    await refresh();
  };

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      onContextMenu={(e) => {
        e.preventDefault();
        contextMenu.show(e, [
          {
            id: 'refresh',
            label: 'Actualiser',
            icon: 'sync',
            onClick: () => void refresh(),
          },
          {
            id: 'empty',
            label: 'Vider la corbeille',
            icon: 'trash',
            onClick: () => void handleEmpty(),
          },
        ]);
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          borderBottom: '1px solid var(--knit-border)',
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600 }}>Corbeille</span>
        <button
          type="button"
          className="knit-btn"
          data-tooltip="Vider la corbeille"
          onClick={() => void handleEmpty()}
        >
          <DuotoneIcon name="trash" size={13} />
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {loading && (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--knit-text-muted)' }}>
            Chargement…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div style={{ padding: 12, fontSize: 12, color: 'var(--knit-text-muted)' }}>
            Aucun élément dans `.knit/trash/`
          </div>
        )}
        {items.map((item) => (
          <div
            key={item.trash_id}
            onClick={() => setSelectedId(item.trash_id)}
            onMouseDown={(e) => {
              if (e.button === 1) e.preventDefault();
            }}
            onAuxClick={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                void handleRestore(item.trash_id);
              }
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              contextMenu.show(e, [
                {
                  id: 'restore',
                  label: 'Restaurer',
                  icon: 'download',
                  onClick: () => void handleRestore(item.trash_id),
                },
                {
                  id: 'copy',
                  label: 'Copier le chemin d’origine',
                  icon: 'copy',
                  onClick: () => void navigator.clipboard.writeText(item.original_rel_path),
                },
                {
                  id: 'purge',
                  label: 'Supprimer définitivement',
                  icon: 'trash',
                  onClick: () => void handlePurge(item.trash_id),
                },
              ]);
            }}
            style={{
              padding: '8px 10px',
              cursor: 'pointer',
              background:
                selectedId === item.trash_id ? 'var(--knit-surface-hover)' : 'transparent',
              borderBottom: '1px solid var(--knit-border)',
              fontSize: 12,
            }}
            data-tooltip="Clic molette : restaurer"
          >
            <div style={{ fontWeight: 600 }}>{item.item_name}</div>
            <div style={{ color: 'var(--knit-text-muted)', fontSize: 11 }}>
              {item.original_rel_path}
            </div>
          </div>
        ))}
      </div>
      {selectedId && (
        <div
          style={{
            borderTop: '1px solid var(--knit-border)',
            maxHeight: '40%',
            overflow: 'auto',
            padding: 10,
            fontSize: 11,
            fontFamily: 'var(--knit-font-mono)',
            whiteSpace: 'pre-wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              className="knit-btn knit-btn-primary"
              onClick={() => void handleRestore(selectedId)}
            >
              Restaurer
            </button>
            <button
              type="button"
              className="knit-btn"
              onClick={() => void handlePurge(selectedId)}
            >
              Supprimer
            </button>
          </div>
          {preview ?? (
            <span style={{ color: 'var(--knit-text-muted)' }}>
              Pas d’aperçu (dossier ou binaire)
            </span>
          )}
        </div>
      )}
    </div>
  );
};
