/**
 * Types Agenda / KnitCalendarIndex (B-031a)
 */

import type {
  Dispatch,
  DragEvent,
  MouseEvent,
  MutableRefObject,
  SetStateAction,
} from 'react';
import type { TaskPriority } from './kanban';

/** Alias Agenda — même union que `TaskPriority`. */
export type CalendarEventPriority = TaskPriority;

export type CalendarEventKind = 'task' | 'inline' | 'due';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  assignee?: string | null;
  relPath: string;
  line: number;
  sourceSpan: string;
  kind: CalendarEventKind;
  completed?: boolean;
  priority?: CalendarEventPriority | null;
}

export interface CalendarIndexData {
  events: CalendarEvent[];
}

export type CalendarViewMode = 'month' | 'week' | 'day' | 'list';

export type CalendarFilterMode = 'all' | 'mine-vault' | 'collaborator';

export type CalendarScopeMode = 'scoped' | 'vault';

export type CalendarStatusFilter = 'all' | 'todo' | 'done';

export type CalendarPriorityFilter = 'all' | CalendarEventPriority;

/** Options d'ouverture depuis l'Agenda (Ctrl/Cmd+clic / molette → nouvel onglet). */
export type CalendarOpenFileOpts = { newTab?: boolean };

/** Cellule de grille mensuelle 6×7 (lundi → dimanche). */
export interface MonthGridCell {
  d: Date;
  iso: string;
  inMonth: boolean;
}

/** Jour de la vue semaine Agenda. */
export interface CalendarWeekDay {
  date: Date;
  iso: string;
}

/** Cible de drop DnD (jour ISO + index optionnel dans la liste du jour). */
export interface CalendarDropTarget {
  date: string;
  index?: number;
}

/** Groupe d'événements pour la vue Liste (horizon temporel). */
export interface CalendarHorizonGroup {
  id: 'overdue' | 'today' | 'week' | 'month' | 'later';
  title: string;
  color: string;
  items: CalendarEvent[];
}

/** Paramètres du hook `useCalendarInteractions`. */
export interface UseCalendarInteractionsParams {
  events: CalendarEvent[];
  readOnly: boolean;
  reload: () => Promise<void>;
  onOpenFile: (path: string, line?: number, opts?: CalendarOpenFileOpts) => void;
  openQuickAdd: (iso: string) => void;
  setCursor: (date: Date) => void;
  setViewMode: (mode: CalendarViewMode) => void;
  cancelHoverPreview: (force?: boolean) => void;
}

/** Résultat du hook `useCalendarInteractions`. */
export interface UseCalendarInteractionsResult {
  dragEventId: string | null;
  setDragEventId: Dispatch<SetStateAction<string | null>>;
  dropTarget: CalendarDropTarget | null;
  setDropTarget: Dispatch<SetStateAction<CalendarDropTarget | null>>;
  dropTargetRef: MutableRefObject<CalendarDropTarget | null>;
  moveEventToDate: (ev: CalendarEvent, newDate: string) => Promise<void>;
  handleToggleComplete: (ev: CalendarEvent) => Promise<void>;
  handleUpdatePriority: (
    ev: CalendarEvent,
    newPriority: CalendarEventPriority | null
  ) => Promise<void>;
  handleDropOnDay: (iso: string, e?: DragEvent) => Promise<void>;
  handleChipDragOver: (e: DragEvent, date: string, index: number) => void;
  handleDayContextMenu: (e: MouseEvent, iso: string) => void;
  handleEventContextMenu: (e: MouseEvent, ev: CalendarEvent) => void;
  onChipDragStart: (event: CalendarEvent, e: DragEvent) => void;
  onChipDragEnd: () => void;
}
