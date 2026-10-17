import { EditorView, keymap } from '@codemirror/view';
import { vaultStore } from '../../stores/vaultStore';
import { toast } from '../../stores/toastStore';
import { splitTableRow, findTableDelimiterOffsets } from '../../utils/markdownUtils';

/**
 * Auto-Wrap pour CodeMirror 6 :
 * Si du texte est sélectionné, taper [, *, `, ~, ", ' entoure la sélection
 * sans l'écraser (US B-053).
 */
export function createAutoWrapKeymap() {
  const wrapPairs: Record<string, [string, string]> = {
    '[': ['[[', ']]'],
    '*': ['*', '*'],
    '`': ['`', '`'],
    '~': ['~~', '~~'],
    '"': ['"', '"'],
    "'": ["'", "'"],
  };

  return keymap.of(
    Object.entries(wrapPairs).map(([key, [open, close]]) => ({
      key,
      run: (view: EditorView) => {
        const sel = view.state.selection.main;
        if (sel.empty) {
          return false; // Comportement normal si pas de sélection
        }

        const selectedText = view.state.sliceDoc(sel.from, sel.to);
        const wrapped = `${open}${selectedText}${close}`;

        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: wrapped },
          selection: { anchor: sel.from + open.length, head: sel.from + open.length + selectedText.length },
        });

        return true;
      },
    }))
  );
}

/**
 * Navigation et formatage dynamique de tableaux Markdown (Tab / Shift-Tab / Entrée) :
 * - Tab : saute à la cellule suivante (en ignorant les | de WikiLinks et de code)
 * - Shift-Tab : saute à la cellule précédente
 * - Entrée : crée immédiatement la ligne suivante alignée avec le même nombre de colonnes
 */
export function createTableNavKeymap() {
  return keymap.of([
    {
      key: 'Tab',
      run: (view: EditorView) => {
        const sel = view.state.selection.main;
        const line = view.state.doc.lineAt(sel.from);
        const lineText = line.text;

        // Est-ce une ligne de tableau Markdown ?
        if (lineText.includes('|')) {
          const colIndex = sel.from - line.from;
          const delimiters = findTableDelimiterOffsets(lineText);
          const nextPipe = delimiters.find((idx) => idx > colIndex);

          if (nextPipe !== undefined && nextPipe < lineText.length) {
            // Se déplacer juste après le vrai séparateur de colonne |
            const target = line.from + nextPipe + 1;
            const skipSpace = lineText.charAt(nextPipe + 1) === ' ' ? 1 : 0;
            view.dispatch({
              selection: { anchor: Math.min(target + skipSpace, line.to) },
            });
            return true;
          } else if (line.number < view.state.doc.lines) {
            // Sauter à la première cellule de la ligne suivante si elle fait partie du tableau
            const nextDocLine = view.state.doc.line(line.number + 1);
            if (nextDocLine.text.trim().startsWith('|')) {
              const nextDelims = findTableDelimiterOffsets(nextDocLine.text);
              const firstPipe = nextDelims.length > 0 ? nextDelims[0] : 0;
              const skip = nextDocLine.text.charAt(firstPipe + 1) === ' ' ? 1 : 0;
              view.dispatch({
                selection: { anchor: Math.min(nextDocLine.from + firstPipe + 1 + skip, nextDocLine.to) },
              });
              return true;
            }
          }
        }
        return false;
      },
    },
    {
      key: 'Shift-Tab',
      run: (view: EditorView) => {
        const sel = view.state.selection.main;
        const line = view.state.doc.lineAt(sel.from);
        const lineText = line.text;

        if (lineText.includes('|')) {
          const colIndex = sel.from - line.from;
          const delimiters = findTableDelimiterOffsets(lineText);
          // Chercher le séparateur précédent
          const prevDelims = delimiters.filter((idx) => idx < colIndex - 1);
          if (prevDelims.length > 0) {
            const prevPipe = prevDelims[prevDelims.length - 1];
            const target = line.from + prevPipe + 1;
            const skipSpace = lineText.charAt(prevPipe + 1) === ' ' ? 1 : 0;
            view.dispatch({
              selection: { anchor: Math.min(target + skipSpace, line.to) },
            });
            return true;
          }
        }
        return false;
      },
    },
    {
      key: 'Enter',
      run: (view: EditorView) => {
        const sel = view.state.selection.main;
        const line = view.state.doc.lineAt(sel.from);
        const lineText = line.text;

        // Si la ligne courante est une ligne de tableau
        if (lineText.trim().startsWith('|') && lineText.trim().endsWith('|')) {
          // Compter le nombre de colonnes avec splitTableRow
          const colCount = splitTableRow(lineText).length;
          if (colCount > 0) {
            let nextRow = '\n|';
            for (let i = 0; i < colCount; i++) {
              nextRow += '  |';
            }
            view.dispatch({
              changes: { from: line.to, insert: nextRow },
              selection: { anchor: line.to + 3 },
            });
            return true;
          }
        }
        return false;
      },
    },
  ]);
}

/**
 * Packager de Contexte IA en 1 Clic (Ctrl+Shift+C) - US B-045 :
 * Copie la note active avec métadonnées YAML et extraits des WikiLinks
 * dans un format balisé <document> optimisé pour les LLMs.
 */
export async function packageContextForAI(
  path: string,
  content: string
): Promise<string> {
  const title = path.split('/').pop()?.replace(/\.md$/, '') || 'Document';
  const fm = await vaultStore.parseFrontmatter(content);
  const backlinks = await vaultStore.getBacklinks(path);

  // Extraction des WikiLinks pour ajouter le contexte lié
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const referencedDocs = new Set<string>();
  let match;
  while ((match = wikiLinkRegex.exec(content)) !== null) {
    referencedDocs.add(match[1].trim());
  }

  let xml = `<document path="${path}" title="${title}">\n`;

  // Métadonnées
  xml += `  <metadata>\n`;
  if (fm.has_frontmatter) {
    for (const [k, v] of Object.entries(fm.fields)) {
      xml += `    <property name="${k}">${v}</property>\n`;
    }
  }
  xml += `    <backlinks count="${backlinks.length}">\n`;
  for (const bl of backlinks.slice(0, 5)) {
    xml += `      <backlink>${bl}</backlink>\n`;
  }
  xml += `    </backlinks>\n`;
  xml += `  </metadata>\n\n`;

  // Contenu principal Markdown
  xml += `  <content>\n<![CDATA[\n${content}\n]]>\n  </content>\n\n`;

  // Extraits des notes liées
  if (referencedDocs.size > 0) {
    xml += `  <related_documents>\n`;
    for (const ref of Array.from(referencedDocs).slice(0, 3)) {
      try {
        const refPath = ref.endsWith('.md') ? ref : `${ref}.md`;
        const refContent = await vaultStore.readFile(refPath);
        const snippet = refContent.slice(0, 400).replace(/]]>/g, ']]&gt;');
        xml += `    <reference target="${ref}">\n<![CDATA[\n${snippet}...\n]]>\n    </reference>\n`;
      } catch {
        // Ignorer si le fichier n'existe pas encore
      }
    }
    xml += `  </related_documents>\n`;
  }

  xml += `</document>`;

  try {
    await navigator.clipboard.writeText(xml);
    toast.success('Contexte IA copié (Ctrl+Shift+C)', 'Format balisé <document> prêt pour Claude/ChatGPT');
  } catch {
    toast.error('Erreur presse-papier', 'Impossible de copier le contexte');
  }

  return xml;
}
