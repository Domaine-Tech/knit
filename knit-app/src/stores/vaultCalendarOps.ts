/**
 * Opérations Agenda (index, mutations date / priorité / toggle / ajout).
 * Extrait de vaultQuery pour alléger le module fourre-tout.
 */

import { invoke } from '@tauri-apps/api/core';
import { tabStore } from './tabStore';
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
  if (!ops.currentVaultPath) return { events: [] };

  if (isTauriEnvironment()) {
    try {
      const data = await invoke<CalendarIndexData>('get_calendar_index', {
        vaultPath: ops.currentVaultPath,
      });
      return normalizeCalendarIndex(data);
    } catch (err) {
      console.debug('Fallback local pour get_calendar_index :', err);
    }
  }

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
    } catch (err) {
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
