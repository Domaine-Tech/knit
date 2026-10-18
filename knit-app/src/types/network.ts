/**
 * Types relatifs au réseau P2P, identités des collaborateurs et profils utilisateur
 */

export interface PeerIdentity {
  peer_id: string;
  display_name: string;
  color_index: number;
  color_hex: string;
  initials: string;
}

export interface AvatarInfo {
  type: 'custom' | 'initials';
  blake3_hash?: string;
  mime_type?: string;
}

export interface PeerProfileSummary {
  first_name: string;
  last_name: string;
  display_name: string;
  email?: string;
  role: string;
  status_message: string;
  avatar: AvatarInfo;
}

export interface UserProfile {
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  role: string;
  status_message: string;
  share_email_p2p: boolean;
  avatar: AvatarInfo;
  created_at_sec: number;
  updated_at_sec: number;
}

export interface ConnectedPeerInfo {
  peer_id: string;
  display_name: string;
  vault_name?: string;
  color_index: number;
  color_hex: string;
  initials: string;
  latency_ms?: number;
  connected_at_sec: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
  status_message?: string;
  avatar?: AvatarInfo;
}

export interface DiscoveredLanPeer {
  peer_id: string;
  display_name: string;
  vault_name?: string;
  addresses: string[];
  port: number;
  invitation_code?: string;
  last_seen_sec: number;
}
