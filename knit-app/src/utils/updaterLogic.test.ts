/**
 * Tests de la logique pure updater (tsx, sans plugin Tauri).
 */
import {
  accumulateUpdateProgress,
  formatUpdateError,
  isUserBusy,
  isVersionSkipped,
  UPDATE_BUSY_IDLE_MS,
  updateProgressPercent,
} from './updaterLogic';

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

let p = { downloaded: 0, total: null as number | null };
p = accumulateUpdateProgress(p, { kind: 'started', contentLength: 1000 });
assert(p.downloaded === 0 && p.total === 1000, 'Started initialise total');

p = accumulateUpdateProgress(p, { kind: 'progress', chunkLength: 250 });
assert(p.downloaded === 250 && p.total === 1000, 'Progress cumule chunk 1');

p = accumulateUpdateProgress(p, { kind: 'progress', chunkLength: 250 });
assert(p.downloaded === 500 && p.total === 1000, 'Progress cumule chunk 2');

assert(updateProgressPercent(p) === 50, 'percent = 50');

p = accumulateUpdateProgress(p, { kind: 'finished' });
assert(p.downloaded === 500 && p.total === 1000, 'Finished ne reset pas');

assert(updateProgressPercent({ downloaded: 0, total: null }) === null, 'total null → percent null');
assert(updateProgressPercent({ downloaded: 10, total: 0 }) === null, 'total 0 → percent null');
assert(updateProgressPercent({ downloaded: 150, total: 100 }) === 100, 'cap à 100');

assert(isVersionSkipped('1.1.0', null) === false, 'skip null');
assert(isVersionSkipped('1.1.0', '1.1.0') === true, 'skip exact');
assert(isVersionSkipped('1.1.0', ' 1.1.0 ') === true, 'skip trim');
assert(isVersionSkipped('1.1.1', '1.1.0') === false, 'version ultérieure non skippée');

let unknown = accumulateUpdateProgress(
  { downloaded: 0, total: null },
  { kind: 'started', contentLength: null }
);
unknown = accumulateUpdateProgress(unknown, { kind: 'progress', chunkLength: 42 });
assert(unknown.downloaded === 42 && unknown.total === null, 'Started sans Content-Length');
assert(updateProgressPercent(unknown) === null, 'percent null sans total');

const jsonErr = formatUpdateError('Could not fetch a valid release JSON from the remote');
assert(jsonErr.includes('latest.json'), 'erreur JSON → message FR manifeste');
assert(!jsonErr.toLowerCase().includes('could not fetch'), 'pas de brut anglais pour JSON');

assert(
  formatUpdateError('connection timed out').includes('Réseau'),
  'timeout → message réseau'
);
assert(
  formatUpdateError('Aucune mise à jour en attente.').startsWith('Aucune'),
  'message FR Knit préservé'
);
assert(formatUpdateError(null).includes('Impossible'), 'null → fallback');

const now = 1_000_000;
assert(isUserBusy(null, now) === false, 'pas d’activité → pas busy');
assert(isUserBusy(now - 1_000, now) === true, 'activité récente → busy');
assert(isUserBusy(now - UPDATE_BUSY_IDLE_MS - 1, now) === false, 'au-delà idle → pas busy');
assert(isUserBusy(now - UPDATE_BUSY_IDLE_MS + 1, now) === true, 'juste sous le seuil → busy');

console.log('[updaterLogic] OK — progression, percent, skip, formatUpdateError, isUserBusy');
