# CLAUDE.md — Directives pour Claude Code

> Instructions pour Claude Code lorsqu'il intervient dans le dépôt Knit.

## Présentation du Projet
Knit est une application collaborative local-first et peer-to-peer (P2P) pour la gestion de wiki, suivi de projet et documentation en Markdown pur.

## Commandes Fréquentes
- **Frontend** : `cd knit-app && npm run dev`
- **Tauri / Rust** : `cargo check --workspace` / `cargo test --workspace` / `cargo tauri dev`
- **Linting** : `npm run lint` / `cargo clippy --workspace`

## Principes Fondamentaux de Développement
1. **Markdown Pur & Pas d'Enfermement** : Ne jamais corrompre les fichiers Markdown avec des métadonnées propriétaires cachées. Respecter la syntaxe CommonMark + YAML Frontmatter.
2. **P2P & Local-First** : Ne jamais introduire de dépendance à un serveur centralisé pour le stockage. `.knit/` reste strictement local (clés, cache), `.knitshare` est synchronisé.
3. **Collaboration Sobre & Non Intrusive** :
   - Suivre scrupuleusement la charte [docs/UI_UX.md](docs/UI_UX.md).
   - Les curseurs distants doivent être fins (2px) et les surlignages translucides (15-20% d'opacité).
   - Les présences dans la barre latérale utilisent des cercles d'avatars avec initiales.
4. **Agilité & Traçabilité** :
   - Ne jamais altérer l'arborescence des versions sans mettre à jour `versions/BACKLOG.md`.
   - Utiliser des messages de commit en français.
5. **Typage Strict (sauf si contre-productif)** :
   - TypeScript rigoureux (`strict: true`, pas de `any`) et Rust idiomatique (`Result<T, KnitError>`) pour garantir des contrats d'interfaces fiables entre agents IA et développeurs. Ne déroger que si un sur-typage théorique bloque la productivité.
6. **Menus Contextuels Applicatifs Systématiques** :
   - Le clic droit natif est désactivé au profit d'un menu sur-mesure centralisé (`contextMenuStore`). Tout composant interactif créé ou modifié doit inclure son menu contextuel adapté (ex: copie des chemins relatifs/absolus, lien Markdown, actions de fichiers et d'onglets).
7. **Formulaires Centralisés & Robustesse des Événements Souris** :
   - Tout champ de formulaire (`input`, `checkbox`, `button`, `label`) doit utiliser le système centralisé défini dans `src/theme/forms.css` et les tokens Knit. Interdiction des éléments de formulaires natifs dépareillés.
   - Clic molette (`e.button === 1`) : Toujours bloquer la boussole de défilement navigateur avec `if (e.button === 1) e.preventDefault()` dans `onMouseDown`, et placer exclusivement l'action métier dans `onAuxClick` pour éliminer tout double déclenchement.
8. **Tooltips Modernes & Netteté des Icônes** :
   - Ne jamais recourir aux infobulles natives de l'OS. Utiliser le composant `<Tooltip>` ou les attributs `data-tooltip="Action"` et `data-shortcut="Ctrl+X"`. Le `TooltipContainer` global intercepte automatiquement les attributs `title` et extrait les raccourcis en badges `<kbd>`.
   - Les tracés d'icônes (`DuotoneIcon`) doivent être ultra-lisibles aux petites tailles (14px) avec des traits nets et des têtes de flèches bien découpées.
9. **Architecture Doc-Driven Views & TabBar Permanente** :
   - Toute vue doit être résolue par onglet selon le type déclaré dans le Frontmatter YAML (`type: kanban`, `type: table`, `type: note`) selon [docs/MARKDOWN_SPEC.md](docs/MARKDOWN_SPEC.md).
   - La barre d'onglets (`TabBar`) doit rester visible sur toutes les vues, avec icône dynamique par type de document.
10. **Synchronisation Continue des Règles d'Agents IA (Règle B-043)** :
   - Toute nouvelle fonctionnalité touchant au format de coffre (syntaxe Markdown, types de documents YAML `type: ...`, nouveaux blocs dynamiques, triggers d'autocomplétion `[[#...]]`, `@...`, dossiers de coffre) doit être immédiatement répercutée dans l'ensemble des fichiers de règles générés pour les IA (`KNIT.md`, `.cursor/rules/knit.mdc`, `CLAUDE.md`, `.agents/skills/knit/SKILL.md`).
11. **Mémoire Agentique Persistante (`.knit/AI_MEMORY.md`) & Protocole Handoff** :
   - Au démarrage d'une session ou tâche, tout agent lit en priorité `.knit/AI_MEMORY.md` (~400 tokens) pour réactiver l'état d'avancement et les décisions clés sans gonfler son contexte.
   - À l'achèvement d'une tâche d'envergure ou avant de clore, mettre à jour `.knit/AI_MEMORY.md` (sections *Historique Récent* et *Tâches Actives*).
12. **Norme de Tâches Étendues & Markdown Pur (B-054)** :
   - Respecter les 7 statuts reconnus par Knit (`- [ ]`, `- [/]`, `- [x]`, `- [-]`, `- [?]`, `- [>]`, `- [!]`), les priorités inline (`!p1`, `!p2`, `!p3`), les dates/heures (`@YYYY-MM-DD[ HH:mm[-HH:mm]]`) et assignations (`@collaborateur` ou `@vault`). Ne jamais introduire de balise HTML propriétaire pour les tâches.
13. **Alignement Systématique des Versions (Commit, Push, Cadrage & Livraison de Sprint)** :
    - À chaque **commit Git**, **`git push`**, **construction/planification d'un sprint**, et **à la livraison d'un sprint/version**, vérifier impérativement la cohérence stricte de la version à travers les 6 sources de vérité du code :
      1. `Cargo.toml` (racine) : `[workspace.package] version = "X.Y.Z"`
      2. `knit-core/Cargo.toml` : `version.workspace = true`
      3. `knit-app/src-tauri/Cargo.toml` : `version.workspace = true`
      4. `knit-app/src-tauri/tauri.conf.json` : `"version": "X.Y.Z"`
      5. `knit-app/package.json` et racine `package.json` : `"version": "X.Y.Z"`
      6. `knit-app/src/utils/version.ts` : `export const APP_VERSION = 'X.Y.Z'`
    - Vérifier également la concordance documentaire : `versions/vX.Y.Z/CHANGELOG.md`, `versions/vX.Y.Z/sprint-N/SPRINT.md`, `versions/VERSIONING.md` et `.knit/AI_MEMORY.md`.
14. **Zéro Émoji dans l'Interface Utilisateur (UI) & le Code** :
    - Interdiction formelle d'introduire des émojis Unicode dans les composants React, menus contextuels, barres d'outils, boutons, en-têtes, onglets, notifications toasts, badges, ou templates Markdown par défaut.
    - Toujours recourir aux icônes vectorielles sobres (`DuotoneIcon` ou SVG purs) pour garantir une esthétique professionnelle et soignée (style Linear / Obsidian).
    - Seul l'utilisateur final a le libre choix de taper des émojis dans le contenu texte brut de ses notes Markdown.
15. **Mode Debug Global Unifié (US B-056)** :
    - Un seul déclencheur global dans le Header (knit-app/src/components/Header.tsx) couplé à src/stores/debugStore.ts et window.__KNIT_DEBUG__. Ne jamais insérer de bouton de debug dans les onglets ou vues locales.
    - Assure la mesure temps réel pixel-perfect (0px décalage) de CodeMirror 6 et le rendu bijectif unifié des blocs de code Markdown (carte unifiée en lecture, source intégrale au clic).
