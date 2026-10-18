/**
 * Mode navigation liens : clic simple (Mode Lecture / Zen) vs Ctrl/Cmd+clic (édition).
 * Consommé par CM6 et widgets Live Preview (DOM hors React).
 */
export const linkNavigateMode = {
  /** true = un clic suffit pour ouvrir un lien (Mode Zen / lecture). */
  simpleClick: false,
};

export function setSimpleLinkClick(enabled: boolean): void {
  linkNavigateMode.simpleClick = enabled;
}

/** true si l'événement doit déclencher la navigation vers la cible du lien. */
export function shouldNavigateOnLinkClick(e: {
  ctrlKey: boolean;
  metaKey: boolean;
  target?: EventTarget | null;
}): boolean {
  if (linkNavigateMode.simpleClick || e.ctrlKey || e.metaKey) return true;
  // Hover Preview : clic simple sur les liens (mode lecture interactive)
  const el = e.target instanceof Element ? e.target : null;
  if (el?.closest('.knit-editor-hover-preview, .knit-floating-hover-preview')) {
    return true;
  }
  return false;
}
