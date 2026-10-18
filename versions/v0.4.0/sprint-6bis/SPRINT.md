# Sprint 6bis — Moteur Dataview & Blocs Dynamiques

> Objectif : Déployer le moteur de requêtes frontmatter en mémoire et les blocs de code dynamiques (`knit-toc`, `knit-files`, `knit-query`, `knit-tasks`) qui projettent des données en direct sans jamais polluer les fichiers Markdown sous-jacents.

| Info | Détail |
|---|---|
| **Version** | v0.4.0 |
| **Durée** | 2027-01-12 → 2027-01-26 (2 semaines) |
| **Statut** | Terminé |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| **B-031e** | Moteur de requêtes Frontmatter & Indexation locale en mémoire (`vaultStore.queryFiles()`) | 🔴 | Terminé | — |
| **B-031f** | Bloc dynamique `knit-files` : index automatique d'un dossier (fichiers, icônes, date de mise à jour) | 🟠 | Terminé | — |
| **B-031g** | Bloc dynamique `knit-query` : tableaux et listes filtrables style Dataview (`from`, `where`, `columns`) | 🔴 | Terminé | — |
| **B-031h** | Bloc dynamique `knit-toc` : sommaire automatique cliquable de la note courante basé sur les titres | 🟠 | Terminé | — |
| **B-031i** | Bloc dynamique `knit-tasks` : agrégateur transversal de cases à cocher `- [ ]` synchronisé via CRDT | 🟠 | Terminé | — |
| **B-031j** | Déclencheurs Slash command (`/sommaire`, `/fichiers`, `/requete`, `/taches-globales`) | 🟡 | Terminé | — |
| **B-047** | Assistant Visuel de Tableaux Markdown (Interactive Table Helper avec navigation `Tab`) | 🟠 | Terminé | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [x] L'index en mémoire extrait les frontmatters de toutes les notes du coffre en arrière-plan sans bloquer l'UI.
- [x] Le bloc ```` ```knit-toc ```` génère un sommaire dynamique cliquable se mettant à jour à la frappe sans toucher au fichier physique.
- [x] Le bloc ```` ```knit-files ```` liste les fichiers d'un dossier spécifié avec tri, icône et date de dernière modification.
- [x] Le bloc ```` ```knit-query ```` supporte la syntaxe déclarative `from:`, `where:`, `sort:`, `columns:` et affiche un tableau interactif.
- [x] Le bloc ```` ```knit-tasks ```` rassemble toutes les cases `- [ ]` du coffre ou d'un sous-dossier ; cocher une case dans le bloc dynamique coche la case correspondante dans le fichier source via Yjs.
- [x] En mode Source `</>`, le bloc redevient un simple bloc de code Markdown modifiable manuellement.
- [x] Les commandes Slash (`/sommaire`, `/fichiers`, etc.) insèrent les gabarits de blocs en 1 clic.
- [x] Assistant de tableaux Markdown (B-047) : mini toolbar au survol d'un tableau GFM (`+ Ligne`, `+ Colonne`, `Alignement`, `Supprimer`), navigation par `Tab`/`Shift+Tab` et réalignement automatique des colonnes sans altération du texte libre.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint / à la clôture.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| 2026-10-18 | B-047a — Align. toolbar sur colonne sous curseur | Amélioration rétro B-047 | Oui (livré Sprint 6bis) |
| 2026-10-18 | B-057 — Index FM unifié avec `KnitSuggestIndex` Rust | Éviter double scan long terme | Non (suivi backlog) |
| 2026-10-18 | KnitSelect — listes déroulantes custom (React + DOM) | Select natif OS hors DA formulaires | Oui (post-clôture UX) |
| 2026-10-18 | Fix LP Mermaid — saut intégral du fence dans `buildDecorations` | Fermeture ` ``` ` avalait image + `knit-toc` | Oui (correctif Live Preview) |
| 2026-10-18 | Médias visibles dans le tree (`tree.rs` : svg/png/…) | Dossier `assets/` vide après filtre `.md` only | Oui |
| 2026-10-18 | Vue Image (`docType: image` / `ImageView`) | Clic tree média = toast, pas d'onglet | Oui (Doc-Driven Views) |
| 2026-10-18 | SVG démo `schema-architecture.svg` UTF-8 ASCII-safe | Glyphs Latin-1 cassés en rendu `<img>` | Oui (démo coffre) |

---

## Livraisons UX / médias (post-DoD Dataview)

Compléments livrés sur la branche 6bis après la DoD Dataview, avant le bump `0.4.0` :

1. **Formulaires** : `KnitSelect` / `createKnitSelectDom` — menus déroulants alignés DA menus contextuels (`forms.css`) ; plus de `<select>` natif dans Table, Kanban modal, `knit-query` statut.
2. **Live Preview** : les blocs ` ```mermaid ` sont entièrement ignorés par `buildDecorations` (délégation à `mermaidExtension`) pour ne plus « manger » le contenu suivant.
3. **Arborescence** : fichiers médias (`png`, `jpg`, `jpeg`, `gif`, `webp`, `svg`, `bmp`, `ico`) listés sous `assets/` ; icône `image` dans le tree.
4. **Vue Image** : ouverture d'un onglet `docType: image` (`components/Media/ImageView.tsx`) avec aperçu via `resolveAssetUrl`, copie lien Markdown / chemins, révélation explorateur ; pas de bascule Source ni conversion de type.
5. **Démo coffre** : assets SVG (`logo-knit`, `bandeau-demo`, `schema-architecture`) + banc `document-long.md` ; texte SVG sans caractères non-UTF-8.

---

## Rétrospective

### Ce qui a bien marché
- Réutilisation du pattern bijectif Live Preview (Mermaid / CodeBlockCard) pour les 4 widgets `knit-*`.
- Index Frontmatter TypeScript par lots asynchrones : zéro blocage UI, invalidation watcher / write.
- Slash commands : extension triviale du tableau existant dans `autocomplete.ts`.
- Clôture Prompt 10 : mtime FS réel (`FileNode.mtime_ms`) + icônes Duotone dans `knit-files`.
- Améliorations UI/UX Prompt 10 : **B-047a** (détection de colonne sous curseur, badge `Col. X/Y` et alignement ciblé) + micro-jauge d'avancement 2px et ratio dynamique dans `knit-tasks`.
- Extension naturelle Doc-Driven Views aux médias (`image`) sans polluer le Markdown sur disque.

### Ce qu'on peut améliorer
- Enrichir `KnitSuggestIndex` Rust pour partager un seul index FM (éviter double scan à long terme) — **B-057**.
- Bump SemVer `0.4.0` reporté à la livraison complète (6bis + 6ter) : runtime reste en `0.3.0`.
- Galerie multi-médias / zoom image : hors scope 6bis (vue image unitaire seulement).

