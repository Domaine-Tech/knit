import React from 'react';
import type { ConnectedPeerInfo, DiscoveredLanPeer } from '../../types';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { contextMenu } from '../../stores/contextMenuStore';
import { PinQrBlock } from './PinQrBlock';

export interface NetworkInvitePanelProps {
  myCode: string;
  pinCode?: string | null;
  invitationInput: string;
  setInvitationInput: (value: string) => void;
  isConnecting: boolean;
  isRefreshingPin?: boolean;
  lanPeers: DiscoveredLanPeer[];
  peers: ConnectedPeerInfo[];
  handleCopyCode: () => void;
  handleCopyPin?: () => void;
  handleRefreshPin?: () => void;
  handleConnect: (code?: string) => void;
}

export const NetworkInvitePanel: React.FC<NetworkInvitePanelProps> = ({
  myCode,
  pinCode,
  invitationInput,
  setInvitationInput,
  isConnecting,
  isRefreshingPin = false,
  lanPeers,
  peers,
  handleCopyCode,
  handleCopyPin,
  handleRefreshPin,
  handleConnect,
}) => {
  const showInviteContext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    contextMenu.show(e, [
      {
        id: 'copy-ticket',
        label: 'Copier le code d’invitation',
        icon: 'copy',
        disabled: !myCode,
        onClick: () => handleCopyCode(),
      },
      {
        id: 'copy-pin',
        label: 'Copier le PIN LAN',
        icon: 'copy',
        disabled: !pinCode,
        onClick: () => handleCopyPin?.(),
      },
      {
        id: 'refresh-pin',
        label: 'Rafraîchir le PIN',
        icon: 'sync',
        disabled: !handleRefreshPin || isRefreshingPin,
        onClick: () => handleRefreshPin?.(),
      },
    ]);
  };

  return (
    <>
      <div onContextMenu={showInviteContext}>
        <label
          className="knit-label"
          style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
        >
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
        {pinCode && (
          <div style={{ marginTop: 10 }}>
            <PinQrBlock
              pinCode={pinCode}
              isRefreshing={isRefreshingPin}
              onCopyPin={handleCopyPin}
              onRefreshPin={handleRefreshPin}
            />
          </div>
        )}
        <div style={{ fontSize: 11, color: 'var(--knit-text-muted)', marginTop: 4 }}>
          Partagez le PIN ou le ticket pour qu’une autre personne connecte ce même coffre
          depuis son propre dossier. Un coffre différent est refusé.
        </div>
      </div>

      <div>
        <label
          className="knit-label"
          style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
        >
          <DuotoneIcon name="link" size={13} />
          <span>Connecter un pair de ce coffre</span>
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="knit://join/... ou PIN 6 chiffres"
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

      {lanPeers.length > 0 && (
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
            <DuotoneIcon name="sync" size={13} />
            <span>Pairs découverts sur le réseau local (mDNS)</span>
            <span style={{ fontSize: 11, color: 'var(--knit-text-muted)', fontWeight: 400 }}>
              ({lanPeers.length})
            </span>
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
    </>
  );
};
