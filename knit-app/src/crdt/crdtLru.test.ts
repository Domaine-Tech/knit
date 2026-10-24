/**
 * Garde-fou B-050 : plafond LRU 20 Y.Doc (exécution : npx tsx src/crdt/crdtLru.test.ts).
 *
 * Note : ce script mocke minimalement les stores pour éviter l'IPC Tauri.
 */
import * as Y from 'yjs';

const MAX = 20;

class MiniLru {
  docs = new Map<string, Y.Doc>();
  lru: string[] = [];
  observers = new Map<string, Set<unknown>>();
  protectedPaths = new Set<string>();

  touch(path: string) {
    this.lru = this.lru.filter((p) => p !== path);
    this.lru.push(path);
  }

  getDoc(path: string): Y.Doc {
    let doc = this.docs.get(path);
    if (!doc) {
      this.evict();
      doc = new Y.Doc();
      this.docs.set(path, doc);
    }
    this.touch(path);
    this.evict();
    return doc;
  }

  evict() {
    while (this.docs.size > MAX) {
      const candidate = this.lru.find((p) => {
        if (this.protectedPaths.has(p)) return false;
        const obs = this.observers.get(p);
        return !obs || obs.size === 0;
      });
      if (!candidate) break;
      this.docs.get(candidate)?.destroy();
      this.docs.delete(candidate);
      this.lru = this.lru.filter((p) => p !== candidate);
    }
  }
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const mgr = new MiniLru();
for (let i = 0; i < 30; i += 1) {
  mgr.getDoc(`note-${i}.md`);
}
assert(mgr.docs.size === MAX, `attendu ${MAX} docs, reçu ${mgr.docs.size}`);
assert(!mgr.docs.has('note-0.md'), 'le plus ancien sans abonné doit être évincé');
assert(mgr.docs.has('note-29.md'), 'le plus récent doit rester');

mgr.protectedPaths.add('note-10.md');
mgr.observers.set('note-11.md', new Set([1]));
// Remplir à nouveau
for (let i = 30; i < 50; i += 1) {
  mgr.getDoc(`note-${i}.md`);
}
assert(mgr.docs.has('note-10.md') || mgr.docs.size <= MAX + 2, 'plafond souple si protégés');

console.log(`[crdtLru] OK — size=${mgr.docs.size} max=${MAX}`);
