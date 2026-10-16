import * as Y from 'yjs';
import diff from 'fast-diff';
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate } from 'y-protocols/awareness';
import { networkStore } from '../stores/networkStore';

export class CRDTManager {
  private docs: Map<string, Y.Doc> = new Map();
  private awarenessMap: Map<string, Awareness> = new Map();
  private fileObservers: Map<string, Set<(content: string) => void>> = new Map();
  private initializedP2P: boolean = false;

  constructor() {
    this.setupP2PListeners();
  }

  private setupP2PListeners() {
    if (this.initializedP2P) return;
    this.initializedP2P = true;

    // Réception des deltas Yjs depuis les pairs distants
    networkStore.onRemoteYjsUpdate((docId, update, _fromPeer) => {
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

      // Brancher la diffusion automatique des modifications locales vers les pairs P2P
      doc.on('update', (update: Uint8Array, origin: unknown) => {
        if (origin !== 'p2p' && origin !== 'init') {
          networkStore.broadcastYjsUpdate(path, update);
        }
      });
    }
    return doc;
  }

  public getAwareness(path: string): Awareness {
    let awareness = this.awarenessMap.get(path);
    if (!awareness) {
      const doc = this.getDoc(path);
      awareness = new Awareness(doc);
      this.awarenessMap.set(path, awareness);

      // Configurer l'utilisateur local dans l'awareness
      if (networkStore.localIdentity) {
        awareness.setLocalStateField('user', {
          name: networkStore.localIdentity.display_name,
          color: networkStore.localIdentity.color_hex,
          initials: networkStore.localIdentity.initials,
          colorIndex: networkStore.localIdentity.color_index,
        });
      }

      // Diffuser les mouvements de curseur locaux aux pairs
      awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
        if (origin !== 'p2p') {
          const changedClients = added.concat(updated, removed);
          const update = encodeAwarenessUpdate(awareness!, changedClients);
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
    if (!this.fileObservers.has(path)) {
      this.fileObservers.set(path, new Set());
    }
    const set = this.fileObservers.get(path)!;
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
