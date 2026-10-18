/**
 * Moteur de requêtes Frontmatter en mémoire (B-031e)
 * Parseur déclaratif des blocs knit-* et évaluation from / where / sort / columns.
 */

import type {
  BlockOptions,
  FrontmatterIndexEntry,
  QueryFilter,
  QueryResult,
  QueryResultRow,
  QuerySortSpec,
  QueryWhereClause,
  QueryWhereOperator,
} from '../types';

/**
 * Parse le corps d'un fence déclaratif (clé: valeur) en options typées.
 */
export function parseBlockOptions(body: string): BlockOptions {
  const options: BlockOptions = {};
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const colonIdx = line.indexOf(':');
    if (colonIdx <= 0) continue;

    const key = line.slice(0, colonIdx).trim();
    let rawValue = line.slice(colonIdx + 1).trim();
    if (!key) continue;

    if (
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
    ) {
      options[key] = rawValue.slice(1, -1);
      continue;
    }

    if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      const inner = rawValue.slice(1, -1).trim();
      if (!inner) {
        options[key] = [];
      } else {
        options[key] = inner.split(',').map((s) => {
          const t = s.trim();
          if (
            (t.startsWith('"') && t.endsWith('"')) ||
            (t.startsWith("'") && t.endsWith("'"))
          ) {
            return t.slice(1, -1);
          }
          return t;
        });
      }
      continue;
    }

    if (rawValue === 'true' || rawValue === 'false') {
      options[key] = rawValue === 'true';
      continue;
    }

    const asNum = Number(rawValue);
    if (rawValue !== '' && Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(rawValue)) {
      options[key] = asNum;
      continue;
    }

    options[key] = rawValue;
  }
  return options;
}

export function parseWhereExpression(expr: string): QueryWhereClause | null {
  const trimmed = expr.trim();
  if (!trimmed) return null;

  for (const op of ['!=', '==', 'contains', '>', '<', '='] as QueryWhereOperator[]) {
    const idx = trimmed.indexOf(` ${op} `);
    if (idx > 0) {
      const field = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + op.length + 2).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return { field, operator: op, value };
    }
  }

  // Fallback: field=value without spaces
  const eqIdx = trimmed.search(/!=|==|=/);
  if (eqIdx > 0) {
    const match = trimmed.match(/^(\S+)\s*(!=|==|=)\s*(.+)$/);
    if (match) {
      let value = match[3].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return {
        field: match[1],
        operator: match[2] as QueryWhereOperator,
        value,
      };
    }
  }

  return null;
}

export function parseSortExpression(expr: string): QuerySortSpec | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return null;
  const field = parts[0];
  const direction = parts[1]?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  return { field, direction };
}

export function blockOptionsToQueryFilter(options: BlockOptions): QueryFilter {
  const filter: QueryFilter = {};

  if (typeof options.from === 'string') {
    filter.from = options.from.replace(/^["']|["']$/g, '');
  }

  if (typeof options.where === 'string') {
    const clause = parseWhereExpression(options.where);
    if (clause) filter.where = [clause];
  }

  if (typeof options.sort === 'string') {
    const sort = parseSortExpression(options.sort);
    if (sort) filter.sort = [sort];
  }

  if (Array.isArray(options.columns)) {
    filter.columns = options.columns.map(String);
  } else if (typeof options.columns === 'string') {
    filter.columns = options.columns
      .replace(/^\[|\]$/g, '')
      .split(',')
      .map((s) => s.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean);
  }

  if (typeof options.limit === 'number') {
    filter.limit = options.limit;
  } else if (typeof options.limit === 'string' && /^\d+$/.test(options.limit)) {
    filter.limit = Number(options.limit);
  }

  return filter;
}

function getFieldValue(entry: FrontmatterIndexEntry, field: string): string {
  const key = field.toLowerCase();
  if (key === 'path') return entry.path;
  if (key === 'name') return entry.name;
  if (key === 'title' || key === 'titre') return entry.title;
  if (key === 'type' || key === 'doc_type') return entry.docType;
  if (key === 'updated' || key === 'mtime') return String(entry.mtime);
  if (entry.fields[field] !== undefined) return entry.fields[field];
  // Case-insensitive lookup
  for (const [k, v] of Object.entries(entry.fields)) {
    if (k.toLowerCase() === key) return v;
  }
  return '';
}

function evaluateWhere(entry: FrontmatterIndexEntry, clause: QueryWhereClause): boolean {
  const left = getFieldValue(entry, clause.field);
  const right = clause.value;

  switch (clause.operator) {
    case '!=':
      return left !== right;
    case 'contains':
      return left.toLowerCase().includes(right.toLowerCase());
    case '>':
      return left > right;
    case '<':
      return left < right;
    case '=':
    case '==':
    default:
      return left === right;
  }
}

function compareEntries(
  a: FrontmatterIndexEntry,
  b: FrontmatterIndexEntry,
  sort: QuerySortSpec
): number {
  if (sort.field === 'updated' || sort.field === 'mtime') {
    const diff = a.mtime - b.mtime;
    return sort.direction === 'asc' ? diff : -diff;
  }
  const av = getFieldValue(a, sort.field);
  const bv = getFieldValue(b, sort.field);
  const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base', numeric: true });
  return sort.direction === 'asc' ? cmp : -cmp;
}

/**
 * Exécute une requête pure en mémoire sur l'index Frontmatter.
 */
export function runQuery(
  entries: Iterable<FrontmatterIndexEntry>,
  filter: QueryFilter
): QueryResult {
  const fromPrefix = filter.from
    ? filter.from.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
    : '';

  let matched = Array.from(entries).filter((entry) => {
    const normPath = entry.path.replace(/\\/g, '/');
    if (fromPrefix) {
      if (
        !(
          normPath === fromPrefix ||
          normPath.startsWith(`${fromPrefix}/`) ||
          normPath.startsWith(fromPrefix)
        )
      ) {
        return false;
      }
    }
    if (filter.where) {
      for (const clause of filter.where) {
        if (!evaluateWhere(entry, clause)) return false;
      }
    }
    return true;
  });

  if (filter.sort && filter.sort.length > 0) {
    const specs = filter.sort;
    matched = matched.sort((a, b) => {
      for (const spec of specs) {
        const c = compareEntries(a, b, spec);
        if (c !== 0) return c;
      }
      return 0;
    });
  }

  if (filter.limit !== undefined && filter.limit >= 0) {
    matched = matched.slice(0, filter.limit);
  }

  const columns =
    filter.columns && filter.columns.length > 0
      ? filter.columns
      : ['titre', 'statut', 'priorite', 'path'];

  const rows: QueryResultRow[] = matched.map((entry) => {
    const values: Record<string, string> = {};
    for (const col of columns) {
      values[col] = getFieldValue(entry, col);
    }
    return {
      path: entry.path,
      name: entry.name,
      title: entry.title,
      mtime: entry.mtime,
      values,
    };
  });

  return { columns, rows };
}

/**
 * Liste les fichiers d'un dossier à partir de l'index (B-031f).
 */
export function listFolderEntries(
  entries: Iterable<FrontmatterIndexEntry>,
  folder: string,
  sortExpr?: string,
  limit?: number
): FrontmatterIndexEntry[] {
  const prefix = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  let matched = Array.from(entries).filter((entry) => {
    const norm = entry.path.replace(/\\/g, '/');
    if (!prefix) return true;
    if (!norm.startsWith(`${prefix}/`)) return false;
    // Uniquement fichiers directs ou récursifs : récursif par défaut
    return true;
  });

  const sort = sortExpr ? parseSortExpression(sortExpr) : { field: 'updated', direction: 'desc' as const };
  if (sort) {
    matched = matched.sort((a, b) => compareEntries(a, b, sort));
  }

  if (limit !== undefined && limit >= 0) {
    matched = matched.slice(0, limit);
  }

  return matched;
}
