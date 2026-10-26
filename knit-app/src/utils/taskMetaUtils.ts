/**
 * Parseurs défensifs à la frontière IPC / index local :
 * Rust expose encore `String` pour statut / priorité / doc_type ;
 * le TS consomme des unions métier strictes.
 */

import type {
  DocType,
  RawSuggestDocItem,
  RawTaskCard,
  SuggestDocItem,
  SuggestIndexData,
  TaskCard,
  VaultTaskPriorite,
  VaultTaskStatut,
} from '../types';
import { isDocType } from '../types';

const VAULT_STATUTS: readonly VaultTaskStatut[] = [
  'backlog',
  'a-faire',
  'en-cours',
  'en-revue',
  'termine',
  'bloque',
] as const;

const VAULT_PRIORITES: readonly VaultTaskPriorite[] = [
  'basse',
  'moyenne',
  'haute',
  'urgente',
  'critique',
] as const;

const STATUT_ALIASES: Record<string, VaultTaskStatut> = {
  todo: 'a-faire',
  'to-do': 'a-faire',
  'a faire': 'a-faire',
  'in-progress': 'en-cours',
  'in_progress': 'en-cours',
  doing: 'en-cours',
  'en cours': 'en-cours',
  review: 'en-revue',
  'en revue': 'en-revue',
  done: 'termine',
  terminé: 'termine',
  completed: 'termine',
  blocked: 'bloque',
  bloqué: 'bloque',
};

const PRIORITE_ALIASES: Record<string, VaultTaskPriorite> = {
  low: 'basse',
  medium: 'moyenne',
  med: 'moyenne',
  high: 'haute',
  urgent: 'urgente',
  p1: 'urgente',
  p2: 'haute',
  p3: 'basse',
  '!p1': 'urgente',
  '!p2': 'haute',
  '!p3': 'basse',
};

export function parseVaultTaskStatut(
  raw: string | null | undefined,
  fallback: VaultTaskStatut = 'a-faire'
): VaultTaskStatut {
  const key = (raw || '').trim().toLowerCase();
  if (!key) return fallback;
  if ((VAULT_STATUTS as readonly string[]).includes(key)) {
    return key as VaultTaskStatut;
  }
  return STATUT_ALIASES[key] ?? fallback;
}

export function parseVaultTaskPriorite(
  raw: string | null | undefined
): VaultTaskPriorite | undefined {
  const key = (raw || '').trim().toLowerCase();
  if (!key) return undefined;
  if ((VAULT_PRIORITES as readonly string[]).includes(key)) {
    return key as VaultTaskPriorite;
  }
  return PRIORITE_ALIASES[key];
}

export function parseSuggestDocType(
  raw: string | null | undefined,
  fallback: DocType = 'note'
): DocType {
  const key = (raw || '').trim().toLowerCase();
  if (key === 'markdown') return 'note';
  if (isDocType(key)) return key;
  return fallback;
}

export function normalizeTaskCard(raw: RawTaskCard): TaskCard {
  return {
    rel_path: raw.rel_path,
    id: raw.id,
    titre: raw.titre,
    statut: parseVaultTaskStatut(raw.statut),
    priorite: parseVaultTaskPriorite(raw.priorite ?? undefined),
    assigne: raw.assigne ?? undefined,
    sprint: raw.sprint ?? undefined,
    echeance: raw.echeance ?? undefined,
    tags: raw.tags ?? [],
    snippet: raw.snippet ?? '',
  };
}

export function normalizeSuggestDocItem(raw: RawSuggestDocItem): SuggestDocItem {
  return {
    rel_path: raw.rel_path,
    title: raw.title,
    doc_type: parseSuggestDocType(raw.doc_type),
  };
}

export function normalizeSuggestIndexData(raw: {
  docs: RawSuggestDocItem[];
  headings: SuggestIndexData['headings'];
  tags: SuggestIndexData['tags'];
}): SuggestIndexData {
  return {
    docs: raw.docs.map(normalizeSuggestDocItem),
    headings: raw.headings,
    tags: raw.tags,
  };
}
