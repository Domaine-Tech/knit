/**
 * Helpers purs du profil personne (nom affiché, initiales, PIN démo).
 * Le défaut « Collaborateur » aligne le client sur `UNNAMED_DISPLAY_NAME` côté Rust.
 */

/** PIN LAN factice en mode Vite (démo) — source unique pour Wizard / networkStore. */
export const DEMO_LAN_PIN = '482915';

export function isUnnamedDisplay(name: string | null | undefined): boolean {
  const trimmed = (name ?? '').trim();
  return trimmed === '' || trimmed === 'Moi' || trimmed === 'Collaborateur';
}

export function initialsFromDisplayName(name: string): string {
  const words = name.trim().split(/\s+/).filter((part) => part.length > 0);
  if (words.length === 0) return 'AN';
  if (words.length === 1) {
    const chars = [...words[0]];
    if (chars.length >= 2) return `${chars[0]}${chars[1]}`.toUpperCase();
    return `${chars[0] ?? 'A'}X`.toUpperCase();
  }
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}
