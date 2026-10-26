import React, { useState } from 'react';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { networkStore } from '../../stores/networkStore';
import { vaultStore } from '../../stores/vaultStore';
import { isUnnamedDisplay } from '../../utils';
import type { UserProfile } from '../../types';

/**
 * Demande le nom de la personne une fois, tant que le profil est encore le défaut.
 * Ce nom est celui que les autres pairs voient.
 */
export const ProfileNameGate: React.FC = () => {
  const existing = networkStore.currentProfile;
  const named = existing != null && !isUnnamedDisplay(existing.display_name);
  const [firstName, setFirstName] = useState(named ? existing.first_name : '');
  const [lastName, setLastName] = useState(named ? existing.last_name : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const first = firstName.trim();
    const last = lastName.trim();
    const displayName = `${first} ${last}`.trim();
    if (!first || !last || isUnnamedDisplay(displayName)) {
      setError('Indiquez votre prénom et votre nom.');
      return;
    }
    const vaultPath = vaultStore.vaultPath ?? '';
    const base: UserProfile = networkStore.currentProfile ?? {
      first_name: first,
      last_name: last,
      display_name: displayName,
      email: '',
      role: 'Collaborateur',
      status_message: 'En rédaction',
      share_email_p2p: false,
      avatar: { type: 'initials' },
      created_at_sec: Math.floor(Date.now() / 1000),
      updated_at_sec: Math.floor(Date.now() / 1000),
    };
    const profile: UserProfile = {
      ...base,
      first_name: first,
      last_name: last,
      display_name: displayName,
      updated_at_sec: Math.floor(Date.now() / 1000),
    };
    setBusy(true);
    setError(null);
    try {
      await networkStore.saveProfile(vaultPath, profile);
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'var(--knit-bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: 'min(420px, 100%)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-md)',
          background: 'var(--knit-surface)',
          padding: '22px 22px 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <DuotoneIcon name="user" size={18} />
          <h2 style={{ margin: 0, fontSize: 16 }}>Qui êtes-vous ?</h2>
        </div>
        <p style={{ fontSize: 13, color: 'var(--knit-text-secondary)', marginTop: 0 }}>
          Ce nom est le vôtre, pas celui du dossier. Les autres personnes le verront à côté de leur curseur.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <label className="knit-label" htmlFor="knit-gate-first">
              Prénom
            </label>
            <input
              id="knit-gate-first"
              className="knit-input"
              value={firstName}
              autoFocus
              onChange={(e) => setFirstName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void save();
              }}
              placeholder="Alice"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label className="knit-label" htmlFor="knit-gate-last">
              Nom
            </label>
            <input
              id="knit-gate-last"
              className="knit-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void save();
              }}
              placeholder="Martin"
              style={{ width: '100%' }}
            />
          </div>
        </div>
        {error && (
          <p style={{ fontSize: 12, color: 'var(--knit-text)', marginTop: 0 }}>{error}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="knit-btn knit-btn-primary"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? 'Enregistrement…' : 'Continuer'}
          </button>
        </div>
      </div>
    </div>
  );
};
