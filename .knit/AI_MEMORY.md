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
- **ADR-13 (Sprint 8)** : Packaging, CI release, updater Minisign, tray, LRU.
- **ADR-14** : Push `main` → bump PATCH → CI tag → Release.
- **ADR-15 (Sprint 9)** : Updater fluide ; runtime base 1.1.0.
- **ADR-16** : Prompt 11 = update deps majeurs + DevSecOps CI (`deny.toml`, gitleaks).

## 3. Historique Récent
- **[2026-10-25]** : Runtime **1.1.1** (deps + DevSecOps) pour tester updater depuis 1.1.0 installé.
- **[2026-10-25]** : Sprint 9 / Release draft **v1.1.0** (installer OK).
- **[2026-10-24]** : Sprint 8 livré.

## 4. Tâches Actives
- [ ] Publier draft Release `v1.1.1` → tester updater in-app (politique auto/notify).
- [ ] Suivre bump `tauri-plugin-updater` (lever ignores zip).
- [ ] **B-114** réplication join.
