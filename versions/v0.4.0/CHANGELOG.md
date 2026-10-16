# Changelog — v0.4.0

> Version 0.4.0 — Requêtes Dynamiques & Vues Visuelles Avancées (Sprint 6bis & Sprint 6ter).  
> Statut : 📋 Planifié

---

## ✨ Nouveautés

### Sprint 6bis — Moteur Dataview & Blocs Dynamiques
- **Moteur de requêtes Frontmatter & Indexation locale en mémoire (`vaultStore.queryFiles()`) (B-031e)** :
  - Indexation réactive des métadonnées YAML sans scanner le disque à chaque frappe.
- **Bloc dynamique `knit-files` (B-031f)** :
  - Index et listing automatique d'un dossier (titre, icône, statut, date de mise à jour).
- **Bloc dynamique `knit-query` (B-031g)** :
  - Tableaux et listes filtrables style Dataview (`from`, `where`, `sort`, `columns`).
- **Bloc dynamique `knit-toc` (B-031h)** :
  - Sommaire cliquable généré automatiquement d'après les titres de la note hôte.
- **Bloc dynamique `knit-tasks` (B-031i)** :
  - Agrégateur transversal de cases à cocher `- [ ]` synchronisé via CRDT (cocher met à jour le fichier d'origine).
- **Déclencheurs Slash commands dédiés (B-031j)** :
  - Insertion rapide `/sommaire`, `/fichiers`, `/requete`, `/taches-globales`.
- **Assistant Visuel de Tableaux Markdown (B-047)** :
  - Mini-toolbar contextuelle au survol d'un tableau GFM (`+ Ligne`, `+ Colonne`, `Alignement`, `Supprimer`).
  - Navigation ultra-fluide avec `Tab` et `Shift+Tab`, ajout automatique de ligne sur `Entrée`.

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
