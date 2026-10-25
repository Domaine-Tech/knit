import React, { useEffect, useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { KnitSelect } from '../Form/KnitSelect';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultConfigStore } from '../../stores/vaultConfigStore';
import { vaultStore } from '../../stores/vaultStore';
import { toast } from '../../stores/toastStore';
import { applyHue, applyTheme } from '../../theme/theme';
import {
  parseThemePreference,
  parseTrashMode,
  type IconName,
  type ThemeMode,
  type ThemePreference,
  type TrashMode,
} from '../../types';
import { APP_VERSION, getAppVersion } from '../../utils/version';
import { isTauriEnvironment } from '../../utils/env';
import { formatUpdateError } from '../../utils/updaterLogic';
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

type SettingsTab = 'appearance' | 'files' | 'updates' | 'network';

const TABS: { id: SettingsTab; label: string; icon: IconName }[] = [
  { id: 'appearance', label: 'Apparence', icon: 'palette' },
  { id: 'files', label: 'Fichiers', icon: 'trash' },
  { id: 'updates', label: 'Mises à jour', icon: 'download' },
  { id: 'network', label: 'Réseau', icon: 'share' },
];

const THEME_OPTIONS: { id: ThemePreference; label: string; icon: IconName }[] = [
  { id: 'light', label: 'Clair', icon: 'sun' },
  { id: 'dark', label: 'Sombre', icon: 'moon' },
  { id: 'auto', label: 'Auto', icon: 'sync' },
];

const settingsCardStyle: React.CSSProperties = {
  padding: '14px 14px 16px',
  borderRadius: 'var(--knit-radius-md)',
  border: '1px solid var(--knit-border)',
  background: 'var(--knit-bg)',
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  theme,
  hue,
  onThemeChange,
  onHueChange,
}) => {
  const [tab, setTab] = useState<SettingsTab>('appearance');
  const [themePref, setThemePref] = useState<ThemePreference>('auto');
  const [trashMode, setTrashMode] = useState<TrashMode>('os');
  const [lanOnly, setLanOnly] = useState(false);
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
    setTab('appearance');
  }, [isOpen]);

  useEffect(() => {
    return updateStore.subscribe(() => setUpdateSnap(updateStore.getSnapshot()));
  }, []);

  const handleCheckUpdates = async () => {
    await updateStore.check({ force: true, silent: false });
    const snap = updateStore.getSnapshot();
    if (snap.currentVersion) setAppVersion(snap.currentVersion);
  };

  const lastCheckedLabel = updateSnap.lastCheckedAt
    ? new Date(updateSnap.lastCheckedAt).toLocaleString()
    : 'Jamais';
  const checkingUpdate = updateSnap.status === 'checking';
  const tauri = isTauriEnvironment();
  const updateErrorFr = formatUpdateError(updateSnap.error);

  if (!isOpen) return null;

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
      aria-label="Paramètres"
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
          width: 'min(560px, 94vw)',
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-md)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px 12px',
            borderBottom: '1px solid var(--knit-border)',
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <DuotoneIcon name="slider" size={16} />
            Paramètres
          </h2>
          <button type="button" className="knit-btn" onClick={onClose} data-tooltip="Fermer">
            <DuotoneIcon name="close" size={14} />
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Sections des paramètres"
          style={{
            display: 'flex',
            gap: 4,
            padding: '10px 12px',
            borderBottom: '1px solid var(--knit-border)',
            flexShrink: 0,
            overflowX: 'auto',
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                style={{
                  flex: '1 1 0',
                  minWidth: 0,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: active ? 600 : 500,
                  fontFamily: 'inherit',
                  padding: '0 8px',
                  borderRadius: 'var(--knit-radius-sm)',
                  border: active
                    ? '1px solid var(--knit-primary)'
                    : '1px solid transparent',
                  background: active ? 'var(--knit-primary-alpha)' : 'transparent',
                  color: active ? 'var(--knit-primary)' : 'var(--knit-text-muted)',
                  cursor: 'pointer',
                  outline: 'none',
                  boxShadow: active ? 'inset 0 -2px 0 var(--knit-primary)' : 'none',
                  transition:
                    'background var(--knit-transition-fast), color var(--knit-transition-fast), border-color var(--knit-transition-fast)',
                }}
              >
                <DuotoneIcon name={t.icon} size={14} style={{ color: 'currentColor' }} />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>

        <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
          {tab === 'appearance' && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={settingsCardStyle}>
                <div
                  className="knit-label"
                  style={{ marginBottom: 6, fontSize: 13, fontWeight: 600, color: 'var(--knit-text)' }}
                >
                  Thème
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--knit-text-muted)' }}>
                  Clair, sombre, ou suivre le système (Auto).
                </p>
                <div
                  role="group"
                  aria-label="Préférence de thème"
                  style={{
                    display: 'flex',
                    gap: 4,
                    padding: 4,
                    borderRadius: 'var(--knit-radius-md)',
                    border: '1px solid var(--knit-border)',
                    background: 'var(--knit-surface)',
                  }}
                >
                  {THEME_OPTIONS.map((opt) => {
                    const active = themePref === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => void applyThemePref(opt.id)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          padding: '8px 6px',
                          border: 'none',
                          borderRadius: 'var(--knit-radius-sm)',
                          cursor: 'pointer',
                          fontSize: 12,
                          fontWeight: active ? 600 : 500,
                          background: active ? 'var(--knit-primary-alpha)' : 'transparent',
                          color: active ? 'var(--knit-text)' : 'var(--knit-text-muted)',
                          boxShadow: active ? 'inset 0 0 0 1px var(--knit-primary)' : 'none',
                          transition: 'background var(--knit-transition-fast), color var(--knit-transition-fast)',
                        }}
                      >
                        <DuotoneIcon name={opt.icon} size={14} />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                {themePref === 'auto' ? (
                  <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--knit-text-muted)' }}>
                    Actuellement : {theme === 'dark' ? 'sombre' : 'clair'} (système)
                  </p>
                ) : null}
              </div>

              <div style={settingsCardStyle}>
                <div
                  className="knit-label"
                  style={{
                    marginBottom: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--knit-text)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  Couleur d’accent
                  <span
                    aria-hidden
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      backgroundColor: 'var(--knit-primary)',
                      border: '1px solid var(--knit-border)',
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.12)',
                    }}
                  />
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--knit-text-muted)' }}>
                  Pastille dans l’en-tête pour un accès rapide.
                </p>
                <label
                  className="knit-label"
                  htmlFor="knit-settings-hue"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}
                >
                  Teinte : {hue}°
                </label>
                <input
                  id="knit-settings-hue"
                  type="range"
                  className="knit-input"
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
              </div>
            </section>
          )}

          {tab === 'files' && (
            <section>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--knit-text-muted)' }}>
                Comportement après suppression (corbeille Knit + OS). Annulation via toast ou Ctrl+Z hors éditeur.
              </p>
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
              <div
                style={{
                  marginTop: 16,
                  fontSize: 12,
                  color: 'var(--knit-text-muted)',
                  padding: '10px 12px',
                  borderRadius: 'var(--knit-radius-sm)',
                  border: '1px solid var(--knit-border)',
                  background: 'var(--knit-bg)',
                }}
              >
                Coffre ouvert : {vaultStore.vaultPath || '—'}
              </div>
            </section>
          )}

          {tab === 'updates' && (
            <section>
              <div
                style={{
                  display: 'grid',
                  gap: 6,
                  marginBottom: 14,
                  fontSize: 12,
                  color: 'var(--knit-text-muted)',
                }}
              >
                <div>
                  Version installée :{' '}
                  <strong style={{ color: 'var(--knit-text)', fontWeight: 600 }}>{appVersion}</strong>
                </div>
                <div>Dernière vérification : {lastCheckedLabel}</div>
              </div>

              {updateSnap.error ? (
                <div
                  role="alert"
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'flex-start',
                    marginBottom: 14,
                    padding: '10px 12px',
                    borderRadius: 'var(--knit-radius-sm)',
                    border: '1px solid color-mix(in srgb, var(--knit-danger, #c44) 45%, var(--knit-border))',
                    background: 'color-mix(in srgb, var(--knit-danger, #c44) 12%, transparent)',
                    color: 'var(--knit-text)',
                    fontSize: 12,
                    lineHeight: 1.45,
                  }}
                >
                  <DuotoneIcon
                    name="warning"
                    size={16}
                    style={{ color: 'var(--knit-danger, #c44)', flexShrink: 0, marginTop: 1 }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Vérification impossible</div>
                    <div style={{ color: 'var(--knit-text-secondary)' }}>{updateErrorFr}</div>
                  </div>
                </div>
              ) : null}

              <div style={{ marginBottom: 12 }}>
                <div className="knit-label" style={{ marginBottom: 6, fontSize: 11 }}>
                  Politique
                </div>
                <KnitSelect
                  value={updateSnap.policy}
                  onChange={(v) => updateStore.setPolicy(v as UpdatePolicy)}
                  options={[
                    {
                      value: 'auto',
                      label: 'Automatique (silencieux si inactif ; confirmation si vous travaillez)',
                    },
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
                    ? 'Interroger le manifeste de release'
                    : 'Disponible dans l’application installée'
                }
              >
                <DuotoneIcon name="download" size={14} />
                <span style={{ marginLeft: 6 }}>
                  {checkingUpdate ? 'Recherche…' : 'Rechercher des mises à jour'}
                </span>
              </button>
            </section>
          )}

          {tab === 'network' && (
            <section>
              <p style={{ margin: '0 0 14px', fontSize: 12, color: 'var(--knit-text-muted)' }}>
                Options locales du coffre. Les invitations, tickets et pairs se gèrent dans la modale{' '}
                <strong style={{ fontWeight: 600, color: 'var(--knit-text)' }}>Réseau P2P</strong> de
                l’en-tête.
              </p>
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
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
