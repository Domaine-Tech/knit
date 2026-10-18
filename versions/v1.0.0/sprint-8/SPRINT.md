# Sprint 8 — Packaging Multi-OS, CI/CD Automatisée, Auto-Updater & Polish Final

> Objectif : Délivrer une chaîne de distribution moderne, multiplateforme et ultra-optimisée (Windows, macOS, Linux), un pipeline CI/CD GitHub Actions automatique, un système de mise à jour sécurisé (Tauri v2 Updater), et polir l'application pour la production v1.0.0.

| Info | Détail |
|---|---|
| **Version** | v1.0.0 |
| **Durée** | 2027-01-26 → 2027-02-09 (2 semaines) |
| **Statut** | 📋 Planifié |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| **B-037** | Installateur Windows (`.exe` NSIS moderne & `.msi` signés via Tauri v2) | 🔴 Critique | 📋 Planifié | — |
| **B-038** | Installateur Linux (`.AppImage` universel & paquet `.deb` Debian/Ubuntu) | 🔴 Critique | 📋 Planifié | — |
| **B-038a** | Bundle macOS natif (`.dmg` stylisé & `.app` Universal Binary Apple Silicon + Intel) | 🔴 Critique | 📋 Planifié | — |
| **B-038b** | Pipeline CI/CD GitHub Actions multi-OS (Matrix `windows-latest`, `macos-latest`, `ubuntu-22.04`, `tauri-action`, rust-cache & release auto) | 🔴 Critique | 📋 Planifié | — |
| **B-038c** | Système de Mise à Jour Automatique In-App (Tauri v2 Updater, signature cryptographique Minisign, manifeste `latest.json` & dialogue UI de mise à jour 1-clic) | 🔴 Critique | 📋 Planifié | — |
| **B-038d** | Optimisation des binaires & profils de release (Cargo `[profile.release]` LTO fat, `strip = true`, `codegen-units = 1`, `panic = "abort"`, bundle Vite optimisé) | 🟠 Haute | 📋 Planifié | — |
| **B-039** | Notifications système (nouveau pair connecté, sync terminée, mise à jour prête) | 🟡 Moyenne | 📋 Planifié | — |
| **B-040** | Tray icon avec menu contextuel et indicateur d'état réseau | 🟡 Moyenne | 📋 Planifié | — |
| **B-041** | Tests end-to-end automatisés (Tauri + 2 pairs virtuels en simultané) | 🟠 Haute | 📋 Planifié | — |
| **B-041a** | Virtualisation de l'arborescence (Windowing Sidebar pour 50 000+ notes sans lag) | 🟠 Haute | 📋 Planifié | — |
| **B-050** | Cache LRU des Documents CRDT & Libération Mémoire (LRU Doc Cache max 20 Y.Docs) | 🟠 Haute | 📋 Planifié | — |
| **B-042** | README final + guide utilisateur + captures d'écran de référence | 🟠 Haute | 📋 Planifié | — |

---

## Critères d'acceptation (DoD - Definition of Done)

### 1. Packaging & Distribution Multi-OS (B-037, B-038, B-038a)
- [ ] **Windows (B-037)** :
  - Installateur NSIS (`.exe`) moderne : choix du répertoire, création de raccourcis Bureau/Menu Démarrer, désinstallateur propre et gestion des mises à jour sans perte de données.
  - Paquet MSI (`.msi`) pour le déploiement silencieux en entreprise.
- [ ] **Linux (B-038)** :
  - Binaire `.AppImage` autonome et portable avec icône intégrée, fonctionnant sur Ubuntu, Debian, Fedora et Arch sans dépendances système externes manquantes.
  - Paquet `.deb` avec intégration desktop (`.desktop`, mime-types Markdown).
- [ ] **macOS (B-038a)** :
  - Image disque `.dmg` personnalisée avec fenêtre graphique invitant au glisser-déposer vers `/Applications`.
  - Binaire Universel `.app` compatible nativement Apple Silicon (ARM64 M1/M2/M3/M4) et processeurs Intel (x86_64).

### 2. Pipeline CI/CD GitHub Actions Automatisé (B-038b)
- [ ] Workflow de Release déclenché automatiquement sur push de tag `v*` (ex: `git tag v1.0.0 && git push --tags`) ou via `workflow_dispatch`.
- [ ] Matrix de compilation parallèle multi-OS :
  - `windows-latest`
  - `macos-latest`
  - `ubuntu-22.04` (avec installation préalable des dépendances `libwebkit2gtk-4.1-dev`, `libappindicator3-dev`, etc.)
- [ ] Optimisation CI avec `Swatinem/rust-cache` et cache NPM : compilation incrémentale réduisant les builds à moins de 6-8 minutes par runner.
- [ ] Publication automatique d'une GitHub Release contenant tous les installateurs et le fichier de métadonnées `latest.json`.
- [ ] Workflow CI de vérification continue sur chaque Pull Request (linter, `cargo test`, `npm run build`).

### 3. Système d'Auto-Update Sécurisé & In-App (B-038c)
- [ ] Intégration du plugin officiel Tauri v2 (`tauri-plugin-updater` et `@tauri-apps/plugin-updater`).
- [ ] Sécurité cryptographique asymétrique Minisign :
  - Clé privée stockée de manière sécurisée dans les GitHub Actions Secrets (`TAURI_SIGNING_PRIVATE_KEY`).
  - Clé publique scellée dans `tauri.conf.json`.
  - Rejet immédiat de tout binaire non authentique ou corrompu.
- [ ] Endpoint de mise à jour sans serveur externe : lecture directe du fichier `latest.json` sur les GitHub Releases du dépôt.
- [ ] Interface utilisateur (React / TypeScript) :
  - Vérification transparente au démarrage et bouton manuel *"Rechercher des mises à jour"* dans la modale Paramètres.
  - Toast discret et modale détaillée présentant la version détectée, les notes de version (release notes), et la progression du téléchargement.
  - Redémarrage propre en 1 clic pour installer la mise à jour.

### 4. Optimisation des Performances & Binaires (B-038d)
- [ ] Configuration `[profile.release]` activée dans `Cargo.toml` racine :
  - `opt-level = 3`
  - `lto = "fat"` (optimisation globale des liaisons Rust)
  - `codegen-units = 1` (réduction maximale de la taille du binaire)
  - `panic = "abort"`
  - `strip = true` (suppression intégrale des symboles de debug)
- [ ] Frontend Vite : minification esbuild/terser, compression des assets statiques, chunking efficace.
- [ ] Empreinte mémoire RAM au repos bornée sous les 60 Mo.
- [ ] Démarrage de l'application (cold start) inférieur à 300 ms.

### 5. Fonctionnalités Système & Polish (B-039, B-040, B-041, B-041a, B-050, B-042)
- [ ] Notifications système natives lors de la connexion d'un nouveau pair P2P et à la fin de la synchronisation initiale.
- [ ] Icône dans la barre des tâches (Tray icon) avec statut réseau (vert = connecté, orange = LAN-only, gris = hors-ligne) et menu contextuel (Ouvrir, Paramètres, Quitter).
- [ ] Tests end-to-end automatisés validant la synchronisation multi-pairs.
- [ ] Virtualisation de la Sidebar supportant 50 000+ fichiers sans baisse de framerate (60 fps constants).
- [ ] Gestionnaire CRDT avec cache LRU limitant les `Y.Doc` actifs en mémoire à 20 maximum (B-050).
- [ ] Documentation utilisateur complète, screenshots haute définition et guide d'installation pour chaque système d'exploitation.

---

## Architecture Technique CI/CD & Updater

```
.github/workflows/
├── release.yml               # Pipeline de release multi-OS (tag v*)
└── ci.yml                    # Pipeline de validation PR/Push (lint, test, build)

knit-app/
├── src-tauri/
│   ├── tauri.conf.json       # Plugins updater, bundle targets, icons, pubkey
│   └── Cargo.toml            # tauri-plugin-updater v2
└── src/
    ├── components/
    │   └── Updater/
    │       ├── UpdateModal.tsx       # Modale d'installation de MAJ
    │       └── UpdateToast.tsx       # Notification discrète de nouvelle version
    └── utils/
        └── updater.ts                # Wrapper @tauri-apps/plugin-updater
```

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| — | — | — | — |

---

## Rétrospective

*(À compléter à la fin du sprint)*

### Ce qui a bien marché
- 

### Ce qu'on peut améliorer
- 
