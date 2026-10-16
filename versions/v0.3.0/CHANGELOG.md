# Changelog — v0.3.0

> Version 0.3.0 — Vues Projets Dynamiques & Rendu Mermaid Vivant.
> Statut : 📋 Planifié

---

## ✨ Nouveautés

- **Navigation clavier & Recherche ultra-rapide (Inspiration Obsidian)** :
  - **Quick Switcher (`Ctrl+O`)** : Recherche floue instantanée (< 10ms) pour sauter à n'importe quelle note.
  - **Palette de commandes (`Ctrl+P`)** : Pilotage intégral au clavier sans souris.
  - **WikiLinks bidirectionnels (`[[...]]`)** : Suggestions automatiques dès la frappe de `[[` et navigation instantanée.
  - **Split View & Multi-onglets (`Ctrl+\`)** : Édition de deux documents côte à côte.
- **Ergonomie de saisie fluide (Inspiration Notion)** :
  - **Menu Slash Command (`/`)** : Insertion rapide de blocs sans lever les mains du clavier (`/titre`, `/tache`, `/mermaid`, `/callout`).
  - **Callouts GFM stylisés** : Rendu sobre et élégant des alertes (`> [!NOTE]`, `> [!TIP]`, etc.).
- **Tableaux Kanban 100% Fichiers Markdown (`type: kanban`)** :
  - Chaque fichier Markdown peut devenir son propre tableau Kanban dédié (un Kanban par projet, un Kanban perso, un Kanban d'équipe).
  - Nombre de colonnes illimité et personnalisable (`+ Ajouter une colonne`), chaque colonne correspondant à un titre `##`.
  - Glisser-déposer (Drag & Drop) fluide déplaçant directement les items `- [ ]` entre les sections sans base propriétaire.
  - Bascule instantanée entre Vue Kanban, Vue Tableau et Code Markdown brut.
- **Vue Tableau structurée par fichier** :
  - Vue tabulaire synchronisée avec filtres de colonne, tri en direct, cases à cocher et exports (CSV, Markdown table).
- **Moteur de recherche plein-texte** :
  - Indexation locale rapide de l'ensemble des notes et tâches du vault.
- **Rendu Mermaid inline immersif** :
  - Rendu direct des blocs ```mermaid dans l'éditeur via `WidgetType` CodeMirror 6.
  - Bascule transparente entre le code source et le diagramme rendu au clic.
  - Coloration syntaxique du code Mermaid (`codemirror-lang-mermaid`).
  - Palette du diagramme synchronisée dynamiquement avec la teinte de l'application (`--knit-hue`).
  - Moteur de rendu optimisé avec debounce de 300ms.

---

## 🐛 Corrections

- *(Prévues durant les tests d'ergonomie du Sprint 6)*

---

## 🔧 Technique

- Les vues Kanban et Tableaux n'utilisent aucune base de données propriétaire : elles sont des projections pures des fichiers `.md`.
- L'édition via Kanban ou via fichier texte brut est 100% interchangeable et réversible.

---

## 💥 Breaking Changes

- Aucun — rétrocompatibilité totale avec les fichiers Markdown v0.1.0 et v0.2.0.
