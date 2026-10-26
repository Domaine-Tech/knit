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
- **ADR-16** : Prompt 11 = update deps Rust+npm (majeurs inclus) + DevSecOps CI (`deny.toml`, gitleaks).
- **ADR-17 (Sprint 10, livré)** : Personne = répertoire applicatif (slot verrouillé). Coffre = `id` + `nom` dans `.knitshare`. Join = manifeste, jamais d'écrasement d'un autre `id`. Handshake refuse toute version autre que `1.2.0`. App **1.2.0**.

## 3. Historique Récent
- **[2026-10-26]** : Sprint 10 poussé en **1.2.0** (premier tag, pas de patch). Deps : fs4 1.1, react-virtual 3.14.23. toml/generic-array restent bloqués par les parents.
- **[2026-10-26]** : Personne hors coffre, `id` de coffre, join par manifeste, CRDT des fichiers fermés.
- **[2026-10-26]** : Le démo n'est plus un dossier sous `src-tauri`. Le wizard revient si le dernier choix était le démo.
- **[2026-10-25]** : Runtime **1.1.2** — licence MIT/Apache, UX Paramètres, updater confirm-si-actif ; repo public.

## 4. Tâches Actives
- [x] Sprint 10 livré. Sources **1.2.0**. Push `main` pour le tag CI.
- [ ] Vérifier la Release GitHub **v1.2.0** (job `tag-if-needed`).
- [ ] Tester l'updater in-app 1.1.x → **1.2.0** après la Release.
- [ ] Suivre le bump `tauri-plugin-updater` (lever les ignores zip).
