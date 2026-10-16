# Changelog — v0.3.0

> Version 0.3.0 — Vues Projets Dynamiques & Rendu Mermaid Vivant.
> Statut : 🟡 En cours (Sprint 5 livré ✅, Sprint 6 planifié)

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
- **Architecture "Doc-Driven Views" (Vues pilotées par le document)** :
  - **Résolution automatique de la vue** : chaque document déclare son type via son Frontmatter YAML (`type: kanban`, `type: table`, `type: note`). Ouvrir un document ou changer d'onglet affiche instantanément la vue correspondante sans manipulation manuelle.
  - **TabBar universelle permanente** : la barre d'onglets reste accessible et interactive sur toutes les vues (Kanban, Tableau, Note), avec icône dynamique par type de document (`kanban`, `table`, `file-markdown`).
  - **Menu contextuel de conversion de type** : clic droit sur un fichier (arbre) ou sur un onglet pour convertir sans perte de données entre Note Markdown, Tableau Kanban et Vue Tableau.
  - **Bouton universel Source `</>` ↔ Rendu** : bascule instantanée entre la vue visuelle riche et le code source Markdown brut dans CodeMirror 6 sur chaque onglet.
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
- **Symbiose IA & Ergonomie Éditeur avancée** :
  - **Moteur d'Autocomplétion Universel & Index Rust `KnitSuggestIndex` (B-052)** :
    - Déclencheurs contextuels unifiés : `[[` (notes, notes#titres, alias, blocs), `[[#` (titres de la note courante), `@` (collaborateurs LAN et entité `@vault` pour assignation collective), `@@` (raccourcis date et heures `@@demain 14:30`), `#` (tags hiérarchiques du vault), `:` (émojis GitHub/Unicode), `/` (commandes slash).
    - Disponibilité universelle sans rupture de contexte : éditeur principal CodeMirror 6, création et édition rapide de cartes Kanban, et saisie inline dans les cellules de vue Tableau.
    - Deep-linking de précision absolue : `[[Note#Titre]]`, `[[#Titre-Interne]]`, `[[Note|Alias]]`, `[[Note^block-id]]`.
    - Index en mémoire incrémental côté Rust (`KnitSuggestIndex`) mis à jour en tâche de fond via le Notify-watcher de vault, garantissant un temps de filtrage < 5ms même sur 10 000 notes.
  - **Smart UX de Rédaction & Navigation Humaine (B-053)** :
    - Smart Paste d'URL et d'images sur texte sélectionné (`[Texte](url)` sans écraser la sélection).
    - Auto-Wrap instantané par sélection et frappe de délimiteurs (`[[...]]`, `*...*`, `` `...` ``, `~~...~~`).
    - Navigation et formatage dynamique de tableaux Markdown (`Tab` / `Entrée` avec réalignement automatique des barres `|`).
    - Prévisualisation flottante au survol (Hover Preview) de liens, mentions et tags sans quitter le document actif.
    - Raccourci Note Quotidienne (`Ctrl+Shift+J` ou `Alt+D`) et panneau latéral de Rétroliens (Backlinks).
  - **Norme Tâches Étendues Markdown & Indicateurs de Progrès (B-054)** :
    - Prise en charge des 7 statuts de tâches Markdown : `- [ ]` (à faire), `- [/]` (en cours), `- [x]` (terminé), `- [-]` (annulé), `- [?]` (question), `- [>]` (reporté), `- [!]` (urgent).
    - Priorités inline épurées : `!p1` (rouge feutré), `!p2` (ambre feutré), `!p3` (gris discret).
    - Mini-barre de progression calculée dynamiquement (2px) sous le premier titre `#` sans polluer le fichier sur disque.
    - Synchronisation bijective immédiate avec les cartes du tableau Kanban.
  - **Mode Zen & Performances Extrêmes (B-055)** :
    - Mode Zen (`Ctrl+Shift+F`) : masquage de l'interface pour une concentration absolue à 760px centré.
    - Lazy-rendering (`IntersectionObserver`) des diagrammes Mermaid et blocs dynamiques Dataview.
    - Flush disque atomique temporisé à 250ms avec hachage XXH3 (WriteGuard) pour préserver les SSD.
  - **Curseur Fantôme IA (Ghost Cursor)** : matérialisation des modifications effectuées par Cursor/Claude avec curseur violet `#8B5CF6` et surlignage doux temporaire.
  - **Packager de Contexte IA (`Ctrl+Shift+C`)** : copie en 1 clic de la note avec métadonnées YAML et extraits des WikiLinks pour les LLMs.
  - **Pliage hiérarchique de titres (`Ctrl+Alt+[` / `]`)** : masquage/dépliage de sections entières `##` et `###`.
  - **Section Favoris / Notes Épinglées** : accès direct en tête de Sidebar via clic droit `⭐ Épingler`.
  - **Confort de lecture centré 760px** : interrupteur instantané entre largeur de lecture saine et mode pleine largeur.

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
