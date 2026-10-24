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
- **ADR-11 (Sprint 7)** : `init_vault` + Wizard ; `.knitshare` ; config `.knit/config.yaml` (trash_mode, lan_only).
- **ADR-12** : Join = connexion P2P + coquille locale ; miroir arbre = B-114. QR PIN ISO (`uqr`).

## 3. Historique Récent
- **[2026-10-24]** : Audit S7 Prompts 1/9/12 : Wizard découpé (Home/Create/Join), `RecentVaultList` + `PinQrBlock`, snapshots via `crdtManager`, guards TrashMode/Theme, trash helpers Rust, retrait `resolve_p2p_pin`.
- **[2026-10-24]** : Bascule coffre : purge localContents + frontmatterIndex.clear + config ; `.knit` visible (toggle œil).
- **[2026-10-24]** : Docs S7 + B-115/B-116 VaultSwitcher ; agenda démo skip IPC ; clôture Prompt 10 ; runtime **0.4.0**.
- **[2026-10-24]** : Wizard Vite + registre `knit-vault-registry` ; visibilité arbre Rust/UI.


## 4. Tâches Actives
- [x] Sprint 5 / 6 / 6bis / 6ter / **7** clôturés.
- [ ] **Sprint 8** : packaging, CI, updater, tray, LRU, virtualisation ; **B-114** réplication join.
