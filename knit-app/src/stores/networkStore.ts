import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { toast } from './toastStore';
import { isTauriEnvironment } from '../utils/env';
import { uint8ArrayToBase64, base64ToUint8Array } from '../utils/encodingUtils';

import type {
  PeerIdentity,
  AvatarInfo,
  UserProfile,
  ConnectedPeerInfo,
  DiscoveredLanPeer,
} from '../types';

export type {
  PeerIdentity,
  AvatarInfo,
  UserProfile,
  ConnectedPeerInfo,
  DiscoveredLanPeer,
};

export const COLLABORATIVE_PALETTE = [
  '#3B82F6', // 0: Bleu Ardoise
  '#10B981', // 1: Émeraude Sauge
  '#D97706', // 2: Ambre Doré
  '#E11D48', // 3: Terre Cuite
  '#0891B2', // 4: Cyan Pétrole
  '#6366F1', // 5: Indigo Feutré
  '#DB2777', // 6: Rose Poudré
  '#C2410C', // 7: Cuivre Foncé
  '#0D9488', // 8: Vert Menthe
  '#9333EA', // 9: Lavande Douce
];

type NetworkListener = () => void;

class NetworkStore {
  public currentProfile: UserProfile | null = null;
  public avatarDataUrl: string | null = null;
  public peerAvatarDataUrls: Map<string, string> = new Map();
  public isNetworkActive: boolean = false;
  public localIdentity: PeerIdentity | null = null;
  public invitationCode: string | null = null;
  public connectedPeers: ConnectedPeerInfo[] = [];
  public discoveredLanPeers: DiscoveredLanPeer[] = [];
  public activeFileByPeer: Map<string, string> = new Map();

  private listeners: Set<NetworkListener> = new Set();
  private unlistenFns: UnlistenFn[] = [];
  private onRemoteYjsUpdateListeners: Set<(docId: string, update: Uint8Array, fromPeer: string) => void> = new Set();
  private onRemoteAwarenessListeners: Set<(docId: string, awareness: Uint8Array, fromPeer: string) => void> = new Set();
  private onRemoteSyncRequestListeners: Set<(docId: string, stateVector: Uint8Array, fromPeer: string) => void> = new Set();
  private onRemoteSyncResponseListeners: Set<(docId: string, update: Uint8Array, fromPeer: string) => void> = new Set();

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public onRemoteYjsUpdate(listener: (docId: string, update: Uint8Array, fromPeer: string) => void): () => void {
    this.onRemoteYjsUpdateListeners.add(listener);
    return () => this.onRemoteYjsUpdateListeners.delete(listener);
  }

  public onRemoteAwareness(listener: (docId: string, awareness: Uint8Array, fromPeer: string) => void): () => void {
    this.onRemoteAwarenessListeners.add(listener);
    return () => this.onRemoteAwarenessListeners.delete(listener);
  }

  public onRemoteSyncRequest(listener: (docId: string, stateVector: Uint8Array, fromPeer: string) => void): () => void {
    this.onRemoteSyncRequestListeners.add(listener);
    return () => this.onRemoteSyncRequestListeners.delete(listener);
  }

  public onRemoteSyncResponse(listener: (docId: string, update: Uint8Array, fromPeer: string) => void): () => void {
    this.onRemoteSyncResponseListeners.add(listener);
    return () => this.onRemoteSyncResponseListeners.delete(listener);
  }

  /**
   * Démarre le nœud réseau Iroh P2P pour le coffre actuel
   */
  public async startNetwork(vaultPath: string, displayName?: string, vaultName?: string): Promise<void> {
    const savedName = displayName || localStorage.getItem('knit-display-name') || 'Moi';

    if (!isTauriEnvironment()) {
      // Mode simulation pour développement Web
      this.isNetworkActive = true;
      this.localIdentity = {
        peer_id: 'demo_peer_local_web',
        display_name: savedName,
        color_index: 0,
        color_hex: COLLABORATIVE_PALETTE[0],
        initials: savedName.slice(0, 2).toUpperCase(),
      };
      this.invitationCode = 'knit://join/demo_sample_ticket_web';
      this.notify();
      return;
    }

    try {
      this.cleanupListeners();

      const identity = await invoke<PeerIdentity>('start_p2p_network', {
        vaultPath,
        displayName: savedName,
        vaultName: vaultName || null,
      });

      this.localIdentity = identity;
      this.isNetworkActive = true;

      // Récupérer le ticket d'invitation
      try {
        const code = await invoke<string>('get_p2p_invitation_code');
        this.invitationCode = code;
      } catch (err) {
        console.warn('Impossible de récupérer le code invitation:', err);
      }

      // Écouter les événements réseau P2P
      const unlistenConnected = await listen<ConnectedPeerInfo>('p2p_peer_connected', (event) => {
        const peer = event.payload;
        this.connectedPeers = [...this.connectedPeers.filter((p) => p.peer_id !== peer.peer_id), peer];
        if (peer.avatar?.type === 'custom' && peer.avatar.blake3_hash) {
          this.loadPeerAvatar(vaultPath, peer.peer_id, peer.avatar.blake3_hash);
        }
        this.notify();
        toast.info(`Pair connecté : ${peer.display_name} (${peer.initials})`);
      });
      this.unlistenFns.push(unlistenConnected);

      const unlistenDisconnected = await listen<{ peer_id: string }>('p2p_peer_disconnected', (event) => {
        const { peer_id } = event.payload;
        const disconnected = this.connectedPeers.find((p) => p.peer_id === peer_id);
        this.connectedPeers = this.connectedPeers.filter((p) => p.peer_id === peer_id);
        this.activeFileByPeer.delete(peer_id);
        this.peerAvatarDataUrls.delete(peer_id);
        this.notify();
        if (disconnected) {
          toast.info(`Pair déconnecté : ${disconnected.display_name}`);
        }
      });
      this.unlistenFns.push(unlistenDisconnected);

      const unlistenYjs = await listen<{ doc_id: string; update: string; from_peer: string }>(
        'p2p_yjs_update',
        (event) => {
          const { doc_id, update, from_peer } = event.payload;
          const bytes = base64ToUint8Array(update);
          this.onRemoteYjsUpdateListeners.forEach((l) => l(doc_id, bytes, from_peer));
        }
      );
      this.unlistenFns.push(unlistenYjs);

      const unlistenAwareness = await listen<{ doc_id: string; awareness: string; from_peer: string }>(
        'p2p_awareness_update',
        (event) => {
          const { doc_id, awareness, from_peer } = event.payload;
          const bytes = base64ToUint8Array(awareness);
          this.activeFileByPeer.set(from_peer, doc_id);
          this.notify();
          this.onRemoteAwarenessListeners.forEach((l) => l(doc_id, bytes, from_peer));
        }
      );
      this.unlistenFns.push(unlistenAwareness);

      const unlistenAsset = await listen<{ rel_path: string; from_peer: string }>(
        'p2p_asset_received',
        (event) => {
          const { rel_path } = event.payload;
          if (rel_path.startsWith('.knit/cache/avatars/')) {
            const hash = rel_path.replace('.knit/cache/avatars/', '').replace('.png', '').replace('.jpg', '');
            const peer = this.connectedPeers.find((p) => p.avatar?.blake3_hash === hash);
            if (peer) {
              this.loadPeerAvatar(vaultPath, peer.peer_id, hash);
            }
          } else {
            toast.success(`Média reçu via Iroh Blobs : ${rel_path}`);
          }
        }
      );
      this.unlistenFns.push(unlistenAsset);

      const unlistenLan = await listen<DiscoveredLanPeer>('p2p_lan_peer_discovered', (event) => {
        const lanPeer = event.payload;
        const exists = this.discoveredLanPeers.some((p) => p.peer_id === lanPeer.peer_id);
        if (!exists) {
          this.discoveredLanPeers = [...this.discoveredLanPeers, lanPeer];
          this.notify();
          toast.info(`Pair découvert en LAN : ${lanPeer.display_name}`);
        }
      });
      this.unlistenFns.push(unlistenLan);

      const unlistenSyncReq = await listen<{ doc_id: string; state_vector: string; from_peer: string }>(
        'p2p_sync_request_received',
        (event) => {
          const { doc_id, state_vector, from_peer } = event.payload;
          const bytes = base64ToUint8Array(state_vector);
          this.onRemoteSyncRequestListeners.forEach((l) => l(doc_id, bytes, from_peer));
        }
      );
      this.unlistenFns.push(unlistenSyncReq);

      const unlistenSyncResp = await listen<{ doc_id: string; update: string; from_peer: string }>(
        'p2p_sync_response_received',
        (event) => {
          const { doc_id, update, from_peer } = event.payload;
          const bytes = base64ToUint8Array(update);
          this.onRemoteSyncResponseListeners.forEach((l) => l(doc_id, bytes, from_peer));
        }
      );
      this.unlistenFns.push(unlistenSyncResp);

      const unlistenProfile = await listen<{ from_peer: string; profile: Partial<UserProfile> }>(
        'p2p_profile_updated',
        (event) => {
          const { from_peer, profile } = event.payload;
          this.connectedPeers = this.connectedPeers.map((p) => {
            if (p.peer_id === from_peer) {
              return {
                ...p,
                display_name: profile.display_name || p.display_name,
                first_name: profile.first_name || p.first_name,
                last_name: profile.last_name || p.last_name,
                email: profile.email !== undefined ? profile.email : p.email,
                role: profile.role || p.role,
                status_message: profile.status_message || p.status_message,
                avatar: profile.avatar || p.avatar,
              };
            }
            return p;
          });
          if (profile.avatar?.type === 'custom' && profile.avatar.blake3_hash) {
            this.loadPeerAvatar(vaultPath, from_peer, profile.avatar.blake3_hash);
          } else if (profile.avatar?.type === 'initials') {
            this.peerAvatarDataUrls.delete(from_peer);
          }
          this.notify();
        }
      );
      this.unlistenFns.push(unlistenProfile);

      // Charger le profil utilisateur local
      await this.loadProfile(vaultPath);

      // Charger les pairs déjà connectés
      const peers = await invoke<ConnectedPeerInfo[]>('get_connected_peers');
      this.connectedPeers = peers;
      for (const p of peers) {
        if (p.avatar?.type === 'custom' && p.avatar.blake3_hash) {
          this.loadPeerAvatar(vaultPath, p.peer_id, p.avatar.blake3_hash);
        }
      }
      this.notify();
    } catch (e) {
      console.error('Erreur démarrage réseau P2P:', e);
      toast.error(`Erreur réseau P2P : ${e}`);
    }
  }

  /**
   * Arrête le nœud réseau Iroh
   */
  public async stopNetwork(): Promise<void> {
    if (!this.isNetworkActive) return;

    this.cleanupListeners();

    if (isTauriEnvironment()) {
      try {
        await invoke('stop_p2p_network');
      } catch (err) {
        console.warn('Erreur arrêt réseau:', err);
      }
    }

    this.isNetworkActive = false;
    this.connectedPeers = [];
    this.discoveredLanPeers = [];
    this.activeFileByPeer.clear();
    this.invitationCode = null;
    this.notify();
  }

  /**
   * Connecte un nouveau pair à partir de son code d'invitation `knit://join/...`
   */
  public async connectPeer(invitationCode: string): Promise<ConnectedPeerInfo> {
    if (!isTauriEnvironment()) {
      const demoPeer: ConnectedPeerInfo = {
        peer_id: 'demo_peer_remote',
        display_name: 'Collaborateur Démo',
        vault_name: 'Mon Vault',
        color_index: 2,
        color_hex: COLLABORATIVE_PALETTE[2],
        initials: 'CD',
        latency_ms: 24,
        connected_at_sec: Math.floor(Date.now() / 1000),
      };
      this.connectedPeers.push(demoPeer);
      this.notify();
      toast.success(`Connecté à ${demoPeer.display_name}`);
      return demoPeer;
    }

    try {
      const peer = await invoke<ConnectedPeerInfo>('connect_p2p_peer', { invitationCode });
      this.connectedPeers = [...this.connectedPeers.filter((p) => p.peer_id !== peer.peer_id), peer];
      this.notify();
      toast.success(`Connecté avec succès à ${peer.display_name} !`);
      return peer;
    } catch (err) {
      toast.error(`Échec de la connexion : ${err}`);
      throw err;
    }
  }

  /**
   * Diffuse un delta Yjs binaire aux pairs connectés
   */
  public async broadcastYjsUpdate(docId: string, update: Uint8Array): Promise<void> {
    if (!this.isNetworkActive || !isTauriEnvironment()) return;

    try {
      const b64 = uint8ArrayToBase64(update);
      await invoke('broadcast_yjs_update', { docId, updateBase64: b64 });
    } catch (err) {
      console.warn('Erreur broadcast Yjs update:', err);
    }
  }

  /**
   * Diffuse un état d'Awareness (curseur collaboratif) aux pairs connectés
   */
  public async broadcastAwareness(docId: string, awareness: Uint8Array): Promise<void> {
    if (!this.isNetworkActive || !isTauriEnvironment()) return;

    try {
      const b64 = uint8ArrayToBase64(awareness);
      await invoke('broadcast_awareness', { docId, awarenessBase64: b64 });
    } catch (err) {
      console.warn('Erreur broadcast awareness:', err);
    }
  }

  /**
   * Demande la synchronisation d'un fichier média manquant dans assets/
   */
  public async syncAssetFromPeers(relPath: string, blake3Hash: string): Promise<boolean> {
    if (!this.isNetworkActive || !isTauriEnvironment()) return false;

    try {
      return await invoke<boolean>('sync_asset_from_peers', { relPath, blake3Hash });
    } catch (err) {
      console.warn('Erreur sync asset:', err);
      return false;
    }
  }

  /**
   * Retourne la liste des collaborateurs actuellement présents sur un document donné
   */
  public getCollaboratorsForFile(relPath: string): ConnectedPeerInfo[] {
    const list: ConnectedPeerInfo[] = [];
    for (const [peerId, filePath] of this.activeFileByPeer.entries()) {
      if (filePath === relPath) {
        const peer = this.connectedPeers.find((p) => p.peer_id === peerId);
        if (peer) list.push(peer);
      }
    }
    return list;
  }

  /**
   * Charge le profil utilisateur enrichi du coffre
   */
  public async loadProfile(vaultPath: string): Promise<UserProfile> {
    if (!isTauriEnvironment()) {
      const demoProfile: UserProfile = {
        first_name: 'Moi',
        last_name: '',
        display_name: 'Moi',
        email: '',
        role: 'Collaborateur',
        status_message: 'En rédaction',
        share_email_p2p: false,
        avatar: { type: 'initials' },
        created_at_sec: Math.floor(Date.now() / 1000),
        updated_at_sec: Math.floor(Date.now() / 1000),
      };
      this.currentProfile = demoProfile;
      this.notify();
      return demoProfile;
    }

    try {
      const profile = await invoke<UserProfile>('get_user_profile', { vaultPath });
      this.currentProfile = profile;
      if (this.localIdentity) {
        this.localIdentity.display_name = profile.display_name;
        this.localIdentity.initials = (profile.first_name[0] || 'A') + (profile.last_name[0] || 'N');
      }
      if (profile.avatar.type === 'custom') {
        this.avatarDataUrl = await this.loadAvatarBase64(vaultPath);
      } else {
        this.avatarDataUrl = null;
      }
      this.notify();
      return profile;
    } catch (err) {
      console.warn('Erreur chargement profil:', err);
      throw err;
    }
  }

  /**
   * Charge un avatar (local ou de pair distant par hash) sous forme de data URL base64
   */
  public async loadAvatarBase64(vaultPath: string, hash?: string): Promise<string | null> {
    if (!isTauriEnvironment()) return null;
    try {
      return await invoke<string | null>('load_avatar_base64', {
        vaultPath,
        hash: hash || null,
      });
    } catch (err) {
      console.warn('Erreur chargement avatar base64:', err);
      return null;
    }
  }

  /**
   * Charge et met en cache l'avatar d'un pair distant pour affichage dans l'UI
   */
  public async loadPeerAvatar(vaultPath: string, peerId: string, hash?: string): Promise<void> {
    if (!hash || !vaultPath) return;
    const dataUrl = await this.loadAvatarBase64(vaultPath, hash);
    if (dataUrl) {
      this.peerAvatarDataUrls.set(peerId, dataUrl);
      this.notify();
    }
  }

  /**
   * Enregistre le profil utilisateur et propage la mise à jour P2P
   */
  public async saveProfile(vaultPath: string, profile: UserProfile): Promise<void> {
    profile.updated_at_sec = Math.floor(Date.now() / 1000);
    this.currentProfile = profile;
    if (this.localIdentity) {
      this.localIdentity.display_name = profile.display_name;
    }
    this.notify();

    if (!isTauriEnvironment()) return;

    try {
      await invoke('save_user_profile', { vaultPath, profile });
      toast.success('Profil utilisateur enregistré');
    } catch (err) {
      toast.error(`Erreur enregistrement profil: ${err}`);
      throw err;
    }
  }

  /**
   * Téléverse une photo de profil personnalisée et calcule son empreinte BLAKE3
   */
  public async uploadAvatar(vaultPath: string, file: File): Promise<AvatarInfo> {
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const imageBase64 = uint8ArrayToBase64(bytes);

    if (!isTauriEnvironment()) {
      const demoAvatar: AvatarInfo = {
        type: 'custom',
        blake3_hash: 'demo_blake3_avatar_hash',
        mime_type: file.type || 'image/png',
      };
      if (this.currentProfile) {
        this.currentProfile.avatar = demoAvatar;
        this.avatarDataUrl = `data:${file.type || 'image/png'};base64,${imageBase64}`;
        this.notify();
      }
      return demoAvatar;
    }

    try {
      const avatar = await invoke<AvatarInfo>('upload_user_avatar', {
        vaultPath,
        imageBase64,
        mimeType: file.type || 'image/png',
      });
      if (this.currentProfile) {
        this.currentProfile.avatar = avatar;
        this.avatarDataUrl = `data:${file.type || 'image/png'};base64,${imageBase64}`;
        this.notify();
      }
      toast.success('Photo de profil mise à jour');
      return avatar;
    } catch (err) {
      toast.error(`Échec du téléversement de l'avatar: ${err}`);
      throw err;
    }
  }

  /**
   * Réinitialise l'avatar au mode par défaut (initiales/teintes)
   */
  public async resetAvatar(vaultPath: string): Promise<AvatarInfo> {
    if (!isTauriEnvironment()) {
      const def: AvatarInfo = { type: 'initials' };
      if (this.currentProfile) {
        this.currentProfile.avatar = def;
        this.avatarDataUrl = null;
        this.notify();
      }
      return def;
    }

    try {
      const avatar = await invoke<AvatarInfo>('reset_user_avatar', { vaultPath });
      if (this.currentProfile) {
        this.currentProfile.avatar = avatar;
        this.avatarDataUrl = null;
        this.notify();
      }
      toast.info('Avatar réinitialisé aux initiales');
      return avatar;
    } catch (err) {
      toast.error(`Erreur réinitialisation avatar: ${err}`);
      throw err;
    }
  }

  /**
   * Configure automatiquement Git (`user.name` et `user.email`) d'après le profil Knit
   */
  public async applyProfileToGit(vaultPath: string): Promise<boolean> {
    if (!this.currentProfile || !isTauriEnvironment()) return false;

    try {
      const ok = await invoke<boolean>('apply_profile_to_git', {
        vaultPath,
        name: this.currentProfile.display_name,
        email: this.currentProfile.email,
      });
      if (ok) {
        toast.success('Configuration Git locale synchronisée !');
      } else {
        toast.info('Aucun dépôt .git détecté à la racine du coffre');
      }
      return ok;
    } catch (err) {
      toast.error(`Erreur auto-configuration Git: ${err}`);
      return false;
    }
  }

  /**
   * Émet une requête Yjs SyncStep1 avec son vecteur d'état pour rattraper les deltas manqués
   */
  public async sendSyncRequest(docId: string, stateVector: Uint8Array): Promise<void> {
    if (!this.isNetworkActive || !isTauriEnvironment()) return;

    try {
      const stateVectorBase64 = uint8ArrayToBase64(stateVector);
      await invoke('send_p2p_sync_step1', { docId, stateVectorBase64 });
    } catch (err) {
      console.warn('Erreur envoi SyncStep1:', err);
    }
  }

  /**
   * Répond à une requête SyncStep1 avec les deltas calculés SyncStep2
   */
  public async sendSyncResponse(peerId: string, docId: string, update: Uint8Array): Promise<void> {
    if (!this.isNetworkActive || !isTauriEnvironment()) return;

    try {
      const updateBase64 = uint8ArrayToBase64(update);
      await invoke('send_p2p_sync_step2', { peerId, docId, updateBase64 });
    } catch (err) {
      console.warn('Erreur envoi SyncStep2:', err);
    }
  }

  private cleanupListeners() {
    this.unlistenFns.forEach((unlisten) => {
      try {
        unlisten();
      } catch (err) {
        console.warn('Erreur unlisten:', err);
      }
    });
    this.unlistenFns = [];
  }
}

export const networkStore = new NetworkStore();
