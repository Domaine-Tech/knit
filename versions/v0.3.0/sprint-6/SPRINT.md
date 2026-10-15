# Sprint 6 — Intégration Mermaid & Rendu Visuel

> Objectif : Rendre les diagrammes Mermaid vivants et intégrés dans le flux de lecture/écriture avec adaptation dynamique au thème et à la couleur d'accent.

| Info | Détail |
|---|---|
| **Version** | v0.3.0 |
| **Durée** | 2026-12-29 → 2027-01-12 (2 semaines) |
| **Statut** | 📋 Planifié |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-027 | Rendu Mermaid inline dans CodeMirror 6 via l'API `WidgetType` | 🔴 | 📋 | — |
| B-028 | Coloration syntaxique du code Mermaid (`codemirror-lang-mermaid`) | 🟠 | 📋 | — |
| B-029 | Thème Mermaid synchronisé dynamiquement avec `--knit-hue` et mode sombre | 🟡 | 📋 | — |
| B-030 | Mode interactif code ↔ rendu (clic pour basculer en édition textuelle) | 🟠 | 📋 | — |
| B-030a | Menu Slash Command (`/`) & Callouts GFM (`> [!NOTE]`) (Notion) | 🟠 | 📋 | — |
| B-030b | Multi-onglets & Split View (`Ctrl+\`) (Obsidian) | 🟡 | 📋 | — |
| B-031 | Optimisation de rendu : debounce 300ms et cache SVG pour éviter les saccades | 🟡 | 📋 | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [ ] Les blocs de code ```` ```mermaid ```` s'affichent par défaut sous forme de diagrammes SVG élégants aux angles arrondis.
- [ ] Cliquer sur le diagramme ou placer le curseur dessus affiche le code source éditable.
- [ ] Taper `/` sur une ligne vide ouvre le menu de sélection rapide Notion-like sans latence.
- [ ] Les callouts (`> [!NOTE]`, `> [!TIP]`) s'affichent avec une bordure fine et un fond feutré.
- [ ] `Ctrl+\` divise la vue pour afficher 2 notes côte à côte en mode split view.
- [ ] Modifier la teinte de couleur dans les paramètres recolore instantanément les nœuds et arêtes du diagramme.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| — | — | — | — |

---

## Rétrospective

*(À compléter à la fin du sprint)*

### Ce qui a bien marché
- 

### Ce qu'on peut améliorer
- 
