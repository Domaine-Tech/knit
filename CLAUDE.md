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


