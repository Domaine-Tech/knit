/**
 * Utilitaires Agenda : scan local (mode démo) + helpers de filtrage / rewrite (B-031a).
 *
 * Important : ne jamais réutiliser une même RegExp /g entre un `exec` en boucle
 * et un `replace` (corruption de lastIndex → boucle infinie / OOM).
 */

import type {
  CalendarEvent,
  CalendarEventKind,
  CalendarEventPriority,
  CalendarFilterMode,
  CalendarHorizonGroup,
  CalendarIndexData,
  CalendarPriorityFilter,
  CalendarStatusFilter,
  MonthGridCell,
  TaskPriority,
} from '../types';
import { formatIsoDate } from './dateUtils';
import { fileStem } from './treeUtils';

export type { CalendarHorizonGroup };

const DATE_MENTION_SRC =
  '@(\\d{4}-\\d{2}-\\d{2})(?:\\s+(\\d{2}:\\d{2})(?:-(\\d{2}:\\d{2}))?)?';
const ASSIGNEE_SRC =
  '@(vault|[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9._-]*(?:\\s+[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9._-]*)?)';

function dateMentionRe(): RegExp {
  return new RegExp(DATE_MENTION_SRC, 'g');
}

function assigneeRe(): RegExp {
  return new RegExp(ASSIGNEE_SRC, 'g');
}

function extractAssignee(line: string): string | null {
  const re = assigneeRe();
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const raw = m[1];
    if (raw && !/^\d/.test(raw)) return raw.trim();
  }
  return null;
}

function titleFromTaskLine(line: string): string {
  const trimmed = line.trimStart();
  const withoutBox = trimmed.replace(/^-\s*\[[^\]]*\]\s*/, '');
  const title = withoutBox
    .replace(dateMentionRe(), '')
    .replace(assigneeRe(), '')
    .replace(/!p[123]/g, '')
    .trim()
    .replace(/^[-|]+\s*/, '')
    .trim();
  return title || 'Événement';
}

/** Scan local des contenus en mémoire (fallback Vite / démo). */
export function buildLocalCalendarIndex(
  contents: Record<string, string>
): CalendarIndexData {
  const events: CalendarEvent[] = [];

  for (const [relPath, content] of Object.entries(contents)) {
    if (!relPath.endsWith('.md') && !relPath.endsWith('.markdown')) continue;

    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (fmMatch) {
      const yaml = fmMatch[1];

      const statutLine = yaml.split('\n').find((l) => {
        const k = l.split(':')[0]?.trim().toLowerCase();
        return k === 'statut' || k === 'status';
      });
      const rawStatut = statutLine ? statutLine.split(':').slice(1).join(':').trim().toLowerCase() : '';
      const fmCompleted = rawStatut === 'termine' || rawStatut === 'terminé' || rawStatut === 'done';

      const prioLine = yaml.split('\n').find((l) => {
        const k = l.split(':')[0]?.trim().toLowerCase();
        return k === 'priorite' || k === 'priorité' || k === 'priority';
      });
      const rawPrio = prioLine ? prioLine.split(':').slice(1).join(':').trim().toLowerCase() : '';
      let fmPriority: 'p1' | 'p2' | 'p3' | null = null;
      if (rawPrio.includes('haute') || rawPrio.includes('urgent') || rawPrio === 'p1' || rawPrio.includes('!p1')) {
        fmPriority = 'p1';
      } else if (rawPrio.includes('moyenne') || rawPrio === 'p2' || rawPrio.includes('!p2')) {
        fmPriority = 'p2';
      } else if (rawPrio.includes('basse') || rawPrio === 'p3' || rawPrio.includes('!p3')) {
        fmPriority = 'p3';
      }

      for (const key of ['due', 'echeance', 'échéance']) {
        const line = yaml.split('\n').find((l) => l.trim().toLowerCase().startsWith(`${key}:`));
        if (!line) continue;
        const raw = line.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '');
        const dateMatch = raw.match(/^(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2})(?:-(\d{2}:\d{2}))?)?/);
        if (!dateMatch) continue;
        const titreLine = yaml.split('\n').find((l) => {
          const k = l.split(':')[0]?.trim().toLowerCase();
          return k === 'titre' || k === 'title';
        });
        const title =
          titreLine?.split(':').slice(1).join(':').trim().replace(/^["']|["']$/g, '') ||
          fileStem(relPath) ||
          'Échéance';
        const assigneLine = yaml
          .split('\n')
          .find((l) => l.trim().toLowerCase().startsWith('assigne:'));
        events.push({
          id: `${relPath}:fm:${key}`,
          title,
          date: dateMatch[1],
          startTime: dateMatch[2] || null,
          endTime: dateMatch[3] || null,
          assignee: assigneLine?.split(':').slice(1).join(':').trim() || null,
          relPath,
          line: 0,
          sourceSpan: `${key}: ${raw}`,
          kind: 'due',
          completed: fmCompleted,
          priority: fmPriority,
        });
      }
    }

    let inCode = false;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trimStart();
      if (trimmed.startsWith('```')) {
        inCode = !inCode;
        continue;
      }
      if (inCode) continue;

      const isTask = trimmed.startsWith('- [');
      const isCompleted = trimmed.startsWith('- [x]') || trimmed.startsWith('- [X]');
      const priorityMatch = line.match(/!(p[123])\b/);
      const priority = priorityMatch ? (priorityMatch[1] as 'p1' | 'p2' | 'p3') : null;

      // Nouvelle RegExp par ligne — évite toute collision lastIndex
      const lineDateRe = dateMentionRe();
      let caps: RegExpExecArray | null;
      while ((caps = lineDateRe.exec(line)) !== null) {
        events.push({
          id: `${relPath}:${i + 1}:${caps[1]}`,
          title: titleFromTaskLine(line),
          date: caps[1],
          startTime: caps[2] || null,
          endTime: caps[3] || null,
          assignee: extractAssignee(line),
          relPath,
          line: i + 1,
          sourceSpan: caps[0],
          kind: isTask ? 'task' : 'inline',
          completed: isCompleted,
          priority,
        });
      }
    }
  }

  events.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  return { events };
}

export function rewriteEventDateInContent(
  content: string,
  sourceSpan: string,
  newDate: string,
  newStart?: string | null,
  newEnd?: string | null
): string {
  if (!sourceSpan || !content.includes(sourceSpan)) return content;

  let replacement: string;
  if (
    sourceSpan.startsWith('due:') ||
    sourceSpan.startsWith('echeance:') ||
    sourceSpan.startsWith('échéance:')
  ) {
    const key = sourceSpan.split(':')[0]?.trim() || 'due';
    if (newStart && newEnd) replacement = `${key}: ${newDate} ${newStart}-${newEnd}`;
    else if (newStart) replacement = `${key}: ${newDate} ${newStart}`;
    else replacement = `${key}: ${newDate}`;
  } else if (newStart && newEnd) {
    replacement = `@${newDate} ${newStart}-${newEnd}`;
  } else if (newStart) {
    replacement = `@${newDate} ${newStart}`;
  } else {
    replacement = `@${newDate}`;
  }

  return content.replace(sourceSpan, replacement);
}

/** Normalise une priorité libre (IPC Rust / YAML) vers p1|p2|p3|null. */
export function normalizePriority(raw: string | null | undefined): CalendarEventPriority | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'p1' || v.includes('!p1') || v.includes('haute') || v.includes('urgent') || v.includes('critique')) {
    return 'p1';
  }
  if (v === 'p2' || v.includes('!p2') || v.includes('moyenne') || v.includes('medium')) {
    return 'p2';
  }
  if (v === 'p3' || v.includes('!p3') || v.includes('basse') || v.includes('low')) {
    return 'p3';
  }
  return null;
}

/** Narrowing frontière IPC (Rust String) → union CalendarEventKind. */
export function normalizeEventKind(raw: string | null | undefined): CalendarEventKind {
  if (raw === 'task' || raw === 'inline' || raw === 'due') return raw;
  return 'inline';
}

/** Forme brute acceptée avant normalisation (IPC / scan). */
type RawCalendarEvent = Omit<CalendarEvent, 'kind' | 'priority'> & {
  kind?: string;
  priority?: string | null;
};

/** Couleur d'accent pour badges / pastilles de priorité. */
export function priorityAccentColor(priority: CalendarEventPriority | null | undefined): string {
  if (priority === 'p1') return '#ef4444';
  if (priority === 'p2') return 'var(--knit-primary)';
  if (priority === 'p3') return 'var(--knit-text-muted)';
  return 'var(--knit-primary)';
}

/** Fond translucide pour badges `!pN`. */
export function priorityBadgeBackground(priority: CalendarEventPriority | null | undefined): string {
  if (priority === 'p1') return 'rgba(239, 68, 68, 0.15)';
  if (priority === 'p2') return 'rgba(234, 179, 8, 0.15)';
  return 'var(--knit-primary-alpha)';
}

export function filterCalendarEvents(
  events: CalendarEvent[],
  mode: CalendarFilterMode,
  selfName: string,
  collaborator?: string
): CalendarEvent[] {
  if (mode === 'all') return events;
  if (mode === 'collaborator' && collaborator) {
    const target = collaborator.toLowerCase();
    return events.filter((e) => (e.assignee || '').toLowerCase().includes(target));
  }
  const me = selfName.trim().toLowerCase();
  return events.filter((e) => {
    const a = (e.assignee || '').trim().toLowerCase();
    if (!a || a === 'vault') return true;
    if (me && (a === me || a.includes(me) || me.includes(a))) return true;
    return false;
  });
}

/** Applique filtres collaborateur + statut + priorité. */
export function applyCalendarFilters(
  events: CalendarEvent[],
  opts: {
    filterMode: CalendarFilterMode;
    selfName: string;
    collaborator?: string;
    statusFilter?: CalendarStatusFilter;
    priorityFilter?: CalendarPriorityFilter;
  }
): CalendarEvent[] {
  let list = filterCalendarEvents(
    events,
    opts.filterMode,
    opts.selfName,
    opts.collaborator
  );
  const status = opts.statusFilter ?? 'all';
  if (status === 'todo') {
    list = list.filter((e) => !e.completed);
  } else if (status === 'done') {
    list = list.filter((e) => Boolean(e.completed));
  }
  const prio = opts.priorityFilter ?? 'all';
  if (prio !== 'all') {
    list = list.filter((e) => e.priority === prio);
  }
  return list;
}

/** Normalise kind + priorités d'un index agenda (frontière IPC / scan local). */
export function normalizeCalendarIndex(data: {
  events: RawCalendarEvent[];
}): CalendarIndexData {
  return {
    events: data.events.map((ev) => ({
      ...ev,
      kind: normalizeEventKind(ev.kind),
      priority: normalizePriority(
        typeof ev.priority === 'string' ? ev.priority : ev.priority ?? null
      ),
    })),
  };
}

export function formatEventTime(ev: CalendarEvent): string {
  if (ev.startTime && ev.endTime) return `${ev.startTime} - ${ev.endTime}`;
  if (ev.startTime) return ev.startTime;
  return '';
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** En-têtes jours pour mini-grilles sidebar / widget. */
export const WEEKDAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

/** En-têtes jours pour la vue Agenda pleine. */
export const WEEKDAYS_LONG = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] as const;

/** Grille mensuelle 6×7 (lundi → dimanche) partagée widget / pane / vue. */
export function buildMonthGridCells(year: number, month: number): MonthGridCell[] {
  const first = new Date(year, month, 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { d, iso: formatIsoDate(d), inMonth: d.getMonth() === month };
  });
}

export function collectDatesWithEvents(events: CalendarEvent[]): Set<string> {
  const set = new Set<string>();
  for (const e of events) set.add(e.date);
  return set;
}

/** Extrait le dossier parent relatif d'un chemin de fichier (ex: 'projets/alpha/agenda.md' -> 'projets/alpha') */
export function getParentFolder(relPath: string): string {
  const clean = relPath.replace(/\\/g, '/');
  const idx = clean.lastIndexOf('/');
  return idx > 0 ? clean.substring(0, idx) : '';
}

/**
 * Filtre les événements selon la portée :
 * - Mode 'vault' / fichier racine / chemin virtuel legacy / `activeFilePath` null (modale) -> Tout le coffre
 * - Mode 'scoped' -> Restreint aux événements du dossier hôte et de tous ses sous-dossiers enfants
 */
export function filterCalendarEventsByScope(
  events: CalendarEvent[],
  activeFilePath?: string | null,
  scopeMode: 'scoped' | 'vault' = 'scoped'
): CalendarEvent[] {
  if (scopeMode === 'vault' || !activeFilePath) return events;
  if (activeFilePath.startsWith('knit://') || activeFilePath === 'agenda.md') return events;

  const folder = getParentFolder(activeFilePath);
  if (!folder) return events; // Au niveau racine du coffre

  return events.filter((e) => {
    const clean = e.relPath.replace(/\\/g, '/');
    return clean.startsWith(folder + '/') || clean === folder;
  });
}

/**
 * Bascule l'état d'achèvement d'une tâche (- [ ] <-> - [x]) sur la ligne spécifiée
 */
export function toggleTaskCompletionInContent(
  content: string,
  lineNum: number,
  currentCompleted?: boolean
): string {
  const lines = content.split('\n');
  const idx = lineNum - 1;
  if (idx < 0 || idx >= lines.length) return content;
  const line = lines[idx];
  if (currentCompleted) {
    lines[idx] = line.replace(/-\s*\[[xX]\]/, '- [ ]');
  } else {
    lines[idx] = line.replace(/-\s*\[\s*\]/, '- [x]');
  }
  return lines.join('\n');
}

/**
 * Met à jour ou retire la priorité (!p1, !p2, !p3) d'un événement sur la ligne spécifiée
 */
export function updateEventPriorityInContent(
  content: string,
  lineNum: number,
  newPriority: TaskPriority | null
): string {
  const lines = content.split('\n');
  const idx = lineNum - 1;
  if (idx < 0 || idx >= lines.length) return content;
  let line = lines[idx];
  line = line.replace(/\s*!p[123]\b/g, '');
  if (newPriority) {
    line = `${line.trimEnd()} !${newPriority}`;
  }
  lines[idx] = line;
  return lines.join('\n');
}

/**
 * Ajoute un nouvel événement / tâche formatée en Markdown à la fin du contenu
 */
export function appendEventToContent(
  content: string,
  event: {
    title: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    assignee?: string | null;
    priority?: TaskPriority | null;
  }
): string {
  let timePart = '';
  if (event.startTime && event.endTime) {
    timePart = ` ${event.startTime}-${event.endTime}`;
  } else if (event.startTime) {
    timePart = ` ${event.startTime}`;
  }
  const assigneePart = event.assignee ? ` @${event.assignee}` : '';
  const priorityPart = event.priority ? ` !${event.priority}` : '';
  const taskLine = `- [ ] ${event.title} @${event.date}${timePart}${assigneePart}${priorityPart}`;

  const trimmed = content.trimEnd();
  return trimmed ? `${trimmed}\n${taskLine}\n` : `${taskLine}\n`;
}

/** Regroupe les événements filtrés pour la vue Liste (horizon temporel). */
export function groupEventsByHorizon(
  events: CalendarEvent[],
  todayIso: string,
  now: Date = new Date()
): CalendarHorizonGroup[] {
  const overdue: CalendarEvent[] = [];
  const todayList: CalendarEvent[] = [];
  const thisWeekList: CalendarEvent[] = [];
  const thisMonthList: CalendarEvent[] = [];
  const later: CalendarEvent[] = [];

  const weekStart = startOfWeek(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const weekEndIso = formatIsoDate(weekEnd);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  for (const ev of events) {
    if (!ev.completed && ev.date < todayIso) {
      overdue.push(ev);
    } else if (ev.date === todayIso) {
      todayList.push(ev);
    } else if (ev.date > todayIso && ev.date < weekEndIso) {
      thisWeekList.push(ev);
    } else {
      const evDate = new Date(`${ev.date}T00:00:00`);
      if (evDate.getMonth() === currentMonth && evDate.getFullYear() === currentYear) {
        thisMonthList.push(ev);
      } else {
        later.push(ev);
      }
    }
  }

  const groups: CalendarHorizonGroup[] = [
    { id: 'overdue', title: 'En retard', items: overdue, color: '#ef4444' },
    { id: 'today', title: "Aujourd'hui", items: todayList, color: 'var(--knit-primary)' },
    { id: 'week', title: 'Cette semaine', items: thisWeekList, color: '#10b981' },
    { id: 'month', title: 'Ce mois-ci', items: thisMonthList, color: '#3b82f6' },
    { id: 'later', title: 'Plus tard', items: later, color: 'var(--knit-text-muted)' },
  ];
  return groups.filter((g) => g.items.length > 0);
}
