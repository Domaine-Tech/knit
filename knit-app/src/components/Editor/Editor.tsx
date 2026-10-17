import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { search, searchKeymap, openSearchPanel } from '@codemirror/search';
import {
  HighlightStyle,
  syntaxHighlighting,
  foldGutter,
  foldKeymap,
} from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { yCollab } from 'y-codemirror.next';
import { crdtManager } from '../../crdt/crdtManager';
import { contextMenu } from '../../stores/contextMenuStore';
import { vaultStore } from '../../stores/vaultStore';
import { toast } from '../../stores/toastStore';
import { tabStore, type ViewMode } from '../../stores/tabStore';
import { networkStore } from '../../stores/networkStore';
import { createKnitAutocompletion } from './autocomplete';
import { createMermaidInlinePlugin } from './mermaidExtension';
import { createLivePreviewPlugin } from './livePreviewExtension';
import {
  createAutoWrapKeymap,
  createTableNavKeymap,
  packageContextForAI,
} from './smartUxExtension';
import {
  createLivePreviewDebugExtension,
  livePreviewDebugCompartment,
  type LivePreviewDebugStats,
} from './livePreviewDebugExtension';
import { LivePreviewDebugHUD } from './LivePreviewDebugHUD';
import { debugStore, useDebugMode } from '../../stores/debugStore';
import type { FileNode } from '../../stores/vaultStore';
import { DuotoneIcon } from '../Icons/DuotoneIcon';
import { renderRichMarkdownPreview } from '../../utils/markdownUtils';

interface EditorProps {
  content: string;
  path: string;
  viewMode?: ViewMode;
  isDirty?: boolean;
  initialLine?: number;
  onChange: (newContent: string) => void;
  onSave: () => void;
  onNavigateFile?: (targetPath: string) => void;
}

function findVaultNode(target: string, nodes: FileNode[]): FileNode | null {
  const clean = target
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .split('|')[0]
    .replace(/^\.\//, '')
    .replace(/\/$/, '')
    .trim();

  const cleanNoExt = clean.replace(/\.md$/i, '');
  const cleanBase = cleanNoExt.split('/').pop() || cleanNoExt;

  let match: FileNode | null = null;
  const traverse = (items: FileNode[]) => {
    for (const item of items) {
      const itemNoExt = item.path.replace(/\.md$/i, '');
      const itemBase = item.name.replace(/\.md$/i, '');

      if (
        item.path === clean ||
        item.path === `${clean}.md` ||
        itemNoExt === clean ||
        itemNoExt === cleanNoExt ||
        itemBase.toLowerCase() === cleanBase.toLowerCase() ||
        item.name.toLowerCase() === clean.toLowerCase() ||
        item.path.toLowerCase().endsWith(`/${cleanNoExt.toLowerCase()}.md`)
      ) {
        match = item;
        return;
      }
      if (item.is_dir && item.children) {
        traverse(item.children);
        if (match) return;
      }
    }
  };
  traverse(nodes);
  return match;
}

function getFlatFiles(nodes: FileNode[]): string[] {
  const res: string[] = [];
  const traverse = (items: FileNode[]) => {
    for (const item of items) {
      if (item.is_dir) {
        traverse(item.children);
      } else if (item.path.endsWith('.md') || item.name === 'KNIT.md') {
        res.push(item.path);
      }
    }
  };
  traverse(nodes);
  return res;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Détecte l'URL ou la cible de lien (WikiLink, lien Markdown, URL brute, chemin local) sous les coordonnées du curseur
 */
function findLinkAtCoords(x: number, y: number, view: EditorView): string | null {
  const pos = view.posAtCoords({ x, y });
  if (pos === null) return null;

  const line = view.state.doc.lineAt(pos);
  const lineText = line.text;
  const col = pos - line.from;

  // 1. WikiLinks [[Note#Ancre|Alias]] ou [[Note]] ou [[#Ancre]]
  const wikiRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let wm: RegExpExecArray | null;
  while ((wm = wikiRegex.exec(lineText)) !== null) {
    const start = wm.index;
    const end = start + wm[0].length;
    if (col >= start && col <= end) {
      return wm[1].trim();
    }
  }

  // 2. Liens Markdown [Label](url-or-path)
  const mdLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let ml: RegExpExecArray | null;
  while ((ml = mdLinkRegex.exec(lineText)) !== null) {
    const start = ml.index;
    const end = start + ml[0].length;
    if (col >= start && col <= end) {
      return ml[2].trim();
    }
  }

  // 3. URLs brutes ou file URLs (ex: https://..., http://..., file:///..., mailto:...)
  const rawUrlRegex = /(https?:\/\/[^\s<>)"]+|file:\/\/\/[^\s<>)"]+|mailto:[^\s<>)"]+)/g;
  let rm: RegExpExecArray | null;
  while ((rm = rawUrlRegex.exec(lineText)) !== null) {
    const start = rm.index;
    const end = start + rm[0].length;
    if (col >= start && col <= end) {
      return rm[1].trim();
    }
  }

  // 4. Chemins de fichiers ou dossiers (ex: C:\... ou D:/... ou ./...)
  const pathRegex = /(?:^|\s)((?:[a-zA-Z]:[\\/]|(?:\.\.?\/))[^\s<>)"]+)/g;
  let pm: RegExpExecArray | null;
  while ((pm = pathRegex.exec(lineText)) !== null) {
    const start = pm.index;
    const end = start + pm[0].length;
    if (col >= start && col <= end) {
      return pm[1].trim();
    }
  }

  return null;
}

export const Editor: React.FC<EditorProps> = ({
  content,
  path,
  viewMode = 'visual',
  initialLine,
  onChange,
  onSave,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onSaveRef = useRef(onSave);
  const onChangeRef = useRef(onChange);
  const initialContentRef = useRef(content);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [backlinks, setBacklinks] = useState<string[]>([]);
  const [unlinkedMentions, setUnlinkedMentions] = useState<string[]>([]);
  const [isBacklinksPanelOpen, setIsBacklinksPanelOpen] = useState(false);
  const [knownTags, setKnownTags] = useState<string[]>([]);
  const knownTagsRef = useRef<string[]>(knownTags);
  const [, setTick] = useState(0);

  // Confort de lecture : 760px par défaut vs Pleine Largeur (US B-030e)
  const [isFullWidth, setIsFullWidth] = useState(() => {
    return localStorage.getItem('knit-reading-fullwidth') === 'true';
  });

  // Curseur Fantôme IA (US B-044) : Violet #8B5CF6 avec fade-out 1.5s
  const [aiGhostActive, setAiGhostActive] = useState(false);

  // Hover Preview Tooltip (US B-053)
  const [hoverPreview, setHoverPreview] = useState<{
    x: number;
    y: number;
    target: string;
    htmlSnippet: string;
    icon?: 'file-markdown' | 'external-link' | 'link' | 'folder' | 'file-text';
  } | null>(null);
  const hoverTargetRef = useRef<string | null>(null);

  const handleToggleFullWidth = () => {
    const next = !isFullWidth;
    setIsFullWidth(next);
    localStorage.setItem('knit-reading-fullwidth', String(next));
    setTimeout(() => {
      viewRef.current?.requestMeasure();
    }, 10);
  };

  // Mode Debug Global (Inspecteur Live Viewer & Éditeur)
  const { isDebugActive, toggleDebug } = useDebugMode();
  const [debugStats, setDebugStats] = useState<LivePreviewDebugStats | null>(null);

  // Synchronisation du compartiment CodeMirror réactif quand isDebugActive change
  useEffect(() => {
    if (viewRef.current) {
      viewRef.current.dispatch({
        effects: livePreviewDebugCompartment.reconfigure(
          isDebugActive && viewMode === 'visual'
            ? createLivePreviewDebugExtension(() => debugStore.toggle())
            : []
        ),
      });
      viewRef.current.requestMeasure();
    }
  }, [isDebugActive, viewMode]);

  // Enregistrement des métriques de l'éditeur dans le debugStore global
  useEffect(() => {
    debugStore.registerEditorStats(() => ({
      path,
      viewMode,
      totalLines: viewRef.current?.state.doc.lines ?? 0,
      stats: debugStats,
    }));
    return () => {
      debugStore.unregisterEditorStats();
    };
  }, [path, viewMode, debugStats]);

  useEffect(() => {
    knownTagsRef.current = knownTags;
  }, [knownTags]);

  useEffect(() => {
    vaultStore.getVaultTags().then((tags) => {
      setKnownTags(tags.map((t) => t.tag));
    });
  }, [content]);

  // Indicateur visuel de navigation de lien lors du maintien de Ctrl / Meta
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        editorRef.current?.classList.add('knit-ctrl-active');
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        editorRef.current?.classList.remove('knit-ctrl-active');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Gestionnaire unifié de navigation par lien (ancre interne #, fichier local, ou URL web)
  const handleNavigateLink = useCallback(async (target: string, view?: EditorView) => {
    if (!target) return;
    const cleanTarget = target.trim();
    const currentView = view || viewRef.current;

    // 1. URL Web externe (http://, https://, mailto:)
    if (/^https?:\/\//i.test(cleanTarget) || /^mailto:/i.test(cleanTarget)) {
      await vaultStore.openExternalPath(cleanTarget);
      toast.info('Lien ouvert dans le navigateur', cleanTarget);
      return;
    }

    // 2. Ancre interne (#section) sur le document courant
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
              currentView.dispatch({
                selection: { anchor: line.from },
                scrollIntoView: true,
              });
              currentView.focus();
              toast.info('Section atteinte', headingText);
              return;
            }
          }
        }
      }
      toast.info('Section introuvable', cleanTarget);
      return;
    }

    // Découpage cible et ancre éventuelle (ex: Note.md#section ou [[Note#section|alias]])
    const [filePartRaw, anchorPartRaw] = cleanTarget.split('#');
    const filePart = filePartRaw.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim();
    const anchorPart = anchorPartRaw ? anchorPartRaw.replace(/\]\]$/, '').split('|')[0].trim() : undefined;

    // 3. Recherche prioritaire dans l'arborescence du coffre-fort (Dossier ou Note)
    const vaultNode = findVaultNode(filePart, vaultStore.files);

    if (vaultNode) {
      if (vaultNode.is_dir) {
        // Dossier du coffre : déplier et sélectionner dans l'arborescence (arbre de l'application)
        window.dispatchEvent(
          new CustomEvent('knit-reveal-in-tree', {
            bubbles: true,
            detail: { path: vaultNode.path, isDir: true },
          })
        );
        toast.info("Dossier déplié dans l'arborescence", vaultNode.name);
        return;
      } else {
        // Fichier du coffre : ouvrir dans un onglet Knit ET révéler / sélectionner dans l'arborescence
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

          // Si une ancre était spécifiée dans le document cible
          if (anchorPart) {
            const targetSlug = slugify(anchorPart);
            setTimeout(() => {
              const v = viewRef.current;
              if (v) {
                const doc = v.state.doc;
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
                      v.dispatch({
                        selection: { anchor: line.from },
                        scrollIntoView: true,
                      });
                      v.focus();
                      break;
                    }
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
    }

    // 4. Chemin absolu ou URI file:// (hors coffre-fort ou système global)
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
        toast.info("Fichier ouvert avec l'application par défaut", filePart.split(/[\\/]/).pop() || filePart);
      }
      return;
    }

    // 5. Fichier non Markdown externe (ex: .docx, .xlsx, .pdf, etc.) ou dossier hors coffre
    const hasNonMdExt = /\.(docx|doc|xlsx|xls|pptx|ppt|pdf|zip|rar|7z|png|jpg|jpeg|gif|svg|mp4|mp3|wav|txt|csv|exe|ps1|sh)$/i.test(filePart);
    const isFolder = filePart.endsWith('/') || filePart.endsWith('\\');

    if (hasNonMdExt || isFolder) {
      const vaultPath = vaultStore.currentVaultPath;
      const currentDir = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
      const cleanRel = filePart.replace(/^\.\//, '');
      const relCandidate = currentDir ? `${currentDir}/${cleanRel}` : cleanRel;
      const fullPath = vaultPath ? `${vaultPath}/${relCandidate}` : relCandidate;

      await vaultStore.openExternalPath(fullPath);
      if (isFolder) {
        toast.info("Dossier ouvert dans l'explorateur système", filePart);
      } else {
        toast.info("Fichier ouvert avec le logiciel par défaut", filePart.split(/[\\/]/).pop() || filePart);
      }
      return;
    }

    // 6. Si c'est un WikiLink sans extension, créer la note dans le vault (Obsidian-like)
    const cleanStem = filePart.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim();
    if (!hasNonMdExt && !isFolder) {
      const newPath = cleanStem.endsWith('.md') ? cleanStem : `wiki/${cleanStem}.md`;
      try {
        await vaultStore.createFile(newPath, `# ${cleanStem.replace(/\.md$/, '')}\n\nNote créée via lien.\n`);
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
  }, [path]);

  const handleOpenWikiLink = useCallback(async (targetStem: string) => {
    handleNavigateLink(targetStem, viewRef.current || undefined);
  }, [handleNavigateLink]);

  const handleOpenWikiLinkRef = useRef(handleOpenWikiLink);
  useEffect(() => {
    handleOpenWikiLinkRef.current = handleOpenWikiLink;
  }, [handleOpenWikiLink]);

  const handleNavigateLinkRef = useRef(handleNavigateLink);
  useEffect(() => {
    handleNavigateLinkRef.current = handleNavigateLink;
  }, [handleNavigateLink]);

  const hideHoverPreview = useCallback(() => {
    hoverTargetRef.current = null;
    setHoverPreview(null);
  }, []);

  const hideHoverPreviewRef = useRef(hideHoverPreview);
  useEffect(() => {
    hideHoverPreviewRef.current = hideHoverPreview;
  }, [hideHoverPreview]);

  const showHoverPreview = useCallback(
    async (rawTarget: string, clientX: number, clientY: number) => {
      const cleanTarget = rawTarget.trim();
      if (!cleanTarget) {
        hideHoverPreview();
        return;
      }

      hoverTargetRef.current = cleanTarget;

      // Positionnement avec contrainte d'écran (évite tout débordement)
      const clampX = Math.min(Math.max(12, clientX + 12), window.innerWidth - 380);
      const clampY =
        clientY + 22 + 180 > window.innerHeight
          ? Math.max(12, clientY - 180)
          : clientY + 18;

      // 1. Lien Web externe
      if (/^https?:\/\//i.test(cleanTarget) || /^mailto:/i.test(cleanTarget)) {
        setHoverPreview({
          x: clampX,
          y: clampY,
          target: cleanTarget,
          htmlSnippet: `
            <div style="font-weight:600;color:var(--knit-primary);margin-bottom:2px;">Lien Web externe</div>
            <div style="color:var(--knit-text-secondary);font-size:11px;">Ctrl + Clic pour ouvrir dans le navigateur par défaut</div>
          `,
          icon: 'external-link',
        });
        return;
      }

      // 2. Ancre de section interne (ex: #section ou [[#section]])
      const isAnchorOnly = cleanTarget.startsWith('#') || cleanTarget.startsWith('[[#');
      if (isAnchorOnly) {
        const anchorClean = cleanTarget.replace(/^\[\[/, '').replace(/\]\]$/, '').trim();
        setHoverPreview({
          x: clampX,
          y: clampY,
          target: anchorClean,
          htmlSnippet: `
            <div style="font-weight:600;color:var(--knit-primary);margin-bottom:2px;">Ancre de section interne</div>
            <div style="color:var(--knit-text-secondary);font-size:11px;">Ctrl + Clic pour faire défiler la note jusqu'à cette section</div>
          `,
          icon: 'link',
        });
        return;
      }

      // Découpage cible et ancre
      const [filePartRaw] = cleanTarget.split('#');
      const filePart = filePartRaw.replace(/^\[\[/, '').replace(/\]\]$/, '').split('|')[0].trim();
      const vaultNode = findVaultNode(filePart, vaultStore.files);

      // 3. Dossier
      const isFolder = filePart.endsWith('/') || filePart.endsWith('\\') || Boolean(vaultNode?.is_dir);
      if (isFolder) {
        const isVaultFolder = Boolean(vaultNode?.is_dir);
        setHoverPreview({
          x: clampX,
          y: clampY,
          target: cleanTarget,
          htmlSnippet: `
            <div style="font-weight:600;color:var(--knit-primary);margin-bottom:2px;">${isVaultFolder ? 'Dossier du coffre-fort' : 'Dossier local'}</div>
            <div style="color:var(--knit-text-secondary);font-size:11px;">Ctrl + Clic pour ${isVaultFolder ? "déplier et sélectionner dans l'arborescence" : "ouvrir dans l'explorateur système"}</div>
          `,
          icon: 'folder',
        });
        return;
      }

      // 4. Fichier externe hors Markdown
      const hasNonMdExt = /\.(docx|doc|xlsx|xls|pptx|ppt|pdf|zip|rar|7z|png|jpg|jpeg|gif|svg|mp4|mp3|wav|txt|csv|exe|ps1|sh)$/i.test(filePart);
      if (hasNonMdExt && (!vaultNode || !vaultNode.path.endsWith('.md'))) {
        const ext = filePart.split('.').pop()?.toUpperCase() || 'DOCUMENT';
        setHoverPreview({
          x: clampX,
          y: clampY,
          target: cleanTarget,
          htmlSnippet: `
            <div style="font-weight:600;color:var(--knit-primary);margin-bottom:2px;">Fichier externe (${ext})</div>
            <div style="color:var(--knit-text-secondary);font-size:11px;">Ctrl + Clic pour ouvrir avec l'application système par défaut</div>
          `,
          icon: 'file-text',
        });
        return;
      }

      // 5. Note Markdown existante dans le coffre-fort
      if (vaultNode && !vaultNode.is_dir) {
        try {
          const content = await vaultStore.readFile(vaultNode.path);
          if (hoverTargetRef.current !== cleanTarget) return;

          const htmlSnippet = renderRichMarkdownPreview(content);
          setHoverPreview({
            x: clampX,
            y: clampY,
            target: vaultNode.path,
            htmlSnippet,
            icon: 'file-markdown',
          });
        } catch {
          if (hoverTargetRef.current === cleanTarget) {
            setHoverPreview({
              x: clampX,
              y: clampY,
              target: vaultNode.path,
              htmlSnippet: `
                <div style="font-weight:600;color:var(--knit-primary);margin-bottom:2px;">Note du coffre-fort</div>
                <div style="color:var(--knit-text-secondary);font-size:11px;">Ctrl + Clic pour ouvrir dans un onglet Knit</div>
              `,
              icon: 'file-markdown',
            });
          }
        }
        return;
      }

      // 6. Nouvelle note à créer
      setHoverPreview({
        x: clampX,
        y: clampY,
        target: cleanTarget,
        htmlSnippet: `
          <div style="font-weight:600;color:var(--knit-primary);margin-bottom:2px;">Nouvelle note</div>
          <div style="color:var(--knit-text-secondary);font-size:11px;">Ctrl + Clic pour créer et éditer cette note dans le coffre</div>
        `,
        icon: 'file-markdown',
      });
    },
    [hideHoverPreview]
  );

  const showHoverPreviewRef = useRef(showHoverPreview);
  useEffect(() => {
    showHoverPreviewRef.current = showHoverPreview;
  }, [showHoverPreview]);

  // Écoute des navigations et hovers issus des widgets interactifs (ex: tableaux)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onKnitNav = (e: Event) => {
      const custom = e as CustomEvent<{ url: string }>;
      if (custom.detail?.url) {
        handleNavigateLinkRef.current(custom.detail.url, viewRef.current || undefined);
      }
    };
    const onKnitHover = (e: Event) => {
      const custom = e as CustomEvent<{ target: string; x: number; y: number } | null>;
      if (custom.detail?.target) {
        showHoverPreviewRef.current(custom.detail.target, custom.detail.x, custom.detail.y);
      } else {
        hideHoverPreviewRef.current();
      }
    };
    const onDebugUpdate = (e: Event) => {
      const custom = e as CustomEvent<LivePreviewDebugStats>;
      if (custom.detail) {
        setDebugStats(custom.detail);
      }
    };
    const onToggleDebugEvent = () => {
      toggleDebug();
    };

    el.addEventListener('knit-navigate-link', onKnitNav);
    el.addEventListener('knit-hover-link', onKnitHover);
    el.addEventListener('mouseleave', hideHoverPreview);
    window.addEventListener('knit-hover-link', onKnitHover);
    window.addEventListener('knit-navigate-link', onKnitNav);
    el.addEventListener('knit-live-debug-update', onDebugUpdate);
    window.addEventListener('knit-toggle-live-debug', onToggleDebugEvent);

    return () => {
      el.removeEventListener('knit-navigate-link', onKnitNav);
      el.removeEventListener('knit-hover-link', onKnitHover);
      el.removeEventListener('mouseleave', hideHoverPreview);
      window.removeEventListener('knit-hover-link', onKnitHover);
      window.removeEventListener('knit-navigate-link', onKnitNav);
      el.removeEventListener('knit-live-debug-update', onDebugUpdate);
      window.removeEventListener('knit-toggle-live-debug', onToggleDebugEvent);
    };
  }, [toggleDebug, hideHoverPreview]);

  useEffect(() => {
    return networkStore.subscribe(() => {
      setTick((t) => t + 1);
    });
  }, []);

  useEffect(() => {
    onSaveRef.current = onSave;
    onChangeRef.current = onChange;
  });





  // Détection des backlinks (mentions liées et non liées)
  useEffect(() => {
    vaultStore.getBacklinks(path).then((bl) => {
      setBacklinks(bl);
    });

    // Détection des mentions non liées (textes mentionnant le titre de cette note sans crochets)
    const currentTitle = path.split('/').pop()?.replace(/\.md$/, '') || '';
    if (currentTitle.length >= 3) {
      const allFiles = getFlatFiles(vaultStore.files);
      const unlinked: string[] = [];
      Promise.all(
        allFiles.filter((f) => f !== path).slice(0, 15).map(async (f) => {
          try {
            const fc = await vaultStore.readFile(f);
            if (fc.includes(currentTitle) && !fc.includes(`[[${currentTitle}`)) {
              unlinked.push(f);
            }
          } catch {
            // ignore
          }
        })
      ).then(() => {
        setUnlinkedMentions(unlinked);
      });
    }
  }, [path, content]);

  useEffect(() => {
    if (!editorRef.current) return;

    // Initialisation du document Yjs partagé pour ce fichier et son awareness collaboratif
    const ytext = crdtManager.initDocument(path, initialContentRef.current);
    const awareness = crdtManager.getAwareness(path);

    // Thème CodeMirror 6 stylé avec les tokens Knit et respect de la largeur saine
    const knitEditorTheme = EditorView.theme({
      '&': {
        height: '100%',
        backgroundColor: 'var(--knit-surface)',
        color: 'var(--knit-text)',
        fontSize: '14px',
        fontFamily: 'var(--knit-font-mono)',
      },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: 'inherit',
        lineHeight: '1.6',
        padding: '0',
      },
      '.cm-content': {
        caretColor: 'var(--knit-primary)',
        maxWidth: isFullWidth ? '100%' : '760px',
        margin: '0 auto',
        padding: isFullWidth ? '16px 32px' : '16px 20px',
      },
      '&.cm-focused .cm-cursor': {
        borderLeftColor: 'var(--knit-primary)',
        borderLeftWidth: '2px',
      },
      '.cm-cursorLayer': {
        zIndex: '10 !important',
        pointerEvents: 'none !important',
      },
      /* Sélection active ou inactive : positionnée au-dessus des lignes (z-index: 5) pour que le surlignage s'affiche sur le texte */
      '.cm-selectionLayer': {
        zIndex: '5 !important',
        pointerEvents: 'none !important',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, .cm-selectionLayer .cm-selectionBackground': {
        backgroundColor: 'hsla(var(--knit-hue), 70%, 55%, 0.35) !important',
        opacity: '1 !important',
      },
      '& ::selection, ::selection': {
        backgroundColor: 'hsla(var(--knit-hue), 70%, 55%, 0.35) !important',
      },
      '.cm-gutters': {
        backgroundColor: 'var(--knit-surface)',
        color: 'var(--knit-text-muted)',
        borderRight: '1px solid var(--knit-border)',
        paddingRight: '6px',
        userSelect: 'none',
      },
      '.cm-gutterElement': {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingRight: '4px',
        boxSizing: 'border-box',
      },
      '.cm-activeLine': {
        backgroundColor: 'var(--knit-surface-hover)',
      },
      '.cm-activeLineGutter': {
        backgroundColor: 'var(--knit-surface-hover)',
        color: 'var(--knit-text)',
      },
      /* Chevrons discrets de pliage hiérarchique (foldGutter) */
      '.cm-foldGutter span': {
        color: 'var(--knit-text-muted)',
        cursor: 'pointer',
        fontSize: '11px',
      },
      '.cm-foldGutter span:hover': {
        color: 'var(--knit-primary)',
      },
      /* Surlignage dynamique des correspondances de recherche */
      '.cm-searchMatch': {
        backgroundColor: 'hsla(var(--knit-hue), 80%, 50%, 0.3)',
      },
      '.cm-searchMatch.cm-searchMatch-selected': {
        backgroundColor: 'hsla(var(--knit-hue), 80%, 50%, 0.6)',
      },
      /* Liens Markdown et URLs adaptés dynamiquement à la teinte du client */
      '.cm-content .cm-link, .cm-link, .tok-link': {
        color: 'var(--knit-primary) !important',
        textDecoration: 'underline',
      },
      '.cm-content .cm-url, .cm-url, .tok-url': {
        color: 'var(--knit-primary) !important',
        opacity: '0.85',
      },
    });

    // Style de coloration syntaxique propre à Knit connecté aux variables CSS
    const knitHighlightStyle = HighlightStyle.define([
      { tag: tags.link, color: 'var(--knit-primary)', textDecoration: 'underline' },
      { tag: tags.url, color: 'var(--knit-primary)', opacity: '0.85' },
      { tag: tags.heading, color: 'var(--knit-text)', fontWeight: 'bold' },
      { tag: tags.emphasis, fontStyle: 'italic' },
      { tag: tags.strong, fontWeight: 'bold' },
      { tag: tags.strikethrough, textDecoration: 'line-through' },
      { tag: tags.keyword, color: 'var(--knit-primary)' },
      { tag: tags.atom, color: 'var(--knit-primary-hover)' },
      { tag: tags.bool, color: 'var(--knit-primary-hover)' },
      { tag: tags.meta, color: 'var(--knit-text-muted)' },
      { tag: tags.comment, color: 'var(--knit-text-muted)', fontStyle: 'italic' },
      { tag: tags.monospace, color: 'var(--knit-text)' },
      { tag: tags.quote, color: 'var(--knit-text-secondary)', fontStyle: 'italic' },
      { tag: tags.contentSeparator, color: 'var(--knit-border)' },
    ]);

    const customKeymap = keymap.of([
      {
        key: 'Mod-s',
        run: () => {
          if (onSaveRef.current) {
            onSaveRef.current();
          }
          return true;
        },
      },
      {
        key: 'Mod-f',
        run: openSearchPanel,
      },
      {
        key: 'Mod-h',
        run: (view) => {
          openSearchPanel(view);
          setTimeout(() => {
            const replaceInput = view.dom.querySelector('.cm-search input[name="replace"]') as HTMLInputElement | null;
            if (replaceInput) {
              replaceInput.focus();
              replaceInput.select();
            }
          }, 20);
          return true;
        },
      },
      {
        key: 'Mod-e',
        run: () => {
          tabStore.toggleViewMode();
          return true;
        },
      },
      {
        key: 'Mod-Shift-c',
        run: () => {
          packageContextForAI(path, viewRef.current?.state.doc.toString() || '');
          return true;
        },
      },
    ]);

    const extensions = [
      lineNumbers(),
      foldGutter(),
      highlightActiveLineGutter(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      EditorView.lineWrapping,
      syntaxHighlighting(knitHighlightStyle, { fallback: true }),
      markdown(),
      EditorState.phrases.of({
        'Find': 'Rechercher...',
        'Replace': 'Remplacer par...',
        'next': 'Suivant',
        'previous': 'Précédent',
        'all': 'Tout',
        'match case': 'Casse',
        'by word': 'Mot entier',
        'regexp': 'RegEx',
        'replace': 'Remplacer',
        'replace all': 'Tout remplacer',
        'close': 'Fermer',
      }),
      search({ top: true }),
      customKeymap,
      createAutoWrapKeymap(),
      createTableNavKeymap(),
      keymap.of([...foldKeymap, ...searchKeymap, ...historyKeymap, ...defaultKeymap]),
      knitEditorTheme,
      // Mode Debug Live Viewer (Compartment CodeMirror réactif)
      livePreviewDebugCompartment.of(
        isDebugActive && viewMode === 'visual'
          ? createLivePreviewDebugExtension(() => debugStore.toggle())
          : []
      ),
      // Autocomplétion omni-trigger unifiée
      createKnitAutocompletion({
        getFiles: () => getFlatFiles(vaultStore.files),
        getTags: () => knownTagsRef.current,
        currentPath: path,
        getContent: () => viewRef.current?.state.doc.toString() || '',
      }),
      // CRDT Yjs avec yCollab
      yCollab(ytext, awareness),
    ];

    // En mode Visuel : ajouter Mermaid inline et Live Preview Obsidian
    if (viewMode === 'visual') {
      extensions.push(createMermaidInlinePlugin());
      extensions.push(createLivePreviewPlugin());
    }

    extensions.push(
      EditorView.domEventHandlers({
        mousedown: (event, view) => {
          if (event.ctrlKey || event.metaKey) {
            const targetEl = (event.target as HTMLElement | null)?.closest('[data-target]') as HTMLElement | null;
            const link = targetEl?.getAttribute('data-target') || findLinkAtCoords(event.clientX, event.clientY, view);
            if (link) {
              event.preventDefault();
              event.stopPropagation();
              handleNavigateLinkRef.current(link, view);
              return true;
            }
          }
          return false;
        },
        click: (event, view) => {
          if (event.ctrlKey || event.metaKey) {
            const targetEl = (event.target as HTMLElement | null)?.closest('[data-target]') as HTMLElement | null;
            const link = targetEl?.getAttribute('data-target') || findLinkAtCoords(event.clientX, event.clientY, view);
            if (link) {
              event.preventDefault();
              event.stopPropagation();
              handleNavigateLinkRef.current(link, view);
              return true;
            }
          }
          return false;
        },
        mousemove: (event, view) => {
          // 1. Détection prioritaire par attribut data-target (tables ou marks live preview)
          const targetEl = (event.target as HTMLElement | null)?.closest('[data-target]') as HTMLElement | null;
          if (targetEl) {
            const link = targetEl.getAttribute('data-target');
            if (link) {
              showHoverPreviewRef.current(link, event.clientX, event.clientY);
              return;
            }
          }

          // 2. Si on est dans le corps d'un tableau rendu sans être sur un data-target, masquer le hover
          if ((event.target as HTMLElement | null)?.closest('.knit-rendered-table-card')) {
            hideHoverPreviewRef.current();
            return;
          }

          // 3. Détection par coordonnées dans le texte source / CodeMirror
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          if (pos !== null) {
            const link = findLinkAtCoords(event.clientX, event.clientY, view);
            if (link) {
              showHoverPreviewRef.current(link, event.clientX, event.clientY);
              return;
            }
          }
          hideHoverPreviewRef.current();
        },
        // Smart Paste (URL sur sélection / Image)
        paste: (event, view) => {
          const sel = view.state.selection.main;
          const clipboardText = event.clipboardData?.getData('text/plain');

          // Smart Paste 1 : Si du texte est sélectionné et qu'on colle une URL
          if (clipboardText && !sel.empty) {
            const cleanUrl = clipboardText.trim();
            if (/^https?:\/\/[^\s]+$/.test(cleanUrl)) {
              event.preventDefault();
              const selectedText = view.state.sliceDoc(sel.from, sel.to);
              const mdLink = `[${selectedText}](${cleanUrl})`;
              view.dispatch({
                changes: { from: sel.from, to: sel.to, insert: mdLink },
                selection: { anchor: sel.from + mdLink.length },
              });
              toast.success('Smart Paste', `Lien appliqué sur "${selectedText}"`);
              return true;
            }
          }

          // Smart Paste 2 : Collage d'image
          const items = event.clipboardData?.items;
          if (items) {
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              if (item.type.startsWith('image/')) {
                event.preventDefault();
                const file = item.getAsFile();
                if (!file) continue;

                const reader = new FileReader();
                reader.onload = async () => {
                  try {
                    const base64 = reader.result as string;
                    const hint = file.name && file.name !== 'image.png' ? file.name : `paste-${Date.now()}.png`;
                    const assetRelPath = await vaultStore.saveAsset(base64, hint);

                    const selectedText = sel.empty ? '' : view.state.sliceDoc(sel.from, sel.to);
                    const label = selectedText || file.name || 'Image';
                    const mdImg = `![${label}](${assetRelPath})`;

                    view.dispatch({
                      changes: { from: sel.from, to: sel.to, insert: mdImg },
                      selection: { anchor: sel.from + mdImg.length },
                    });
                    toast.success('Image enregistrée', `Ajoutée dans ${assetRelPath}`);
                  } catch (err: unknown) {
                    toast.error('Erreur collage image', String(err));
                  }
                };
                reader.readAsDataURL(file);
                return true;
              }
            }
          }
          return false;
        },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newText = update.state.doc.toString();
          onChangeRef.current(newText);

          // Flush disque atomique temporisé à 250ms avec WriteGuard backend (Sprint 6 DoD 9)
          if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
          }
          saveTimerRef.current = setTimeout(async () => {
            try {
              await vaultStore.writeFile(path, newText);
              tabStore.markClean(path);
            } catch (err) {
              console.warn('Erreur auto-sauvegarde 250ms :', err);
            }
          }, 250);
        }
      })
    );

    try {
      // Positionnement initial du curseur :
      // Si le document possède un Frontmatter (--- ... ---), positionner le curseur APRES le frontmatter
      // pour que la carte des propriétés YAML reste affichée dès l'ouverture sans être masquée par le curseur sur la ligne 1 !
      const docText = initialContentRef.current;
      let initialAnchor = 0;
      const fmMatch = docText.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
      if (fmMatch) {
        initialAnchor = Math.min(docText.length, fmMatch[0].length);
      }

      const state = EditorState.create({
        doc: docText,
        selection: { anchor: initialAnchor },
        extensions,
      });

      const view = new EditorView({
        state,
        parent: editorRef.current,
      });

      viewRef.current = view;
    } catch (err) {
      console.error('Erreur montage CodeMirror EditorView :', err);
    }

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        if (viewRef.current) {
          try {
            const curDoc = viewRef.current.state.doc.toString();
            vaultStore.writeFile(path, curDoc).catch(() => {});
            tabStore.markClean(path);
          } catch {
            // Ignorer
          }
        }
      }
      if (viewRef.current) {
        try {
          viewRef.current.destroy();
        } catch {
          // Ignorer
        }
        viewRef.current = null;
      }
    };
  }, [path, viewMode, isFullWidth]);

  // Positionnement dynamique sur la ligne demandée
  useEffect(() => {
    if (!initialLine || initialLine <= 0) return;
    const view = viewRef.current;
    if (!view) return;

    const timer = setTimeout(() => {
      try {
        const totalLines = view.state.doc.lines;
        const targetLineNum = Math.min(Math.max(1, initialLine), totalLines);
        const lineInfo = view.state.doc.line(targetLineNum);
        view.dispatch({
          selection: { anchor: lineInfo.from },
          scrollIntoView: true,
        });
        view.focus();
      } catch {
        // ignore
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [initialLine]);

  // Si le contenu extérieur change (ex: synchronisation IA externe) -> Curseur Fantôme IA (B-044)
  useEffect(() => {
    const view = viewRef.current;
    if (view) {
      const currentDoc = view.state.doc.toString();
      if (currentDoc !== content) {
        crdtManager.applyExternalContent(path, content);
        // Activer l'effet visuel du Curseur Fantôme IA (#8B5CF6) pendant 1.5s
        setAiGhostActive(true);
        const t = setTimeout(() => setAiGhostActive(false), 1500);
        return () => clearTimeout(t);
      }
    }
  }, [content, path]);

  const handleEditorContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const view = viewRef.current;
    const selection = view
      ? view.state.sliceDoc(
          view.state.selection.main.from,
          view.state.selection.main.to
        )
      : '';
    const hasSelection = selection.length > 0;

    const absPath = vaultStore.getAbsolutePath(path);
    const fileName = path.split('/').pop() || path;
    const mdLink = `[${fileName.replace(/\.md$/, '')}](${path})`;

    contextMenu.show(e, [
      ...(hasSelection
        ? [
            {
              id: 'cut',
              label: 'Couper',
              icon: 'copy' as const,
              shortcut: 'Ctrl+X',
              onClick: () => {
                if (view) {
                  navigator.clipboard.writeText(selection);
                  const sel = view.state.selection.main;
                  view.dispatch({
                    changes: { from: sel.from, to: sel.to, insert: '' },
                  });
                }
              },
            },
            {
              id: 'copy',
              label: 'Copier',
              icon: 'copy' as const,
              shortcut: 'Ctrl+C',
              onClick: () => {
                navigator.clipboard.writeText(selection);
              },
            },
          ]
        : []),
      {
        id: 'paste',
        label: 'Coller',
        icon: 'clipboard' as const,
        shortcut: 'Ctrl+V',
        onClick: async () => {
          if (view) {
            try {
              const text = await navigator.clipboard.readText();
              if (text) {
                const sel = view.state.selection.main;
                view.dispatch({
                  changes: { from: sel.from, to: sel.to, insert: text },
                  selection: { anchor: sel.from + text.length },
                });
                view.focus();
              }
            } catch {
              toast.error('Presse-papier inaccessible', 'Autorisation refusée');
            }
          }
        },
      },
      {
        id: 'package-ai',
        label: 'Copier le contexte IA de la note',
        icon: 'command' as const,
        shortcut: 'Ctrl+Shift+C',
        onClick: () => {
          packageContextForAI(path, content);
        },
      },
      { id: 'div-edit-1', divider: true },
      {
        id: 'toggle-mode',
        label: viewMode === 'visual' ? 'Basculer en Code Source brut' : 'Basculer en Vue Live Preview',
        icon: 'file-markdown' as const,
        shortcut: 'Ctrl+E',
        onClick: () => tabStore.toggleViewMode(),
      },
      {
        id: 'toggle-width',
        label: isFullWidth ? 'Largeur de lecture saine (760px)' : 'Mode Pleine Largeur',
        icon: 'slider' as const,
        onClick: handleToggleFullWidth,
      },
      { id: 'div-edit-2', divider: true },
      {
        id: 'reveal-file',
        label: "Révéler dans l'explorateur",
        icon: 'external-link' as const,
        onClick: () => {
          vaultStore.revealInExplorer(path);
        },
      },
      {
        id: 'copy-rel-path',
        label: 'Copier le chemin relatif',
        icon: 'copy' as const,
        onClick: () => {
          navigator.clipboard.writeText(path);
          toast.info('Chemin relatif copié', path);
        },
      },
      {
        id: 'copy-abs-path',
        label: 'Copier le chemin absolu',
        icon: 'copy' as const,
        onClick: () => {
          navigator.clipboard.writeText(absPath);
          toast.info('Chemin absolu copié', absPath);
        },
      },
      {
        id: 'copy-md-link',
        label: 'Copier le lien Markdown',
        icon: 'link' as const,
        onClick: () => {
          navigator.clipboard.writeText(mdLink);
          toast.info('Lien Markdown copié', mdLink);
        },
      },
    ]);
  };

  return (
    <div
      onContextMenu={handleEditorContextMenu}
      style={{
        flex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: aiGhostActive ? 'inset 0 0 0 2px #8B5CF6' : 'none',
        transition: 'box-shadow 0.5s ease',
      }}
    >
      {/* Curseur Fantôme IA (B-044) : Badge discret lors d'une intervention IA */}
      {aiGhostActive && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 20,
            zIndex: 20,
            backgroundColor: '#8B5CF6',
            color: '#FFFFFF',
            padding: '3px 10px',
            borderRadius: 'var(--knit-radius-sm)',
            fontSize: '11px',
            fontWeight: 700,
            boxShadow: '0 2px 8px rgba(139, 92, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            animation: 'fadeIn 0.2s',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#FFFFFF' }} />
          Ghost Cursor IA actif
        </div>
      )}

      {/* Barre rétroliens & confort (US B-053) */}
      {(backlinks.length > 0 || unlinkedMentions.length > 0) && (
        <div
          style={{
            padding: '4px 20px',
            backgroundColor: 'var(--knit-surface)',
            borderBottom: '1px solid var(--knit-border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '12px',
            userSelect: 'none',
          }}
        >
          <button
            onClick={() => setIsBacklinksPanelOpen((p) => !p)}
            data-tooltip="Afficher l'inspecteur des rétroliens"
            style={{
              background: isBacklinksPanelOpen ? 'var(--knit-primary-alpha)' : 'none',
              border: '1px solid var(--knit-border)',
              padding: '2px 8px',
              borderRadius: 'var(--knit-radius-xs)',
              color: isBacklinksPanelOpen ? 'var(--knit-primary)' : 'var(--knit-text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <DuotoneIcon name="link" size={12} />
            <span>
              {backlinks.length} lié{backlinks.length > 1 ? 's' : ''}
              {unlinkedMentions.length > 0 ? ` • ${unlinkedMentions.length} non lié(s)` : ''}
            </span>
          </button>

          <button
            onClick={handleToggleFullWidth}
            data-tooltip={isFullWidth ? 'Basculer en centré (760px)' : 'Basculer en pleine largeur'}
            style={{
              background: 'none',
              border: '1px solid var(--knit-border)',
              padding: '2px 7px',
              borderRadius: 'var(--knit-radius-xs)',
              color: 'var(--knit-text-muted)',
              fontSize: '11px',
              cursor: 'pointer',
              marginLeft: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <DuotoneIcon name="slider" size={12} />
            <span>{isFullWidth ? 'Pleine largeur' : '760px'}</span>
          </button>

          <button
            onClick={() => packageContextForAI(path, content)}
            data-tooltip="Copier le contexte IA au format <document>"
            data-shortcut="Ctrl+Shift+C"
            style={{
              background: 'none',
              border: '1px solid var(--knit-border)',
              padding: '2px 8px',
              borderRadius: 'var(--knit-radius-xs)',
              color: 'var(--knit-primary)',
              fontSize: '11px',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <DuotoneIcon name="command" size={12} />
            <span>Packager IA</span>
          </button>
        </div>
      )}

      {/* Inspecteur déroulant des Rétroliens (Backlinks Panel) */}
      {isBacklinksPanelOpen && (
        <div
          style={{
            padding: '10px 24px',
            backgroundColor: 'var(--knit-surface)',
            borderBottom: '1px solid var(--knit-border)',
            display: 'flex',
            gap: 24,
            fontSize: '12px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--knit-text-secondary)', marginBottom: 6 }}>
              <DuotoneIcon name="link" size={13} style={{ color: 'var(--knit-primary)' }} />
              <span>Mentions liées ({backlinks.length})</span>
            </div>
            {backlinks.length === 0 ? (
              <div style={{ color: 'var(--knit-text-muted)', fontSize: 11 }}>Aucune note ne lie ce document.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {backlinks.map((bl) => (
                  <button
                    key={bl}
                    onClick={() => {
                      vaultStore.readFile(bl).then((c) => tabStore.openTab(bl, false, c));
                    }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--knit-radius-xs)',
                      backgroundColor: 'var(--knit-surface-hover)',
                      border: '1px solid var(--knit-border)',
                      color: 'var(--knit-primary)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontFamily: 'var(--knit-font-mono)',
                    }}
                  >
                    {bl}
                  </button>
                ))}
              </div>
            )}
          </div>

          {unlinkedMentions.length > 0 && (
            <div style={{ flex: 1, borderLeft: '1px solid var(--knit-border)', paddingLeft: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: 'var(--knit-text-secondary)', marginBottom: 6 }}>
                <DuotoneIcon name="search" size={13} style={{ color: 'var(--knit-text-muted)' }} />
                <span>Mentions non liées ({unlinkedMentions.length})</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {unlinkedMentions.map((um) => (
                  <button
                    key={um}
                    onClick={() => {
                      vaultStore.readFile(um).then((c) => tabStore.openTab(um, false, c));
                    }}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--knit-radius-xs)',
                      backgroundColor: 'var(--knit-surface-hover)',
                      border: '1px dashed var(--knit-border)',
                      color: 'var(--knit-text-muted)',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontFamily: 'var(--knit-font-mono)',
                    }}
                  >
                    {um}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conteneur CodeMirror 6 */}
      <div
        ref={editorRef}
        style={{
          width: '100%',
          flex: 1,
          overflow: 'hidden',
        }}
      />

      {/* Hover Preview Tooltip flottant (US B-053) via React Portal vers document.body */}
      {hoverPreview &&
        createPortal(
          <div
            className="knit-floating-hover-preview"
            style={{
              position: 'fixed',
              left: hoverPreview.x,
              top: hoverPreview.y,
              zIndex: 99999,
              width: 360,
              maxWidth: '90vw',
              padding: '12px 14px',
              backgroundColor: 'var(--knit-surface, #1e1e24)',
              border: '1px solid var(--knit-border, #333)',
              borderRadius: 'var(--knit-radius-md, 8px)',
              boxShadow: '0 8px 28px rgba(0, 0, 0, 0.5)',
              pointerEvents: 'none',
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--knit-text, #fff)',
            }}
          >
            <div style={{ fontWeight: 700, color: 'var(--knit-primary, #6366f1)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <DuotoneIcon name={hoverPreview.icon || 'file-markdown'} size={14} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>{hoverPreview.target}</span>
            </div>
            <div
              className="knit-hover-preview-body"
              dangerouslySetInnerHTML={{ __html: hoverPreview.htmlSnippet }}
              style={{
                maxHeight: 140,
                overflowY: 'hidden',
                fontSize: 11.5,
                lineHeight: 1.45,
                color: 'var(--knit-text-secondary, #ccc)',
              }}
            />
          </div>,
          document.body
        )}

      {/* Inspecteur HUD en bas de l'éditeur (Mode Debug Global) */}
      {isDebugActive && viewMode === 'visual' && (
        <LivePreviewDebugHUD
          stats={debugStats}
          onToggle={toggleDebug}
          onRequestMeasure={() => {
            viewRef.current?.requestMeasure();
          }}
        />
      )}
    </div>
  );
};
