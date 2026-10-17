# Sprint 6 — Doc-Driven Views, Mermaid Inline & Polish Éditeur

> **Objectif** : Instaurer l'architecture **"Doc-Driven Views"** (la vue est définie par le document dans son frontmatter YAML `type: ...` et s'affiche automatiquement sans manipulation manuelle lors de la navigation), pérenniser la barre d'onglets (**TabBar**) sur toutes les vues avec icônes dynamiques, intégrer le menu contextuel de conversion de fichiers, rendre les diagrammes **Mermaid** vivants dans l'éditeur, intégrer les commandes **Slash `/`** style Notion, la **Split View `Ctrl+\`**, le mode **Live Preview** Obsidian et le bouton universel de bascule **Source `</>` ↔ Rendu**.

| Info | Détail |
|---|---|
| **Version** | v0.3.0 |
| **Durée** | 2026-10-16 → 2026-10-17 (Sprint Réalisé) |
| **Statut** | ✅ Terminé |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| **B-026d** | Architecture "Doc-Driven Views" : résolution automatique de la vue par onglet via `type: kanban \| table \| note`, suppression du verrouillage d'état global dans `App.tsx` | 🔴 | ✅ | Équipe Knit |
| **B-026e** | TabBar universelle persistante : barre d'onglets visible sur toutes les vues (Kanban, Tableau, Note) avec icônes dynamiques par type de document | 🔴 | ✅ | Équipe Knit |
| **B-026f** | Menus contextuels de conversion de types de document (Sidebar TreeNode, TabBar & Toolbar) avec mise à jour non-destructive du Frontmatter YAML | 🟠 | ✅ | Équipe Knit |
| **B-030d** | Bouton universel Source `</>` ↔ Rendu interactif sur chaque onglet (bascule instantanée vue visuelle ↔ code Markdown brut) | 🟠 | ✅ | Équipe Knit |
| **B-027** | Rendu Mermaid inline dans n'importe quel fichier `.md` classique (WidgetType CodeMirror 6, architecture réutilisable pour les futurs blocs dynamiques) | 🔴 | ✅ | Équipe Knit |
| **B-028** | Coloration syntaxique du code Mermaid (`codemirror-lang-mermaid`) | 🟠 | ✅ | Équipe Knit |
| **B-029** | Thème Mermaid synchronisé dynamiquement avec `--knit-hue` et mode sombre | 🟡 | ✅ | Équipe Knit |
| **B-030** | Mode interactif code ↔ rendu (clic sur le diagramme pour éditer la source) | 🟠 | ✅ | Équipe Knit |
| **B-031** | Optimisation de rendu : debounce 300ms et cache SVG pour éviter les saccades | 🟡 | ✅ | Équipe Knit |
| **B-030a** | Menu Slash Command (`/`) & Callouts GFM (`> [!NOTE]`) (Notion) | 🟠 | ✅ | Équipe Knit |
| **B-030b** | Multi-onglets & Split View (`Ctrl+\`) avec panneaux et vues indépendants (Obsidian) | 🟡 | ✅ | Équipe Knit |
| **B-030c** | Mode Live Preview (style Obsidian : masquer balises Markdown hors curseur) | 🔴 | ✅ | Équipe Knit |
| **B-030e** | Confort de lecture centré (760px) & Bascule "Pleine Largeur" (style Notion) | 🟡 | ✅ | Équipe Knit |
| **B-044** | Curseur Fantôme & Présence Visuelle des Agents IA (Ghost Cursor violet `#8B5CF6`) | 🟠 | ✅ | Équipe Knit |
| **B-045** | Générateur de Contexte IA en 1 Clic (Context Packager `Ctrl+Shift+C`) | 🟡 | ✅ | Équipe Knit |
| **B-046** | Pliage Hiérarchique de Sections (Heading Fold / Collapse `Ctrl+Alt+[` / `]`) | 🟡 | ✅ | Équipe Knit |
| **B-048** | Section "Favoris / Épinglés" en Tête de Sidebar (Pinned Notes) | 🟠 | ✅ | Équipe Knit |
| **B-052** | Moteur d'Autocomplétion Universel & Indexation Incrémentale Multi-Vues (Deep-links `[[Note#Titre]]`, ancres `[[#Titre]]`, `@date`, `@collaborateur`, `:emoji:`, `#tag`, actif Éditeur/Kanban/Table) | 🔴 | ✅ | Équipe Knit |
| **B-053** | Smart UX d'Écriture & Navigation (Smart Paste URL/image sur sélection, Auto-wrap, Tableaux `Tab`/`Entrée`, Hover preview flottant, raccourci Note Quotidienne `Ctrl+Shift+J`, panneau Backlinks) | 🟠 | ✅ | Équipe Knit |
| **B-054** | Norme Tâches Étendues Markdown & Indicateurs de Progrès (États `- [ ]`, `- [/]`, `- [x]`, `- [-]`, `- [?]`, `- [>]`, `- [!]`, priorités `!p1`..`!p3`, barre 2px projetée sous `#`, synchro Kanban) | 🟠 | ✅ | Équipe Knit |
| **B-055** | Mode Zen & Focus Absolu (`Ctrl+Shift+F`) et Optimisation Performance (Lazy-rendering `IntersectionObserver`, WriteGuard 250ms debounce) | 🟡 | ✅ | Équipe Knit |
| **B-056** | Mode Debug Global Unifié & Inspecteurs Multi-Vues (Bouton Header unique `debugStore`, HUD overlay temps réel, métriques pixel-perfect 0px, rendu bijectif unifié des blocs de code) | 🟡 | ✅ | Équipe Knit |

---

## Critères d'acceptation (DoD - Definition of Done)

### 1. Navigation & Vues pilotées par le Document (Doc-Driven Views)
- [x] Lorsqu'un fichier est sélectionné dans la barre latérale ou via le Quick Switcher (`Ctrl+O`), Knit détecte automatiquement son type (`type: kanban`, `type: table` ou note classique) et rend immédiatement la vue correspondante sans aucune action utilisateur.
- [x] Changer d'onglet actif (via clic, `Ctrl+Tab` ou `Ctrl+1..9`) commute instantanément l'affichage vers la vue assignée à cet onglet.
- [x] La barre d'onglets (`TabBar`) reste présente et interactive en permanence, que la vue active soit un Kanban, un Tableau ou une note Markdown.
- [x] Chaque onglet de la `TabBar` et chaque élément de l'explorateur (`TreeNode`) affiche une icône adaptée à son type (`kanban`, `table` ou `file-markdown`).
- [x] Le menu contextuel (clic droit sur fichier dans l'explorateur ou sur l'onglet) propose l'option `Changer le type de vue ▸` (`Note Markdown`, `Tableau Kanban`, `Vue Tableau`).
- [x] La conversion d'une note en Kanban préserve l'intégralité du texte : les sections `##` deviennent des colonnes ; si aucune section `##` n'est présente, 3 colonnes de base (`À faire`, `En cours`, `Terminé`) sont générées sans perte de données.
- [x] La conversion est réversible (`type: note` restaure le mode éditeur) et annulable via `Ctrl+Z` / Toast undoable.

### 2. Bouton Universel Source `</>` ↔ Rendu Visuel
- [x] Chaque vue dispose d'un bouton d'en-tête `[Code Source </>]` / `[Vue Visuelle]` (ou raccourci clavier `Ctrl+E` / `Ctrl+/`) permettant de basculer instantanément entre la représentation visuelle (Kanban interactif, Table triable) et l'éditeur de texte CodeMirror 6 brut.
- [x] Revenir à la vue visuelle prend en compte immédiatement les modifications textuelles apportées au code source Markdown.

### 3. Rendu Mermaid Inline & Live Preview
- [x] Dans n'importe quelle note Markdown classique, les blocs ```` ```mermaid ```` sont automatiquement interceptés et rendus inline sous forme de diagrammes SVG intégrés entre les paragraphes de texte.
- [x] Cliquer sur le diagramme SVG ou placer le curseur texte à l'intérieur révèle instantanément le code source Mermaid pour modification en direct.
- [x] Dès que le curseur quitte le bloc, le diagramme se recompile et se réaffiche en direct avec un debounce de 300ms.
- [x] Modifier la teinte de couleur dans les paramètres (`--knit-hue`) recolore instantanément les nœuds et arêtes du diagramme.
- [x] Les éléments Markdown (titres `#`, gras `**`, listes à cocher `- [ ]`) sont rendus visuellement et révèlent leur syntaxe brute au survol/clic de la ligne (Live Preview Obsidian).

### 4. Slash Commands & Split View
- [x] Taper `/` sur une ligne vide ouvre le menu de sélection rapide Notion-like sans latence (`/kanban`, `/tableau`, `/mermaid`, `/callout`, `/titre`).
- [x] Le bouton `+` dans la barre d'onglets (`TabBar`) et dans la Sidebar propose un menu pour créer directement une Note Markdown ou un Tableau Kanban.
- [x] Les callouts (`> [!NOTE]`, `> [!TIP]`) s'affichent avec une bordure fine et un fond feutré.
- [x] `Ctrl+\` divise l'espace de travail pour afficher 2 notes côte à côte en mode Split View avec synchronisation d'état indépendante (ex: Note à gauche, Kanban à droite).

### 5. Intégration IA, Ergonomie & Pliage (US B-044 à B-048)
- [x] Curseur fantôme IA : Toute modification externe par une IA génère un curseur violet `#8B5CF6` et un surlignage doux temporaire (fade-out 1.5s).
- [x] Packager contexte IA (`Ctrl+Shift+C`) : Copie la note active avec métadonnées YAML et extraits des WikiLinks dans un format balisé `<document>` optimisé pour les LLMs.
- [x] Pliage de sections (`Ctrl+Alt+[` / `]`) : Chevrons discrets dans la marge de CodeMirror 6 pour plier/déplier les titres `##` et `###`.
- [x] Section Favoris / Épinglés : Groupe rétractable en tête de la Sidebar pour fixer les notes prioritaires via clic droit `⭐ Épingler`.
- [x] Confort de lecture : Texte centré par défaut à 760px avec bouton toggle pour basculer en Pleine Largeur.

### 6. Moteur d'Autocomplétion Universel Multi-Vues (US B-052)
- [x] **Indexation incrémentale Rust (`KnitSuggestIndex`)** : Dictionnaires en mémoire des titres (`#`, `##`, `###`), tags et profils de pairs, temps de réponse < 2ms sans latence.
- [x] **Deep-linking WikiLinks** : `[[` suggère les fichiers, `[[Note#` suggère les titres de la note cible, `[[#` suggère les titres de la note active, `[[Note|` permet un alias d'affichage, `[[Note^` référence un bloc précis.
- [x] **Mentions collaborateurs & Vault** : `@` suggère les pairs locaux et distants connectés avec badge avatar et awareness, ainsi que l'entité `@vault` pour l'attribution collective au coffre.
- [x] **Raccourcis temporels & calendrier** : `@@today` ou `@@demain` insère `@YYYY-MM-DD`, avec support des heures `@@2026-10-20 14:30`.
- [x] **Shortcodes Emojis** : `:emoji:` remplace automatiquement les shortcodes (`:sparkles:` → ✨, `:check:` → ✅, etc.).
- [x] **Disponibilité multi-vues** : Le moteur de suggestion et popover fonctionne à l'identique dans l'éditeur CodeMirror 6, lors de l'édition d'une carte Kanban (titre/description) et dans les cellules de la Vue Table.

### 7. Smart UX de Rédaction & Navigation (US B-053)
- [x] **Smart Paste (Lien/Image sur sélection)** : Coller une URL avec du texte sélectionné transforme en `[Texte](url)` sans écraser ; coller une image crée `![Texte](assets/...)`.
- [x] **Auto-Wrap par symboles** : Sélectionner du texte et taper `[`, `*`, `` ` ``, `~` entoure le texte sélectionné du symbole associé.
- [x] **Formatage dynamique de tableaux** : `Tab` navigue à la cellule suivante en réalignant les barres `|` ; `Entrée` crée immédiatement la ligne suivante alignée.
- [x] **Hover Preview au survol** : Maintenir `Ctrl` au survol de n'importe quel `[[WikiLink]]`, `@collaborateur`, ou `#tag` affiche une infobulle prévisualisant la cible sans changer d'écran.
- [x] **Raccourci Note Quotidienne** : `Ctrl+Shift+J` (ou `Alt+D`) ouvre ou crée instantanément la note du jour `journal/YYYY-MM-DD.md`.
- [x] **Panneau de Backlinks** : L'inspecteur latéral liste les mentions liées (`[[...]]`) et les mentions non liées pour la note active.

### 8. Norme Tâches Étendues & Indicateurs de Progrès (US B-054)
- [x] **Support des 7 statuts de tâches** : `- [ ]` (à faire), `- [/]` (en cours), `- [x]` (terminé), `- [-]` (annulé), `- [?]` (question / arbitrage), `- [>]` (reporté / délégué), `- [!]` (urgent).
- [x] **Cycle interactif en 1 clic** : Clic ou raccourci sur la case pour basculer ou cocher sans passer par le clavier.
- [x] **Priorités inline** : Rendu graphique épuré des tags `!p1` (rouge feutré), `!p2` (ambre feutré), `!p3` (gris feutré).
- [x] **Barre de progression automatique (2px)** : Projection discrète sous le premier titre `#` affichant `X / Y tâches (Z%)` sans écrire de métadonnées parasites dans le fichier `.md`.
- [x] **Bijectivité Kanban** : Déplacer une carte vers une colonne « En cours » ou « Terminé » met à jour immédiatement la syntaxe de case sous-jacente (`- [ ]` → `- [/]` → `- [x]`).

### 9. Mode Zen & Performances Extrêmes (US B-055)
- [x] **Mode Zen (`Ctrl+Shift+F`)** : Masquage en 1 clic de la barre latérale, estompage de la TabBar et de la barre d'état, centrage automatique de la lecture à 760px.
- [x] **Lazy-Rendering des Blocs Lourds** : Les diagrammes Mermaid et requêtes Dataview `knit-query` ne sont rendus que lorsqu'ils entrent dans le viewport lors du défilement via `IntersectionObserver`.
- [x] **Flush Disque Atomique Micro-Debouncé (250ms)** : Les modifications CRDT Yjs sont répercutées en mémoire en < 1ms, tandis que l'écriture disque est temporisée à 250ms avec hachage XXH3 (WriteGuard) pour préserver les SSD.

### 10. Mode Debug Global Unifié & Inspecteurs Multi-Vues (US B-056)
- [x] **Bouton unique Header (`debugStore`)** : Activation/désactivation globale d'un seul clic depuis l'en-tête de l'application (`window.__KNIT_DEBUG__`).
- [x] **HUD Overlay Temps Réel** : Métriques d'alignement pixel-perfect CodeMirror 6 (écart 0px, ratio 100%), hauteurs de lignes réelles vs théoriques et diagnostic en direct des décalages.
- [x] **Rendu unifié des blocs de code** : Cartes unifiées avec badge langage et bouton copier en lecture, bascule fluide en mode source intégrale au clic sans artefact de surlignage.
- [x] **Compatibilité multi-vues & extensibilité** : Système découplé permettant à chaque vue (Note classique, Kanban, Table, Graphe) d'injecter ses propres métriques et inspecteurs.

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
| 2026-10-17 | **B-056** : Mode Debug Global Unifié | Bouton unique Header, overlay HUD temps réel, mesure pixel-perfect 0 décalage et inspection multi-vues | Oui |


---

## Rétrospective

### Ce qui a bien marché
- **Doc-Driven Views & TabBar permanente** : Découpler la vue de l'état global React a fluidifié la navigation. Cliquer sur un Kanban ou une note commute immédiatement le bon moteur tout en conservant la barre d'onglets visible.
- **Bouton universel Source `</>` ↔ Rendu** : Permet de basculer instantanément d'une vue visuelle (Kanban ou Table) vers l'éditeur Markdown pur (`Ctrl+E`), garantissant une transparence totale du format fichier sur disque.
- **Mermaid interactif & Live Preview** : Rendu dynamique des diagrammes avec cache SVG, support du thème `--knit-hue`, clic pour modifier la source en direct et lazy rendering par `IntersectionObserver`.
- **Moteur d'autocomplétion & Index Rust incrémental** : Temps de réponse sous les 2ms pour les deep-links `[[Note#Titre]]`, `@collaborateur`, `@@dates`, `#tags` et shortcodes `:emoji:`.
- **Mode Zen, Split View & Packager IA** : Expérience d'écriture épurée (`Ctrl+Shift+F`), travail multitâche côte à côte (`Ctrl+\`) et export de contexte LLM en 1 clic (`Ctrl+Shift+C`).
- **Mode Debug Global Unifié & Pixel-Perfect** : Diagnostic en temps réel des métriques d'affichage garantissant 0 décalage cumulatif, cartes unifiées de blocs de code sans bug de surlignage et barre de propriétés frontmatter restaurée.

### Ce qu'on peut améliorer
- Optimiser le bundling des grammaires de diagrammes Mermaid supplémentaires lors des builds de production pour réduire la taille des chunks secondaires.
