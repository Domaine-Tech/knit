/**
 * Sélecteur déroulant Knit (DOM) — DA unifiée avec menus contextuels.
 * Remplace les <select> natifs dont le popup OS n'est pas stylable.
 */

import type { KnitSelectDomOptions } from '../types';
import { preventMiddleCompass } from './domUtils';

export type { KnitSelectDomOptions };

let openMenuEl: HTMLElement | null = null;
let openRootEl: HTMLElement | null = null;
let openCleanup: (() => void) | null = null;

function closeOpenMenu(): void {
  if (openCleanup) {
    openCleanup();
    openCleanup = null;
  }
  if (openMenuEl) {
    openMenuEl.remove();
    openMenuEl = null;
  }
  if (openRootEl) {
    openRootEl.classList.remove('is-open');
    const trigger = openRootEl.querySelector('.knit-select-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    openRootEl = null;
  }
}

function positionMenu(menu: HTMLElement, trigger: HTMLElement): void {
  const rect = trigger.getBoundingClientRect();
  const pad = 8;
  const menuWidth = Math.max(rect.width, 140);
  menu.style.minWidth = `${menuWidth}px`;
  menu.style.maxWidth = `${Math.min(280, window.innerWidth - pad * 2)}px`;

  // Mesure après insertion
  const mh = menu.offsetHeight;
  const spaceBelow = window.innerHeight - rect.bottom - pad;
  const spaceAbove = rect.top - pad;
  const placeAbove = spaceBelow < mh && spaceAbove > spaceBelow;

  let top = placeAbove ? rect.top - mh - 4 : rect.bottom + 4;
  let left = rect.left;

  if (left + menuWidth > window.innerWidth - pad) {
    left = window.innerWidth - pad - menuWidth;
  }
  if (left < pad) left = pad;
  if (top < pad) top = pad;
  if (top + mh > window.innerHeight - pad) {
    top = Math.max(pad, window.innerHeight - pad - mh);
  }

  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
}

/**
 * Construit un sélecteur custom conforme à forms.css / menus Knit.
 */
export function createKnitSelectDom(opts: KnitSelectDomOptions): HTMLElement {
  const root = document.createElement('div');
  root.className = ['knit-select-root', opts.className].filter(Boolean).join(' ');
  if (opts.minWidth !== undefined) {
    root.style.minWidth =
      typeof opts.minWidth === 'number' ? `${opts.minWidth}px` : opts.minWidth;
  }

  let currentValue = opts.value;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'knit-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');

  const valueEl = document.createElement('span');
  valueEl.className = 'knit-select-value';

  const chevron = document.createElement('span');
  chevron.className = 'knit-select-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML =
    '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

  trigger.appendChild(valueEl);
  trigger.appendChild(chevron);
  root.appendChild(trigger);

  const syncLabel = (): void => {
    const match = opts.options.find((o) => o.value === currentValue);
    valueEl.textContent = match?.label ?? currentValue;
  };
  syncLabel();

  const openMenu = (): void => {
    if (openRootEl === root) {
      closeOpenMenu();
      return;
    }
    closeOpenMenu();

    const menu = document.createElement('div');
    menu.className = 'knit-select-menu';
    menu.setAttribute('role', 'listbox');

    for (const opt of opts.options) {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'knit-select-option';
      item.setAttribute('role', 'option');
      item.setAttribute('data-value', opt.value);
      item.textContent = opt.label;
      if (opt.value === currentValue) {
        item.classList.add('is-selected');
        item.setAttribute('aria-selected', 'true');
      } else {
        item.setAttribute('aria-selected', 'false');
      }

      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (opt.value !== currentValue) {
          currentValue = opt.value;
          syncLabel();
          opts.onChange(opt.value);
        }
        closeOpenMenu();
        trigger.focus();
      });

      menu.appendChild(item);
    }

    document.body.appendChild(menu);
    positionMenu(menu, trigger);

    openMenuEl = menu;
    openRootEl = root;
    root.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');

    const onPointerDown = (e: MouseEvent): void => {
      const t = e.target as Node;
      if (menu.contains(t) || root.contains(t)) return;
      closeOpenMenu();
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeOpenMenu();
        trigger.focus();
      }
    };
    const onScroll = (): void => closeOpenMenu();
    const onResize = (): void => closeOpenMenu();

    window.addEventListener('mousedown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);

    openCleanup = () => {
      window.removeEventListener('mousedown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };

    // Focus première option sélectionnée
    const selected = menu.querySelector('.is-selected') as HTMLElement | null;
    (selected ?? menu.querySelector('.knit-select-option'))?.focus();
  };

  const stop = (e: Event): void => {
    if (opts.stopEditorEvents) {
      e.stopPropagation();
    }
  };

  trigger.addEventListener('mousedown', (e) => {
    preventMiddleCompass(e);
    // Dans un widget CM replace : empêcher la sélection d'entrer dans le fence
    if (opts.stopEditorEvents) {
      e.preventDefault();
      e.stopPropagation();
    } else {
      stop(e);
    }
  });
  trigger.addEventListener('click', (e) => {
    e.preventDefault();
    stop(e);
    openMenu();
  });

  // API légère pour mise à jour externe
  (root as HTMLElement & { setKnitSelectValue?: (v: string) => void }).setKnitSelectValue = (
    v: string
  ) => {
    currentValue = v;
    syncLabel();
  };

  return root;
}
