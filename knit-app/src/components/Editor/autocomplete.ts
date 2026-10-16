import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';

export interface AutocompleteSourceProps {
  getFiles: () => string[];
  getTags: () => string[];
}

/**
 * Extension d'autocomplétion CodeMirror 6 pour Knit :
 * - Taper `[[` propose toutes les notes du coffre (WikiLinks Obsidian)
 * - Taper `#` propose tous les tags du coffre
 */
export function createKnitAutocompletion(sources: AutocompleteSourceProps) {
  return autocompletion({
    override: [
      (context: CompletionContext): CompletionResult | null => {
        // 1. Détection des WikiLinks `[[...`
        const wikiMatch = context.matchBefore(/\[\[([^\]]*)$/);
        if (wikiMatch) {
          const files = sources.getFiles();
          const query = wikiMatch.text.slice(2).toLowerCase();

          const options = files
            .map((filePath) => {
              const stem = filePath.replace(/\.md$/, '').split('/').pop() || filePath;
              return {
                label: stem,
                detail: filePath,
                apply: (view: any, completion: any, from: number, to: number) => {
                  const insertText = `${completion.label}]]`;
                  view.dispatch({
                    changes: { from, to, insert: insertText },
                    selection: { anchor: from + insertText.length },
                  });
                },
              };
            })
            .filter((opt) => !query || opt.label.toLowerCase().includes(query) || opt.detail.toLowerCase().includes(query));

          return {
            from: wikiMatch.from + 2,
            options,
            filter: false,
          };
        }

        // 2. Détection des Tags `#...`
        const tagMatch = context.matchBefore(/(?:^|[\s(])#([a-zA-Z0-9_\-/]*)$/);
        if (tagMatch) {
          const tags = sources.getTags();
          const matchedText = tagMatch.text;
          const hashIdx = matchedText.indexOf('#');
          const query = matchedText.slice(hashIdx + 1).toLowerCase();

          const options = tags
            .filter((t) => !query || t.toLowerCase().includes(query))
            .map((tag) => ({
              label: tag,
              type: 'keyword',
              detail: 'tag',
            }));

          return {
            from: tagMatch.from + hashIdx + 1,
            options,
            filter: false,
          };
        }

        return null;
      },
    ],
  });
}
