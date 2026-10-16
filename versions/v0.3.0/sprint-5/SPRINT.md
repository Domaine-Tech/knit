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
| B-023 | Vue Kanban : colonnes automatiques basées sur `statut:` du frontmatter | 🔴 | ✅ | Antigravity |
| B-024 | Vue Tableau : liste filtrable, triable et exportable de toutes les tâches | 🟠 | ✅ | Antigravity |
| B-025 | Drag & Drop Kanban (déplacer une carte met à jour le frontmatter YAML) | 🟠 | ✅ | Antigravity |
| B-026 | Recherche globale dans tout le coffre (`Ctrl+Shift+F` avec snippets) | 🔴 | ✅ | Antigravity |
| B-026a | Quick Switcher (`Ctrl+O`) & Palette de commandes (`Ctrl+P`) (Obsidian) | 🔴 | ✅ | Antigravity |
| B-026b | WikiLinks bidirectionnels `[[Note]]` avec autocomplétion (Obsidian) | 🟠 | ✅ | Antigravity |
| B-026c | Système de Tags (`#inline` et `tags: [...]` en frontmatter, volet de filtres) | 🟠 | ✅ | Antigravity |

---

## Critères d'acceptation (DoD - Definition of Done)

- [x] Tout fichier Markdown comportant un frontmatter YAML avec un champ `statut:` apparaît comme une carte dans le Kanban.
- [x] Glisser une carte d'une colonne "En cours" à "Terminé" modifie la ligne `statut: termine` dans le fichier `.md` sur le disque.
- [x] `Ctrl+O` ouvre le Quick Switcher instantanément avec recherche floue sur tous les fichiers du coffre.
- [x] `Ctrl+Shift+F` ouvre le volet de recherche globale avec affichage des snippets et lignes en surbrillance.
- [x] Taper `#` suggère les tags existants du coffre ; cliquer sur un tag dans le volet filtre les notes associées.
- [x] Taper `[[` dans CodeMirror 6 suggère les notes du coffre et insère le lien cliquable.
- [x] La vue Tableau permet de filtrer par priorité (🔴, 🟠, 🟡, 🟢) et de rechercher par titre en temps réel (< 50ms).
- [x] Aucune altération du texte, des commentaires ou des métadonnées additionnelles lors du déplacement d'une carte.
- [x] Navigation clavier accessible entre les colonnes et les cartes.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| 2026-10-16 | Raccourcis clavier globaux `Ctrl+Shift+K` (Kanban direct) et exports CSV / Markdown table | Ergonomie avancée et conformité avec les standards de gestion de tâches | Oui |

---

## Rétrospective

### Ce qui a bien marché
- Architecture modulaire dans `knit-core` : `search.rs`, `tasks.rs`, `tags.rs` performants, indexant directement le système de fichiers sans aucune base de données opaque ni propriétaire.
- Modification chirurgicale et non destructive du frontmatter YAML : glisser-déposer de cartes Kanban mettant à jour uniquement la ligne `statut: ...` avec préservation intégrale du corps de texte, retours chariots et métadonnées annexes.
- Intégration fluide de CodeMirror 6 avec `@codemirror/autocomplete` pour la saisie intuitive des WikiLinks `[[...]]` et des tags `#...`.
- Navigation intégrale au clavier (`Ctrl+O` Quick Switcher, `Ctrl+P` Palette de commandes, `Ctrl+Shift+F` Recherche globale, `Ctrl+Shift+K` Kanban).
- Couverture de tests à 100% sur les nouveaux modules Rust (37 tests au total) et respect strict des règles de clippy (zéro avertissement).

### Ce qu'on peut améliorer
- Prévoir pour le Sprint 6 l'intégration des diagrammes Mermaid inline avec WidgetType CodeMirror et le menu slash `/` pour l'insertion rapide de blocs.
