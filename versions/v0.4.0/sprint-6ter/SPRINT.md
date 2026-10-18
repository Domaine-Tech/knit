# Sprint 6ter — Vues Immersives (Canvas, Calendrier & Diaporama)

> Objectif : Offrir des représentations visuelles immersives pour les types déclarés dans le Frontmatter YAML (`type: canvas`, `type: calendar`, `type: slides`, `type: gallery`) tout en conservant une réversibilité totale avec le format Markdown pur.

| Info        | Détail                               |
| ----------- | ------------------------------------ |
| **Version** | v0.4.0                               |
| **Durée**   | 2027-01-26 → 2027-02-09 (2 semaines) |
| **Statut**  | Terminé                              |

---

## Tâches du sprint

| #          | Tâche                                                                                                                                                                                    | Priorité | Statut | Assigné |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | ------- |
| **B-031a** | Agenda & Échéancier Global du Coffre (`type: calendar` / vue globale, scan `@dates` & `@heures`, attribution `@collaborateur` ou `@vault`, filtrage 'Mes tâches & Vault', drag-and-drop) | Haute    | Terminé | —       |
| **B-031b** | Vue Canvas / Tableau Blanc infini (`type: canvas`, cartes déplaçables & connecteurs fléchés)                                                                                             | Haute    | Terminé | —       |
| **B-031c** | Vue Diaporama / Présentation (`type: slides`, séparateur `---`, mode plein écran)                                                                                                        | Moyenne  | Terminé | —       |
| **B-031d** | Vue Galerie / Database (`type: gallery`, cartes visuelles avec bannière et métadonnées)                                                                                                  | Moyenne  | Terminé | —       |
| **B-049**  | Vue Graphe Local Interactive (Local Graph View 2D basé sur WikiLinks & Backlinks)                                                                                                        | Moyenne  | Terminé | —       |
| **B-059**  | Support sécurisé du HTML standardisé en Live Preview & Rendu (Whitelist inline `<kbd>`, `<u>`, `<mark>`, `<sub>`, `<sup>`, `<br>` ; Blocs `<details>`/`<summary>` ; Sanitizer anti-XSS) | Moyenne  | Terminé | —       |

---

## Critères d'acceptation (DoD - Definition of Done)

- [x] **Agenda & Échéancier Global du Coffre (B-031a)** :
  - Agrégation via `KnitCalendarIndex` (Rust + fallback TS) des tâches et `@YYYY-MM-DD` / `due:`.
  - Heures et plages `@YYYY-MM-DD 14:30` / `14:00-15:30`.
  - Attribution `@collaborateur` / `@vault` et filtres Mes tâches & Vault / Collaborateur / Tout.
  - Vues Mois, Semaine, Jour, Liste ; DnD bijectif ; mini-widget sidebar ; toasts d'échéance.
  - Dualité architecturale : **Agenda Global en modale immersive** (`GlobalAgendaModal`, Header, `Ctrl+Shift+A`, 4ᵉ onglet sidebar) vs **Agenda Scoped en onglet** (`type: calendar` délimité au dossier `folderScope`).
  - Règle stricte « un onglet = un fichier physique » : zéro onglet virtuel `knit://agenda`.
  - Tâches interactives (coches `- [ ]` ↔ `- [x]`), badges de priorité visuels `!p1..p3` et menus contextuels complets (clic droit jour & événement).
- [x] `type: canvas` — surface canvas JSON-Canvas avec cartes et connecteurs.
- [x] `type: slides` — diaporama plein écran, navigation clavier, séparateurs `---`.
- [x] `type: gallery` — grille de cartes avec bannières et pastilles.
- [x] Vue Graphe Local 2D (B-049) depuis l'éditeur (bouton Graphe).
- [x] **HTML sécurisé (B-059)** : whitelist LP + sanitizer partagé `renderSimpleMarkdown`.
- [x] Bascule Source `</>` sur les nouvelles vues (hors image).
- [x] Conversion via menu contextuel (arbre / onglet) vers les nouveaux types.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint / lors de la clôture Prompt 10 / hygiène post-livraison (Prompts 1+9+12 sur le git diff immersif).

| Date       | Tâche ajoutée                                                       | Raison                                              | Intégré au sprint ?          |
| ---------- | ------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------- |
| 2026-10-18 | D&D Immersif unifié style Kanban (Calendar, Canvas, Gallery, Tree) | Alignement d'excellence UI/UX sur le standard Kanban : `CalendarDropIndicator`, halos lumineux, ghost drag `opacity: 0.35`, placeholders vides, drop notes Canvas | Oui (clôture Prompt 10)      |
| 2026-10-18 | Refonte Agenda & Scoping de projet (B-031a & ADR-04)                | Dualité Global modale vs Scoped onglet, coches directes `- [x]`, priorités `!p1..p3`, menus contextuels clic droit | Oui (clôture Prompt 10)      |
| 2026-10-18 | Registre unifié des types Doc-Driven (`docTypeRegistry.ts`)         | Source unique des métadonnées (types, icônes Duotone, labels, descriptions, templates de création) | Oui (clôture Prompt 10)      |
| 2026-10-18 | Fix test Rust `test_file_filtering_and_special_files`               | Support des médias `assets/` : test ajusté sur binaire non supporté (`archive.zip`) | Oui (clôture Prompt 10)      |
| 2026-10-18 | Élimination des warnings linter frontend (`Date` render, compiler)  | Pureté des composants et robustesse React Compiler  | Oui (clôture Prompt 10)      |
| 2026-10-18 | Hygiène P1+P9+P12 sur le diff immersif (post-clôture)               | Voir section *Assainissement post-livraison* ci-dessous | Oui (working tree)           |

---

## Assainissement post-livraison (Prompts 1 · 9 · 12 — git diff)

> Travail de dette technique appliqué au code des vues immersives après clôture DoD. Aucune nouvelle User Story produit ; consolidation architecture / typage.

### Prompt 1 — Refactor

- [x] `journalUtils` : template journal unique (`MiniCalendarWidget` + `useAppShell`).
- [x] Agenda : `CalendarView` branché sur `useCalendarIndex` (plus de double reload) ; extraction `CalendarEventChip` / `CalendarEventRow` ; `groupEventsByHorizon` / `applyCalendarFilters` / `priorityAccentColor`.
- [x] Editor : `useRegisterDebugStats('editor')` + `stripFrontmatterBody` partagé.
- [x] Sidebar agenda : checkboxes `.knit-checkbox`.

### Prompt 9 — Centralisation

- [x] Types domaine déplacés hors utils : `types/canvas.ts`, `types/graph.ts`, `types/gallery.ts` ; `ConvertibleDocType` / `DocTypeMeta` / `MonthGridCell` / `DocTypeRenderMode` / `DocTypeViewRouterProps` dans `types/`.
- [x] Utils pures : `galleryUtils.ts` (`parseGalleryItems`), `renderSlideHtml` → `slidesUtils`, réexports `utils/index.ts`.
- [x] Hooks immersifs déjà isolés (`useCalendarIndex`, hover, debug) — inchangé côté placement.

### Prompt 12 — Typage strict

- [x] Guard DocType / index FM (`FrontmatterIndexEntry.docType: DocType`, `getDocType(): DocType | undefined`) ; `docTypeToAppViewMode` + switch exhaustif `DocTypeViewRouter`.
- [x] `normalizePriority` à la frontière IPC (`getCalendarIndex`) ; filtres `CalendarStatusFilter` / `CalendarPriorityFilter` / `CalendarEventKind`.
- [x] `KanbanDebugReport` / `TableDebugReport` (plus de `unknown` dans `GlobalDebugReport`) ; parse Canvas validé (`coerceCanvasData`) ; `invoke<void>` sur commandes void touchées.
- [x] Preuve : `tsc --noEmit` OK · `cargo check -p knit-core` OK.

### Polish B-056

- [x] `LivePreviewDebugHUD` via `ViewDebugHUDShell` ; `ViewDebugHUDBadge` dans `types/debug.ts`.

---

## Rétrospective

### Ce qui a bien marché

- Réutilisation du pattern Doc-Driven Views (`DocumentPane` / `DocTypeViewRouter` + `detectDocType` + convert menu).
- Index calendrier Rust aligné sur le modèle SuggestIndex, avec fallback démo Vite.
- JSON-Canvas et slides livrés rapidement grâce à des formats texte purs.
- **Unification du modèle D&D (clôture Prompt 10)** : Agenda, Canvas et Galerie bénéficient désormais de la même expérience fluide et feutrée que le Kanban (`CalendarDropIndicator`, fantômes semi-transparents 0.35, surbrillances primaires et récepteurs vides).
- **Cross-DnD Inter-Vues** : Possibilité de glisser des notes de la Sidebar sur le Canvas pour instancier des cartes et planification de tâches Kanban sur l'Agenda.
- **Post-clôture P1/P9/P12** : centralisation types immersifs + factorisation Agenda sans régression DoD (Markdown pur, dualité Global/Scoped, debug unifié).

### Ce qu'on peut améliorer

- Notifications système Tauri natives (plugin) au-delà des toasts in-app (Sprint 8).
- Simulation graphe : perf et layout pour très grands coffres.
- Canvas : édition texte inline des cartes et création d'arêtes par UI (Sprint 7/8).
- Découpe restante de `CalendarView` (Toolbar / Month / Week / Day en fichiers dédiés) et de `HoverPreviewPortal` si le monolithe redevient gênant.
