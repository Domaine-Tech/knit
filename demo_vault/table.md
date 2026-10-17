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
- [x] Blocs de code multi-langages avec bouton Copier !p2 #ui
- [x] Rendu Mermaid integre avec coloration dynamique !p2 #diagramme
- [ ] Panneau lateral des retroliens et mentions non liees [[liens-navigation]] !p2 #backlinks
- [ ] Hover Preview tooltip au survol des WikiLinks [[live-preview]] !p3 #ux

## Documentation et Normes

- [x] Specification Markdown pure dans [[document-long]] !p2 #doc
- [x] Regles agents IA sans emoji dans .cursorrules et CLAUDE.md !p1 #ia
- [ ] Guide d'utilisation utilisateur final v0.3.0 !p3 #doc
