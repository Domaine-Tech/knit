# Sprint 6 — Intégration Mermaid, Slash Command & Polish Éditeur

> Objectif : Rendre les diagrammes Mermaid vivants dans l'éditeur, intégrer les commandes Slash `/` style Notion, la Split View `Ctrl+\`, le mode Live Preview Obsidian et le bouton universel de bascule Source `</>` ↔ Rendu sur chaque vue.

| Info | Détail |
|---|---|
| **Version** | v0.3.0 |
| **Durée** | 2026-12-29 → 2027-01-12 (2 semaines) |
| **Statut** | 📋 Planifié |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-027 | Rendu Mermaid inline dans n'importe quel fichier `.md` classique (WidgetType CodeMirror 6) | 🔴 | 📋 | — |
| B-028 | Coloration syntaxique du code Mermaid (`codemirror-lang-mermaid`) | 🟠 | 📋 | — |
| B-029 | Thème Mermaid synchronisé dynamiquement avec `--knit-hue` et mode sombre | 🟡 | 📋 | — |
| B-030 | Mode interactif code ↔ rendu (clic sur le diagramme pour éditer la source) | 🟠 | 📋 | — |
| B-030a | Menu Slash Command (`/`) & Callouts GFM (`> [!NOTE]`) (Notion) | 🟠 | 📋 | — |
| B-030b | Multi-onglets & Split View (`Ctrl+\`) (Obsidian) | 🟡 | 📋 | — |
| B-030c | Mode Live Preview (style Obsidian : masquer balises Markdown hors curseur) | 🔴 | 📋 | — |
| B-030d | Bouton Source universel (`</>` ↔ Rendu) & Déclencheurs de création multi-types (TabBar `+` & Slash `/kanban`) | 🟠 | 📋 | — |
| B-031 | Optimisation de rendu : debounce 300ms et cache SVG pour éviter les saccades | 🟡 | 📋 | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [ ] Dans n'importe quelle note Markdown classique (sans configuration ni type spécial requis), les blocs ```` ```mermaid ```` sont automatiquement interceptés et rendus inline sous forme de superbes diagrammes SVG intégrés entre les paragraphes de texte.
- [ ] Cliquer sur le diagramme SVG ou placer le curseur texte à l'intérieur révèle instantanément le code source Mermaid pour modification en direct.
- [ ] Dès que le curseur quitte le bloc, le diagramme se recompile et se réaffiche en direct avec un debounce de 300ms.
- [ ] Les éléments Markdown (titres `#`, gras `**`, listes à cocher `- [ ]`) sont rendus visuellement et révèlent leur syntaxe brute au survol/clic de la ligne (Live Preview Obsidian).
- [ ] Le bouton `[Code Source </>]` est présent et accessible dans l'en-tête de chaque onglet pour basculer instantanément entre la vue visuelle (Live Preview, Kanban, Tableau) et le code Markdown brut.
- [ ] Taper `/` sur une ligne vide ouvre le menu de sélection rapide Notion-like sans latence (`/kanban`, `/tableau`, `/mermaid`, `/callout`, `/titre`).
- [ ] Le bouton `+` dans la barre d'onglets (`TabBar`) propose un menu pour créer directement une Note Markdown ou un Tableau Kanban.
- [ ] Les callouts (`> [!NOTE]`, `> [!TIP]`) s'affichent avec une bordure fine et un fond feutré.
- [ ] `Ctrl+\` divise la vue pour afficher 2 notes côte à côte en mode split view.
- [ ] Modifier la teinte de couleur dans les paramètres recolore instantanément les nœuds et arêtes du diagramme.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| 2026-10-16 | B-030d : Bouton Source universel `</>` & Sélecteur TabBar `+` / Slash `/kanban` | Unification de l'ergonomie visuelle ↔ source sur tous les types de fichiers | Oui |

---

## Rétrospective

*(À compléter à la fin du sprint)*

### Ce qui a bien marché
- 

### Ce qu'on peut améliorer
- 
