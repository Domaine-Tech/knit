---
type: calendar
title: Agenda du Projet
---

# Agenda & Jalons du Projet

Cet agenda est positionné au sein du sous-dossier `projet/` (`projet/agenda.md`).

Grâce à la **portée délimitée (Scoped Agenda)**, cet agenda filtre et affiche automatiquement **exclusivement** les échéances et tâches :
- Du dossier actuel (`projet/`)
- De tous ses sous-dossiers enfants (`projet/taches/**`)

Les événements situés au-dessus (racine du coffre, autres dossiers, journal) ne sont pas affichés par défaut. Pour inspecter l'ensemble du coffre et vérifier d'éventuels conflits, utilisez le bouton **[Afficher tout le coffre]** dans la barre d'outils, le bouton **Agenda** du Header (`Ctrl+Shift+A` — modale globale), ou le 4ᵉ onglet **Agenda** de la barre latérale.

---

## Jalons & Tâches Spécifiques à ce Projet

- [ ] Revue globale des livrables du projet @2026-10-20 10:30-12:00 @Thomas !p1
- [ ] Atelier Design System & Composants @2026-10-20 14:00-15:30 @Alice
- [ ] Démonstration client P2P Local-First @2026-10-21 11:00-12:00 @Bob !p1
- [ ] Session de validation d'architecture @2026-10-22 10:00-11:30 @Alice !p2
- [ ] Tests croisés multi-pairs @2026-10-22 14:00-16:00 @vault !p2
- [ ] Audit de sécurité des flux et sanitizer HTML @2026-10-23 09:00-10:30 @Thomas
- [ ] Préparation du rapport de clôture @2026-10-23 16:00-17:00 @Bob
- [x] Initialisation de la roadmap projet @2026-10-18 @vault !p2
- [x] Alignement technique CRDT et Iroh @2026-10-18 09:30-10:00 @Thomas !p1

---

## Tâches Enfants Automatiquement Agrégrées (`projet/taches/`)

Les tâches et échéances définies dans les fiches Markdown de `projet/taches/` (ex: [[task-001-index-frontmatter.md|Index Frontmatter]], [[task-007-vue-agenda.md|Vue Agenda]]) sont automatiquement détectées par le parseur local et intégrées dans ce calendrier de projet.

---

## Fonctionnalités d'Excellence du Calendrier Knit

### 1. Portée Délimitée (Dossier Actuel & Enfants)
- **Scoping automatique** : Le chemin du fichier détermine la racine du projet (`projet/`). Seules les notes de cette branche arborescente sont indexées.
- **Bascule en 1 clic** : Le bouton de la toolbar permet d'alterner à la volée entre la vue focalisée sur le projet et la vue globale du coffre.

### 2. Menus Contextuels Systématiques (Clic Droit)
- **Clic droit sur un jour** : Ajouter un événement pré-rempli, ouvrir/créer la note de journal (`journal/YYYY-MM-DD.md`), basculer en vue Jour, ou copier la date ISO.
- **Clic droit sur un événement** : Changer la priorité (`!p1`, `!p2`, `!p3`, aucune), reporter l'échéance (Aujourd'hui, Demain, Semaine prochaine), ou basculer l'achèvement.
- **Validation directe** : Cochez directement la case d'une tâche dans l'agenda (`- [ ]` ↔ `- [x]`) sans ouvrir le code source.

### 3. Drag & Drop Bijectif Unifié
- **Indicateur d'insertion lumineux (`CalendarDropIndicator`)** : En vue Semaine ou Jour, un point d'ancrage de 8px et un filet doré indiquent l'emplacement exact d'insertion.
- **Cross-DnD** : Glissez une carte depuis le [[kanban.md|Kanban]] ou une tâche de la barre latérale sur une date pour la planifier instantanément.
