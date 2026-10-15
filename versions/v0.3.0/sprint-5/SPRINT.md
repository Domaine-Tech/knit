# Sprint 5 — Vues Kanban & Tableau de Tâches

> Objectif : Offrir une couche de gestion de projet projetée sur les fichiers Markdown sans jamais enfermer les données dans une base propriétaire.

| Info | Détail |
|---|---|
| **Version** | v0.3.0 |
| **Durée** | 2026-12-15 → 2026-12-29 (2 semaines) |
| **Statut** | 📋 Planifié |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-023 | Vue Kanban : colonnes automatiques basées sur `statut:` du frontmatter | 🔴 | 📋 | — |
| B-024 | Vue Tableau : liste filtrable, triable et exportable de toutes les tâches | 🟠 | 📋 | — |
| B-025 | Drag & Drop Kanban (déplacer une carte met à jour le frontmatter YAML) | 🟠 | 📋 | — |
| B-026 | Recherche full-text indexée sur l'ensemble des fichiers du vault | 🟡 | 📋 | — |
| B-026a | Quick Switcher (`Ctrl+O`) & Palette de commandes (`Ctrl+P`) (Obsidian) | 🔴 | 📋 | — |
| B-026b | WikiLinks bidirectionnels `[[Note]]` avec autocomplétion (Obsidian) | 🟠 | 📋 | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [ ] Tout fichier Markdown comportant un frontmatter YAML avec un champ `statut:` apparaît comme une carte dans le Kanban.
- [ ] Glisser une carte d'une colonne "En cours" à "Terminé" modifie la ligne `statut: termine` dans le fichier `.md` sur le disque.
- [ ] `Ctrl+O` ouvre le Quick Switcher instantanément avec recherche floue sur tous les fichiers du coffre.
- [ ] Taper `[[` dans CodeMirror 6 suggère les notes du coffre et insère le lien cliquable.
- [ ] La vue Tableau permet de filtrer par priorité (🔴, 🟠, 🟡, 🟢) et de rechercher par titre en temps réel (< 50ms).
- [ ] Aucune altération du texte, des commentaires ou des métadonnées additionnelles lors du déplacement d'une carte.
- [ ] Navigation clavier accessible entre les colonnes et les cartes.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| — | — | — | — |

---

## Rétrospective

*(À compléter à la fin du sprint)*

### Ce qui a bien marché
- 

### Ce qu'on peut améliorer
- 
