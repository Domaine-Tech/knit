---
type: table
titre: Vue Tableau Synthetique
statut: en-cours
priorite: moyenne
tags: [table, inventaire, modules]
id: TABLE-001
---

# Inventaire des Modules et Composants Knit

Ce document utilise la vue Tableau pilotee par le document (`type: table`).
Les cartes de chaque categorie sont affichees dans une table interactive avec recherche en direct, tri dynamique par colonne et cases a cocher interactives.

## Composants Moteur Core

- [x] Moteur CRDT Yjs avec synchronisation bidirectionnelle [[document-long]] !p1 @Thomas #core
- [x] Triple Garde WriteGuard Rust avec debounce 100ms !p1 @Thomas #backend
- [ ] Protocole P2P Iroh Gossipsub pour mise a jour instantanee [[kanban]] !p1 @Thomas #p2p
- [ ] Chiffrement ChaCha20-Poly1305 pour synchronisation privee !p2 #securite

## Composants Editeur UI

- [x] Mode Live Preview Obsidian avec masquage discret [[live-preview]] !p1 @Sublix #ui/editor
- [x] Vue Agenda multi-vues Mois/Semaine/Jour avec drag-and-drop bijectif [[projet/agenda|agenda]] !p1 @Thomas #ui/calendar
- [x] Vue Canvas infinie 2D avec ingestion de notes de l'arbre [[canvas]] !p1 @Sublix #ui/canvas
- [x] Vue Diaporama plein ecran avec navigation clavier [[diaporama]] !p2 @Alice #ui/slides
- [x] Vue Galerie visuelle avec pastilles et bannieres [[galerie]] !p2 @Bob #ui/gallery
- [x] Vue Graphe local 2D interactive avec reseau de forces [[liens-navigation]] !p1 @Thomas #ui/graph
- [x] Support HTML securise DOMPurify et blocs details [[live-preview]] !p1 @Thomas #securite
- [x] Standardisation Drag-and-Drop avec CalendarDropIndicator et halo [[projet/agenda|agenda]] !p1 @Sublix #ux
- [x] Blocs dynamiques knit-toc / knit-files / knit-query / knit-tasks [[blocs-dynamiques]] !p1 @Sublix #dataview
- [x] Assistant tableaux GFM (toolbar + realign) [[blocs-dynamiques]] !p2 #ux
- [x] Panneau lateral des retroliens et mentions non liees [[liens-navigation]] !p2 #backlinks
- [x] Hover Preview tooltip au survol des WikiLinks [[live-preview]] !p3 #ux

## Documentation et Normes

- [x] Specification Markdown pure dans [[document-long]] !p2 #doc
- [x] Regles agents IA sans emoji dans .cursorrules et CLAUDE.md !p1 #ia
- [x] Specification des 7 Vues Doc-Driven dans [[accueil]] !p1 #doc
- [x] Banc d'essai exhaustif dans demo_vault !p1 @vault #test

