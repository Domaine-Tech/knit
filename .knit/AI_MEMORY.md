# Mémoire Agentique — Coffre Knit

> Registre de mémoire partagée inter-sessions pour agents IA (Cursor, Claude Code, Antigravity, Copilot, Windsurf, Cline, Aider).
> Format ultra-compact (~400 tokens) conçu pour être lu au démarrage de chaque nouvelle session et mis à jour à chaque jalon.

## 1. Principes Absolus & Stack Technique
- **Zéro base de données propriétaire** : le Markdown pur sur disque est la source unique de vérité.
- **Frontend** : React 19, TypeScript (`strict: true`), Vite, Tailwind CSS / Vanilla CSS (`--knit-hue`), CodeMirror 6 (Live Preview).
- **Backend & Core** : Rust 2021, Tauri v2 (`knit-core` pour la logique métier et les index, `src-tauri` pour l'IPC).
- **Temps Réel & Sync** : CRDT Yjs P2P (LAN / Libp2p mdns) sans serveur cloud obligatoire.
- **Vues Doc-Driven** : le type de vue découle du Frontmatter YAML (`type: note | kanban | table | calendar | canvas | slides | gallery`).
- **IHM** : Menu contextuel centralisé (`contextMenuStore`), jamais de menu natif du navigateur.
- **Zéro émoji dans l'UI** : composants React, menus, boutons, onglets, toasts et templates utilisent exclusivement des icônes vectorielles (`DuotoneIcon` ou SVG purs).

## 2. Décisions d'Architecture Validées (ADR Synthétiques)
- **ADR-01** : Règle continue : Tout ajout de type/syntaxe met immédiatement à jour les règles IA du coffre (`B-043`).
- **ADR-02 (B-052)** : Moteur d'autocomplétion universel (6 déclencheurs `[[`, `[[#`, `@`, `@@`, `#`, `:`, `/`) + index mémoire Rust `KnitSuggestIndex` (< 5ms).
- **ADR-03 (B-053)** : Smart UX d'écriture : Smart Paste (lien/image sur sélection), Auto-Wrap, formatage de tableaux (`Tab`/`Entrée`), Hover Preview au survol, raccourci Note Quotidienne (`Ctrl+Shift+J`), panneau Backlinks.
- **ADR-04 (B-031a)** : Agenda & Échéancier global : scanne `@YYYY-MM-DD[ HH:mm[-HH:mm]]` et `due:`, attribution `@nom-collaborateur` ou `@vault` (partagé), vues Jour/Semaine/Mois/Liste avec filtres personnalisés.
- **ADR-05** : Protocole Handoff IA : lecture au démarrage (1x) et mise à jour de ce fichier à chaque clôture ou jalon.
- **ADR-06** : Tâches étendues (`- [/]` en cours, `- [x]` fait, `- [-]` annulé, `- [?]` question), priorités `!p1`/`!p2`/`!p3`, barre de progression 2px projetée sous `#` et Mode Zen (`Ctrl+Shift+F`).
- **ADR-07** : Alignement strict de version : Cargo workspace, Tauri, frontend & Sprints 100% synchronisés à chaque commit, push, cadrage et livraison.
- **ADR-08** : Règle Zéro-Émoji dans l'UI : interdiction stricte d'injecter des émojis dans le code/interface (icônes vectorielles obligatoires).
- **ADR-09 (B-056)** : Mode Debug Global Unifié & Inspecteurs Multi-Vues : Un seul bouton d'activation global dans le Header (`debugStore.ts`, `window.__KNIT_DEBUG__`), overlay HUD pixel-perfect CodeMirror 6 (écart 0px, ratio 100%), cartes unifiées pour les blocs de code (rendu/édition bijectif style Tableaux/Mermaid), et inspecteurs extensibles pour toutes les vues.

## 3. Historique Récent des Sessions (Changelog Compact)
- **[2026-10-16]** : Passage à la v0.3.0 (Sprint 5 livré : Kanban Markdown pur, Tableaux, WindowControls frameless, identité Ambre), alignement multi-fichiers 100% vérifié.
- **[2026-10-16]** : Règle absolue d'alignement des versions (6 sources de vérité) intégrée dans .cursorrules, CLAUDE.md, KNIT.md, agent-rules-sync.mdc et VERSIONING.md.
- **[2026-10-16]** : Fix dépendance Vite `y-protocols`, vérification complète docs vs versions, création v0.4.0 (Sprint 6bis Dataview & 6ter Vues Immersives).
- **[2026-10-16]** : US B-052 (Autocomplétion Universelle & `KnitSuggestIndex` Rust), intégrée au Sprint 6.
- **[2026-10-16]** : US B-043 Kit IA Universel (Cursor, Claude, Antigravity, Copilot, Windsurf, Cline) & règle stricte de synchronisation continue (`agent-rules-sync.mdc`).
- **[2026-10-16]** : **Sprint 6 livré à 100% (v0.3.0)** : Doc-Driven Views (`type: note|kanban|table`), TabBar persistante universelle, conversion contextuelle de types avec rollback `Ctrl+Z`, bouton Source `</>` ↔ Rendu (`Ctrl+E`), Mermaid inline interactif & SVG cache réactif à `--knit-hue`, Live Preview Obsidian, Slash commands Notion (`/`), Split View (`Ctrl+\`), Curseur fantôme IA (`#8B5CF6`), Packager de contexte IA (`Ctrl+Shift+C`), autocomplétion universelle (6 triggers) avec index Rust `KnitSuggestIndex` (< 2ms), Smart UX (smart paste, auto-wrap, navigation tableau `Tab`/`Entrée`, hover preview, journal quotidien `Ctrl+Shift+J`, panneau backlinks), 7 statuts de tâches Markdown & synchro Kanban, Mode Zen (`Ctrl+Shift+F`), lazy-rendering et flush disque 250ms.
- **[2026-10-16]** : Règle Zéro-Émoji UI intégrée dans toutes les règles IA (.cursorrules, CLAUDE.md, KNIT.md, collab-ui-ux.mdc, agent-rules-sync.mdc, docs/UI_UX.md). Purge complète des émojis du code frontend.
- **[2026-10-17]** : **US B-056 Mode Debug Global Unifié & Stabilisation Pixel-Perfect** : Bouton unique dans le Header (`debugStore`), HUD diagnostic live preview, élimination des décalages cumulatifs, cartes unifiées de blocs de code (rendu élégant en lecture / bascule intégrale en source au clic), et restauration soignée de la barre des paramètres frontmatter de note.
- **[2026-10-17]** : Création de `docs/PROMPTS_IA.md` (6 prompts standardisés optimisés derniers LLMs en Mode Plan) et intégration de la commande rapide "fait prompt X" dans `.agents/skills/`, `.cursorrules`, `CLAUDE.md`, `KNIT.md` et `.cursor/rules/`.

## 4. Tâches Actives & Prochaines Priorités
- [x] **Sprint 5** (v0.3.0) : Livré ✅ — Kanban Markdown, Quick Switcher, Formulaires sombres, Logo ambre.
- [x] **Sprint 6** (v0.3.0) : Livré ✅ — Doc-Driven Views, Mermaid inline, Autocomplétion, Live Preview, Split View, Smart UX, Mode Zen.
- [ ] **Sprint 6bis** (v0.4.0) : B-031e à B-031j (Moteur Dataview & Blocs Dynamiques `knit-files`, `knit-query`, `knit-toc`, `knit-tasks`).
- [ ] **Sprint 6ter** (v0.4.0) : B-031a (Agenda & Calendrier Global, attribution `@nom`/`@vault`, filtres et rappels).
