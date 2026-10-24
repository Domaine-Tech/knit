/**
 * Normalisation et construction locale de l'index coffre unifié (B-057).
 */

import type {
  CalendarEvent,
  FrontmatterIndexEntry,
  HeadingItem,
  IndexedInlineTask,
  IndexedMarkdownSlice,
  RawFrontmatterFileEntry,
  RawIndexedInlineTask,
  RawVaultIndexData,
  SuggestIndexData,
  VaultIndexData,
} from '../types';
import { detectDocType, parseSimpleFrontmatter, slugify } from './markdownUtils';
import { normalizeTaskStatus } from './kanbanParser';
import { buildLocalCalendarIndex, normalizeCalendarIndex } from './calendarUtils';
import { normalizeSuggestIndexData, parseSuggestDocType } from './taskMetaUtils';
import { fileStem } from './treeUtils';

const TASK_LINE_RE = /^(\s*[-*]\s*)\[([ xX/\-?>!])\](\s+)(.*)$/;
const INLINE_TAG_RE = /(?:^|\s)#([a-zA-Z0-9_/-]+)/g;

function extractLocalHeadings(relPath: string, content: string): HeadingItem[] {
  const headings: HeadingItem[] = [];
  let inCode = false;
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    if (trimmed.startsWith('# ')) {
      const text = trimmed.slice(2).trim();
      headings.push({ file_rel: relPath, level: 1, text, slug: slugify(text) });
    } else if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3).trim();
      headings.push({ file_rel: relPath, level: 2, text, slug: slugify(text) });
    } else if (trimmed.startsWith('### ')) {
      const text = trimmed.slice(4).trim();
      headings.push({ file_rel: relPath, level: 3, text, slug: slugify(text) });
    }
  }
  return headings;
}

function extractLocalTags(fields: Record<string, string>, body: string): string[] {
  const tags: string[] = [];
  const raw = fields.tags;
  if (raw) {
    const clean = raw.replace(/^\[/, '').replace(/\]$/, '');
    for (const part of clean.split(',')) {
      const t = part.trim().replace(/^['"#]+|['"]+$/g, '');
      if (t) tags.push(t);
    }
  }
  for (const m of body.matchAll(INLINE_TAG_RE)) {
    tags.push(m[1]);
  }
  return tags;
}

function extractLocalTasks(relPath: string, content: string): IndexedInlineTask[] {
  const tasks: IndexedInlineTask[] = [];
  let inCode = false;
  const lines = content.split(/\r?\n/);
  lines.forEach((rawLine, lineIndex) => {
    const trimmed = rawLine.trimStart();
    if (trimmed.startsWith('```')) {
      inCode = !inCode;
      return;
    }
    if (inCode) return;
    const m = rawLine.match(TASK_LINE_RE);
    if (!m) return;
    tasks.push({
      path: relPath,
      lineIndex,
      status: normalizeTaskStatus(m[2]),
      text: m[4],
      rawLine,
    });
  });
  return tasks;
}

export function normalizeFrontmatterFileEntry(
  raw: RawFrontmatterFileEntry
): FrontmatterIndexEntry {
  const docRaw = raw.docType ?? raw.doc_type ?? 'note';
  return {
    path: raw.path.replace(/\\/g, '/'),
    name: raw.name,
    title: raw.title,
    docType: parseSuggestDocType(docRaw),
    mtime: Number(raw.mtime) || Date.now(),
    fields: { ...(raw.fields || {}) },
  };
}

export function normalizeIndexedInlineTask(raw: RawIndexedInlineTask): IndexedInlineTask {
  return {
    path: raw.path.replace(/\\/g, '/'),
    lineIndex: raw.lineIndex ?? raw.line_index ?? 0,
    status: normalizeTaskStatus(raw.status),
    text: raw.text,
    rawLine: raw.rawLine ?? raw.raw_line ?? '',
  };
}

export function normalizeVaultIndexData(raw: RawVaultIndexData): VaultIndexData {
  return {
    generation: Number(raw.generation) || 0,
    suggest: normalizeSuggestIndexData(raw.suggest),
    files: (raw.files || []).map(normalizeFrontmatterFileEntry),
    tasks: (raw.tasks || []).map(normalizeIndexedInlineTask),
    calendar: normalizeCalendarIndex(raw.calendar),
  };
}

export function normalizeIndexedMarkdownSlice(raw: {
  file: RawFrontmatterFileEntry;
  headings: HeadingItem[];
  fileTags?: string[];
  file_tags?: string[];
  tasks: RawIndexedInlineTask[];
  calendarEvents?: CalendarEvent[];
  calendar_events?: CalendarEvent[];
}): IndexedMarkdownSlice {
  return {
    file: normalizeFrontmatterFileEntry(raw.file),
    headings: raw.headings || [],
    fileTags: raw.fileTags ?? raw.file_tags ?? [],
    tasks: (raw.tasks || []).map(normalizeIndexedInlineTask),
    calendarEvents: normalizeCalendarIndex({
      events: raw.calendarEvents ?? raw.calendar_events ?? [],
    }).events,
  };
}

/** Indexe un fichier en mémoire (démo Vite / fallback hors Tauri). */
export function indexMarkdownContentLocal(
  relPath: string,
  content: string,
  mtime?: number
): IndexedMarkdownSlice {
  const key = relPath.replace(/\\/g, '/');
  const { fields, body } = parseSimpleFrontmatter(content);
  const name = key.split('/').pop() || key;
  const headings = extractLocalHeadings(key, content);
  let title = fields.titre || fields.title || '';
  if (!title) {
    const h1 = headings.find((h) => h.level === 1);
    title = h1?.text || fileStem(key) || name;
  }
  const docType = detectDocType(
    fields.type ? `---\ntype: ${fields.type}\n---\n` : content,
    key
  );
  return {
    file: {
      path: key,
      name,
      title,
      docType,
      mtime: mtime ?? Date.now(),
      fields: { ...fields },
    },
    headings,
    fileTags: extractLocalTags(fields, body),
    tasks: extractLocalTasks(key, content),
    calendarEvents: normalizeCalendarIndex(
      buildLocalCalendarIndex({ [key]: content })
    ).events,
  };
}

/** Une seule passe sur les contenus locaux (mode démo). */
export function buildLocalVaultIndex(
  contents: Record<string, string>,
  mtimes?: Record<string, number>,
  generation = 0
): VaultIndexData {
  const slices: IndexedMarkdownSlice[] = [];
  for (const [path, content] of Object.entries(contents)) {
    const key = path.replace(/\\/g, '/');
    const lower = key.toLowerCase();
    if (!lower.endsWith('.md') && !lower.endsWith('.markdown') && !key.endsWith('KNIT.md')) {
      continue;
    }
    slices.push(indexMarkdownContentLocal(key, content, mtimes?.[key]));
  }

  const tagCounts: Record<string, number> = {};
  const docs: SuggestIndexData['docs'] = [];
  const headings: HeadingItem[] = [];
  const files: FrontmatterIndexEntry[] = [];
  const tasks: IndexedInlineTask[] = [];
  const events: CalendarEvent[] = [];

  for (const slice of slices) {
    docs.push({
      rel_path: slice.file.path,
      title: slice.file.title,
      doc_type: slice.file.docType,
    });
    headings.push(...slice.headings);
    for (const tag of slice.fileTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
    files.push(slice.file);
    tasks.push(...slice.tasks);
    events.push(...slice.calendarEvents);
  }

  docs.sort((a, b) => a.rel_path.localeCompare(b.rel_path));
  headings.sort((a, b) => a.file_rel.localeCompare(b.file_rel));
  files.sort((a, b) => a.path.localeCompare(b.path));
  events.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  const tags = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return {
    generation,
    suggest: { docs, headings, tags },
    files,
    tasks,
    calendar: { events },
  };
}
