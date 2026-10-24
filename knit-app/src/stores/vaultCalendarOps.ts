/**
 * Opérations Agenda (index, mutations date / priorité / toggle / ajout).
 * Extrait de vaultQuery pour alléger le module fourre-tout.
 */

import { invoke } from '@tauri-apps/api/core';
import { tabStore } from './tabStore';
import { isDemoVaultPath } from './vaultRegistry';
import {
  appendEventToContent,
  buildLocalCalendarIndex,
  isTauriEnvironment,
  normalizeCalendarIndex,
  rewriteEventDateInContent,
  toggleTaskCompletionInContent,
  updateEventPriorityInContent,
} from '../utils';
import type { CalendarIndexData, TaskPriority, VaultOps } from '../types';

export async function getCalendarIndex(ops: VaultOps): Promise<CalendarIndexData> {
  // B-057 : projection mémoire de l'index unifié.
  const { frontmatterIndex } = await import('./frontmatterIndex');
  const demo = isDemoVaultPath(ops.currentVaultPath);
  const cached = frontmatterIndex.getCalendarData();
  // Cache utile s'il y a des events ; `generation` (pas `version`) : clear()
  // incrémente version sans hydrater — sinon agenda bloqué vide après bascule.
  if (cached.events.length > 0) return cached;
  if (!demo && frontmatterIndex.getGeneration() > 0) return cached;

  if (!ops.currentVaultPath) return { events: [] };

  // Coffre démo = mémoire Vite, jamais de scan Rust sur un chemin fictif
  if (isTauriEnvironment() && !demo) {
    try {
      const data = await invoke<CalendarIndexData>('get_calendar_index', {
        vaultPath: ops.currentVaultPath,
      });
      return normalizeCalendarIndex(data);
    } catch (err: unknown) {
      console.debug('Fallback local pour get_calendar_index :', err);
    }
  }

  await frontmatterIndex.rebuild(ops);
  const fromIndex = frontmatterIndex.getCalendarData();
  if (fromIndex.events.length > 0) return fromIndex;
  return normalizeCalendarIndex(buildLocalCalendarIndex(ops.localContents));
}

export async function updateCalendarEventDate(
  ops: VaultOps,
  relPath: string,
  sourceSpan: string,
  newDate: string,
  newStart?: string | null,
  newEnd?: string | null
): Promise<void> {
  if (isTauriEnvironment() && ops.currentVaultPath) {
    try {
      await invoke<void>('update_calendar_event_date', {
        vaultPath: ops.currentVaultPath,
        relPath,
        sourceSpan,
        newDate,
        newStart: newStart ?? null,
        newEnd: newEnd ?? null,
      });
      return;
    } catch (err: unknown) {
      console.debug('Fallback local pour update_calendar_event_date :', err);
    }
  }

  const content = await ops.readFile(relPath);
  const updated = rewriteEventDateInContent(content, sourceSpan, newDate, newStart, newEnd);
  await ops.writeFile(relPath, updated);
}

export async function toggleCalendarTask(
  ops: VaultOps,
  relPath: string,
  lineNum: number,
  currentCompleted?: boolean
): Promise<void> {
  const content = await ops.readFile(relPath);
  const updated = toggleTaskCompletionInContent(content, lineNum, currentCompleted);
  await ops.writeFile(relPath, updated);
  tabStore.updateContent(relPath, updated);
}

export async function updateCalendarEventPriority(
  ops: VaultOps,
  relPath: string,
  lineNum: number,
  newPriority: TaskPriority | null
): Promise<void> {
  const content = await ops.readFile(relPath);
  const updated = updateEventPriorityInContent(content, lineNum, newPriority);
  await ops.writeFile(relPath, updated);
  tabStore.updateContent(relPath, updated);
}

export async function addCalendarEvent(
  ops: VaultOps,
  relPath: string,
  event: {
    title: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    assignee?: string | null;
    priority?: TaskPriority | null;
  }
): Promise<void> {
  let content = '';
  try {
    content = await ops.readFile(relPath);
  } catch {
    content = `# ${event.date}\n\n`;
  }
  const updated = appendEventToContent(content, event);
  await ops.writeFile(relPath, updated);
  tabStore.updateContent(relPath, updated);
}
