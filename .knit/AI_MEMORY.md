# Mémoire Agentique — Coffre Knit

> Registre inter-sessions (~400 tokens). Lire au démarrage ; mettre à jour à chaque jalon.

## 1. Principes & Stack
- Markdown pur sur disque ; pas de BDD propriétaire. React 19 / TS strict / Vite / CM6 Live Preview.
- Rust 2021, Tauri v2 (`knit-core` + `src-tauri`). CRDT Yjs P2P (Iroh/QUIC).
- Vues Doc-Driven : `note | kanban | table | image | calendar | canvas | slides | gallery`.
- UI : `contextMenuStore`, tokens `--knit-hue`, zéro emoji (icônes vectorielles).

## 2. ADR Synthétiques
- **ADR-01 (B-043)** : Toute syntaxe/type/bloc → règles IA **et** exemple dans `demo_vault/`.
- **ADR-02 (B-052/B-057)** : Autocomplétion + scan unique `get_vault_index`.
- **ADR-03 (B-053)** : Smart Paste, Auto-Wrap, Tab tableaux, Hover Preview, journal, backlinks.
- **ADR-04 (B-031a/b)** : Agenda global = modale ; Scoped = `type: calendar`.
- **ADR-05** : Handoff via ce fichier. **ADR-06** : 7 statuts tâches + Mode Zen.
- **ADR-07** : Alignement versions (6 sources) à chaque commit/push/sprint.
- **ADR-08** : Zéro-Émoji UI. **ADR-09 (B-056)** : Debug global unique Header.
- **ADR-10 (B-059)** : HTML whitelist LP + sanitizer.
- **ADR-11 (Sprint 7)** : `init_vault` + Wizard ; `.knitshare` ; config `.knit/config.yaml`.
- **ADR-12** : Join = coquille locale ; miroir arbre = B-114. QR PIN ISO (`uqr`).
- **ADR-13 (Sprint 8)** : Packaging Tauri multi-OS, CI release, updater Minisign, tray, LRU 20, arbre virtualisé.

## 3. Historique Récent
- **[2026-10-24]** : Sprint 8 livré — NSIS Windows OK, CI/CD, updater, tray, LRU, virtualisation. Runtime **1.0.0**.
- **[2026-10-24]** : Sprint 7 clôturé ; B-114 hors périmètre (Sprint 8+).

## 4. Tâches Actives
- [x] Sprint 5 / 6 / 6bis / 6ter / **7** / **8** clôturés — **v1.0.0**.
- [ ] **B-114** : réplication initiale du coffre au join (Sprint 8+).
- [ ] Première release GitHub tag `v1.0.0` + secrets `TAURI_SIGNING_*`.
