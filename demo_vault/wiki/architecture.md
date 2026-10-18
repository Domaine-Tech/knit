---
type: note
titre: Architecture Technique
statut: en-cours
priorite: haute
tags: [wiki, architecture, sprint-6bis, medias]
---

# Architecture Technique de Knit

L'architecture de Knit repose sur 4 piliers technologiques majeurs :

1. **Tauri v2** : Empreinte memoire minimale (< 30 Mo), demarrage instantane, securite native.
2. **CodeMirror 6** : Moteur d'edition modulaire, Live Preview sans latence, Live Preview HUD.
3. **CRDT Yjs & Iroh P2P** : Fusion en temps reel decentralisee sans serveur central obligatoire.
4. **Triple Garde WriteGuard Rust** : Protection contre toute boucle d'ecriture entre le Watcher et le CRDT.

## Schema visuel

![Schema architecture Knit](assets/schema-architecture.svg)

## Moteur CRDT

Le texte Markdown est synchronise via Yjs. Les medias binaires du dossier `assets/` transitent separement via **Iroh Blobs** (hors document CRDT) afin de ne pas alourdir les diffs texte.

## Moteur Dataview (Sprint 6bis)

- Index Frontmatter en memoire (`frontmatterIndex` / `vaultStore.queryFiles()`).
- Blocs dynamiques projetes en Live Preview : `knit-toc`, `knit-files`, `knit-query`, `knit-tasks`.
- Zero pollution disque : le fence Markdown reste la seule source de verite.
- Demo : [[blocs-dynamiques.md]].

## Medias et collage

- Convention : `![legende](assets/fichier.ext)` sur une ligne seule → carte Live Preview.
- Collage <kbd>Ctrl+V</kbd> : enregistrement automatique dans `assets/` puis insertion Markdown.
- Banc d'essai : [[live-preview.md#9. Images et Medias Locaux (assets/)]].
