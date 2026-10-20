# Mémoire Agentique — Coffre Knit

> Registre inter-sessions (~400 tokens). Lire au démarrage ; mettre à jour à chaque jalon.

## 1. Principes & Stack
- Markdown pur sur disque ; pas de BDD propriétaire. React 19 / TS strict / Vite / CM6 Live Preview.
- Rust 2021, Tauri v2 (`knit-core` + `src-tauri`). CRDT Yjs P2P (Iroh/QUIC).
- Vues Doc-Driven : `note | kanban | table | image | calendar | canvas | slides | gallery`.
- UI : `contextMenuStore`, tokens `--knit-hue`, zéro emoji (icônes vectorielles).

## 2. ADR Synthétiques
- **ADR-01 (B-043)** : Toute syntaxe/type/bloc → règles IA **et** exemple dans `demo_vault/`.
- **ADR-02 (B-052)** : Autocomplétion `[[` `[[#` `@` `@@` `#` `:` `/` + `KnitSuggestIndex` Rust.
- **ADR-03 (B-053)** : Smart Paste, Auto-Wrap, Tab tableaux, Hover Preview, journal, backlinks.
- **ADR-04 (B-031a/b)** : Dualité Agenda — Global = **modale** ; Scoped = `type: calendar` onglet.
- **ADR-05** : Handoff via ce fichier. **ADR-06** : 7 statuts tâches + `!p1..p3` + Mode Zen.
- **ADR-07** : Alignement versions (6 sources) à chaque commit/push/sprint.
- **ADR-08** : Zéro-Émoji UI. **ADR-09 (B-056)** : Debug global unique Header + HUD multi-vues.
- **ADR-10 (B-059)** : HTML whitelist LP + sanitizer.

## 3. Historique Récent
- **[2026-10-18]** : Prompts **1+9+12** (4e) : dates unifiées (`toIsoDate`→`formatIsoDate`) ; `findTableBounds` branché ; `TaskPriority` + `cycleTaskStatus` ; `fileStem`/`normalizeRelPath` ; GraphView→hooks ; `DocViewChrome` ; `vaultCalendarOps` ; IPC wrappers ; guards JSON ; debugStore typé ; oxlint `!` → error. tsc+lint+cargo OK.
- **[2026-10-18]** : Prompts 1+9+12 (3e) : MonthGridCell ; types DropTarget/… ; oxlint any.
- **[2026-10-18]** : Sprint 6ter clôturé ; runtime **0.4.0** ; `docTypeRegistry`.
- **[2026-10-18]** : Spécification Sprint 8 Packaging Multi-OS / CI/CD Tauri v2 / Auto-Updater / macOS natif ; Cargo.toml `[profile.release]` optimisé (LTO fat, strip, codegen-units 1).
- **[2026-10-18]** : Résolution du Hover Preview Kanban & Table (`livePreview.css`, `HoverPreviewPortal`, `KanbanView`, `KanbanToolbar`, `TableView`, `tableCardWidget`) : défilement horizontal fluide direct et Shift+molette, protection du clic scrollbar contre la bascule source, suppression du `clearHoverPreview(true)` intempestif au montage, minWidth 680px + colonnes non écrasées pour TableView avec scrollbar dédiée 8px.
- **[2026-10-20]** : Résolution du bug de découpage des tableaux contenant `<` ou `>` (ex: `(RTO < DPI 4 h)`) dans `splitTableRow` et `findTableDelimiterOffsets` (`markdownUtils.ts`) : remplacement du flag global `inHtml` par un regex strict de balise HTML, et support des tableaux dans les citations/callouts (`> | ... |`).

## 4. Tâches Actives
- [x] Sprint 5 / 6 / 6bis / **6ter** clôturés (v0.4.0).
- [ ] Suivi : B-057 (index FM Rust).
- [ ] **Sprint 7** (v1.0.0) : Wizard (B-032/B-033), PIN/QR (B-017b), Playbook IA (B-043a).
