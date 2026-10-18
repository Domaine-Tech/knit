/**
 * Bus & résolution Hover Preview (B-053) — partagé éditeur, agenda, graphe, etc.
 */
import type { EditorView } from '@codemirror/view';
import { vaultStore } from '../stores/vaultStore';
import { tabStore } from '../stores/tabStore';
import { toast } from '../stores/toastStore';
import type {
  ClampPreviewPositionOptions,
  DocType,
  HoverPreviewData,
  HoverPreviewPayload,
  KnitHoverLinkDetail,
} from '../types';
import { detectDocType, slugify } from './markdownUtils';
import { docTypeToIconName } from './docTypeRegistry';
import { findVaultNode, isMediaFilePath } from './treeUtils';
import { scrollHeadingIntoView } from './editorUtils';

export type {
  ClampPreviewPositionOptions,
  HoverPreviewPayload,
  KnitHoverLinkDetail,
};

/** Ref synchronisée par HoverPreviewHost — lue par CodeMirror (mousemove). */
export const hoverPreviewPinnedRef = { current: false };

/** Dimensions stables du panneau Hover Preview (pin = bordure seule, zéro saut). */
export const HOVER_PREVIEW_WIDTH = 380;
/** Largeur élargie pour vues immersives (kanban, canvas, agenda…). */
export const HOVER_PREVIEW_IMMERSIVE_WIDTH = 540;
/** Hauteur estimée (titre + corps + footer) — 1er frame avant mesure réelle. */
export const HOVER_PREVIEW_EST_HEIGHT = 320;
/** Écart curseur ↔ panneau : zéro superposition souris / aperçu. */
const CURSOR_GAP = 20;
const VIEWPORT_MARGIN = 12;

/** Types Doc-Driven qui bénéficient d'un panneau hover plus large. */
export const IMMERSIVE_HOVER_DOC_TYPES: ReadonlySet<DocType> = new Set([
  'kanban',
  'table',
  'calendar',
  'canvas',
  'slides',
  'gallery',
]);

export function hoverPreviewWidthForDocType(docType?: DocType): number {
  if (docType && IMMERSIVE_HOVER_DOC_TYPES.has(docType)) {
    return HOVER_PREVIEW_IMMERSIVE_WIDTH;
  }
  return HOVER_PREVIEW_WIDTH;
}

/**
 * Verrouille un rectangle (x, y, w, h) dans la fenêtre root (viewport) — marge 12px.
 */
export function clampRectToViewport(
  x: number,
  y: number,
  w: number,
  h: number
): { x: number; y: number } {
  const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - w - VIEWPORT_MARGIN);
  const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - h - VIEWPORT_MARGIN);
  return {
    x: Math.min(Math.max(VIEWPORT_MARGIN, x), maxX),
    y: Math.min(Math.max(VIEWPORT_MARGIN, y), maxY),
  };
}

/**
 * Placement ancré sur la souris + fenêtre root uniquement.
 * Préfère bas-droite du curseur ; bascule gauche / haut si manque de place ;
 * garde un gap pour ne jamais recouvrir le pointeur.
 */
export function clampPreviewPosition(
  clientX: number,
  clientY: number,
  options?: ClampPreviewPositionOptions
): { x: number; y: number } {
  const opts = options ?? {};
  const w = opts.width ?? hoverPreviewWidthForDocType(opts.docType);
  const h = Math.min(
    opts.height ?? HOVER_PREVIEW_EST_HEIGHT,
    Math.max(120, window.innerHeight - VIEWPORT_MARGIN * 2)
  );
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Horizontal : droite du curseur si ça tient, sinon gauche
  const fitsRight = clientX + CURSOR_GAP + w <= vw - VIEWPORT_MARGIN;
  const fitsLeft = clientX - CURSOR_GAP - w >= VIEWPORT_MARGIN;
  let x: number;
  if (fitsRight) {
    x = clientX + CURSOR_GAP;
  } else if (fitsLeft) {
    x = clientX - CURSOR_GAP - w;
  } else {
    // Fenêtre étroite : côté avec le plus d'espace, puis clamp
    x =
      vw - clientX > clientX
        ? clientX + CURSOR_GAP
        : clientX - CURSOR_GAP - w;
  }

  // Vertical : sous le curseur si ça tient, sinon au-dessus
  const fitsBelow = clientY + CURSOR_GAP + h <= vh - VIEWPORT_MARGIN;
  const fitsAbove = clientY - CURSOR_GAP - h >= VIEWPORT_MARGIN;
  let y: number;
  if (fitsBelow) {
    y = clientY + CURSOR_GAP;
  } else if (fitsAbove) {
    y = clientY - CURSOR_GAP - h;
  } else {
    y =
      vh - clientY > clientY
        ? clientY + CURSOR_GAP
        : clientY - CURSOR_GAP - h;
  }

  return clampRectToViewport(x, y, w, h);
}

/**
 * Assemble un HoverPreviewData placé (payload + curseur + clamp).
 */
export function placeHoverPreviewData(
  payload: HoverPreviewPayload,
  clientX: number,
  clientY: number,
  options?: ClampPreviewPositionOptions
): HoverPreviewData {
  const placed = clampPreviewPosition(clientX, clientY, {
    docType: payload.docType,
    ...options,
  });
  return {
    ...payload,
    x: placed.x,
    y: placed.y,
    originX: clientX,
    originY: clientY,
  };
}

/**
 * Résolution unique primary + nested : DocType React pour vault ;
 * stubs HTML pour web / dossier / externe / ancre.
 * (Le nested non-pin est une contrainte UI portal uniquement.)
 */
export async function resolveHoverPreviewPayload(
  cleanTarget: string
): Promise<HoverPreviewPayload | null> {
  if (!cleanTarget) return null;

  if (/^https?:\/\//i.test(cleanTarget) || /^mailto:/i.test(cleanTarget)) {
    return {
      target: cleanTarget,
      htmlSnippet: `
        <div style="font-weight:600;color:var(--knit-primary);margin-bottom:2px;">Lien Web externe</div>
        <div style="color:var(--knit-text-secondary);font-size:11px;">Ctrl + Clic pour ouvrir dans le navigateur par défaut</div>
      `,
      icon: 'external-link',
    };
  }

  const isAnchorOnly = cleanTarget.startsWith('#') || cleanTarget.startsWith('[[#');
  if (isAnchorOnly) {
    const anchorClean = cleanTarget.replace(/^\[\[/, '').replace(/\]\]$/, '').trim();
    return {
      target: anchorClean,
      htmlSnippet: `
        <div style="font-weight:600;color:var(--knit-primary);margin-bottom:2px;">Ancre de section interne</div>
        <div style="color:var(--knit-text-secondary);font-size:11px;">Ctrl + Clic pour faire défiler la note jusqu'à cette section</div>
      `,
      icon: 'link',
    };
  }

  const [filePartRaw] = cleanTarget.split('#');
  const filePart = filePartRaw.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim();
  const vaultNode = findVaultNode(filePart, vaultStore.files);

  const isFolder = filePart.endsWith('/') || filePart.endsWith('\\') || Boolean(vaultNode?.is_dir);
  if (isFolder) {
    const isVaultFolder = Boolean(vaultNode?.is_dir);
    return {
      target: cleanTarget,
      htmlSnippet: `
        <div style="font-weight:600;color:var(--knit-primary);margin-bottom:2px;">${isVaultFolder ? 'Dossier du coffre-fort' : 'Dossier local'}</div>
        <div style="color:var(--knit-text-secondary);font-size:11px;">Ctrl + Clic pour ${isVaultFolder ? "déplier et sélectionner dans l'arborescence" : "ouvrir dans l'explorateur système"}</div>
      `,
      icon: 'folder',
    };
  }

  // Médias vault (assets/*.png…) → ImageView via DocType
  if (vaultNode && !vaultNode.is_dir && isMediaFilePath(vaultNode.path)) {
    return {
      target: vaultNode.path,
      docType: 'image',
      content: '',
      icon: docTypeToIconName('image'),
    };
  }

  const hasNonMdExt =
    /\.(docx|doc|xlsx|xls|pptx|ppt|pdf|zip|rar|7z|png|jpg|jpeg|gif|svg|mp4|mp3|wav|txt|csv|exe|ps1|sh)$/i.test(
      filePart
    );
  if (hasNonMdExt && (!vaultNode || !vaultNode.path.endsWith('.md'))) {
    const ext = filePart.split('.').pop()?.toUpperCase() || 'DOCUMENT';
    return {
      target: cleanTarget,
      htmlSnippet: `
        <div style="font-weight:600;color:var(--knit-primary);margin-bottom:2px;">Fichier externe (${ext})</div>
        <div style="color:var(--knit-text-secondary);font-size:11px;">Ctrl + Clic pour ouvrir avec l'application système par défaut</div>
      `,
      icon: 'file-text',
    };
  }

  if (vaultNode && !vaultNode.is_dir) {
    try {
      const content = await vaultStore.readFile(vaultNode.path);
      const docType = detectDocType(content, vaultNode.path);
      return {
        target: vaultNode.path,
        docType,
        content,
        icon: docTypeToIconName(docType),
      };
    } catch {
      return {
        target: vaultNode.path,
        htmlSnippet: `
          <div style="font-weight:600;color:var(--knit-primary);margin-bottom:2px;">Note du coffre-fort</div>
          <div style="color:var(--knit-text-secondary);font-size:11px;">Ctrl + Clic pour ouvrir dans un onglet Knit</div>
        `,
        icon: 'file-markdown',
      };
    }
  }

  return {
    target: cleanTarget,
    htmlSnippet: `
      <div style="font-weight:600;color:var(--knit-primary);margin-bottom:2px;">Nouvelle note</div>
      <div style="color:var(--knit-text-secondary);font-size:11px;">Ctrl + Clic pour créer et éditer cette note dans le coffre</div>
    `,
    icon: 'file-markdown',
  };
}

export function dispatchHoverPreview(target: string, x: number, y: number): void {
  window.dispatchEvent(
    new CustomEvent<KnitHoverLinkDetail>('knit-hover-link', {
      bubbles: true,
      detail: { target, x, y },
    })
  );
}

/** Bind hover preview sur un élément DOM (widgets Live Preview). */
export function bindHoverPreviewTarget(el: HTMLElement, path: string): void {
  el.addEventListener('mouseenter', (e) => {
    dispatchHoverPreview(path, e.clientX, e.clientY);
  });
  el.addEventListener('mousemove', (e) => {
    dispatchHoverPreview(path, e.clientX, e.clientY);
  });
  el.addEventListener('mouseleave', () => {
    clearHoverPreview();
  });
}

/** Masque l'aperçu. `force` ignore le mode pin. */
export function clearHoverPreview(force = false): void {
  window.dispatchEvent(
    new CustomEvent<KnitHoverLinkDetail>('knit-hover-link', {
      bubbles: true,
      detail: force ? { force: true } : null,
    })
  );
}

/** Contrôleur délai/debounce pour listes denses (Agenda, recherche, tags). */
export function createDelayedHoverController(delayMs = 200): {
  schedule: (path: string, x: number, y: number) => void;
  cancel: (force?: boolean) => void;
  dispose: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return {
    schedule(path: string, x: number, y: number) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        dispatchHoverPreview(path, x, y);
      }, delayMs);
    },
    cancel(force = false) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      clearHoverPreview(force);
    },
    dispose() {
      // Annuler seulement le timer — ne jamais force-clear.
      // Ce contrôleur vit dans Galerie/Canvas/Agenda/Kanban qui peuvent
      // être montés DANS le Hover Preview ; un clear(true) au démontage
      // (Strict Mode inclus) tuait l'aperçu parent immédiatement.
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

/**
 * Navigation unifiée WikiLink / Markdown (contexte path = note active pour chemins relatifs).
 */
export async function navigateKnitLink(
  target: string,
  contextPath = '',
  view?: EditorView | null
): Promise<void> {
  if (!target) return;
  const cleanTarget = target.trim();
  const currentView = view ?? null;

  if (/^https?:\/\//i.test(cleanTarget) || /^mailto:/i.test(cleanTarget)) {
    await vaultStore.openExternalPath(cleanTarget);
    toast.info('Lien ouvert dans le navigateur', cleanTarget);
    return;
  }

  if (cleanTarget.startsWith('#') || cleanTarget.startsWith('[[#')) {
    const anchorRaw = cleanTarget.replace(/^\[\[/, '').replace(/\]\]$/, '').replace(/^#/, '').trim();
    const targetSlug = slugify(anchorRaw);

    if (currentView) {
      const doc = currentView.state.doc;
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const text = line.text.trim();
        if (text.startsWith('#')) {
          const headingText = text.replace(/^#+\s*/, '').trim();
          const headingSlug = slugify(headingText);
          if (
            headingSlug === targetSlug ||
            headingSlug.includes(targetSlug) ||
            targetSlug.includes(headingSlug) ||
            headingText.toLowerCase().includes(anchorRaw.toLowerCase())
          ) {
            scrollHeadingIntoView(currentView, line.from);
            toast.info('Section atteinte', headingText);
            return;
          }
        }
      }
    }
    toast.info('Section introuvable', cleanTarget);
    return;
  }

  const [filePartRaw, anchorPartRaw] = cleanTarget.split('#');
  const filePart = filePartRaw.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim();
  const anchorPart = anchorPartRaw
    ? anchorPartRaw.replace(/\]\]$/, '').split('|')[0].trim()
    : undefined;

  const vaultNode = findVaultNode(filePart, vaultStore.files);

  if (vaultNode) {
    if (vaultNode.is_dir) {
      window.dispatchEvent(
        new CustomEvent('knit-reveal-in-tree', {
          bubbles: true,
          detail: { path: vaultNode.path, isDir: true },
        })
      );
      toast.info("Dossier déplié dans l'arborescence", vaultNode.name);
      return;
    }
    try {
      const c = await vaultStore.readFile(vaultNode.path);
      tabStore.openTab(vaultNode.path, false, c);
      window.dispatchEvent(
        new CustomEvent('knit-reveal-in-tree', {
          bubbles: true,
          detail: { path: vaultNode.path, isDir: false },
        })
      );
      toast.info('Document ouvert', vaultNode.name);

      if (anchorPart) {
        const targetSlug = slugify(anchorPart);
        setTimeout(() => {
          if (!view) return;
          const doc = view.state.doc;
          for (let i = 1; i <= doc.lines; i++) {
            const line = doc.line(i);
            const text = line.text.trim();
            if (text.startsWith('#')) {
              const headingText = text.replace(/^#+\s*/, '').trim();
              const headingSlug = slugify(headingText);
              if (
                headingSlug === targetSlug ||
                headingText.toLowerCase().includes(anchorPart.toLowerCase())
              ) {
                scrollHeadingIntoView(view, line.from);
                break;
              }
            }
          }
        }, 120);
      }
      return;
    } catch (err) {
      toast.error('Erreur ouverture', String(err));
      return;
    }
  }

  const isAbsolute =
    /^[a-zA-Z]:[\\/]/.test(filePart) ||
    filePart.startsWith('/') ||
    filePart.startsWith('\\\\') ||
    filePart.startsWith('file:///');

  if (isAbsolute) {
    const isDir = filePart.endsWith('/') || filePart.endsWith('\\');
    await vaultStore.openExternalPath(filePart);
    if (isDir) {
      toast.info("Dossier ouvert dans l'explorateur système", filePart);
    } else {
      toast.info(
        "Fichier ouvert avec l'application par défaut",
        filePart.split(/[\\/]/).pop() || filePart
      );
    }
    return;
  }

  const hasNonMdExt =
    /\.(docx|doc|xlsx|xls|pptx|ppt|pdf|zip|rar|7z|png|jpg|jpeg|gif|svg|mp4|mp3|wav|txt|csv|exe|ps1|sh)$/i.test(
      filePart
    );
  const isFolder = filePart.endsWith('/') || filePart.endsWith('\\');

  if (hasNonMdExt || isFolder) {
    const vaultPath = vaultStore.currentVaultPath;
    const currentDir = contextPath.includes('/')
      ? contextPath.slice(0, contextPath.lastIndexOf('/'))
      : '';
    const cleanRel = filePart.replace(/^\.\//, '');
    const relCandidate = currentDir ? `${currentDir}/${cleanRel}` : cleanRel;
    const fullPath = vaultPath ? `${vaultPath}/${relCandidate}` : relCandidate;

    await vaultStore.openExternalPath(fullPath);
    if (isFolder) {
      toast.info("Dossier ouvert dans l'explorateur système", filePart);
    } else {
      toast.info(
        'Fichier ouvert avec le logiciel par défaut',
        filePart.split(/[\\/]/).pop() || filePart
      );
    }
    return;
  }

  const cleanStem = filePart.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim();
  if (!hasNonMdExt && !isFolder) {
    const newPath = cleanStem.endsWith('.md') ? cleanStem : `wiki/${cleanStem}.md`;
    try {
      await vaultStore.createFile(
        newPath,
        `# ${cleanStem.replace(/\.md$/, '')}\n\nNote créée via lien.\n`
      );
      const c = await vaultStore.readFile(newPath);
      tabStore.openTab(newPath, false, c);
      window.dispatchEvent(
        new CustomEvent('knit-reveal-in-tree', {
          bubbles: true,
          detail: { path: newPath, isDir: false },
        })
      );
      toast.success('Note créée via WikiLink', newPath);
      return;
    } catch {
      // fallback
    }
  }

  toast.info('Lien cible introuvable', cleanTarget);
}
