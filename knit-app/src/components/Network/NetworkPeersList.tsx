import React from 'react';
import type { ConnectedPeerInfo } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';

export interface NetworkPeersListProps {
  peers: ConnectedPeerInfo[];
  peerAvatarDataUrls: Map<string, string>;
}

export const NetworkPeersList: React.FC<NetworkPeersListProps> = ({
  peers,
  peerAvatarDataUrls,
}) => (
  <div>
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--knit-text)',
        marginBottom: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <DuotoneIcon name="user" size={13} />
      <span>Collaborateurs connectés en direct</span>
      <span style={{ fontSize: 11, color: 'var(--knit-text-muted)', fontWeight: 400 }}>
        ({peers.length})
      </span>
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
                data-tooltip="Connecté via QUIC Iroh"
              />
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);
