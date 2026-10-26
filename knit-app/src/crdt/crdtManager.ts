/**
 * Moteur CRDT Yjs (documents, Awareness, snapshots).
 * Frontière : `networkStore` gère uniquement le transport IPC / Base64 (broadcast, sync steps) ;
 * toute mutation Y.Doc / Y.Text / Awareness passe par ce manager.
 */
import * as Y from 'yjs';
import diff from 'fast-diff';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';
import { networkStore } from '../stores/networkStore';
import { vaultStore } from '../stores/vaultStore';
import { isDemoVaultPath } from '../stores/vaultRegistry';
import { tabStore } from '../stores/tabStore';
import { isTauriEnvironment, uint8ArrayToBase64, base64ToUint8Array } from '../utils';
import { invoke } from '@tauri-apps/api/core';

import type {
  DocSnapshot,
  AwarenessUserState,
  AwarenessChangeEvent,
} from '../types';

/** Le coffre démo n'a pas de dossier : aucun snapshot ni état CRDT sur disque. */
function diskVaultPath(): string | null {
  const vaultPath = vaultStore.vaultPath;
  if (!vaultPath || !isTauriEnvironment() || isDemoVaultPath(vaultPath)) return null;
  return vaultPath;
}

/** Plafond souple B-050 : max Y.Doc en mémoire (éviction LRU des docs sans abonné). */
export const CRDT_DOC_LRU_MAX = 20;

export class CRDTManager {
  private docs: Map<string, Y.Doc> = new Map();
  private awarenessMap: Map<string, Awareness> = new Map();
  private fileObservers: Map<string, Set<(content: string) => void>> = new Map();
  private opCounts: Map<string, number> = new Map();
  /** Ordre d'accès LRU (plus récent en fin de liste). */
  private lruOrder: string[] = [];
  private initializedP2P: boolean = false;
  /** Chaîne d'écriture par fichier fermé, pour ne pas mélanger deux updates. */
  private closedChains: Map<string, Promise<void>> = new Map();

  constructor() {
    this.setupP2PListeners();
  }

  private setupP2PListeners() {
    if (this.initializedP2P) return;
    this.initializedP2P = true;

    // Réception des deltas Yjs standards depuis les pairs distants
    networkStore.onRemoteYjsUpdate((docId, update, _fromPeer) => {
      const doc = this.docs.get(docId);
      if (doc) {
        Y.applyUpdate(doc, update, 'p2p');
        return;
      }
      void this.persistClosedUpdate(docId, update);
    });
    networkStore.subscribe(() => this.syncLocalAwarenessUser());

    // Réception des requêtes de synchronisation (SyncStep1) après reconnexion ou déconnexion prolongée
    networkStore.onRemoteSyncRequest((docId, stateVector, fromPeer) => {
      const doc = this.docs.get(docId);
      if (doc) {
        // Calcul du delta différentiel exact pour combler les opérations manquées
        const diffUpdate = Y.encodeStateAsUpdate(doc, stateVector);
        if (diffUpdate.length > 0) {
          networkStore.sendSyncResponse(fromPeer, docId, diffUpdate);
        }
      }
    });

    // Réception de la réponse de synchronisation (SyncStep2) pour convergence sans conflit
    networkStore.onRemoteSyncResponse((docId, update, _fromPeer) => {
      const doc = this.docs.get(docId);
      if (doc) {
        Y.applyUpdate(doc, update, 'p2p');
      }
    });

    // Réception des positions de curseurs et sélections collaboratives
    networkStore.onRemoteAwareness((docId, awarenessBytes, _fromPeer) => {
      const awareness = this.awarenessMap.get(docId);
      if (awareness) {
        applyAwarenessUpdate(awareness, awarenessBytes, 'p2p');
      }
    });
  }

  private touchLru(path: string): void {
    this.lruOrder = this.lruOrder.filter((p) => p !== path);
    this.lruOrder.push(path);
  }

  private protectedPaths(): Set<string> {
    const paths = new Set<string>();
    for (const t of [...tabStore.tabs, ...tabStore.group2Tabs]) {
      paths.add(t.path);
    }
    return paths;
  }

  /**
   * Évince les documents les moins récemment utilisés sans abonné ni onglet ouvert.
   * Plafond souple : si tous les docs sont protégés, on n'évince pas.
   */
  private evictLruIfNeeded(): void {
    const protectedPaths = this.protectedPaths();
    while (this.docs.size > CRDT_DOC_LRU_MAX) {
      const candidate = this.lruOrder.find((p) => {
        if (protectedPaths.has(p)) return false;
        const observers = this.fileObservers.get(p);
        return !observers || observers.size === 0;
      });
      if (!candidate) break;
      this.removeDoc(candidate);
    }
  }

  /** Nombre de Y.Doc actuellement en mémoire (tests / debug). */
  public getDocCount(): number {
    return this.docs.size;
  }

  /** Liste ordonnée LRU (tests). */
  public getLruOrder(): readonly string[] {
    return this.lruOrder;
  }

  public getDoc(path: string): Y.Doc {
    let doc = this.docs.get(path);
    if (!doc) {
      this.evictLruIfNeeded();
      doc = new Y.Doc();
      this.docs.set(path, doc);
      const createdDoc = doc;

      // Brancher la diffusion automatique des modifications locales vers les pairs P2P
      createdDoc.on('update', (update: Uint8Array, origin: unknown) => {
        if (
          origin !== 'p2p' &&
          origin !== 'init' &&
          origin !== 'snapshot-load' &&
          origin !== 'crdt-state'
        ) {
          networkStore.broadcastYjsUpdate(path, update);

          // Compteur d'opérations pour déclencher un snapshot compacté toutes les 200 opérations
          const currentOps = (this.opCounts.get(path) || 0) + 1;
          this.opCounts.set(path, currentOps);
          if (currentOps % 200 === 0) {
            void this.createSnapshot(path, createdDoc);
          }
        }
      });

      // Si le réseau P2P est actif, demander un rattrapage de deltas auprès des pairs connectés
      if (networkStore.isNetworkActive) {
        const stateVector = Y.encodeStateVector(doc);
        networkStore.sendSyncRequest(path, stateVector);
      }
    }
    this.touchLru(path);
    this.evictLruIfNeeded();
    return doc;
  }

  /** Liste les snapshots compactés d'un document (IPC `list_doc_snapshots`). */
  public async listDocSnapshots(path: string): Promise<DocSnapshot[]> {
    const vaultPath = diskVaultPath();
    if (!vaultPath) return [];
    try {
      return await invoke<DocSnapshot[]>('list_doc_snapshots', {
        vaultPath,
        docId: path,
      });
    } catch (err: unknown) {
      console.warn('Erreur list_doc_snapshots:', err);
      return [];
    }
  }

  /**
   * Crée et persiste un snapshot compacté et signé cryptographiquement dans `.knit/snapshots/`
   */
  public async createSnapshot(path: string, doc: Y.Doc): Promise<void> {
    try {
      const stateVector = Y.encodeStateVector(doc);
      const snapshotBytes = Y.encodeStateAsUpdate(doc);

      const stateVectorBase64 = uint8ArrayToBase64(stateVector);
      const yjsSnapshotBase64 = uint8ArrayToBase64(snapshotBytes);

      const vaultPath = diskVaultPath();
      if (vaultPath) {
        await invoke<void>('save_doc_snapshot', {
          vaultPath,
          docId: path,
          stateVectorBase64,
          yjsSnapshotBase64,
        });
      }
    } catch (err: unknown) {
      console.warn('Erreur lors de la compaction du snapshot Yjs:', err);
    }
  }

  public getAwareness(path: string): Awareness {
    let awareness = this.awarenessMap.get(path);
    if (!awareness) {
      const doc = this.getDoc(path);
      awareness = new Awareness(doc);
      this.awarenessMap.set(path, awareness);

      // Configurer l'utilisateur local dans l'awareness
      if (networkStore.localIdentity) {
        const localUser: AwarenessUserState = {
          name: networkStore.localIdentity.display_name,
          color: networkStore.localIdentity.color_hex,
          initials: networkStore.localIdentity.initials,
          colorIndex: networkStore.localIdentity.color_index,
        };
        awareness.setLocalStateField('user', localUser);
      }

      // Diffuser les mouvements de curseur locaux aux pairs
      const createdAwareness = awareness;
      createdAwareness.on('update', ({ added, updated, removed }: AwarenessChangeEvent, origin: unknown) => {
        if (origin !== 'p2p') {
          const changedClients = added.concat(updated, removed);
          const update = encodeAwarenessUpdate(createdAwareness, changedClients);
          networkStore.broadcastAwareness(path, update);
        }
      });
    }
    return awareness;
  }

  public getYText(path: string): Y.Text {
    const doc = this.getDoc(path);
    return doc.getText('codemirror');
  }

  /** Décode un snapshot Yjs Base64 vers le texte `codemirror` (aperçu historique). */
  public textFromSnapshotBase64(yjsSnapshotBase64: string): string {
    const bytes = base64ToUint8Array(yjsSnapshotBase64);
    const doc = new Y.Doc();
    try {
      Y.applyUpdate(doc, bytes);
      return doc.getText('codemirror').toString();
    } finally {
      doc.destroy();
    }
  }

  /**
   * Restaure le contenu d'un document ouvert depuis un snapshot compacté.
   * Origine `snapshot-restore` : broadcast P2P conservé (hors p2p/init/snapshot-load).
   */
  public restoreDocFromSnapshot(path: string, yjsSnapshotBase64: string): void {
    const text = this.textFromSnapshotBase64(yjsSnapshotBase64);
    const doc = this.getDoc(path);
    const ytext = doc.getText('codemirror');
    doc.transact(() => {
      ytext.delete(0, ytext.length);
      if (text.length > 0) {
        ytext.insert(0, text);
      }
    }, 'snapshot-restore');
  }

  public initDocument(path: string, initialContent: string): Y.Text {
    const doc = this.getDoc(path);
    const ytext = doc.getText('codemirror');
    if (ytext.length === 0) {
      void this.hydrateDocument(path, doc, initialContent);
    }
    return ytext;
  }

  private syncLocalAwarenessUser(): void {
    const identity = networkStore.localIdentity;
    if (!identity) return;
    for (const awareness of this.awarenessMap.values()) {
      const current = awareness.getLocalState()?.user as { name?: string } | undefined;
      if (current?.name === identity.display_name) continue;
      awareness.setLocalStateField('user', {
        name: identity.display_name,
        color: identity.color_hex,
        initials: identity.initials,
        colorIndex: identity.color_index,
      });
    }
  }

  private persistClosedUpdate(docId: string, update: Uint8Array): Promise<void> {
    const previous = this.closedChains.get(docId) ?? Promise.resolve();
    const next = previous
      .then(async () => {
        const vaultPath = diskVaultPath();
        if (!vaultPath) return;
        const existing = await invoke<string | null>('load_crdt_state_cmd', {
          vaultPath,
          docId,
        });
        const tmp = new Y.Doc();
        try {
          if (existing) Y.applyUpdate(tmp, base64ToUint8Array(existing));
          Y.applyUpdate(tmp, update);
          const full = Y.encodeStateAsUpdate(tmp);
          await invoke<void>('store_crdt_state', {
            vaultPath,
            docId,
            stateBase64: uint8ArrayToBase64(full),
          });
        } finally {
          tmp.destroy();
        }
      })
      .catch((err: unknown) => {
        console.warn('Persistance CRDT fichier fermé:', err);
      });
    this.closedChains.set(docId, next);
    return next;
  }

  private async hydrateDocument(path: string, doc: Y.Doc, initialContent: string): Promise<void> {
    const ytext = doc.getText('codemirror');
    const vaultPath = diskVaultPath();
    if (vaultPath) {
      try {
        const stored = await invoke<string | null>('load_crdt_state_cmd', {
          vaultPath,
          docId: path,
        });
        if (stored && ytext.length === 0) {
          Y.applyUpdate(doc, base64ToUint8Array(stored), 'crdt-state');
          return;
        }
      } catch (err: unknown) {
        console.warn('Rejeu crdt-state:', err);
      }
      try {
        const snapshot = await invoke<DocSnapshot | null>('load_latest_doc_snapshot', {
          vaultPath,
          docId: path,
        });
        if (snapshot?.yjs_snapshot_base64 && ytext.length === 0) {
          Y.applyUpdate(doc, base64ToUint8Array(snapshot.yjs_snapshot_base64), 'snapshot-load');
          return;
        }
      } catch {
        /* snapshot absent */
      }
    }
    if (ytext.length === 0 && initialContent.length > 0) {
      doc.transact(() => {
        ytext.insert(0, initialContent);
      }, 'init');
    }
  }

  public getContent(path: string): string {
    const doc = this.docs.get(path);
    if (!doc) return '';
    return doc.getText('codemirror').toString();
  }

  /**
   * Applique une modification externe (provenant du File Watcher / Agent IA)
   * sous forme de diff granulaire dans la transaction Yjs pour préserver le curseur de l'utilisateur.
   */
  public applyExternalContent(path: string, newContent: string): boolean {
    const doc = this.docs.get(path);
    if (!doc) return false;

    const ytext = doc.getText('codemirror');
    const currentText = ytext.toString();

    if (currentText === newContent) {
      return false; // Contenu identique, aucun diff nécessaire
    }

    const diffs = diff(currentText, newContent);

    doc.transact(() => {
      let index = 0;
      for (const [op, text] of diffs) {
        if (op === diff.EQUAL) {
          index += text.length;
        } else if (op === diff.DELETE) {
          ytext.delete(index, text.length);
        } else if (op === diff.INSERT) {
          ytext.insert(index, text);
          index += text.length;
        }
      }
    }, 'external-fs');

    return true;
  }

  public subscribe(path: string, listener: (content: string) => void): () => void {
    let set = this.fileObservers.get(path);
    if (!set) {
      set = new Set();
      this.fileObservers.set(path, set);
    }
    set.add(listener);

    const doc = this.getDoc(path);
    const ytext = doc.getText('codemirror');
    const observer = () => {
      listener(ytext.toString());
    };
    ytext.observe(observer);

    return () => {
      set.delete(listener);
      ytext.unobserve(observer);
    };
  }

  public removeDoc(path: string) {
    const doc = this.docs.get(path);
    if (doc) {
      doc.destroy();
      this.docs.delete(path);
    }
    const awareness = this.awarenessMap.get(path);
    if (awareness) {
      awareness.destroy();
      this.awarenessMap.delete(path);
    }
    this.fileObservers.delete(path);
    this.opCounts.delete(path);
    this.lruOrder = this.lruOrder.filter((p) => p !== path);
  }
}

export const crdtManager = new CRDTManager();
