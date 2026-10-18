/**
 * Types relatifs aux flux collaboratifs CRDT (Yjs), synchronisation P2P et snapshots
 */

export interface DocSnapshot {
  snapshot_id: string;
  doc_id: string;
  state_vector_base64: string;
  yjs_snapshot_base64: string;
  created_at_sec: number;
}

export interface AwarenessUserState {
  name: string;
  color: string;
  initials: string;
  colorIndex?: number;
}

export interface AwarenessChangeEvent {
  added: number[];
  updated: number[];
  removed: number[];
}

export type CRDTOperationOrigin =
  | 'p2p'
  | 'init'
  | 'snapshot-load'
  | 'external-fs'
  | 'local';
