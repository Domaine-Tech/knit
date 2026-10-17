import React, { useState, useEffect, useRef } from 'react';
import { networkStore, COLLABORATIVE_PALETTE } from '../../stores/networkStore';
import type { UserProfile } from '../../stores/networkStore';
import { vaultStore } from '../../stores/vaultStore';
import { toast } from '../../stores/toastStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const [profile, setProfile] = useState<UserProfile | null>(() => {
    return networkStore.currentProfile ? JSON.parse(JSON.stringify(networkStore.currentProfile)) : null;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingGit, setIsApplyingGit] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    return networkStore.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      const activeVault = vaultStore.vaultPath;
      if (activeVault && !networkStore.currentProfile) {
        networkStore.loadProfile(activeVault).then((p) => {
          setProfile(JSON.parse(JSON.stringify(p)));
        }).catch((e) => console.error(e));
      } else if (networkStore.currentProfile) {
        queueMicrotask(() => {
          setProfile(JSON.parse(JSON.stringify(networkStore.currentProfile)));
        });
      }
    }
  }, [isOpen]);

  if (!isOpen || !profile) return null;

  const activeVault = vaultStore.vaultPath || '';

  const handleChange = (field: keyof UserProfile, value: string | boolean) => {
    setProfile((prev) => {
      if (!prev) return null;
      const updated = { ...prev, [field]: value };
      // Mise à jour automatique de display_name si l'utilisateur saisit nom/prénom
      if (field === 'first_name' || field === 'last_name') {
        const fn = field === 'first_name' ? (value as string) : prev.first_name;
        const ln = field === 'last_name' ? (value as string) : prev.last_name;
        if (fn || ln) {
          updated.display_name = `${fn} ${ln}`.trim();
        }
      }
      return updated;
    });
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner un fichier image valide (PNG ou JPEG)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.warning('Attention: taille conseillée < 2 Mo pour la synchronisation P2P rapide');
    }

    try {
      const avatarInfo = await networkStore.uploadAvatar(activeVault, file);
      setProfile((prev) => (prev ? { ...prev, avatar: avatarInfo } : null));
    } catch {
      // toast déjà géré dans le store
    }
  };

  const handleResetAvatar = async () => {
    try {
      const avatarInfo = await networkStore.resetAvatar(activeVault);
      setProfile((prev) => (prev ? { ...prev, avatar: avatarInfo } : null));
    } catch {
      // toast déjà géré
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      await networkStore.saveProfile(activeVault, profile);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncGit = async () => {
    if (!activeVault) {
      toast.warning('Ouvrez un coffre-fort pour configurer Git');
      return;
    }
    setIsApplyingGit(true);
    try {
      await networkStore.applyProfileToGit(activeVault);
    } finally {
      setIsApplyingGit(false);
    }
  };

  const colorIndex = networkStore.localIdentity?.color_index ?? 0;
  const colorHex = COLLABORATIVE_PALETTE[colorIndex % COLLABORATIVE_PALETTE.length];
  const initials = `${(profile.first_name[0] || 'M')}${(profile.last_name[0] || '')}`.toUpperCase();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2100,
        animation: 'fadeIn 120ms ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 540,
          maxHeight: '88vh',
          backgroundColor: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-lg)',
          boxShadow: 'var(--knit-shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <DuotoneIcon name="user" size={18} style={{ color: 'var(--knit-primary)' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--knit-text)' }}>
                Profil Collaborateur & Identité
              </h3>
              <div style={{ fontSize: 11, color: 'var(--knit-text-muted)' }}>
                Stocké localement dans <code style={{ fontFamily: 'var(--knit-font-mono)' }}>.knit/identity/profile.json</code>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="knit-btn"
            style={{ padding: 4, borderRadius: 'var(--knit-radius-xs)', color: 'var(--knit-text-muted)' }}
          >
            <DuotoneIcon name="x" size={16} />
          </button>
        </div>

        {/* Corps du formulaire */}
        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Section Avatar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              padding: '14px 16px',
              backgroundColor: 'var(--knit-bg)',
              borderRadius: 'var(--knit-radius-md)',
              border: '1px solid var(--knit-border)',
            }}
          >
            {/* Visualisation de l'avatar */}
            <div style={{ position: 'relative' }}>
              {profile.avatar.type === 'custom' && networkStore.avatarDataUrl ? (
                <img
                  src={networkStore.avatarDataUrl}
                  alt={profile.display_name}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid var(--knit-primary)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    backgroundColor: colorHex,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  {initials || 'MO'}
                </div>
              )}
            </div>

            {/* Actions d'avatar */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--knit-text)' }}>
                Photo de profil P2P
              </div>
              <div style={{ fontSize: 11, color: 'var(--knit-text-muted)' }}>
                {profile.avatar.type === 'custom'
                  ? `Photo personnalisée (BLAKE3: ${profile.avatar.blake3_hash?.slice(0, 10)}...)`
                  : `Palette déterministe collaborative (Teinte #${colorIndex})`}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  style={{ display: 'none' }}
                  onChange={handleAvatarFileChange}
                />
                <button
                  type="button"
                  className="knit-btn"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ fontSize: 11, padding: '3px 10px', gap: 5 }}
                >
                  <DuotoneIcon name="upload" size={13} />
                  <span>Changer la photo...</span>
                </button>
                {profile.avatar.type === 'custom' && (
                  <button
                    type="button"
                    className="knit-btn"
                    onClick={handleResetAvatar}
                    style={{ fontSize: 11, padding: '3px 10px', color: 'var(--knit-text-muted)' }}
                  >
                    <span>Réinitialiser</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Formulaire état civil / affichage */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="knit-label" style={{ marginBottom: 4, display: 'block', fontSize: 11, fontWeight: 600 }}>
                Prénom
              </label>
              <input
                type="text"
                className="knit-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="Ex: Alice"
                value={profile.first_name}
                onChange={(e) => handleChange('first_name', e.target.value)}
              />
            </div>
            <div>
              <label className="knit-label" style={{ marginBottom: 4, display: 'block', fontSize: 11, fontWeight: 600 }}>
                Nom
              </label>
              <input
                type="text"
                className="knit-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="Ex: Durand"
                value={profile.last_name}
                onChange={(e) => handleChange('last_name', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="knit-label" style={{ marginBottom: 4, display: 'block', fontSize: 11, fontWeight: 600 }}>
              Nom d'affichage (visible par les pairs)
            </label>
            <input
              type="text"
              className="knit-input"
              style={{ width: '100%', boxSizing: 'border-box' }}
              placeholder="Ex: Alice D."
              value={profile.display_name}
              onChange={(e) => handleChange('display_name', e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="knit-label" style={{ marginBottom: 4, display: 'block', fontSize: 11, fontWeight: 600 }}>
                Rôle
              </label>
              <input
                type="text"
                className="knit-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="Ex: Auteur, Réviseur, Chercheur"
                value={profile.role}
                onChange={(e) => handleChange('role', e.target.value)}
              />
            </div>
            <div>
              <label className="knit-label" style={{ marginBottom: 4, display: 'block', fontSize: 11, fontWeight: 600 }}>
                Message de statut
              </label>
              <input
                type="text"
                className="knit-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="Ex: En rédaction"
                value={profile.status_message}
                onChange={(e) => handleChange('status_message', e.target.value)}
              />
            </div>
          </div>

          {/* Section Email et Mode Confidentialité Zéro-Fuite */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--knit-bg)',
              borderRadius: 'var(--knit-radius-md)',
              border: '1px solid var(--knit-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div>
              <label className="knit-label" style={{ marginBottom: 4, display: 'block', fontSize: 11, fontWeight: 600 }}>
                Adresse e-mail
              </label>
              <input
                type="email"
                className="knit-input"
                style={{ width: '100%', boxSizing: 'border-box' }}
                placeholder="alice@exemple.fr"
                value={profile.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            {/* Privacy Toggle Switch */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--knit-text)' }}>
                  Mode Confidentialité P2P (Zéro-Fuite)
                </div>
                <div style={{ fontSize: 11, color: 'var(--knit-text-muted)', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                  <DuotoneIcon name={profile.share_email_p2p ? 'warning' : 'shield'} size={12} />
                  <span>
                    {profile.share_email_p2p
                      ? 'Votre e-mail est transmis aux collaborateurs sur le réseau'
                      : 'Votre adresse e-mail reste strictement locale et privée'}
                  </span>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!profile.share_email_p2p}
                  onChange={(e) => handleChange('share_email_p2p', !e.target.checked)}
                />
                <span style={{ fontSize: 11, fontWeight: 600, color: !profile.share_email_p2p ? '#10B981' : 'var(--knit-text-secondary)' }}>
                  {!profile.share_email_p2p ? 'Actif' : 'Désactivé'}
                </span>
              </label>
            </div>
          </div>

          {/* Intégration Git Locale */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              backgroundColor: 'var(--knit-surface)',
              borderRadius: 'var(--knit-radius-md)',
              border: '1px solid var(--knit-border)',
            }}
          >
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--knit-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <DuotoneIcon name="vault" size={14} />
                <span>Auto-configuration Git du coffre</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--knit-text-muted)', marginTop: 2 }}>
                Synchronise automatiquement <code style={{ fontFamily: 'var(--knit-font-mono)' }}>git config user.name</code> et <code style={{ fontFamily: 'var(--knit-font-mono)' }}>user.email</code>
              </div>
            </div>
            <button
              type="button"
              className="knit-btn"
              onClick={handleSyncGit}
              disabled={isApplyingGit || !profile.email}
              style={{
                fontSize: 11,
                padding: '4px 12px',
                fontWeight: 600,
                opacity: !profile.email ? 0.6 : 1,
              }}
            >
              <span>{isApplyingGit ? 'Synchronisation...' : 'Appliquer à Git'}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            backgroundColor: 'var(--knit-surface)',
          }}
        >
          <button
            type="button"
            className="knit-btn"
            onClick={onClose}
            disabled={isSaving}
            style={{ padding: '6px 14px', fontSize: 12 }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="knit-btn knit-btn-primary"
            style={{
              padding: '6px 18px',
              fontSize: 12,
              fontWeight: 600,
              backgroundColor: 'var(--knit-primary)',
              color: '#FFFFFF',
              borderRadius: 'var(--knit-radius-sm)',
              cursor: isSaving ? 'not-allowed' : 'pointer',
            }}
          >
            {isSaving ? 'Enregistrement...' : 'Enregistrer le profil'}
          </button>
        </div>
      </div>
    </div>
  );
};
