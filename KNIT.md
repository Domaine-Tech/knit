# Instructions pour les agents IA

> Ce fichier est lu automatiquement par les agents IA (Cursor, Claude Code, Antigravity) lorsqu'ils travaillent dans ce dépôt.

## À propos du projet

Knit est une application collaborative local-first & P2P en Markdown. Ce dépôt contient le code source et la documentation du projet.

## Structure du dépôt

```
knit/
├── docs/                    # Documentation technique
├── versions/                # Gestion de versions, sprints, changelogs
│   ├── BACKLOG.md           # Backlog global (modifiable à tout moment)
│   ├── VERSIONING.md        # Méthodologie de versioning
│   └── v{X.Y.Z}/           # Dossier par version
│       ├── CHANGELOG.md     # Changelog de la version
│       └── sprint-{N}/     # Dossier par sprint
│           └── SPRINT.md   # Objectifs et tâches du sprint
├── .cursor/rules/           # Règles modulaires Cursor / IDE IA (.mdc)
├── .cursorrules             # Règles universelles pour agents IA
├── CLAUDE.md                # Directives dédiées pour Claude Code
├── KNIT.md                  # Ce fichier (instructions centrales IA)
├── .knitshare.example       # Modèle de configuration partagée
└── README.md                # README principal
```

## Conventions

### Versioning & Alignement Multi-Fichiers
- Format : SemVer `vMAJOR.MINOR.PATCH`
- Chaque version contient 1 à 3 sprints de 1 à 2 semaines
- **Source unique de vérité** : `Cargo.toml` racine (`[workspace.package] version = "X.Y.Z"`).
- **Contrat d'alignement strict** : Les versions déclarées dans `knit-core/Cargo.toml`, `knit-app/src-tauri/Cargo.toml`, `knit-app/src-tauri/tauri.conf.json`, `knit-app/package.json`, `package.json` racine et `knit-app/src/utils/version.ts` doivent être strictement identiques en permanence.

### Backlog
- Le backlog global est dans `versions/BACKLOG.md`
- Il peut être modifié **à tout moment**, même en milieu de sprint
- Les ajouts en milieu de sprint sont tracés dans le `SPRINT.md` concerné sous la section "Ajouts en cours de sprint"

### Documentation
- Toute la doc est en Markdown dans `docs/`
- Les diagrammes utilisent Mermaid (blocs ```mermaid)

### Coffre-fort & Fichiers
- **`.knit/`** : Dossier local technique (clés privées, cache, snapshots CRDT). Ne JAMAIS le versionner ou le modifier sans précaution.
- **`.knitshare`** : Fichier partagé du coffre (conventions d'équipe, nom du coffre). Doit être versionné et synchronisé.
- **`assets/`** : Répertoire dédié aux images et pièces jointes binaires (synchronisées via Iroh Blobs).
- **Frontmatters YAML & Doc-Driven Views** : Préserver scrupuleusement la structure des métadonnées `---` en tête de fichier `.md` (champs `type:`, `statut:`, `priorite:`, etc.) selon la spécification [docs/MARKDOWN_SPEC.md](docs/MARKDOWN_SPEC.md). La vue est toujours pilotée par le document et résolue par onglet.

### Standards Markdown Riches & Vues Reconnues par Knit
Tout agent IA générant ou manipulant des fichiers dans le coffre doit se conformer à ces normes ouvertes :

1. **Les 7 Statuts de Tâches Standardisés (B-054)** :
   - `- [ ]` : À faire (To-do)
   - `- [/]` : En cours (In progress, sablier feutré)
   - `- [x]` : Terminé (Done, barré feutré)
   - `- [-]` : Annulé / Abandonné (Cancelled)
   - `- [?]` : En attente / Question (On hold / Question)
   - `- [>]` : Reporté / Délégué (Forwarded / Deferred)
   - `- [!]` : Urgent / Bloquant (Urgent)
2. **Priorités & Assignations Inline** :
   - `!p1` (urgent), `!p2` (haut), `!p3` (bas)
   - `@collaborateur` (assignation individuelle) et `@vault` (assignation collective au coffre)
   - `@YYYY-MM-DD` ou `@YYYY-MM-DD HH:mm[-HH:mm]` (dates et plages horaires)
3. **Callouts GFM (Alertes Épurées)** :
   - `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`, `> [!CAUTION]`
4. **WikiLinks & Deep-Linking** :
   - `[[Nom Note]]`, `[[Note#Titre Section]]`, `[[Note|Texte Affiché]]`, `[[#Titre Local]]`
5. **Standards des 7 Vues Doc-Driven (`type: ...`)** :
   - **`note`** : Éditeur Live Preview (CodeMirror 6) avec diagrammes Mermaid inline ```mermaid
   - **`kanban`** : Colonnes délimitées par `## Titre` et cartes délimitées par `- [ ]`
   - **`table`** : Tableaux GitHub Flavored Markdown `| Col 1 | Col 2 |`
   - **`calendar`** : Projection d'agenda scannant `@dates`, `@heures` et `due:`
   - **`canvas`** : Format standard ouvert JSON-Canvas (fichiers `.canvas` ou bloc markdown)
   - **`slides`** : Diaporama standard Marp/Slidev avec séparateur de transparents `---`
   - **`gallery`** : Cartes visuelles basées sur les clés frontmatter `cover:`, `banner:`, `tags:`

## Règles pour les agents IA

1. **Ne jamais supprimer de documentation existante** sans instruction explicite
2. **Toujours mettre à jour le BACKLOG.md** si une nouvelle tâche est identifiée
3. **Respecter le format des sprints** défini dans `versions/VERSIONING.md`
4. **Ne jamais altérer le formatage Markdown pur** lors de l'édition (compatibilité CodeMirror 6)
5. **Utiliser des messages de commit clairs** en français
6. **Typage strict (sauf si contre-productif)** : Coder en TypeScript strict et Rust idiomatique sans `any` pour sécuriser les modifications des agents IA, sans tomber dans un sur-typage théorique si cela nuit à la productivité réelle.
7. **Menus contextuels applicatifs centralisés** : Le clic droit webview natif est proscrit. Pour toute nouvelle interface ou modification d'écran dans `knit-app`, alimenter systématiquement le menu contextuel centralisé (`contextMenuStore.show`) avec les actions clés (copie de chemins relatifs et absolus, liens Markdown, manipulation de fichiers/onglets, révélation).
8. **Formulaires centralisés & robustesse clic molette** : Styliser tous les composants via `src/theme/forms.css` et tokens Knit. Sur clic molette (`button === 1`), neutraliser la boussole de défilement dans `onMouseDown` (`e.preventDefault()`) et placer l'action métier exclusivement dans `onAuxClick`.
9. **Tooltips modernes & lisibilité des icônes** : Proscrire les tooltips natifs de l'OS au profit du composant `<Tooltip>` ou des attributs `data-tooltip` et `data-shortcut` (interceptés par `TooltipContainer`). Garantir un tracé net (`strokeWidth >= 40`) pour les icônes `DuotoneIcon` à 14px.
10. **Architecture Doc-Driven Views & TabBar permanente** : Ne jamais forcer un changement de vue global à l'application. La vue (`editor`, `kanban`, `table`) doit être résolue par onglet selon le `type:` du document ou la bascule Source `</>`. La TabBar doit rester visible sur toutes les vues.
11. **Kit universel multi-agents IA & Synchronisation continue (B-043)** : Tout coffre-fort Knit veille à maintenir et respecter les fichiers de règles dédiés aux agents IA (`KNIT.md`, `.cursor/rules/knit.mdc`, `CLAUDE.md`, `.agents/skills/knit/SKILL.md`, `.github/copilot-instructions.md`, `.windsurfrules`, `.clinerules`). Dès qu'une nouvelle fonctionnalité touchant au format de coffre est introduite (nouveau `type:`, clé frontmatter, bloc dynamique, syntaxe d'autocomplétion `[[#...]]`, `@...`), ces fichiers doivent être immédiatement mis à jour pour garantir une interopérabilité sans faille avec l'ensemble des assistants du marché.
12. **Mémoire Agentique Persistante (`.knit/AI_MEMORY.md`) & Protocole Handoff** : Pour préserver les tokens et éliminer l'amnésie inter-sessions sur les coffres de toute taille, tout agent démarre sa session en lisant `.knit/AI_MEMORY.md` (~400 tokens) et met à jour ses sections (historique récent et tâches actives) à l'achèvement d'un jalon.
13. **Norme de Tâches Étendues & Markdown Pur (B-054)** : Lors de la génération ou modification de tâches dans les documents, respecter strictement les 7 statuts reconnus par Knit (`- [ ]` à faire, `- [/]` en cours, `- [x]` fait, `- [-]` annulé, `- [?]` question, `- [>]` reporté, `- [!]` urgent), les priorités inline (`!p1`, `!p2`, `!p3`), les dates/heures (`@YYYY-MM-DD[ HH:mm[-HH:mm]]`) et assignations (`@collaborateur` ou `@vault`). Ne jamais insérer de balise HTML propriétaire pour les tâches.
14. **Alignement Strict des Versions (Commit, Push, Cadrage & Livraison de Sprint)** : À chaque **commit Git**, **`git push`**, **construction/planification d'un sprint** (`SPRINT.md`), ou **livraison d'un sprint/version** (`✅ Terminé`, tag Git, release), l'agent IA doit obligatoirement vérifier la concordance absolue du numéro de version dans :
    - `Cargo.toml` racine (`[workspace.package] version = "X.Y.Z"`)
    - `knit-core/Cargo.toml` (`version.workspace = true`)
    - `knit-app/src-tauri/Cargo.toml` (`version.workspace = true`)
    - `knit-app/src-tauri/tauri.conf.json` (`"version": "X.Y.Z"`)
    - `knit-app/package.json` et racine `package.json` (`"version": "X.Y.Z"`)
    - `knit-app/src/utils/version.ts` (`export const APP_VERSION = 'X.Y.Z'`)
    - `versions/vX.Y.Z/CHANGELOG.md`, `versions/vX.Y.Z/sprint-N/SPRINT.md`, `versions/VERSIONING.md` et `.knit/AI_MEMORY.md`.
15. **Zéro émoji dans l'interface et le code** : Interdiction absolue d'ajouter des émojis dans les interfaces utilisateur, boutons, barres d'outils, menus contextuels, notifications toasts, badges, onglets ou templates par défaut générés par l'IA. Toujours utiliser des icônes vectorielles sobres (`DuotoneIcon` ou SVG purs). L'utilisation d'émojis est un choix réservé strictement au texte Markdown libre rédigé par l'utilisateur final.

16. **Mode Debug Global Unifié (US B-056)** : Tout composant ou vue réagissant au mode debug doit passer par `useDebugStore` (`src/stores/debugStore.ts`). Un seul bouton dans le Header (`knit-app/src/components/Header.tsx`), aucun bouton local dans les onglets. L'overlay HUD fournit un diagnostic temps réel de l'alignement pixel-perfect de CodeMirror 6 (0 décalage cumulatif). Les blocs de code Markdown utilisent le rendu bijectif unifié (carte élégante en lecture, source intégrale au clic).

17. **Déclencheur Rapide des Prompts IA Standardisés (`docs/PROMPTS_IA.md`)** : Dès que l'utilisateur écrit dans le chat `fait prompt X` ou `prompt X` (avec X de 1 à 6 ou bonus) :
    - Charger immédiatement le prompt correspondant dans `docs/PROMPTS_IA.md` (1: Refactoring, 2: Performance, 3: Traduction/i18n, 4: Sécurité, 5: UX/Killer App, 6: Alignement Code/Doc/Versions).
    - Adopter le rôle expert, le contexte architectural de Knit et ses contraintes.
    - Appliquer rigoureusement le **STRICT MODE PLAN** : analyse en lecture seule, diagnostic chiffré, plan d'action phasé avec cases `[ ]`, et demande obligatoire de validation avant toute modification de fichier.
