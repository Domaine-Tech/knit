/**
 * Utilitaires de dates partagés (autocomplétion @@, échéances Markdown).
 */

/** Formate une date locale en YYYY-MM-DD. */
export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Alias Agenda — même sémantique que `formatIsoDate`. */
export const toIsoDate = formatIsoDate;

/**
 * Prochaine occurrence d'un jour de la semaine.
 * Convention JavaScript : 0 = dimanche, 1 = lundi, ..., 6 = samedi.
 * Si le jour demandé est aujourd'hui, renvoie la semaine suivante.
 */
export function getNextDayOfWeek(dayOfWeek: number): Date {
  const date = new Date();
  const current = date.getDay();
  let diff = dayOfWeek - current;
  if (diff <= 0) diff += 7;
  date.setDate(date.getDate() + diff);
  return date;
}
