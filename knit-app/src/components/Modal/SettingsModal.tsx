import React, { useEffect, useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { KnitSelect } from '../Form/KnitSelect';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultConfigStore } from '../../stores/vaultConfigStore';
import { networkStore } from '../../stores/networkStore';
import { vaultStore } from '../../stores/vaultStore';
import { toast } from '../../stores/toastStore';
import { applyHue, applyTheme } from '../../theme/theme';
import {
  parseThemePreference,
  parseTrashMode,
  type ThemeMode,
  type ThemePreference,
  type TrashMode,
} from '../../types';
import { APP_VERSION, getAppVersion } from '../../utils/version';
import { isTauriEnvironment } from '../../utils/env';
import { updateStore } from '../../stores/updateStore';
import type { UpdatePolicy } from '../../types/updater';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  hue: number;
  onThemeChange: (theme: ThemeMode) => void;
  onHueChange: (hue: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  hue,
  onThemeChange,
  onHueChange,
}) => {
  const [themePref, setThemePref] = useState<ThemePreference>('auto');
  const [trashMode, setTrashMode] = useState<TrashMode>('os');
  const [lanOnly, setLanOnly] = useState(false);
  const [tick, setTick] = useState(0);
  const [appVersion, setAppVersion] = useState(APP_VERSION);
  const [updateSnap, setUpdateSnap] = useState(() => updateStore.getSnapshot());

  useEffect(() => {
    if (!isOpen) return;
    const cfg = vaultConfigStore.config;
    setThemePref(parseThemePreference(cfg.theme));
    setTrashMode(parseTrashMode(cfg.trash_mode));
    setLanOnly(Boolean(cfg.lan_only));
    void getAppVersion().then(setAppVersion);
    setUpdateSnap(updateStore.getSnapshot());
  }, [isOpen]);

  useEffect(() => {
    return updateStore.subscribe(() => setUpdateSnap(updateStore.getSnapshot()));
  }, []);

  const handleCheckUpdates = async () => {
    await updateStore.check({ force: true, silent: false });
    const snap = updateStore.getSnapshot();
    if (snap.currentVersion) setAppVersion(snap.currentVersion);
  };

  useEffect(() => {
    return networkStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const lastCheckedLabel = updateSnap.lastCheckedAt
    ? new Date(updateSnap.lastCheckedAt).toLocaleString()
    : 'Jamais';
  const checkingUpdate = updateSnap.status === 'checking';
  const tauri = isTauriEnvironment();

  if (!isOpen) return null;

  const peers = networkStore.connectedPeers;
  void tick;

  const applyThemePref = async (pref: ThemePreference) => {
    setThemePref(pref);
    await vaultConfigStore.save({ theme: pref });
    if (pref === 'auto') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const next: ThemeMode = dark ? 'dark' : 'light';
      onThemeChange(next);
      applyTheme(next);
    } else {
      onThemeChange(pref);
      applyTheme(pref);
    }
  };

  const handleLanOnly = async (value: boolean) => {
    setLanOnly(value);
    await vaultConfigStore.setLanOnly(value);
    toast.info(
      value ? 'Mode LAN strict activé' : 'Relays WAN réactivés',
      'Redémarrez le réseau P2P (fermer/rouvrir le coffre) pour appliquer.'
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.button === 1) e.preventDefault();
        if (e.target === e.currentTarget) onClose();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        contextMenu.show(e, [
          {
            id: 'close',
            label: 'Fermer les paramètres',
            icon: 'close',
            onClick: onClose,
          },
        ]);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
      }}
    >
      <div
        style={{
          width: 'min(520px, 94vw)',
          maxHeight: '86vh',
          overflow: 'auto',
          background: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-md)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <DuotoneIcon name="slider" size={16} />
            Paramètres
          </h2>
          <button type="button" className="knit-btn" onClick={onClose} data-tooltip="Fermer">
            <DuotoneIcon name="close" size={14} />
          </button>
        </div>

        <section style={{ marginBottom: 20 }}>
          <div className="knit-label" style={{ marginBottom: 8 }}>
            Apparence
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {(['light', 'dark', 'auto'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                className="knit-btn"
                onClick={() => void applyThemePref(mode)}
                style={{
                  flex: 1,
                  borderColor: themePref === mode ? 'var(--knit-primary)' : undefined,
                }}
              >
                {mode === 'light' ? 'Clair' : mode === 'dark' ? 'Sombre' : 'Auto'}
              </button>
            ))}
          </div>
          <label className="knit-label">Teinte ({hue}°) — thème actif : {theme}</label>
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(e) => {
              const v = Number(e.target.value);
              onHueChange(v);
              applyHue(v);
              void vaultConfigStore.save({ hue: v });
            }}
            style={{ width: '100%' }}
          />
        </section>

        <section style={{ marginBottom: 20 }}>
          <div className="knit-label" style={{ marginBottom: 8 }}>
            Corbeille
          </div>
          <KnitSelect
            value={trashMode}
            onChange={(v) => {
              const mode = parseTrashMode(v);
              setTrashMode(mode);
              void vaultConfigStore.setTrashMode(mode);
            }}
            options={[
              { value: 'os', label: 'Corbeille système (OS) après annulation' },
              { value: 'knit', label: 'Corbeille Knit uniquement (.knit/trash/)' },
            ]}
          />
        </section>

        <section style={{ marginBottom: 20 }}>
          <div className="knit-label" style={{ marginBottom: 8 }}>
            Mises à jour
          </div>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--knit-text-muted)' }}>
            Version installée : {appVersion}
            <br />
            Dernière vérification : {lastCheckedLabel}
            {updateSnap.error ? (
              <>
                <br />
                <span style={{ color: 'var(--knit-danger, #c44)' }}>{updateSnap.error}</span>
              </>
            ) : null}
          </p>
          <div style={{ marginBottom: 10 }}>
            <div className="knit-label" style={{ marginBottom: 6, fontSize: 11 }}>
              Politique
            </div>
            <KnitSelect
              value={updateSnap.policy}
              onChange={(v) => updateStore.setPolicy(v as UpdatePolicy)}
              options={[
                { value: 'auto', label: 'Automatique (téléchargement silencieux)' },
                { value: 'notify', label: 'Notifier uniquement' },
                { value: 'manual', label: 'Manuel uniquement' },
              ]}
            />
          </div>
          <button
            type="button"
            className="knit-btn"
            disabled={checkingUpdate || !tauri}
            onClick={() => void handleCheckUpdates()}
            data-tooltip={
              tauri
                ? 'Interroger GitHub Releases'
                : 'Disponible dans l’application installée'
            }
          >
            <DuotoneIcon name="download" size={14} />
            <span style={{ marginLeft: 6 }}>
              {checkingUpdate ? 'Recherche…' : 'Rechercher des mises à jour'}
            </span>
          </button>
        </section>

        <section style={{ marginBottom: 20 }}>
          <div className="knit-label" style={{ marginBottom: 8 }}>
            Réseau
          </div>
          <label
            className="knit-label"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: 0 }}
          >
            <input
              type="checkbox"
              className="knit-checkbox"
              checked={lanOnly}
              onChange={(e) => void handleLanOnly(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            <span>Mode réseau local strict / air-gapped (sans relays WAN)</span>
          </label>
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--knit-text-muted)' }}>
            Coffre : {vaultStore.vaultPath || '—'}
            <br />
            Pairs connectés : {peers.length}
            {peers.length > 0 && (
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                {peers.map((p) => (
                  <li key={p.peer_id}>
                    {p.display_name} ({p.initials})
                    {p.latency_ms != null ? ` — ${p.latency_ms} ms` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

    </div>
  );
};
