# Sprint 6ter — Vues Immersives (Canvas, Calendrier & Diaporama)

> Objectif : Offrir des représentations visuelles immersives pour les types déclarés dans le Frontmatter YAML (`type: canvas`, `type: calendar`, `type: slides`, `type: gallery`) tout en conservant une réversibilité totale avec le format Markdown pur.

| Info        | Détail                               |
| ----------- | ------------------------------------ |
| **Version** | v0.4.0                               |
| **Durée**   | 2027-01-26 → 2027-02-09 (2 semaines) |
| **Statut**  | 📋 Planifié                          |

---

## Tâches du sprint

| #          | Tâche                                                                                                                                                                                    | Priorité | Statut | Assigné |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------- |
| **B-031a** | Agenda & Échéancier Global du Coffre (`type: calendar` / vue globale, scan `@dates` & `@heures`, attribution `@collaborateur` ou `@vault`, filtrage 'Mes tâches & Vault', drag-and-drop) | 🔴       | 📋     | —       |
| **B-031b** | Vue Canvas / Tableau Blanc infini (`type: canvas`, cartes déplaçables & connecteurs fléchés)                                                                                             | 🔴       | 📋     | —       |
| **B-031c** | Vue Diaporama / Présentation (`type: slides`, séparateur `---`, mode plein écran)                                                                                                        | 🟡       | 📋     | —       |
| **B-031d** | Vue Galerie / Database (`type: gallery`, cartes visuelles avec bannière et métadonnées)                                                                                                  | 🟡       | 📋     | —       |
| **B-049**  | Vue Graphe Local Interactive (Local Graph View 2D basé sur WikiLinks & Backlinks)                                                                                                        | 🟠       | 📋     | —       |
| **B-059**  | Support sécurisé du HTML standardisé en Live Preview & Rendu (Whitelist inline `<kbd>`, `<u>`, `<mark>`, `<sub>`, `<sup>`, `<br>` ; Blocs `<details>`/`<summary>` ; Sanitizer anti-XSS) | 🟡       | 📋     | —       |

---

## Critères d'acceptation (DoD - Definition of Done)

- [ ] **Agenda & Échéancier Global du Coffre (B-031a)** :
  - Agrégation instantanée via l'index Rust `KnitCalendarIndex` de toutes les tâches `- [ ]` et événements contenant `@YYYY-MM-DD` ou `due:`.
  - Prise en charge des heures et plages horaires (`@YYYY-MM-DD 14:30`, `@YYYY-MM-DD 14:00-15:30`).
  - Attribution personnelle (`@collaborateur` avec puce avatar) et collective (`@vault` partagée par l'équipe).
  - Vues interactives : Mois, Semaine, Jour et Liste chronologique avec barre d'onglets persistante.
  - Filtres d'affichage en 1 clic : « Mes Tâches & Vault », « Collaborateur X », « Tout le Coffre ».
  - Glisser-déposer bijectif : modifier la date ou l'heure sur la vue met à jour immédiatement le fichier Markdown source sur disque.
  - Mini-widget calendrier dans la barre latérale et notifications d'échéances discrètes via Tauri.
- [ ] L'ouverture d'un fichier avec `type: canvas` affiche une surface infinie avec cartes de notes interactives et liens directionnels.
- [ ] L'ouverture d'un fichier avec `type: slides` permet de projeter la note en diaporama plein écran avec navigation clavier (flèches gauche/droite, `Espace`), chaque diapositive étant séparée par `---`.
- [ ] L'ouverture d'un fichier avec `type: gallery` présente les éléments sous forme de grille de cartes avec prévisualisation d'images et pastilles de métadonnées.
- [ ] Vue Graphe Local 2D (B-049) : volet interactif avec nœuds colorés selon `--knit-hue`, simulation de forces, zoom/pan et saut vers la note au clic sur un nœud.
- [ ] **Support HTML sécurisé en Live Preview & Rendu (B-059)** :
  - Rendu masqué/stylisé hors curseur des balises inline standard : `<kbd>` (touches clavier stylisées), `<u>` (souligné), `<mark>` (surlignage), `<sub>` / `<sup>` (indices/exposants), `<br>` (saut forcé).
  - Prise en charge des blocs repliables `<details>` et `<summary>` en accordéons interactifs natifs.
  - Sanitization stricte : neutralisation de `<script>`, `<iframe>`, `<object>`, `<style>` et attributs d'événements `on*` garantissant une sécurité totale en local et en synchronisation P2P.
  - Alignement du rendu dans les infobulles/widgets (`renderSimpleMarkdown`) avec le même niveau de sécurité.
- [ ] Le bouton universel `</>` permet sur chaque vue de basculer instantanément vers le code Markdown brut sans altérer le document.
- [ ] Les conversions via menu contextuel (clic droit arbre ou onglet) prennent en charge ces nouveaux formats.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
| ---- | ------------- | ------ | ------------------- |
| —    | —             | —      | —                   |

---

## Rétrospective

_(À compléter à la fin du sprint)_

### Ce qui a bien marché

-

### Ce qu'on peut améliorer

-
