/**
 * Types relatifs au réseau P2P, identités des collaborateurs et profils utilisateur.
 * Les helpers purs (`isUnnamedDisplay`, `DEMO_LAN_PIN`) vivent dans `utils/profileUtils`.
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

export interface ReplicationReport {
  copied: number;
  skipped: number;
  divergent: string[];
  vault_name: string;
  vault_id: string;
}

/** Événement Tauri `p2p_replication_progress` pendant la copie d'un coffre. */
export interface ReplicationProgress {
  done: number;
  total: number;
  rel_path: string;
}

export interface DiscoveredLanPeer {
  peer_id: string;
  display_name: string;
  vault_name?: string;
  addresses: string[];
  port: number;
  invitation_code?: string;
  /** PIN LAN éphémère à 6 chiffres (B-017b). */
  pin_code?: string;
  last_seen_sec: number;
}
