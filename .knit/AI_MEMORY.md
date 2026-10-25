# Mémoire Agentique — Coffre Knit

> Registre inter-sessions (~400 tokens). Lire au démarrage ; mettre à jour à chaque jalon.

## 1. Principes & Stack
- Markdown pur sur disque ; pas de BDD propriétaire. React 19 / TS strict / Vite / CM6 Live Preview.
- Rust 2021, Tauri v2 (`knit-core` + `src-tauri`). CRDT Yjs P2P (Iroh/QUIC).
- Vues Doc-Driven : `note | kanban | table | image | calendar | canvas | slides | gallery`.
- UI : `contextMenuStore`, tokens `--knit-hue`, zéro emoji (icônes vectorielles).

## 2. ADR Synthétiques
- **ADR-01 (B-043)** : Syntaxe/type/bloc → règles IA **et** `demo_vault/`.
- **ADR-07** : Alignement versions (6 sources) à chaque commit/push/sprint.
- **ADR-13 (Sprint 8)** : Packaging, CI release, updater Minisign, tray, LRU, virtualisation.
- **ADR-14** : Push sur `main` → bump PATCH → CI tag → Release. Prompt 11 + `VERSIONING.md` §1bis.
- **ADR-15 (Sprint 9)** : Updater fluide — `updateStore`, politique `auto|notify|manual`, check différé, bandeau ; tray relaunch gated `ready` ; soft-dismiss session. Runtime **1.1.0**.

## 3. Historique Récent
- **[2026-10-25]** : Sprint 9 **clôturé** (B-117→B-121). Runtime **1.1.0** (6 sources).
- **[2026-10-25]** : ADR-14 documentée. Release v1.0.0 en stabilisation CI.
- **[2026-10-24]** : Sprint 8 livré ; runtime 1.0.0.

## 4. Tâches Actives
- [x] Sprint 9 livré + clôturé (runtime 1.1.0).
- [ ] Commit / push Prompt 11 → Release `v1.1.0`.
- [ ] Finaliser draft Release GitHub `v1.0.0` / `v1.1.0`.
- [ ] **B-114** réplication join (hors Sprint 9).
