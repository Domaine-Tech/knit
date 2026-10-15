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
