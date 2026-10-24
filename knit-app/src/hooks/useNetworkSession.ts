import { useState, useEffect } from 'react';
import type {
  PeerIdentity,
  ConnectedPeerInfo,
  DiscoveredLanPeer,
  UserProfile,
} from '../types';
import { networkStore } from '../stores/networkStore';
import { toast } from '../stores/toastStore';
import { copyTextWithToast } from '../utils';

/**
 * Logique métier de la session réseau P2P : invitation, connexion, abonnement store.
 * NetworkModal.tsx reste une UI pure consommant le retour de ce hook.
 */
export function useNetworkSession() {
  const [invitationInput, setInvitationInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isRefreshingPin, setIsRefreshingPin] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => {
    return networkStore.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  const localId: PeerIdentity | null = networkStore.localIdentity;
  const myCode: string = networkStore.invitationCode || '';
  const pinCode: string | null = networkStore.pinCode;
  const peers: ConnectedPeerInfo[] = networkStore.connectedPeers;
  const lanPeers: DiscoveredLanPeer[] = networkStore.discoveredLanPeers;
  const isNetworkActive: boolean = networkStore.isNetworkActive;
  const avatarDataUrl: string | null = networkStore.avatarDataUrl;
  const currentProfile: UserProfile | null = networkStore.currentProfile;
  const peerAvatarDataUrls: Map<string, string> = networkStore.peerAvatarDataUrls;

  const handleCopyCode = async (): Promise<void> => {
    if (!myCode) return;
    await copyTextWithToast(myCode, "Code d'invitation copié dans le presse-papier !");
  };

  const handleCopyPin = async (): Promise<void> => {
    if (!pinCode) return;
    await copyTextWithToast(pinCode, 'PIN LAN copié dans le presse-papier !');
  };

  const handleRefreshPin = async (): Promise<void> => {
    setIsRefreshingPin(true);
    try {
      await networkStore.refreshPinCode();
      toast.success('PIN LAN régénéré');
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshingPin(false);
    }
  };

  const handleConnect = async (codeToUse?: string): Promise<void> => {
    const code = (codeToUse || invitationInput).trim();
    if (!code) {
      toast.warning("Veuillez saisir un code d'invitation knit://join/...");
      return;
    }

    setIsConnecting(true);
    try {
      await networkStore.connectPeer(code);
      setInvitationInput('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsConnecting(false);
    }
  };

  const openProfile = (): void => {
    setIsProfileOpen(true);
  };

  const closeProfile = (): void => {
    setIsProfileOpen(false);
  };

  return {
    invitationInput,
    setInvitationInput,
    isConnecting,
    isRefreshingPin,
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

    handleCopyCode,
    handleCopyPin,
    handleRefreshPin,
    handleConnect,
  };
}
