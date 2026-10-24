# Changelog — v1.0.0

> Version 1.0.0 — Première Version Majeure & Déploiement Production.
> Statut : 🚀 En cours (Sprint 7 livré — runtime applicatif toujours **0.4.0** ; bump SemVer + packaging = Sprint 8)

---

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
  - Thème clair/sombre/auto, teinte HSL, état des pairs, mode corbeille OS vs Knit.
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

## Sprint 8 — Planifié (packaging)

- **Cache LRU & Performances Mémoire (B-050 & B-041a)** :
  - Gestionnaire de pool LRU bornant à 20 le nombre de documents CRDT en RAM.
  - Virtualisation de l'arborescence (Windowing).
- **Intégration OS native & packaging** :
  - Installateurs Windows (`.msi`, `.exe`), Linux (`.AppImage`, `.deb`), macOS.
  - Tray icon, notifications système, auto-updater Tauri v2.
- Suite de tests e2e 2 pairs ; optimisation mémoire au repos.

---

## Corrections

- Stabilisation globale de l'OpLog et gestion robuste des réveils après veille système (cible release).
- Agenda global vide sur coffre démo sous Tauri : skip IPC `get_calendar_index` / `get_vault_index` si `isDemoVaultPath` (index local depuis `DEMO_CONTENTS`).

---

## Technique

- `init_vault` / `VaultLocalConfig` dans `knit-core` + IPC Tauri.
- Alignement runtime : les 6 sources restent en **0.4.0** jusqu'au bump Sprint 8.

---

## Breaking Changes

- Stabilisation de l'API de vault et du protocole de synchronisation v1 (à la livraison Sprint 8).
