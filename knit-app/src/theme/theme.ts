import type { ThemeMode } from '../types';

export const COLLABORATIVE_PALETTE: readonly string[] = [
  '#3B82F6', // 0: Bleu Ardoise
  '#10B981', // 1: Émeraude Sauge
  '#D97706', // 2: Ambre Doré
  '#E11D48', // 3: Terre Cuite
  '#0891B2', // 4: Cyan Pétrole
  '#6366F1', // 5: Indigo Feutré
  '#DB2777', // 6: Rose Poudré
  '#C2410C', // 7: Cuivre Foncé
  '#0D9488', // 8: Vert Menthe
  '#9333EA', // 9: Lavande Douce
];

const THEME_STORAGE_KEY = 'knit-theme-mode';
const HUE_STORAGE_KEY = 'knit-theme-hue';

export const DEFAULT_HUE = 35; // Ambre Artisanal & Cuivre Doré (évite toute ressemblance avec Obsidian)

export function getStoredTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  // Détecte la préférence système
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'dark'; // Mode sombre par défaut pour un look artisanal sobre
}

export function getStoredHue(): number {
  const saved = localStorage.getItem(HUE_STORAGE_KEY);
  if (saved) {
    const parsed = parseInt(saved, 10);
    // Si l'utilisateur avait l'ancien violet Obsidian par défaut (260), on migre vers l'Ambre Knit
    if (parsed === 260) {
      localStorage.setItem(HUE_STORAGE_KEY, DEFAULT_HUE.toString());
      return DEFAULT_HUE;
    }
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 360) {
      return parsed;
    }
  }
  return DEFAULT_HUE;
}

export function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem(THEME_STORAGE_KEY, mode);
}

export function applyHue(hue: number) {
  const clamped = Math.max(0, Math.min(360, Math.round(hue)));
  document.documentElement.style.setProperty('--knit-hue', clamped.toString());
  localStorage.setItem(HUE_STORAGE_KEY, clamped.toString());
}
