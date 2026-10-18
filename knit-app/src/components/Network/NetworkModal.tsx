import React from 'react';
import { useNetworkSession } from '../../hooks/useNetworkSession';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { ProfileModal } from '../Profile/ProfileModal';

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
    peers,
    lanPeers,
    isNetworkActive,
    avatarDataUrl,
    currentProfile,
    peerAvatarDataUrls,
    handleCopyCode,
    handleConnect,
  } = useNetworkSession();

  if (!isOpen) return null;

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
      >
        {/* Header de la Modal */}
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

        {/* Corps de la Modal */}
        <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Mon Identité */}
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
                      }}
                      title="Votre email n'est pas diffusé sur le réseau P2P"
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
                  title={localId.peer_id}
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

          {/* Partager mon code d'invitation */}
          <div>
            <label className="knit-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
              <DuotoneIcon name="share" size={13} />
              <span>Mon code d'invitation (WAN & LAN)</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                readOnly
                value={myCode}
                className="knit-input"
                style={{ flex: 1, fontFamily: 'var(--knit-font-mono)', fontSize: 11 }}
              />
              <button
                onClick={handleCopyCode}
                className="knit-btn"
                style={{
                  padding: '4px 12px',
                  backgroundColor: 'var(--knit-surface)',
                  border: '1px solid var(--knit-border)',
                  borderRadius: 'var(--knit-radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <DuotoneIcon name="copy" size={13} />
                <span>Copier</span>
              </button>
            </div>
            <div style={{ fontSize: 11, color: 'var(--knit-text-muted)', marginTop: 4 }}>
              Partagez ce code pour permettre à un collaborateur de rejoindre vos documents via Iroh (QUIC direct ou relay aveugle).
            </div>
          </div>

          {/* Rejoindre un pair */}
          <div>
            <label className="knit-label" style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}>
              <DuotoneIcon name="link" size={13} />
              <span>Se connecter à un collaborateur</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Coller le code knit://join/..."
                value={invitationInput}
                onChange={(e) => setInvitationInput(e.target.value)}
                className="knit-input"
                style={{ flex: 1, fontFamily: 'var(--knit-font-mono)', fontSize: 11 }}
              />
              <button
                onClick={() => handleConnect()}
                disabled={isConnecting || !invitationInput.trim()}
                className="knit-btn"
                style={{
                  padding: '4px 14px',
                  backgroundColor: 'var(--knit-primary)',
                  color: '#FFFFFF',
                  borderRadius: 'var(--knit-radius-sm)',
                  fontWeight: 600,
                  fontSize: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  opacity: isConnecting || !invitationInput.trim() ? 0.6 : 1,
                  cursor: isConnecting || !invitationInput.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                <DuotoneIcon name="arrow-right" size={13} />
                <span>{isConnecting ? 'Connexion...' : 'Connecter'}</span>
              </button>
            </div>
          </div>

          {/* Découverte LAN (mDNS) */}
          {lanPeers.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--knit-text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <DuotoneIcon name="sync" size={13} />
                <span>Pairs découverts sur le réseau local (mDNS)</span>
                <span style={{ fontSize: 11, color: 'var(--knit-text-muted)', fontWeight: 400 }}>({lanPeers.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {lanPeers.map((lp) => {
                  const isConnected = peers.some((p) => p.peer_id === lp.peer_id);
                  return (
                    <div
                      key={lp.peer_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: 'var(--knit-bg)',
                        borderRadius: 'var(--knit-radius-sm)',
                        border: '1px solid var(--knit-border)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--knit-text)' }}>
                          {lp.display_name} {lp.vault_name ? `• ${lp.vault_name}` : ''}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--knit-text-muted)' }}>
                          {lp.addresses[0]}:{lp.port} • mDNS Zéro-Conf
                        </div>
                      </div>
                      {isConnected ? (
                        <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>Connecté</span>
                      ) : lp.invitation_code ? (
                        <button
                          onClick={() => handleConnect(lp.invitation_code)}
                          disabled={isConnecting}
                          style={{
                            padding: '3px 10px',
                            backgroundColor: 'var(--knit-primary)',
                            color: '#FFFFFF',
                            borderRadius: 'var(--knit-radius-xs)',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Connecter
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pairs actuellement connectés */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--knit-text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <DuotoneIcon name="user" size={13} />
              <span>Collaborateurs connectés en direct</span>
              <span style={{ fontSize: 11, color: 'var(--knit-text-muted)', fontWeight: 400 }}>({peers.length})</span>
            </div>

            {peers.length === 0 ? (
              <div
                style={{
                  padding: '24px 12px',
                  textAlign: 'center',
                  fontSize: 12,
                  color: 'var(--knit-text-muted)',
                  backgroundColor: 'var(--knit-bg)',
                  borderRadius: 'var(--knit-radius-sm)',
                  border: '1px dashed var(--knit-border)',
                }}
              >
                Aucun collaborateur connecté pour l'instant. Invitez un pair avec votre code ci-dessus !
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {peers.map((peer) => (
                  <div
                    key={peer.peer_id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      backgroundColor: 'var(--knit-bg)',
                      borderRadius: 'var(--knit-radius-sm)',
                      border: '1px solid var(--knit-border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      {peerAvatarDataUrls.get(peer.peer_id) ? (
                        <img
                          src={peerAvatarDataUrls.get(peer.peer_id)}
                          alt={peer.display_name}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            border: '1px solid var(--knit-border)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: peer.color_hex,
                            color: '#FFFFFF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            flexShrink: 0,
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                          }}
                        >
                          {peer.initials}
                        </div>
                      )}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--knit-text)' }}>
                            {peer.display_name}
                          </span>
                          {peer.role && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: '1px 5px',
                                backgroundColor: 'var(--knit-surface)',
                                borderRadius: 'var(--knit-radius-xs)',
                                border: '1px solid var(--knit-border)',
                                color: 'var(--knit-text-secondary)',
                              }}
                            >
                              {peer.role}
                            </span>
                          )}
                          {!peer.email && (
                            <span
                              style={{
                                fontSize: 9,
                                padding: '1px 5px',
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                color: '#10B981',
                                borderRadius: 'var(--knit-radius-xs)',
                                fontWeight: 600,
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <DuotoneIcon name="shield" size={10} />
                              <span>Zéro-Fuite</span>
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--knit-text-muted)', marginTop: 1 }}>
                          {peer.status_message ? (
                            <span>{peer.status_message}</span>
                          ) : (
                            <span style={{ fontFamily: 'var(--knit-font-mono)', fontSize: 10 }}>
                              {peer.peer_id.slice(0, 12)}...
                            </span>
                          )}
                          {peer.email && (
                            <span style={{ marginLeft: 6, fontSize: 10 }}>• {peer.email}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      {peer.latency_ms !== undefined && peer.latency_ms !== null && (
                        <span
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            backgroundColor: 'var(--knit-surface)',
                            border: '1px solid var(--knit-border)',
                            borderRadius: 'var(--knit-radius-xs)',
                            color: peer.latency_ms < 50 ? '#10B981' : 'var(--knit-text-secondary)',
                            fontWeight: 600,
                          }}
                        >
                          {peer.latency_ms} ms
                        </span>
                      )}
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                        }}
                        title="Connecté via QUIC Iroh"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileModal isOpen={isProfileOpen} onClose={closeProfile} />
    </div>
  );
};
