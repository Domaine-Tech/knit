# Sprint 6 — Doc-Driven Views, Mermaid Inline & Polish Éditeur

> **Objectif** : Instaurer l'architecture **"Doc-Driven Views"** (la vue est définie par le document dans son frontmatter YAML `type: ...` et s'affiche automatiquement sans manipulation manuelle lors de la navigation), pérenniser la barre d'onglets (**TabBar**) sur toutes les vues avec icônes dynamiques, intégrer le menu contextuel de conversion de fichiers, rendre les diagrammes **Mermaid** vivants dans l'éditeur, intégrer les commandes **Slash `/`** style Notion, la **Split View `Ctrl+\`**, le mode **Live Preview** Obsidian et le bouton universel de bascule **Source `</>` ↔ Rendu**.

| Info | Détail |
|---|---|
| **Version** | v0.3.0 |
| **Durée** | 2026-12-29 → 2027-01-12 (2 semaines) |
| **Statut** | 📋 Planifié |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| **B-026d** | Architecture "Doc-Driven Views" : résolution automatique de la vue par onglet via `type: kanban \| table \| note`, suppression du verrouillage d'état global dans `App.tsx` | 🔴 | 📋 | — |
| **B-026e** | TabBar universelle persistante : barre d'onglets visible sur toutes les vues (Kanban, Tableau, Note) avec icônes dynamiques par type de document | 🔴 | 📋 | — |
| **B-026f** | Menus contextuels de conversion de types de document (Sidebar TreeNode, TabBar & Toolbar) avec mise à jour non-destructive du Frontmatter YAML | 🟠 | 📋 | — |
| **B-030d** | Bouton universel Source `</>` ↔ Rendu interactif sur chaque onglet (bascule instantanée vue visuelle ↔ code Markdown brut) | 🟠 | 📋 | — |
| **B-027** | Rendu Mermaid inline dans n'importe quel fichier `.md` classique (WidgetType CodeMirror 6, architecture réutilisable pour les futurs blocs dynamiques) | 🔴 | 📋 | — |
| **B-028** | Coloration syntaxique du code Mermaid (`codemirror-lang-mermaid`) | 🟠 | 📋 | — |
| **B-029** | Thème Mermaid synchronisé dynamiquement avec `--knit-hue` et mode sombre | 🟡 | 📋 | — |
| **B-030** | Mode interactif code ↔ rendu (clic sur le diagramme pour éditer la source) | 🟠 | 📋 | — |
| **B-031** | Optimisation de rendu : debounce 300ms et cache SVG pour éviter les saccades | 🟡 | 📋 | — |
| **B-030a** | Menu Slash Command (`/`) & Callouts GFM (`> [!NOTE]`) (Notion) | 🟠 | 📋 | — |
| **B-030b** | Multi-onglets & Split View (`Ctrl+\`) avec panneaux et vues indépendants (Obsidian) | 🟡 | 📋 | — |
| **B-030c** | Mode Live Preview (style Obsidian : masquer balises Markdown hors curseur) | 🔴 | 📋 | — |
| **B-030e** | Confort de lecture centré (760px) & Bascule "Pleine Largeur" (style Notion) | 🟡 | 📋 | — |
| **B-044** | Curseur Fantôme & Présence Visuelle des Agents IA (Ghost Cursor violet `#8B5CF6`) | 🟠 | 📋 | — |
| **B-045** | Générateur de Contexte IA en 1 Clic (Context Packager `Ctrl+Shift+C`) | 🟡 | 📋 | — |
| **B-046** | Pliage Hiérarchique de Sections (Heading Fold / Collapse `Ctrl+Alt+[` / `]`) | 🟡 | 📋 | — |
| **B-048** | Section "Favoris / Épinglés" en Tête de Sidebar (Pinned Notes) | 🟠 | 📋 | — |
| **B-052** | Moteur d'Autocomplétion Universel & Indexation Incrémentale Multi-Vues (Deep-links `[[Note#Titre]]`, ancres `[[#Titre]]`, `@date`, `@collaborateur`, `:emoji:`, `#tag`, actif Éditeur/Kanban/Table) | 🔴 | 📋 | — |
| **B-053** | Smart UX d'Écriture & Navigation (Smart Paste URL/image sur sélection, Auto-wrap, Tableaux `Tab`/`Entrée`, Hover preview flottant, raccourci Note Quotidienne `Ctrl+Shift+J`, panneau Backlinks) | 🟠 | 📋 | — |
| **B-054** | Norme Tâches Étendues Markdown & Indicateurs de Progrès (États `- [ ]`, `- [/]`, `- [x]`, `- [-]`, `- [?]`, `- [>]`, `- [!]`, priorités `!p1`..`!p3`, barre 2px projetée sous `#`, synchro Kanban) | 🟠 | 📋 | — |
| **B-055** | Mode Zen & Focus Absolu (`Ctrl+Shift+F`) et Optimisation Performance (Lazy-rendering `IntersectionObserver`, WriteGuard 250ms debounce) | 🟡 | 📋 | — |

---

## Critères d'acceptation (DoD - Definition of Done)

### 1. Navigation & Vues pilotées par le Document (Doc-Driven Views)
- [ ] Lorsqu'un fichier est sélectionné dans la barre latérale ou via le Quick Switcher (`Ctrl+O`), Knit détecte automatiquement son type (`type: kanban`, `type: table` ou note classique) et rend immédiatement la vue correspondante sans aucune action utilisateur.
- [ ] Changer d'onglet actif (via clic, `Ctrl+Tab` ou `Ctrl+1..9`) commute instantanément l'affichage vers la vue assignée à cet onglet.
- [ ] La barre d'onglets (`TabBar`) reste présente et interactive en permanence, que la vue active soit un Kanban, un Tableau ou une note Markdown.
- [ ] Chaque onglet de la `TabBar` et chaque élément de l'explorateur (`TreeNode`) affiche une icône adaptée à son type (`kanban`, `table` ou `file-markdown`).
- [ ] Le menu contextuel (clic droit sur fichier dans l'explorateur ou sur l'onglet) propose l'option `Changer le type de vue ▸` (`Note Markdown`, `Tableau Kanban`, `Vue Tableau`).
- [ ] La conversion d'une note en Kanban préserve l'intégralité du texte : les sections `##` deviennent des colonnes ; si aucune section `##` n'est présente, 3 colonnes de base (`À faire`, `En cours`, `Terminé`) sont générées sans perte de données.
- [ ] La conversion est réversible (`type: note` restaure le mode éditeur) et annulable via `Ctrl+Z` / Toast undoable.

### 2. Bouton Universel Source `</>` ↔ Rendu Visuel
- [ ] Chaque vue dispose d'un bouton d'en-tête `[Code Source </>]` / `[Vue Visuelle]` (ou raccourci clavier `Ctrl+E` / `Ctrl+/`) permettant de basculer instantanément entre la représentation visuelle (Kanban interactif, Table triable) et l'éditeur de texte CodeMirror 6 brut.
- [ ] Revenir à la vue visuelle prend en compte immédiatement les modifications textuelles apportées au code source Markdown.

### 3. Rendu Mermaid Inline & Live Preview
- [ ] Dans n'importe quelle note Markdown classique, les blocs ```` ```mermaid ```` sont automatiquement interceptés et rendus inline sous forme de diagrammes SVG intégrés entre les paragraphes de texte.
- [ ] Cliquer sur le diagramme SVG ou placer le curseur texte à l'intérieur révèle instantanément le code source Mermaid pour modification en direct.
- [ ] Dès que le curseur quitte le bloc, le diagramme se recompile et se réaffiche en direct avec un debounce de 300ms.
- [ ] Modifier la teinte de couleur dans les paramètres (`--knit-hue`) recolore instantanément les nœuds et arêtes du diagramme.
- [ ] Les éléments Markdown (titres `#`, gras `**`, listes à cocher `- [ ]`) sont rendus visuellement et révèlent leur syntaxe brute au survol/clic de la ligne (Live Preview Obsidian).

### 4. Slash Commands & Split View
- [ ] Taper `/` sur une ligne vide ouvre le menu de sélection rapide Notion-like sans latence (`/kanban`, `/tableau`, `/mermaid`, `/callout`, `/titre`).
- [ ] Le bouton `+` dans la barre d'onglets (`TabBar`) et dans la Sidebar propose un menu pour créer directement une Note Markdown ou un Tableau Kanban.
- [ ] Les callouts (`> [!NOTE]`, `> [!TIP]`) s'affichent avec une bordure fine et un fond feutré.
- [ ] `Ctrl+\` divise l'espace de travail pour afficher 2 notes côte à côte en mode Split View avec synchronisation d'état indépendante (ex: Note à gauche, Kanban à droite).

### 5. Intégration IA, Ergonomie & Pliage (US B-044 à B-048)
- [ ] Curseur fantôme IA : Toute modification externe par une IA génère un curseur violet `#8B5CF6` et un surlignage doux temporaire (fade-out 1.5s).
- [ ] Packager contexte IA (`Ctrl+Shift+C`) : Copie la note active avec métadonnées YAML et extraits des WikiLinks dans un format balisé `<document>` optimisé pour les LLMs.
- [ ] Pliage de sections (`Ctrl+Alt+[` / `]`) : Chevrons discrets dans la marge de CodeMirror 6 pour plier/déplier les titres `##` et `###`.
- [ ] Section Favoris / Épinglés : Groupe rétractable en tête de la Sidebar pour fixer les notes prioritaires via clic droit `⭐ Épingler`.
- [ ] Confort de lecture : Texte centré par défaut à 760px avec bouton toggle pour basculer en Pleine Largeur.

### 6. Moteur d'Autocomplétion Universel Multi-Vues (US B-052)
- [ ] **Indexation incrémentale Rust (`KnitSuggestIndex`)** : Dictionnaires en mémoire des titres (`#`, `##`, `###`), tags et profils de pairs, temps de réponse < 2ms sans latence.
- [ ] **Deep-linking WikiLinks** : `[[` suggère les fichiers, `[[Note#` suggère les titres de la note cible, `[[#` suggère les titres de la note active, `[[Note|` permet un alias d'affichage, `[[Note^` référence un bloc précis.
- [ ] **Mentions collaborateurs & Vault** : `@` suggère les pairs locaux et distants connectés avec badge avatar et awareness, ainsi que l'entité `@vault` pour l'attribution collective au coffre.
- [ ] **Raccourcis temporels & calendrier** : `@@today` ou `@@demain` insère `@YYYY-MM-DD`, avec support des heures `@@2026-10-20 14:30`.
- [ ] **Shortcodes Emojis** : `:emoji:` remplace automatiquement les shortcodes (`:sparkles:` → ✨, `:check:` → ✅, etc.).
- [ ] **Disponibilité multi-vues** : Le moteur de suggestion et popover fonctionne à l'identique dans l'éditeur CodeMirror 6, lors de l'édition d'une carte Kanban (titre/description) et dans les cellules de la Vue Table.

### 7. Smart UX de Rédaction & Navigation (US B-053)
- [ ] **Smart Paste (Lien/Image sur sélection)** : Coller une URL avec du texte sélectionné transforme en `[Texte](url)` sans écraser ; coller une image crée `![Texte](assets/...)`.
- [ ] **Auto-Wrap par symboles** : Sélectionner du texte et taper `[`, `*`, `` ` ``, `~` entoure le texte sélectionné du symbole associé.
- [ ] **Formatage dynamique de tableaux** : `Tab` navigue à la cellule suivante en réalignant les barres `|` ; `Entrée` crée immédiatement la ligne suivante alignée.
- [ ] **Hover Preview au survol** : Maintenir `Ctrl` au survol de n'importe quel `[[WikiLink]]`, `@collaborateur`, ou `#tag` affiche une infobulle prévisualisant la cible sans changer d'écran.
- [ ] **Raccourci Note Quotidienne** : `Ctrl+Shift+J` (ou `Alt+D`) ouvre ou crée instantanément la note du jour `journal/YYYY-MM-DD.md`.
- [ ] **Panneau de Backlinks** : L'inspecteur latéral liste les mentions liées (`[[...]]`) et les mentions non liées pour la note active.

### 8. Norme Tâches Étendues & Indicateurs de Progrès (US B-054)
- [ ] **Support des 7 statuts de tâches** : `- [ ]` (à faire), `- [/]` (en cours), `- [x]` (terminé), `- [-]` (annulé), `- [?]` (question / arbitrage), `- [>]` (reporté / délégué), `- [!]` (urgent).
- [ ] **Cycle interactif en 1 clic** : Clic ou raccourci sur la case pour basculer ou cocher sans passer par le clavier.
- [ ] **Priorités inline** : Rendu graphique épuré des tags `!p1` (rouge feutré), `!p2` (ambre feutré), `!p3` (gris feutré).
- [ ] **Barre de progression automatique (2px)** : Projection discrète sous le premier titre `#` affichant `X / Y tâches (Z%)` sans écrire de métadonnées parasites dans le fichier `.md`.
- [ ] **Bijectivité Kanban** : Déplacer une carte vers une colonne « En cours » ou « Terminé » met à jour immédiatement la syntaxe de case sous-jacente (`- [ ]` → `- [/]` → `- [x]`).

### 9. Mode Zen & Performances Extrêmes (US B-055)
- [ ] **Mode Zen (`Ctrl+Shift+F`)** : Masquage en 1 clic de la barre latérale, estompage de la TabBar et de la barre d'état, centrage automatique de la lecture à 760px.
- [ ] **Lazy-Rendering des Blocs Lourds** : Les diagrammes Mermaid et requêtes Dataview `knit-query` ne sont rendus que lorsqu'ils entrent dans le viewport lors du défilement via `IntersectionObserver`.
- [ ] **Flush Disque Atomique Micro-Debouncé (250ms)** : Les modifications CRDT Yjs sont répercutées en mémoire en < 1ms, tandis que l'écriture disque est temporisée à 250ms avec hachage XXH3 (WriteGuard) pour préserver les SSD.

---

## Ajouts en cours de sprint

> Tâches ajoutées ou affinées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| 2026-10-16 | **B-026d** : Architecture Doc-Driven Views | Découplage de la vue globale rigide ; la vue est pilotée par le document YAML `type: ...` | Oui |
| 2026-10-16 | **B-026e** : TabBar universelle permanente | La barre d'onglets ne doit jamais disparaître en vue Kanban ou Tableau | Oui |
| 2026-10-16 | **B-026f** : Menus contextuels de conversion de type | Permettre à l'utilisateur de changer facilement le format d'un fichier sans manipulation manuelle | Oui |
| 2026-10-16 | **B-030d** : Bouton Source universel `</>` | Unification de l'ergonomie visuelle ↔ source sur tous les types de fichiers | Oui |
| 2026-10-16 | **B-052** : Moteur d'Autocomplétion Universel | 6 déclencheurs contextuels, deep-linking, multi-vues et index Rust `KnitSuggestIndex` | Oui |
| 2026-10-16 | **B-053** : Smart UX d'Écriture & Navigation | Smart paste, auto-wrap, tableaux `Tab`/`Enter`, Hover preview, Daily note et Backlinks | Oui |
| 2026-10-16 | **B-054** : Norme Tâches Étendues & Indicateurs | 7 statuts de cases, priorités `!p1`, barre 2px projetée sous `#`, synchro Kanban | Oui |
| 2026-10-16 | **B-055** : Mode Zen & Performances Extrêmes | `Ctrl+Shift+F`, lazy rendering IntersectionObserver et flush disque 250ms | Oui |


---

## Rétrospective

*(À compléter à la fin du sprint)*

### Ce qui a bien marché
- 

### Ce qu'on peut améliorer
- 
