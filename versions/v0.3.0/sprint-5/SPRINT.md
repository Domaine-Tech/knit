# Sprint 5 — Vues Kanban & Navigation Clavier

> Objectif : Offrir une couche de gestion de projet projetée sur les fichiers Markdown sans jamais enfermer les données dans une base propriétaire.

| Info | Détail |
|---|---|
| **Version** | v0.3.0 |
| **Durée** | 2026-10-16 (Sprint Réalisé) |
| **Statut** | ✅ Terminé |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-023 | Vue Kanban : fichiers `.md` dédiés (`type: kanban`) avec colonnes personnalisables illimitées | 🔴 | ✅ | Antigravity |
| B-024 | Vue Tableau : liste filtrable, triable et exportable pour chaque fichier Kanban | 🟠 | ✅ | Antigravity |
| B-025 | Drag & Drop Kanban (déplacer une carte réorganise les sections `##` dans le fichier `.md`) | 🟠 | ✅ | Antigravity |
| B-026 | Recherche globale dans tout le coffre (`Ctrl+Shift+F` avec snippets) | 🔴 | ✅ | Antigravity |
| B-026a | Quick Switcher (`Ctrl+O`) & Palette de commandes (`Ctrl+P`) (Obsidian) | 🔴 | ✅ | Antigravity |
| B-026b | WikiLinks bidirectionnels `[[Note]]` avec autocomplétion (Obsidian) | 🟠 | ✅ | Antigravity |
| B-026c | Système de Tags (`#inline` et `tags: [...]` en frontmatter, volet de filtres) | 🟠 | ✅ | Antigravity |

---

## Critères d'acceptation (DoD - Definition of Done)

- [x] Un tableau Kanban est un fichier Markdown standard déclaré avec `type: kanban` dans son frontmatter YAML.
- [x] Possibilité d'avoir autant de fichiers Kanban que souhaité dans le coffre (ex: `projet/kanban-projet.md`, `perso/kanban-perso.md`, `equipe/kanban-equipe.md`).
- [x] L'utilisateur peut créer le nombre de colonnes de son choix via le bouton `+ Ajouter une colonne` ; chaque colonne correspond à une section `## Titre`.
- [x] Glisser-déposer une carte déplace le point de liste `- [ ]` ou `- [x]` vers la section correspondante dans le fichier `.md` sur le disque.
- [x] Vue Tableau intégrée affichant toutes les cartes sous forme tabulaire avec tri instantané, filtre de colonne et exports (CSV, Markdown table).
- [x] Bouton `Code Markdown` / `Éditeur` accessible à tout moment pour inspecter et modifier directement le code source Markdown.
- [x] `Ctrl+O` ouvre le Quick Switcher instantanément avec recherche floue sur tous les fichiers du coffre.
- [x] `Ctrl+Shift+F` ouvre le volet de recherche globale avec affichage des snippets et lignes en surbrillance.
- [x] Taper `#` suggère les tags existants du coffre ; le volet Tags permet de filtrer avec multi-sélection.
- [x] Taper `[[` dans CodeMirror 6 suggère les notes du coffre et active la navigation au clic.
- [x] Tous les champs de formulaire (`select`, `input`, `textarea`, `checkbox`) disposent d'un design système sombre/clair unifié sans contraste dégradé.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| 2026-10-16 | Architecture Kanban 100% basée sur des fichiers `.md` indépendants | Permettre d'avoir un Kanban par projet, un Kanban perso et un Kanban d'équipe avec colonnes libres | Oui |
| 2026-10-16 | Raccourcis clavier globaux `Ctrl+Shift+K` (Kanban direct) et exports CSV / Markdown table | Ergonomie avancée et conformité avec les standards de gestion de tâches | Oui |
| 2026-10-16 | Bouton de création multi-types dans la barre latérale | Création directe de notes `.md` ou de tableaux Kanban `.md` depuis le bouton `+` | Oui |
| 2026-10-16 | Design unifié et sombre des `<select>` et formulaires (`forms.css`) | Corriger le rendu natif GTK/Linux avec fond blanc sur texte clair | Oui |

---

## Rétrospective

### Ce qui a bien marché
- Architecture 100% Markdown inspirée d'Obsidian Kanban : chaque tableau est un fichier `.md` humainement lisible, versionnable avec Git et synchronisable via Yjs sans aucune base de données propriétaire.
- Flexibilité totale des colonnes : ajout, renommage inline, réordonnancement gauche/droite et suppression avec répercussion instantanée dans le document.
- Double affichage Kanban ↔ Tableau pour chaque fichier, avec bascule transparente vers l'éditeur Markdown source CodeMirror 6.
- Résolution complète du bug de rendu des champs de formulaires sur Linux grâce à la classe `.knit-select` et au chevron SVG personnalisé dans `forms.css`.
- Suite complète de 37 tests unitaires Rust validée et build frontend instantané (< 350ms).

### Ce qu'on peut améliorer
- Sprint 6 : Rendu interactif Mermaid inline avec WidgetType CodeMirror, bouton source/rendu au clic sur les blocs, et menu Slash Command `/`.
