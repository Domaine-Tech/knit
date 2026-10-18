# Changelog — v0.4.0

> Version 0.4.0 — Requêtes Dynamiques & Vues Visuelles Avancées (Sprint 6bis & Sprint 6ter).  
> Statut : Livrée (Sprints 6bis + 6ter — runtime 0.4.0)

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
  - Glisser-déposer interactif avec indicateur d'insertion lumineux (`CalendarDropIndicator`), surbrillance de cellule et feedback fantôme 0.35 calqués sur le Kanban ; réécriture directe des dates et heures dans les fichiers Markdown sources.
  - Mini-widget calendrier dans la barre latérale et notifications d'échéances discrètes via Tauri.
- **Vue Canvas / Tableau Blanc infini (`type: canvas`) (B-031b)** :
  - Cartes de notes déplaçables sur canvas 2D avec connecteurs fléchés, élévation lumineuse au drag et import de notes par glisser-déposer depuis la barre latérale.
- **Vue Diaporama / Présentation (`type: slides`) (B-031c)** :
  - Projection plein écran style Marp/Slidev avec séparateurs `---`.
- **Vue Galerie / Database (`type: gallery`) (B-031d)** :
  - Cartes visuelles avec bannières d'images, métadonnées frontmatter et réorganisation/glissement fluide.
- **Vue Graphe Local Interactive 2D (B-049)** :
  - Exploration visuelle des connexions WikiLinks/Backlinks sous forme de réseau de force interactif.
- **Support sécurisé du HTML standardisé en Live Preview & Rendu (B-059)** :
  - Rendu inline enrichi masqué hors curseur : touches clavier `<kbd>`, texte souligné `<u>`, surlignage `<mark>`, indices/exposants `<sub>`/`<sup>`, saut de ligne forcé `<br>`.
  - Blocs interactifs repliables : accordéons natifs `<details>` et `<summary>`.
  - Sanitizer strict neutralisant toute tentative d'injection XSS (`<script>`, `<iframe>`, handlers `on*`) pour garantir l'intégrité locale et collaborative P2P.

---

## 🐛 Corrections
- **Test unitaire Rust FS (`knit-core/src/lib.rs`)** : Adaptation du test de filtrage des fichiers non supportés (`archive.zip`) en préservant l'affichage des médias sous `assets/`.
- **Linter & React Compiler** : Résolution des avertissements de pureté (`new Date()` dans les boucles de rendu) et des états dérivés (`SlidesView`, `GraphView`, `MiniCalendarWidget`).

---

## 🔧 Technique
- Les blocs dynamiques projettent des composants réactifs en mémoire sans polluer les fichiers Markdown sous-jacents.
- Préservation de la philosophie 100% Markdown pur sans base de données opaque.

---

## 💥 Breaking Changes
- Aucun — rétrocompatibilité totale avec les spécifications v0.1.0 à v0.3.0.
