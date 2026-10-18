import { useState, useRef, useCallback, useEffect } from 'react';
import type { EditorView } from '@codemirror/view';
import { vaultStore } from '../stores/vaultStore';
import { tabStore } from '../stores/tabStore';
import { toast } from '../stores/toastStore';
import { renderRichMarkdownPreview, findVaultNode, slugify } from '../utils';
import type { HoverPreviewData, UseEditorLinksProps } from '../types';

/**
 * Hook gérant la navigation au clic/survol sur les liens Markdown/WikiLinks et l'infobulle d'aperçu
 */
export function useEditorLinks({ path, viewRef, editorRef }: UseEditorLinksProps) {
  const [hoverPreview, setHoverPreview] = useState<HoverPreviewData | null>(null);
  const hoverTargetRef = useRef<string | null>(null);

  const hideHoverPreview = useCallback(() => {
    hoverTargetRef.current = null;
    setHoverPreview(null);
  }, []);

  const hideHoverPreviewRef = useRef(hideHoverPreview);
  useEffect(() => {
    hideHoverPreviewRef.current = hideHoverPreview;
  }, [hideHoverPreview]);

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
        window.dispatchEvent(
          new CustomEvent('knit-reveal-in-tree', {
            bubbles: true,
            detail: { path: vaultNode.path, isDir: true },
          })
        );
        toast.info("Dossier déplié dans l'arborescence", vaultNode.name);
        return;
      } else {
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
  }, [path, viewRef]);

  const handleNavigateLinkRef = useRef(handleNavigateLink);
  useEffect(() => {
    handleNavigateLinkRef.current = handleNavigateLink;
  }, [handleNavigateLink]);

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

  // Écouteurs d'événements pour les widgets DOM (ex: Tables Markdown, liens personnalisés)
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

    el.addEventListener('knit-navigate-link', onKnitNav);
    el.addEventListener('knit-hover-link', onKnitHover);
    el.addEventListener('mouseleave', hideHoverPreview);
    window.addEventListener('knit-hover-link', onKnitHover);
    window.addEventListener('knit-navigate-link', onKnitNav);

    return () => {
      el.removeEventListener('knit-navigate-link', onKnitNav);
      el.removeEventListener('knit-hover-link', onKnitHover);
      el.removeEventListener('mouseleave', hideHoverPreview);
      window.removeEventListener('knit-hover-link', onKnitHover);
      window.removeEventListener('knit-navigate-link', onKnitNav);
    };
  }, [editorRef, viewRef, hideHoverPreview]);

  return {
    hoverPreview,
    handleNavigateLink,
    handleNavigateLinkRef,
    showHoverPreview,
    showHoverPreviewRef,
    hideHoverPreview,
    hideHoverPreviewRef,
  };
}
