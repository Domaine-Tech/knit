import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { toast } from './toastStore';
import { isTauriEnvironment } from './vaultStore';

export interface PeerIdentity {
  peer_id: string;
  display_name: string;
  color_index: number;
  color_hex: string;
  initials: string;
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
        this.notify();
        toast.info(`🌐 Pair connecté : ${peer.display_name} (${peer.initials})`);
      });
      this.unlistenFns.push(unlistenConnected);

      const unlistenDisconnected = await listen<{ peer_id: string }>('p2p_peer_disconnected', (event) => {
        const { peer_id } = event.payload;
        const disconnected = this.connectedPeers.find((p) => p.peer_id === peer_id);
        this.connectedPeers = this.connectedPeers.filter((p) => p.peer_id !== peer_id);
        this.activeFileByPeer.delete(peer_id);
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
          const bytes = Uint8Array.from(atob(update), (c) => c.charCodeAt(0));
          this.onRemoteYjsUpdateListeners.forEach((l) => l(doc_id, bytes, from_peer));
        }
      );
      this.unlistenFns.push(unlistenYjs);

      const unlistenAwareness = await listen<{ doc_id: string; awareness: string; from_peer: string }>(
        'p2p_awareness_update',
        (event) => {
          const { doc_id, awareness, from_peer } = event.payload;
          const bytes = Uint8Array.from(atob(awareness), (c) => c.charCodeAt(0));
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
          toast.success(`Média reçu via Iroh Blobs : ${rel_path}`);
        }
      );
      this.unlistenFns.push(unlistenAsset);

      const unlistenLan = await listen<DiscoveredLanPeer>('p2p_lan_peer_discovered', (event) => {
        const lanPeer = event.payload;
        const exists = this.discoveredLanPeers.some((p) => p.peer_id === lanPeer.peer_id);
        if (!exists) {
          this.discoveredLanPeers = [...this.discoveredLanPeers, lanPeer];
          this.notify();
          toast.info(`🏠 Pair découvert en LAN : ${lanPeer.display_name}`);
        }
      });
      this.unlistenFns.push(unlistenLan);

      // Charger les pairs déjà connectés
      const peers = await invoke<ConnectedPeerInfo[]>('get_connected_peers');
      this.connectedPeers = peers;
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
      let binary = '';
      for (let i = 0; i < update.length; i++) {
        binary += String.fromCharCode(update[i]);
      }
      const b64 = btoa(binary);
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
      let binary = '';
      for (let i = 0; i < awareness.length; i++) {
        binary += String.fromCharCode(awareness[i]);
      }
      const b64 = btoa(binary);
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
