export type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'knit-theme-mode';
const HUE_STORAGE_KEY = 'knit-theme-hue';

export const DEFAULT_HUE = 260; // Violet sobre

export function getStoredTheme(): ThemeMode {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') {
    return saved;
  }
  // Détecte la préférence système
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'dark'; // Mode sombre par défaut pour un look artisanal sobre Obsidian
}

export function getStoredHue(): number {
  const saved = localStorage.getItem(HUE_STORAGE_KEY);
  if (saved) {
    const parsed = parseInt(saved, 10);
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
