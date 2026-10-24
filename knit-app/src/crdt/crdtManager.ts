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
import { isTauriEnvironment, uint8ArrayToBase64, base64ToUint8Array } from '../utils';
import { invoke } from '@tauri-apps/api/core';

import type {
  DocSnapshot,
  AwarenessUserState,
  AwarenessChangeEvent,
} from '../types';


export class CRDTManager {
  private docs: Map<string, Y.Doc> = new Map();
  private awarenessMap: Map<string, Awareness> = new Map();
  private fileObservers: Map<string, Set<(content: string) => void>> = new Map();
  private opCounts: Map<string, number> = new Map();
  private initializedP2P: boolean = false;

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
      }
    });

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

  public getDoc(path: string): Y.Doc {
    let doc = this.docs.get(path);
    if (!doc) {
      doc = new Y.Doc();
      this.docs.set(path, doc);
      const createdDoc = doc;

      // Brancher la diffusion automatique des modifications locales vers les pairs P2P
      createdDoc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin !== 'p2p' && origin !== 'init' && origin !== 'snapshot-load') {
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
    return doc;
  }

  /** Liste les snapshots compactés d'un document (IPC `list_doc_snapshots`). */
  public async listDocSnapshots(path: string): Promise<DocSnapshot[]> {
    const vaultPath = vaultStore.vaultPath;
    if (!vaultPath || !isTauriEnvironment()) return [];
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

      const vaultPath = vaultStore.vaultPath;
      if (vaultPath && isTauriEnvironment()) {
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

  public initDocument(path: string, initialContent: string): Y.Text {
    const doc = this.getDoc(path);
    const ytext = doc.getText('codemirror');

    // Tenter de charger un snapshot compacté récent s'il existe dans .knit/snapshots/
    if (isTauriEnvironment() && vaultStore.vaultPath && ytext.length === 0) {
      invoke<DocSnapshot | null>('load_latest_doc_snapshot', {
        vaultPath: vaultStore.vaultPath,
        docId: path,
      })
        .then((snapshot) => {
          if (snapshot && snapshot.yjs_snapshot_base64 && ytext.length === 0) {
            try {
              const bytes = base64ToUint8Array(snapshot.yjs_snapshot_base64);
              Y.applyUpdate(doc, bytes, 'snapshot-load');
            } catch (err: unknown) {
              console.warn('Erreur chargement snapshot compacté:', err);
            }
          }
        })
        .catch(() => {});
    }

    if (ytext.length === 0 && initialContent.length > 0) {
      doc.transact(() => {
        ytext.insert(0, initialContent);
      }, 'init');
    }
    return ytext;
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
  }
}

export const crdtManager = new CRDTManager();
