import React from 'react';
import { useNetworkSession } from '../../hooks/useNetworkSession';
import { contextMenu } from '../../stores/contextMenuStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { ProfileModal } from '../Profile/ProfileModal';
import { NetworkInvitePanel } from './NetworkInvitePanel';
import { NetworkPeersList } from './NetworkPeersList';

interface NetworkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NetworkModal: React.FC<NetworkModalProps> = ({ isOpen, onClose }) => {
  const {
    invitationInput,
    setInvitationInput,
    isConnecting,
    isProfileOpen,
    openProfile,
    closeProfile,
    localId,
    myCode,
    pinCode,
    peers,
    lanPeers,
    isNetworkActive,
    avatarDataUrl,
    currentProfile,
    peerAvatarDataUrls,
    isRefreshingPin,
    handleCopyCode,
    handleCopyPin,
    handleRefreshPin,
    handleConnect,
  } = useNetworkSession();

  if (!isOpen) return null;

  const showNetworkContext = (e: React.MouseEvent) => {
    e.preventDefault();
    contextMenu.show(e, [
      {
        id: 'copy-ticket',
        label: 'Copier le code d’invitation',
        icon: 'copy',
        disabled: !myCode,
        onClick: () => void handleCopyCode(),
      },
      {
        id: 'copy-pin',
        label: 'Copier le PIN LAN',
        icon: 'copy',
        disabled: !pinCode,
        onClick: () => void handleCopyPin(),
      },
      {
        id: 'refresh-pin',
        label: 'Rafraîchir le PIN',
        icon: 'sync',
        disabled: isRefreshingPin || !isNetworkActive,
        onClick: () => void handleRefreshPin(),
      },
      {
        id: 'close',
        label: 'Fermer',
        icon: 'x',
        onClick: onClose,
      },
    ]);
  };

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
        zIndex: 2000,
        animation: 'fadeIn 120ms ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 520,
          maxHeight: '85vh',
          backgroundColor: 'var(--knit-surface)',
          border: '1px solid var(--knit-border)',
          borderRadius: 'var(--knit-radius-lg)',
          boxShadow: 'var(--knit-shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
        onContextMenu={showNetworkContext}
      >
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
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: isNetworkActive ? '#10B981' : 'var(--knit-text-muted)',
                boxShadow: isNetworkActive ? '0 0 8px #10B981' : 'none',
              }}
            />
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--knit-text)' }}>
              Réseau P2P & Collaborateurs
            </h3>
          </div>
          <button
            onClick={onClose}
            className="knit-btn"
            style={{ padding: 4, borderRadius: 'var(--knit-radius-xs)', color: 'var(--knit-text-muted)' }}
          >
            <DuotoneIcon name="x" size={16} />
          </button>
        </div>

        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {localId && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                backgroundColor: 'var(--knit-bg)',
                borderRadius: 'var(--knit-radius-md)',
                border: '1px solid var(--knit-border)',
              }}
            >
              {avatarDataUrl ? (
                <img
                  src={avatarDataUrl}
                  alt={localId.display_name}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '1.5px solid var(--knit-primary)',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    backgroundColor: localId.color_hex,
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    flexShrink: 0,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                  }}
                >
                  {localId.initials}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--knit-text)' }}>
                    {currentProfile?.display_name || localId.display_name}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--knit-text-muted)' }}>(Vous)</span>
                  {currentProfile?.role && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        backgroundColor: 'var(--knit-surface)',
                        borderRadius: 'var(--knit-radius-xs)',
                        border: '1px solid var(--knit-border)',
                        color: 'var(--knit-text-secondary)',
                      }}
                    >
                      {currentProfile.role}
                    </span>
                  )}
                  {currentProfile && !currentProfile.share_email_p2p && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        color: '#10B981',
                        borderRadius: 'var(--knit-radius-xs)',
                        fontWeight: 600,
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                      }}
                      data-tooltip="Votre email n'est pas diffusé sur le réseau P2P"
                    >
                      <DuotoneIcon name="shield" size={11} />
                      <span>Zéro-Fuite</span>
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--knit-text-muted)', marginTop: 2 }}>
                  {currentProfile?.status_message || 'En rédaction'}
                  {currentProfile?.email && currentProfile.share_email_p2p && (
                    <span style={{ marginLeft: 8 }}>• {currentProfile.email}</span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontFamily: 'var(--knit-font-mono)',
                    color: 'var(--knit-text-secondary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginTop: 2,
                  }}
                  data-tooltip={localId.peer_id}
                >
                  Clé: {localId.peer_id.slice(0, 16)}...{localId.peer_id.slice(-8)}
                </div>
              </div>

              <button
                type="button"
                className="knit-btn"
                onClick={openProfile}
                style={{ fontSize: 11, padding: '3px 8px', gap: 4, flexShrink: 0 }}
              >
                <DuotoneIcon name="user" size={12} />
                <span>Profil</span>
              </button>
            </div>
          )}

          <NetworkInvitePanel
            myCode={myCode}
            pinCode={pinCode}
            invitationInput={invitationInput}
            setInvitationInput={setInvitationInput}
            isConnecting={isConnecting}
            isRefreshingPin={isRefreshingPin}
            lanPeers={lanPeers}
            peers={peers}
            handleCopyCode={() => void handleCopyCode()}
            handleCopyPin={() => void handleCopyPin()}
            handleRefreshPin={() => void handleRefreshPin()}
            handleConnect={(code) => void handleConnect(code)}
          />

          <NetworkPeersList peers={peers} peerAvatarDataUrls={peerAvatarDataUrls} />
        </div>
      </div>

      <ProfileModal isOpen={isProfileOpen} onClose={closeProfile} />
    </div>
  );
};
