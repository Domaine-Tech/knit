# Changelog — v1.0.0

> Version 1.0.0 — Première Version Majeure & Déploiement Production.
> Statut : ✅ Livré (Sprint 7 + Sprint 8) — runtime **1.0.0**

---

## Sprint 8 — Livré (packaging & polish)

- **Packaging multi-OS** :
  - Cibles Tauri : NSIS, MSI, deb, AppImage, app, DMG.
  - Build Windows NSIS vérifié localement ; Linux / macOS via CI release.
  - Template `.desktop` Linux + associations MIME Markdown.
- **CI/CD** :
  - `.github/workflows/ci.yml` (lint, build, `cargo test`, garde-fous).
  - `.github/workflows/release.yml` (matrix 3 OS, `tauri-action`, `latest.json`).
- **Auto-updater** :
  - `tauri-plugin-updater` + Minisign ; UI Paramètres + modale d'installation.
  - Doc signature : `docs/UPDATER_SIGNING.md`.
- **Tray & notifications OS** :
  - Menu Ouvrir / Paramètres / Quitter ; tooltip réseau.
  - Notifications native pair connecté / première sync.
- **Performances** :
  - Chunks Vite (mermaid, yjs, CodeMirror, react).
  - LRU CRDT 20 docs ; arbre sidebar virtualisé (50k nœuds gardés en test).
- **Docs** : README installation multi-OS ; dossier `docs/assets/screenshots/`.

## Sprint 7 — Livré

- **Wizard d'initialisation** :
  - Flux créer : 3 écrans (dossier, apparence, invitation ticket + PIN + QR).
  - Flux rejoindre : 2 écrans (code + progression de connexion P2P honnête). Coquille locale via `prepare_join_vault` ; réplication arbre Markdown = B-114.
  - `openVault` attend `startNetwork` avant lecture ticket/PIN ou `connectPeer`.
- **Fichier de partage `.knitshare`** :
  - Configuration d'équipe synchronisée automatiquement (nom, conventions, structure).
  - Généré par `init_vault` ; schéma unifié avec `.knitshare.example` / `demo_vault`.
- **Appairage PIN / QR (B-017b)** :
  - PIN LAN éphémère à 6 chiffres annoncé via mDNS + QR ISO scannable (`uqr`, payload = PIN) dans le Wizard et le panneau réseau.
  - Rafraîchissement PIN avec republication mDNS ; menu contextuel réseau (copier ticket/PIN, rafraîchir).
- **Collaboration visuelle en direct** :
  - Curseurs et sélections distants (y-codemirror) avec badge rétractable après 3 s.
  - Avatars sidebar, tooltips applicatifs, téléportation vers le curseur du pair.
- **Volet Historique & Time Travel** :
  - Timeline des snapshots Yjs, diff bicolore (`fast-diff`), restauration 1 clic (clic molette).
- **Panneau de préférences unifié** :
  - Thème clair/sombre/auto, teinte HSL, état des pairs, mode corbeille OS vs Knit, recherches de mises à jour.
- **Corbeille intégrée** :
  - Volet sidebar : liste `.knit/trash/`, prévisualisation, restauration (clic molette), vidage.
- **Kit Universel pour IA Agentiques (B-043)** :
  - Génération à l'init : `KNIT.md`, `.cursor/rules/knit.mdc`, `.cursorrules`, `CLAUDE.md`, `.agents/skills/knit/SKILL.md`, `AGENTS.md`, `.github/copilot-instructions.md`, `.windsurfrules`, `.clinerules`, `.aider.conf.yml`.
- **Playbook d'exploitation (B-043a)** :
  - `GUIDE_IA.md` + seed `.knit/AI_MEMORY.md` générés avec le kit.
- **Mode Réseau Local Strict / Air-Gapped (B-051)** :
  - Toggle paramètres → endpoint Iroh `N0DisableRelay` au prochain démarrage réseau (relays WAN coupés, mDNS conservé).
- **Registre de coffres & VaultSwitcher (B-116)** :
  - Liste locale des coffres récents ; bascule `Ctrl+Shift+O` ; Wizard si dossier sans `.knitshare` (Vite + Tauri).
  - Bouton footer sidebar « Ouvrir un coffre… » retiré (redondant).
- **Visibilité arbre centralisée (B-115)** :
  - Rust : build (`node_modules`/`target`/`dist`) exclus ; `.knit` / dots listés dans le scan (watcher ignore toujours `.knit`/`.git`).
  - UI : `vaultTreeVisibility.ts` masque par défaut dots + kit IA ; toggle œil pour tout afficher (dont `.knit`).
  - Bascule de coffre : purge `localContents`, `frontmatterIndex.clear()`, config locale, invalidation index Rust.

---

## Corrections

- Stabilisation globale de l'OpLog et gestion robuste des réveils après veille système (cible release).
- Agenda global vide sur coffre démo sous Tauri : skip IPC `get_calendar_index` / `get_vault_index` si `isDemoVaultPath` (index local depuis `DEMO_CONTENTS`).

---

## Technique

- `init_vault` / `VaultLocalConfig` dans `knit-core` + IPC Tauri.
- Alignement runtime : **1.0.0** sur les 6 sources de vérité.
- Hors v1.0.0 : **B-114** réplication join (Sprint 8+).

---

## Breaking Changes

- Stabilisation de l'API de vault et du protocole de synchronisation v1.
