# Sprint 6bis — Moteur Dataview & Blocs Dynamiques

> Objectif : Déployer le moteur de requêtes frontmatter en mémoire et les blocs de code dynamiques (`knit-toc`, `knit-files`, `knit-query`, `knit-tasks`) qui projettent des données en direct sans jamais polluer les fichiers Markdown sous-jacents.

| Info        | Détail                               |
| ----------- | ------------------------------------ |
| **Version** | v0.4.0                               |
| **Durée**   | 2027-01-12 → 2027-01-26 (2 semaines) |
| **Statut**  | Terminé                              |

---

## Tâches du sprint

| #          | Tâche                                                                                                   | Priorité | Statut | Assigné |
| ---------- | ------------------------------------------------------------------------------------------------------- | -------- | ------ | ------- |
| **B-031e** | Moteur de requêtes Frontmatter & Indexation locale en mémoire (`vaultStore.queryFiles()`)               | 🔴       | ✅     | —       |
| **B-031f** | Bloc dynamique `knit-files` : index automatique d'un dossier (fichiers, icônes, date de mise à jour)    | 🟠       | ✅     | —       |
| **B-031g** | Bloc dynamique `knit-query` : tableaux et listes filtrables style Dataview (`from`, `where`, `columns`) | 🔴       | ✅     | —       |
| **B-031h** | Bloc dynamique `knit-toc` : sommaire automatique cliquable de la note courante basé sur les titres      | 🟠       | ✅     | —       |
| **B-031i** | Bloc dynamique `knit-tasks` : agrégateur transversal de cases à cocher `- [ ]` synchronisé via CRDT     | 🟠       | ✅     | —       |
| **B-031j** | Déclencheurs Slash command (`/sommaire`, `/fichiers`, `/requete`, `/taches-globales`)                   | 🟡       | ✅     | —       |
| **B-047**  | Assistant Visuel de Tableaux Markdown (Interactive Table Helper avec navigation `Tab`)                  | 🟠       | ✅     | —       |

---

## Critères d'acceptation (DoD - Definition of Done)

- [x] L'index en mémoire extrait les frontmatters de toutes les notes du coffre en arrière-plan sans bloquer l'UI.
- [x] Le bloc ` ```knit-toc ` génère un sommaire dynamique cliquable se mettant à jour à la frappe sans toucher au fichier physique.
- [x] Le bloc ` ```knit-files ` liste les fichiers d'un dossier spécifié avec tri, icône et date de dernière modification.
- [x] Le bloc ` ```knit-query ` supporte la syntaxe déclarative `from:`, `where:`, `sort:`, `columns:` et affiche un tableau interactif.
- [x] Le bloc ` ```knit-tasks ` rassemble toutes les cases `- [ ]` du coffre ou d'un sous-dossier ; cocher une case dans le bloc dynamique coche la case correspondante dans le fichier source via Yjs.
- [x] En mode Source `</>`, le bloc redevient un simple bloc de code Markdown modifiable manuellement.
- [x] Les commandes Slash (`/sommaire`, `/fichiers`, etc.) insèrent les gabarits de blocs en 1 clic.
- [x] Assistant de tableaux Markdown (B-047) : mini toolbar au survol d'un tableau GFM (`+ Ligne`, `+ Colonne`, `Alignement`, `Supprimer`), navigation par `Tab`/`Shift+Tab` et réalignement automatique des colonnes sans altération du texte libre.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint / à la clôture.

| Date       | Tâche ajoutée                                                   | Raison                                         | Intégré au sprint ?          |
| ---------- | --------------------------------------------------------------- | ---------------------------------------------- | ---------------------------- |
| 2026-10-18 | B-047a — Align. toolbar sur colonne sous curseur                | Amélioration rétro B-047                       | Oui (livré Sprint 6bis)      |
| 2026-10-18 | B-057 — Index FM unifié avec `KnitSuggestIndex` Rust            | Éviter double scan long terme                  | Non (suivi backlog)          |
| 2026-10-18 | KnitSelect — listes déroulantes custom (React + DOM)            | Select natif OS hors DA formulaires            | Oui (post-clôture UX)        |
| 2026-10-18 | Fix LP Mermaid — saut intégral du fence dans `buildDecorations` | Fermeture ` ``` ` avalait image + `knit-toc`   | Oui (correctif Live Preview) |
| 2026-10-18 | Médias visibles dans le tree (`tree.rs` : svg/png/…)            | Dossier `assets/` vide après filtre `.md` only | Oui                          |
| 2026-10-18 | Vue Image (`docType: image` / `ImageView`)                      | Clic tree média = toast, pas d'onglet          | Oui (Doc-Driven Views)       |
| 2026-10-18 | SVG démo `schema-architecture.svg` UTF-8 ASCII-safe             | Glyphs Latin-1 cassés en rendu `<img>`         | Oui (démo coffre)            |
| 2026-10-18 | Hover Preview figé (Ctrl/Cmd) + scroll + clics                  | Impossible d'interagir avec l'infobulle        | Oui (UX B-053)               |
| 2026-10-18 | Fix libellé WikiLink `[[note#ancre (path/)]]`                   | `split('/').pop()` n'affichait que `)`         | Oui (correctif tableaux LP)  |
| 2026-10-18 | Hover Preview imbriqué (survol lien dans preview figée)         | Visualiser une cible sans figer le secondaire  | Oui (UX B-053)               |
| 2026-10-18 | Tooltip global au-dessus du Hover Preview (`z-index: 100050`)   | Infobulle « Ouvrir la cible » passait derrière | Oui (correctif UI)           |

---

## Livraisons UX / médias (post-DoD Dataview)

Compléments livrés sur la branche 6bis après la DoD Dataview, avant le bump `0.4.0` :

1. **Formulaires** : `KnitSelect` / `createKnitSelectDom` — menus déroulants alignés DA menus contextuels (`forms.css`) ; plus de `<select>` natif dans Table, Kanban modal, `knit-query` statut.
2. **Live Preview** : les blocs ` ```mermaid ` sont entièrement ignorés par `buildDecorations` (délégation à `mermaidExtension`) pour ne plus « manger » le contenu suivant.
3. **Arborescence** : fichiers médias (`png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `bmp`, `ico`) listés sous `assets/` ; icône `image` dans le tree.
4. **Vue Image** : ouverture d'un onglet `docType: image` (`components/Media/ImageView.tsx`) avec aperçu via `resolveAssetUrl`, copie lien Markdown / chemins, révélation explorateur ; pas de bascule Source ni conversion de type.
5. **Démo coffre** : assets SVG (`logo-knit`, `bandeau-demo`, `schema-architecture`) + banc `document-long.md` ; texte SVG sans caractères non-UTF-8.
6. **Hover Preview (B-053)** :
   - Maintien de `Ctrl`/`Cmd` fige l'infobulle (position, `pointer-events`, scroll interne, hint discret, bordure primary).
   - Clic sur le titre ou un lien `[data-target]` du contenu ouvre la cible via `handleNavigateLink` (clic molette inclus) ; Escape ferme.
   - **Aperçu imbriqué** : au survol d'un lien dans la preview figée, une seconde infobulle non figée (`nestedHoverPreview`, `pointer-events: none`) affiche la cible sans remplacer l'aperçu principal.
   - Doc démo : `liens-navigation.md`.
7. **Correctif WikiLink tableaux** : `wikilinkDisplayLabel()` sépare chemin et ancre `#…` avant `split('/')` — plus de libellé réduit à `)` pour `[[live-preview.md#9. Images … (assets/)]]`.
8. **TooltipContainer** : `z-index` relevé à `100050` pour rester au-dessus du Hover Preview (`99999`).

---

## Rétrospective

### Ce qui a bien marché

- Réutilisation du pattern bijectif Live Preview (Mermaid / CodeBlockCard) pour les 4 widgets `knit-*`.
- Index Frontmatter TypeScript par lots asynchrones : zéro blocage UI, invalidation watcher / write.
- Slash commands : extension triviale du tableau existant dans `autocomplete.ts`.
- Clôture Prompt 10 : mtime FS réel (`FileNode.mtime_ms`) + icônes Duotone dans `knit-files`.
- Améliorations UI/UX Prompt 10 : **B-047a** (détection de colonne sous curseur, badge `Col. X/Y` et alignement ciblé) + micro-jauge d'avancement 2px et ratio dynamique dans `knit-tasks`.
- Extension naturelle Doc-Driven Views aux médias (`image`) sans polluer le Markdown sur disque.
- Renforcement Hover Preview : pin Ctrl + navigation depuis le portal + aperçu imbriqué au survol des liens internes (pattern Obsidian Page Preview).

### Ce qu'on peut améliorer

- Enrichir `KnitSuggestIndex` Rust pour partager un seul index FM (éviter double scan à long terme) — **B-057**.
- Bump SemVer `0.4.0` reporté à la livraison complète (6bis + 6ter) : runtime reste en `0.3.0`.
- Galerie multi-médias / zoom image : hors scope 6bis (vue image unitaire seulement).
