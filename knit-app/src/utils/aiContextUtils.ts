import { vaultStore } from '../stores/vaultStore';
import { copyTextWithToast } from './clipboardUtils';
import { fileStem } from './treeUtils';

/**
 * Utilitaires de préparation et d'exportation de contexte pour assistants et modèles IA
 */

/**
 * Packager de Contexte IA en 1 Clic (Ctrl+Shift+C) - US B-045 :
 * Copie la note active avec métadonnées YAML et extraits des WikiLinks
 * dans un format balisé <document> optimisé pour les LLMs.
 */
export async function packageContextForAI(
  path: string,
  content: string
): Promise<string> {
  const title = fileStem(path) || 'Document';
  const fm = await vaultStore.parseFrontmatter(content);
  const backlinks = await vaultStore.getBacklinks(path);

  // Extraction des WikiLinks pour ajouter le contexte lié
  const wikiLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
  const referencedDocs = new Set<string>();
  let match: RegExpExecArray | null;
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
  }

  xml += `</document>`;

  await copyTextWithToast(
    xml,
    'Contexte IA copié (Ctrl+Shift+C)',
    'Format balisé <document> prêt pour Claude/ChatGPT'
  );

  return xml;
}
