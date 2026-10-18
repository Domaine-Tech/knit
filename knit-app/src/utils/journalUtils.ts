/**
 * Notes quotidiennes : chemin + template Markdown unique (B-031 / journal/).
 */

/** Chemin relatif `journal/YYYY-MM-DD.md`. */
export function journalPathForDate(iso: string): string {
  return `journal/${iso}.md`;
}

/** Corps Markdown pur pour une nouvelle note de journal. */
export function buildDailyJournalTemplate(iso: string): string {
  return `---
title: Journal du ${iso}
date: ${iso}
type: note
tags: [journal, quotidien]
---

# Journal du ${iso}

## Objectifs de la journée
- [ ] 

## Notes & Réflexions

## Idées & Découvertes

`;
}
