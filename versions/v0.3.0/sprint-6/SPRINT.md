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

---

## Ajouts en cours de sprint

> Tâches ajoutées ou affinées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| 2026-10-16 | **B-026d** : Architecture Doc-Driven Views | Découplage de la vue globale rigide ; la vue est pilotée par le document YAML `type: ...` | Oui |
| 2026-10-16 | **B-026e** : TabBar universelle permanente | La barre d'onglets ne doit jamais disparaître en vue Kanban ou Tableau | Oui |
| 2026-10-16 | **B-026f** : Menus contextuels de conversion de type | Permettre à l'utilisateur de changer facilement le format d'un fichier sans manipulation manuelle | Oui |
| 2026-10-16 | **B-030d** : Bouton Source universel `</>` | Unification de l'ergonomie visuelle ↔ source sur tous les types de fichiers | Oui |

---

## Rétrospective

*(À compléter à la fin du sprint)*

### Ce qui a bien marché
- 

### Ce qu'on peut améliorer
- 
