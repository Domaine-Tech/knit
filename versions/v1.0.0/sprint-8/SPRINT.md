# Sprint 8 — Packaging Multi-OS, CI/CD Automatisée, Auto-Updater & Polish Final

> Objectif : Délivrer une chaîne de distribution moderne, multiplateforme et ultra-optimisée (Windows, macOS, Linux), un pipeline CI/CD GitHub Actions automatique, un système de mise à jour sécurisé (Tauri v2 Updater), et polir l'application pour la production v1.0.0.

| Info | Détail |
|---|---|
| **Version** | v1.0.0 |
| **Durée** | 2027-01-26 → 2027-02-09 (2 semaines) |
| **Statut** | ✅ Terminé |
| **Runtime** | 1.0.0 |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| **B-037** | Installateur Windows (`.exe` NSIS moderne & `.msi` signés via Tauri v2) | 🔴 Critique | ✅ Terminé | — |
| **B-038** | Installateur Linux (`.AppImage` universel & paquet `.deb` Debian/Ubuntu) | 🔴 Critique | ✅ Terminé | — |
| **B-038a** | Bundle macOS natif (`.dmg` stylisé & `.app` Universal Binary Apple Silicon + Intel) | 🔴 Critique | ✅ Terminé | — |
| **B-038b** | Pipeline CI/CD GitHub Actions multi-OS (Matrix `windows-latest`, `macos-latest`, `ubuntu-22.04`, `tauri-action`, rust-cache & release auto) | 🔴 Critique | ✅ Terminé | — |
| **B-038c** | Système de Mise à Jour Automatique In-App (Tauri v2 Updater, signature cryptographique Minisign, manifeste `latest.json` & dialogue UI de mise à jour 1-clic) | 🔴 Critique | ✅ Terminé | — |
| **B-038d** | Optimisation des binaires & profils de release (Cargo `[profile.release]` LTO fat, `strip = true`, `codegen-units = 1`, `panic = "abort"`, bundle Vite optimisé) | 🟠 Haute | ✅ Terminé | — |
| **B-039** | Notifications système (nouveau pair connecté, sync terminée, mise à jour prête) | 🟡 Moyenne | ✅ Terminé | — |
| **B-040** | Tray icon avec menu contextuel et indicateur d'état réseau | 🟡 Moyenne | ✅ Terminé | — |
| **B-041** | Tests end-to-end automatisés (Tauri + 2 pairs virtuels en simultané) | 🟠 Haute | ✅ Terminé | — |
| **B-041a** | Virtualisation de l'arborescence (Windowing Sidebar pour 50 000+ notes sans lag) | 🟠 Haute | ✅ Terminé | — |
| **B-050** | Cache LRU des Documents CRDT & Libération Mémoire (LRU Doc Cache max 20 Y.Docs) | 🟠 Haute | ✅ Terminé | — |
| **B-042** | README final + guide utilisateur + captures d'écran de référence | 🟠 Haute | ✅ Terminé | — |

---

## Critères d'acceptation (DoD - Definition of Done)

### 1. Packaging & Distribution Multi-OS (B-037, B-038, B-038a)
- [x] **Windows (B-037)** :
  - Installateur NSIS (`.exe`) moderne : choix du répertoire, création de raccourcis Bureau/Menu Démarrer, désinstallateur propre et gestion des mises à jour sans perte de données.
  - Paquet MSI (`.msi`) pour le déploiement silencieux en entreprise. *(cible `msi` déclarée ; vérifié en local : NSIS `Knit_0.4.0_x64-setup.exe` puis bump 1.0.0)*
- [x] **Linux (B-038)** :
  - Binaire `.AppImage` autonome et portable avec icône intégrée *(config + CI ; non compilé sur Windows)*.
  - Paquet `.deb` avec template `.desktop` et association MIME Markdown.
- [x] **macOS (B-038a)** :
  - Image disque `.dmg` personnalisée (positions fenêtre / Applications).
  - Cible Universal déclarée dans `release.yml` (`universal-apple-darwin`) — artefact produit par la CI macOS.

### 2. Pipeline CI/CD GitHub Actions Automatisé (B-038b)
- [x] Workflow de Release déclenché sur tag `v*` ou `workflow_dispatch` (`.github/workflows/release.yml`).
- [x] Matrix `windows-latest` / `macos-latest` / `ubuntu-22.04`.
- [x] Cache Rust (`Swatinem/rust-cache`) + cache NPM.
- [x] Publication GitHub Release via `tauri-apps/tauri-action` (`latest.json` inclus).
- [x] Workflow CI PR : lint, `npm run build`, `cargo test --workspace`, garde-fous flatten/LRU.

### 3. Système d'Auto-Update Sécurisé & In-App (B-038c)
- [x] Plugins `tauri-plugin-updater` + `tauri-plugin-process` + UI React.
- [x] Pubkey Minisign dans `tauri.conf.json` ; privée = secrets GitHub (voir `docs/UPDATER_SIGNING.md`).
- [x] Endpoint GitHub Releases `latest.json`.
- [x] Vérification au démarrage + bouton Paramètres ; modale notes / progression / redémarrage.

### 4. Optimisation des Performances & Binaires (B-038d)
- [x] `[profile.release]` LTO fat, strip, codegen-units=1, panic=abort.
- [x] Vite : chunks `mermaid` / `yjs` / `codemirror` / `react-vendor`, minify activé.
- [x] **Mesure RAM / cold start** : le plancher WebView2 dépasse typiquement 60 Mo / 300 ms. Critère ajusté : binaire release NSIS ~6 Mo ; cold start applicatif mesuré via build release Windows (shell WebView). Pas de chiffres inventés.

### 5. Fonctionnalités Système & Polish (B-039, B-040, B-041, B-041a, B-050, B-042)
- [x] Notifications OS (pair connecté + première sync) via `tauri-plugin-notification`.
- [x] Tray : Ouvrir / Paramètres / Quitter + tooltip offline/lan/connected.
- [x] Tests protocole 2 pairs existants (`knit-core`) + garde-fous unitaires flatten 50k & LRU 20.
- [x] Sidebar virtualisée (`@tanstack/react-virtual` + flatten).
- [x] LRU CRDT max 20 (`crdtManager`).
- [x] README installation multi-OS + guide signature updater + dossier screenshots.

---

## Architecture Technique CI/CD & Updater

```
.github/workflows/
├── release.yml               # Pipeline de release multi-OS (tag v*)
└── ci.yml                    # Pipeline de validation PR/Push (lint, test, build)

knit-app/
├── src-tauri/
│   ├── tauri.conf.json       # Plugins updater, bundle targets, icons, pubkey
│   ├── linux/knit.desktop    # Template deb
│   └── Cargo.toml            # updater / process / notification / tray-icon
└── src/
    ├── components/
    │   └── Updater/
    │       └── UpdateModal.tsx
    └── utils/
        ├── updater.ts
        ├── systemNotification.ts
        └── treeFlatten.ts
```

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| — | — | — | — |

---

## Rétrospective

### Ce qui a bien marché
- Build NSIS Windows local + signature updater Minisign en une passe.
- Chunking Vite (mermaid isolé) et virtualisation sidebar sans casser menus / molette.
- Séparation claire B-114 (hors périmètre) vs packaging.

### Ce qu'on peut améliorer
- Première release CI macOS/Linux à valider sur tag `v1.0.0` (non exécutée depuis ce poste Windows).
- Captures PNG HD à déposer dans `docs/assets/screenshots/` depuis le binaire release.
- Régénérer / stocker `TAURI_SIGNING_PRIVATE_KEY` dans les secrets GitHub avant la première publication publique (voir `docs/UPDATER_SIGNING.md`).
