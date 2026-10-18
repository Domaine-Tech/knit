# Changelog — v0.4.0

> Version 0.4.0 — Requêtes Dynamiques & Vues Visuelles Avancées (Sprint 6bis & Sprint 6ter).  
> Statut : 🚀 En cours (Sprint 6bis clôturé — runtime encore en 0.3.0 jusqu'à livraison 6ter)

---

## ✨ Nouveautés

### Sprint 6bis — Moteur Dataview & Blocs Dynamiques _(clôturé — runtime encore en 0.3.0 jusqu'à livraison 6ter)_
- **Moteur de requêtes Frontmatter & Indexation locale en mémoire (`vaultStore.queryFiles()`) (B-031e)** :
  - Indexation réactive des métadonnées YAML (`frontmatterIndex`) sans scanner le disque à chaque frappe.
  - `mtime` réel via `FileNode.mtime_ms` (scan FS Rust) / horodatage déterministe en mode démo.
- **Bloc dynamique `knit-files` (B-031f)** :
  - Index et listing automatique d'un dossier (titre, icônes Duotone par `docType`, date de mise à jour).
- **Bloc dynamique `knit-query` (B-031g)** :
  - Tableaux et listes filtrables style Dataview (`from`, `where`, `sort`, `columns`) ; édition `statut` depuis le widget.
- **Bloc dynamique `knit-toc` (B-031h)** :
  - Sommaire cliquable généré automatiquement d'après les titres de la note hôte.
- **Bloc dynamique `knit-tasks` (B-031i)** :
  - Agrégateur transversal de cases à cocher `- [ ]` synchronisé via CRDT / writeFile (cocher met à jour le fichier d'origine).
  - Micro-jauge d'avancement feutrée 2px et badge réactif (`X/Y terminées • Z%`) mis à jour en direct au clic.
- **Déclencheurs Slash commands dédiés (B-031j)** :
  - Insertion rapide `/sommaire`, `/fichiers`, `/requete`, `/taches-globales`.
- **Assistant Visuel de Tableaux Markdown (B-047 & B-047a)** :
  - Mini-toolbar contextuelle avec détection de la colonne active sous curseur (`Col. X/Y`), alignement contextuel (`Align. G/C/D` ciblé), `+ Ligne`, `+ Colonne`, `Supprimer`, `Aligner`.
  - Navigation `Tab` / `Shift+Tab`, ajout de ligne sur `Entrée`, `formatTableColumns`.

### Sprint 6ter — Vues Immersives
- **Agenda & Échéancier Global du Coffre (`type: calendar` & Vue Globale) (B-031a)** :
  - Visualisation multi-vues (Mois, Semaine, Jour, Timeline) agrégeant l'ensemble des tâches `@dates` et réunions du coffre via `KnitCalendarIndex`.
  - Prise en charge des heures et plages horaires (`@YYYY-MM-DD 14:00-15:30`).
  - Attribution personnelle (`@collaborateur` avec avatar) et collective (`@vault` partagée).
  - Filtres d'affichage personnalisés (« Mes Tâches & Vault », « Collaborateur X », « Tout le Coffre »).
  - Glisser-déposer interactif réécrivant directement les dates et heures dans les fichiers Markdown sources.
  - Mini-widget calendrier dans la barre latérale et notifications d'échéances discrètes via Tauri.
- **Vue Canvas / Tableau Blanc infini (`type: canvas`) (B-031b)** :
  - Cartes de notes déplaçables sur canvas 2D avec connecteurs fléchés.
- **Vue Diaporama / Présentation (`type: slides`) (B-031c)** :
  - Projection plein écran style Marp/Slidev avec séparateurs `---`.
- **Vue Galerie / Database (`type: gallery`) (B-031d)** :
  - Cartes visuelles avec bannières d'images et métadonnées frontmatter.
- **Vue Graphe Local Interactive 2D (B-049)** :
  - Exploration visuelle des connexions WikiLinks/Backlinks sous forme de réseau de force interactif.
- **Support sécurisé du HTML standardisé en Live Preview & Rendu (B-059)** :
  - Rendu inline enrichi masqué hors curseur : touches clavier `<kbd>`, texte souligné `<u>`, surlignage `<mark>`, indices/exposants `<sub>`/`<sup>`, saut de ligne forcé `<br>`.
  - Blocs interactifs repliables : accordéons natifs `<details>` et `<summary>`.
  - Sanitizer strict neutralisant toute tentative d'injection XSS (`<script>`, `<iframe>`, handlers `on*`) pour garantir l'intégrité locale et collaborative P2P.

---

## 🐛 Corrections
- *(Prévues durant la phase de tests des sprints 6bis et 6ter)*

---

## 🔧 Technique
- Les blocs dynamiques projettent des composants réactifs en mémoire sans polluer les fichiers Markdown sous-jacents.
- Préservation de la philosophie 100% Markdown pur sans base de données opaque.

---

## 💥 Breaking Changes
- Aucun — rétrocompatibilité totale avec les spécifications v0.1.0 à v0.3.0.
