import { autocompletion, type Completion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';
import { networkStore } from '../../stores/networkStore';
import { vaultStore } from '../../stores/vaultStore';
import type { SuggestIndexData, HeadingItem, AutocompleteSourceProps } from '../../types';
import { fileStem, formatIsoDate, getNextDayOfWeek, slugify } from '../../utils';

export const EMOJI_DICTIONARY: Record<string, string> = {
  sparkles: '✨',
  check: '✅',
  rocket: '🚀',
  warning: '⚠️',
  fire: '🔥',
  memo: '📝',
  tada: '🎉',
  bug: '🐛',
  art: '🎨',
  star: '⭐',
  heart: '❤️',
  bulb: '💡',
  calendar: '📅',
  clock: '⏰',
  target: '🎯',
  lock: '🔒',
  eyes: '👀',
  thumbsup: '👍',
  smile: '😊',
  laugh: '😂',
  robot: '🤖',
  brain: '🧠',
  coffee: '☕',
  clap: '👏',
  wave: '👋',
  100: '💯',
  recycle: '♻️',
  gear: '⚙️',
  hammer: '🔨',
  wrench: '🔧',
  books: '📚',
  link: '🔗',
  pin: '📌',
  chat: '💬',
  bell: '🔔',
  folder: '📁',
  package: '📦',
  zap: '⚡',
};

/**
 * Cache mémoire pour l'index de suggestions ultra-rapide (< 2ms)
 */
let cachedSuggestIndex: SuggestIndexData | null = null;
let lastSuggestIndexTime = 0;

export async function getOrLoadSuggestIndex(): Promise<SuggestIndexData> {
  const now = Date.now();
  if (!cachedSuggestIndex || now - lastSuggestIndexTime > 4000) {
    cachedSuggestIndex = await vaultStore.getSuggestIndex();
    lastSuggestIndexTime = now;
  }
  return cachedSuggestIndex || { docs: [], headings: [], tags: [] };
}

/**
 * Extraction synchrone des titres locaux de la note courante
 */
export function getLocalHeadings(content: string, currentPath: string = ''): HeadingItem[] {
  const headings: HeadingItem[] = [];
  let inCode = false;

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    if (trimmed.startsWith('# ')) {
      const text = trimmed.slice(2).trim();
      headings.push({ file_rel: currentPath, level: 1, text, slug: slugify(text) });
    } else if (trimmed.startsWith('## ')) {
      const text = trimmed.slice(3).trim();
      headings.push({ file_rel: currentPath, level: 2, text, slug: slugify(text) });
    } else if (trimmed.startsWith('### ')) {
      const text = trimmed.slice(4).trim();
      headings.push({ file_rel: currentPath, level: 3, text, slug: slugify(text) });
    }
  }
  return headings;
}

/**
 * Moteur universel d'autocomplétion (CodeMirror 6 + Multi-Vues)
 * Supporte :
 * 1. [[WikiLinks]] : notes, [[Note#Titre]], [[#Titre-Local]], [[Note|Alias]]
 * 2. @mentions : pairs connectés + @vault
 * 3. @@dates : @@today, @@demain, @@lundi, @@YYYY-MM-DD
 * 4. :emoji: : shortcodes émojis GitHub / Unicode
 * 5. #tag : tags hiérarchiques du vault
 * 6. /slash : commandes slash Notion-like
 */
export function createKnitAutocompletion(sources: AutocompleteSourceProps) {
  // Préchargement asynchrone de l'index
  getOrLoadSuggestIndex();

  return autocompletion({
    tooltipClass: () => 'knit-autocomplete-tooltip',
    optionClass: (c) => `knit-completion-item knit-completion-${c.type || 'default'}`,
    icons: true,
    override: [
      (context: CompletionContext): CompletionResult | null => {
        // --- 1. DÉCLENCHEUR WIKILINKS `[[...` ---
        const wikiMatch = context.matchBefore(/\[\[([^\]]*)$/);
        if (wikiMatch) {
          const rawMatch = wikiMatch.text.slice(2);
          const currentPath = sources.currentPath || '';
          const currentContent = sources.getContent ? sources.getContent() : '';

          // 1a. Ancre locale vers titre interne `[[#...`
          if (rawMatch.startsWith('#')) {
            const query = rawMatch.slice(1).toLowerCase();
            const headings = getLocalHeadings(currentContent, currentPath);

            const options = headings
              .filter((h) => !query || h.text.toLowerCase().includes(query))
              .map((h) => ({
                label: `#${h.text}`,
                detail: `Section H${h.level} (cette note)`,
                type: 'heading',
                apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
                  const insertText = `#${h.text}]]`;
                  view.dispatch({
                    changes: { from: from - 1, to, insert: insertText },
                    selection: { anchor: from - 1 + insertText.length },
                  });
                },
              }));

            return {
              from: wikiMatch.from + 2 + 1,
              options,
              filter: false,
            };
          }

          // 1b. Deep-link vers titre d'une autre note `[[Note#...`
          if (rawMatch.includes('#')) {
            const [targetDoc, queryHeading] = rawMatch.split('#');
            const targetStem = targetDoc.trim().toLowerCase();
            const qHeading = (queryHeading || '').toLowerCase();

            const allHeadings = cachedSuggestIndex ? cachedSuggestIndex.headings : [];
            const matchingHeadings = allHeadings.filter((h) => {
              const stem = fileStem(h.file_rel).toLowerCase();
              return stem === targetStem || h.file_rel.toLowerCase().includes(targetStem);
            });

            const options = matchingHeadings
              .filter((h) => !qHeading || h.text.toLowerCase().includes(qHeading))
              .map((h) => ({
                label: h.text,
                detail: `H${h.level} dans ${h.file_rel}`,
                type: 'heading',
                apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
                  const insertText = `${h.text}]]`;
                  view.dispatch({
                    changes: { from, to, insert: insertText },
                    selection: { anchor: from + insertText.length },
                  });
                },
              }));

            return {
              from: wikiMatch.from + 2 + targetDoc.length + 1,
              options,
              filter: false,
            };
          }

          // 1c. Alias `[[Note|...`
          if (rawMatch.includes('|')) {
            const [targetDoc, aliasText] = rawMatch.split('|');
            return {
              from: wikiMatch.from + 2 + targetDoc.length + 1,
              options: [
                {
                  label: aliasText || 'Mon alias',
                  detail: `Alias d'affichage pour ${targetDoc}`,
                  type: 'alias',
                  apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
                    const text = `${aliasText || 'Mon alias'}]]`;
                    view.dispatch({
                      changes: { from, to, insert: text },
                      selection: { anchor: from + text.length },
                    });
                  },
                },
              ],
              filter: false,
            };
          }

          // 1d. Recherche de documents classique `[[...`
          const query = rawMatch.toLowerCase();
          const files = sources.getFiles();

          const options = files
            .map((filePath) => {
              const stem = filePath.replace(/\.md$/, '').split('/').pop() || filePath;
              const docType = filePath.toLowerCase().includes('kanban')
                ? 'kanban'
                : filePath.toLowerCase().includes('table')
                ? 'table'
                : 'note';

              return {
                label: stem,
                detail: filePath,
                type: docType,
                boost: docType === 'kanban' ? 2 : 1,
                apply: (view: EditorView, completion: Completion, from: number, to: number) => {
                  const insertText = `${completion.label}]]`;
                  view.dispatch({
                    changes: { from, to, insert: insertText },
                    selection: { anchor: from + insertText.length },
                  });
                },
              };
            })
            .filter(
              (opt) => !query || opt.label.toLowerCase().includes(query) || opt.detail.toLowerCase().includes(query)
            );

          return {
            from: wikiMatch.from + 2,
            options,
            filter: false,
          };
        }

        // --- 2. DÉCLENCHEUR CALENDRIER / DATE `@@...` ---
        const dateMatch = context.matchBefore(/(?:^|\s)@@([a-zA-Z0-9_-]*)$/);
        if (dateMatch) {
          const raw = dateMatch.text.trim().slice(2).toLowerCase();
          const today = new Date();
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);

          const suggestions = [
            { label: 'today', detail: `@${formatIsoDate(today)} (Aujourd'hui)`, date: formatIsoDate(today) },
            { label: 'demain', detail: `@${formatIsoDate(tomorrow)} (Demain)`, date: formatIsoDate(tomorrow) },
            { label: 'lundi', detail: `@${formatIsoDate(getNextDayOfWeek(1))} (Lundi prochain)`, date: formatIsoDate(getNextDayOfWeek(1)) },
            { label: 'vendredi', detail: `@${formatIsoDate(getNextDayOfWeek(5))} (Vendredi prochain)`, date: formatIsoDate(getNextDayOfWeek(5)) },
          ];

          const options = suggestions
            .filter((s) => !raw || s.label.includes(raw) || s.date.includes(raw))
            .map((s) => ({
              label: s.label,
              detail: s.detail,
              type: 'date',
              apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
                const insertText = `@${s.date} `;
                view.dispatch({
                  changes: { from: from - 2, to, insert: insertText },
                  selection: { anchor: from - 2 + insertText.length },
                });
              },
            }));

          const atIdx = dateMatch.text.indexOf('@@');
          return {
            from: dateMatch.from + atIdx + 2,
            options,
            filter: false,
          };
        }

        // --- 3. DÉCLENCHEUR MENTIONS COLLABORATEURS `@...` ---
        const mentionMatch = context.matchBefore(/(?:^|\s)@([a-zA-Z0-9_./-]*)$/);
        if (mentionMatch && !mentionMatch.text.includes('@@')) {
          const atIdx = mentionMatch.text.indexOf('@');
          const query = mentionMatch.text.slice(atIdx + 1).toLowerCase();

          // Liste des pairs connectés depuis networkStore + entité @vault
          const peers = networkStore.connectedPeers;
          const options = [
            {
              label: 'vault',
              detail: 'Attribution collective partagée avec tous les pairs',
              type: 'vault',
              boost: 10,
              apply: (view: EditorView, _c: Completion, from: number, to: number) => {
                const text = '@vault ';
                view.dispatch({
                  changes: { from: from - 1, to, insert: text },
                  selection: { anchor: from - 1 + text.length },
                });
              },
            },
            ...peers.map((peer) => ({
              label: peer.display_name.replace(/\s+/g, '-'),
              detail: `Pair connecté (${peer.initials})`,
              type: 'mention',
              boost: 5,
              apply: (view: EditorView, _c: Completion, from: number, to: number) => {
                const text = `@${peer.display_name} `;
                view.dispatch({
                  changes: { from: from - 1, to, insert: text },
                  selection: { anchor: from - 1 + text.length },
                });
              },
            })),
          ].filter((opt) => !query || opt.label.toLowerCase().includes(query) || opt.detail.toLowerCase().includes(query));

          return {
            from: mentionMatch.from + atIdx + 1,
            options,
            filter: false,
          };
        }

        // --- 4. DÉCLENCHEUR ÉMOJIS `:emoji:` ---
        const emojiMatch = context.matchBefore(/(?:^|\s):([a-zA-Z0-9_]{0,20})$/);
        if (emojiMatch) {
          const colonIdx = emojiMatch.text.indexOf(':');
          const query = emojiMatch.text.slice(colonIdx + 1).toLowerCase();

          const options = Object.entries(EMOJI_DICTIONARY)
            .filter(([shortcode]) => !query || shortcode.toLowerCase().includes(query))
            .map(([shortcode, emoji]) => ({
              label: `:${shortcode}:`,
              detail: emoji,
              type: 'emoji',
              apply: (view: EditorView, _c: Completion, from: number, to: number) => {
                view.dispatch({
                  changes: { from: from - 1, to, insert: `${emoji} ` },
                  selection: { anchor: from - 1 + emoji.length + 1 },
                });
              },
            }));

          return {
            from: emojiMatch.from + colonIdx + 1,
            options,
            filter: false,
          };
        }

        // --- 5. DÉCLENCHEUR TAGS `#tag` ---
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
              type: 'tag',
              detail: 'tag',
            }));

          return {
            from: tagMatch.from + hashIdx + 1,
            options,
            filter: false,
          };
        }

        // --- 6. DÉCLENCHEUR SLASH COMMANDS `/` ---
        const slashMatch = context.matchBefore(/^\s*\/([a-zA-Z0-9_-]*)$/);
        if (slashMatch) {
          const query = slashMatch.text.trim().slice(1).toLowerCase();

          const slashCommands = [
            {
              label: '/titre1',
              detail: 'Titre de niveau 1 (#)',
              template: '# Titre principal\n',
            },
            {
              label: '/titre2',
              detail: 'Section de niveau 2 (##)',
              template: '## Section\n',
            },
            {
              label: '/titre3',
              detail: 'Sous-section de niveau 3 (###)',
              template: '### Sous-section\n',
            },
            {
              label: '/tache',
              detail: 'Tâche à faire (- [ ])',
              template: '- [ ] ',
            },
            {
              label: '/tache-urgente',
              detail: 'Tâche urgente !p1 (- [!] )',
              template: '- [!] Nouvelle tâche urgente !p1\n',
            },
            {
              label: '/mermaid',
              detail: 'Diagramme Mermaid interactif',
              template: '```mermaid\ngraph TD\n    A[Début] --> B(Étape 1)\n    B --> C{Validation}\n    C -->|Oui| D[Succès]\n    C -->|Non| A\n```\n',
            },
            {
              label: '/callout-note',
              detail: 'Encart Note sobre (> [!NOTE])',
              template: '> [!NOTE]\n> Information contextuelle sobre et élégante.\n\n',
            },
            {
              label: '/callout-tip',
              detail: 'Encart Astuce (> [!TIP])',
              template: '> [!TIP]\n> Astuce de productivité ou raccourci clavier.\n\n',
            },
            {
              label: '/callout-warning',
              detail: 'Encart Attention (> [!WARNING])',
              template: '> [!WARNING]\n> Précautions importantes à respecter.\n\n',
            },
            {
              label: '/tableau',
              detail: 'Tableau Markdown 3 colonnes',
              template: '| Colonne 1 | Colonne 2 | Statut |\n|---|---|---|\n| Élément A | Donnée 1 | En cours |\n| Élément B | Donnée 2 | Terminé |\n\n',
            },
            {
              label: '/sommaire',
              detail: 'Sommaire dynamique (knit-toc)',
              template: '```knit-toc\ndepth: 3\ncollapsible: true\n```\n',
            },
            {
              label: '/fichiers',
              detail: 'Index de fichiers (knit-files)',
              template: '```knit-files\nfolder: ""\nsort: updated desc\nlimit: 10\nlayout: table\n```\n',
            },
            {
              label: '/requete',
              detail: 'Requête Frontmatter (knit-query)',
              template: '```knit-query\nfrom: ""\nwhere: statut != "termine"\nsort: priorite desc\ncolumns: [titre, statut, priorite, path]\n```\n',
            },
            {
              label: '/taches-globales',
              detail: 'Agrégateur de tâches (knit-tasks)',
              template: '```knit-tasks\nfrom: ""\nstatus: todo\ngroup_by: file\n```\n',
            },
            {
              label: '/code',
              detail: 'Bloc de code Markdown',
              template: '```typescript\n// Code ici\n```\n',
            },
            {
              label: '/citation',
              detail: 'Bloc de citation (> )',
              template: '> Citation inspirante\n\n',
            },
          ];

          const options = slashCommands
            .filter((cmd) => !query || cmd.label.toLowerCase().includes(query) || cmd.detail.toLowerCase().includes(query))
            .map((cmd) => ({
              label: cmd.label,
              detail: cmd.detail,
              type: 'slash',
              apply: (view: EditorView, _c: Completion, _from: number, to: number) => {
                view.dispatch({
                  changes: { from: slashMatch.from, to, insert: cmd.template },
                  selection: { anchor: slashMatch.from + cmd.template.length },
                });
              },
            }));

          return {
            from: slashMatch.from,
            options,
            filter: false,
          };
        }

        return null;
      },
    ],
  });
}
