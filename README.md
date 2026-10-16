<p align="center">
  <img src="docs/assets/logo.svg" width="128" height="128" alt="Knit Logo" />
</p>

<h1 align="center">Knit</h1>

<p align="center">
  <strong>L'espace de travail collaboratif local-first en Markdown pur, synchronisé en P2P et conçu pour une symbiose parfaite entre humains et agents IA.</strong>
</p>

<p align="center">
  <a href="https://github.com/Domaine-Tech/knit/releases"><img src="https://img.shields.io/badge/version-v0.3.0--dev-8B5CF6?style=flat-square" alt="Version" /></a>
  <a href="https://tauri.app/"><img src="https://img.shields.io/badge/Tauri-v2.12-24C8D5?style=flat-square&logo=tauri&logoColor=white" alt="Tauri v2" /></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-2021-DEA584?style=flat-square&logo=rust&logoColor=white" alt="Rust 2021" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" /></a>
  <a href="https://yjs.dev/"><img src="https://img.shields.io/badge/CRDT-Yjs-ECA227?style=flat-square" alt="Yjs CRDT" /></a>
  <a href="https://iroh.computer/"><img src="https://img.shields.io/badge/P2P-Iroh%20QUIC-FF5500?style=flat-square" alt="Iroh P2P" /></a>
  <img src="https://img.shields.io/badge/Format-100%25%20Markdown%20Pur-10B981?style=flat-square" alt="100% Pure Markdown" />
  <img src="https://img.shields.io/badge/Zero-Cloud%20Lock--in-blue?style=flat-square" alt="Zero Cloud Lock-in" />
</p>

---

## 💡 Qu'est-ce que Knit ?

**Knit** est un coffre-fort de connaissances et de gestion de projet décentralisé. 

Contrairement aux outils SaaS propriétaires (Notion, Jira, Linear, Miro) qui enferment vos données dans des serveurs cloud opaques, Knit garantit que **vos fichiers restent sur votre disque en texte brut Markdown (`.md`)**. 

Les humains éditent via une interface visuelle riche (Kanban, Tableaux, Calendrier, Live Preview CodeMirror 6). Les agents IA (Cursor, Claude Code, Antigravity, Copilot, Windsurf, Cline) éditent directement les fichiers `.md` sur le disque — et **tout se synchronise instantanément en peer-to-peer sans aucun serveur central et sans conflit de fusion**.

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│     👩‍💻 DÉVELOPPEUR / HUMAIN      │           │       🤖 AGENT IA AGENTIQUE     │
│   (Knit App - Kanban / Note)    │           │ (Cursor / Claude / Antigravity) │
└────────────────┬────────────────┘           └────────────────┬────────────────┘
                 │ (Édition IHM)                               │ (Édition .md)
                 ▼                                             ▼
  ┌───────────────────────────────┐             ┌───────────────────────────────┐
  │   Structure Yjs (CRDT en RAM) │ ◄─────────► │ Watcher Notify + WriteGuard   │
  └──────────────┬────────────────┘ (Diff <1ms) └──────────────┬────────────────┘
                 │                                             │
                 ▼                                             ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                       FICHIERS MARKDOWN PURS SUR DISQUE                     │
  │                      (Zéro base de données propriétaire)                    │
  └──────────────────────────────────────┬──────────────────────────────────────┘
                                         │
                                         ▼ (Iroh QUIC / mDNS)
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │              RÉSEAU PEER-TO-PEER CHIFFRÉ DE BOUT EN BOUT (LAN / WAN)        │
  └─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🌟 Les Points Forts de Knit

### 📑 1. Vues Pilotées par le Document (*Doc-Driven Views*)
Le mode d'affichage découle directement du Frontmatter YAML de la note. Un simple clic ou raccourci permet de convertir le fichier ou de basculer vers le code source brut :
- **`type: note`** : Éditeur Live Preview avec coloration syntaxique et diagrammes Mermaid inline.
- **`type: kanban`** : Tableau Kanban complet. Les colonnes sont délimitées par des titres `##` et les cartes par des items `- [ ]`.
- **`type: table`** : Vue tabulaire structurée avec filtres, tri en direct et modification de cellules.
- **`type: calendar`** : Agenda et échéancier du coffre agrégeant toutes les tâches `@dates` et réunions.
- **`type: canvas`** : Tableau blanc infini au format standard international [JSON-Canvas](https://jsoncanvas.org).
- **`type: slides`** : Diaporama plein écran avec séparateurs `---` (norme Marp / Slidev).

### ✨ 2. Moteur d'Autocomplétion Universel (Omni-Trigger)
Actif dans l'éditeur, sur les cartes Kanban et dans les cellules de tableau :
- **`[[`** : Recherche instantanée de notes du coffre.
- **`[[#`** : Ancre interne vers les titres de la note active.
- **`[[Note#`** : Deep-linking vers une section précise d'une autre note.
- **`[[Note|`** : Définition d'un alias d'affichage.
- **`@`** : Mentions de collaborateurs et entité spéciale `@vault` (attribution collective au coffre).
- **`@@`** : Raccourcis de dates dynamiques et sélecteur de calendrier (`@@aujourd'hui`, `@@demain 14:30`).
- **`#`** : Tags hiérarchiques du coffre (`#projet/sprint-1`).
- **`:`** : Sélecteur d'émojis instantané (`:sparkles:` → ✨, `:check:` → ✅).
- **`/`** : Menu Slash commands (`/titre`, `/tache`, `/callout`, `/mermaid`, `/table`).

### 📋 3. Gestion de Projet Épurée & 7 Statuts de Tâches
Une norme de gestion de projet universelle, 100% lisible par les humains et les LLMs :
```markdown
- [ ] Tâche à réaliser (To-do)
- [/] Tâche en cours d'exécution (In progress, demi-jauge feutrée)
- [x] Tâche terminée et validée (Done, barré feutré)
- [-] Tâche annulée ou abandonnée (Cancelled)
- [?] Tâche en attente d'arbitrage / question (On-hold)
- [>] Tâche reportée ou déléguée (Forwarded)
- [!] Tâche urgente ou critique (Urgent)

# Priorités inline & échéances fines
- [ ] Résoudre le bug critique de sync !p1 @Thomas H. @2026-10-20 14:00-15:30
- [ ] Sauvegarde mensuelle du vault !p2 @vault @2026-10-25
```
- **Barre de progression automatique (2px)** : calculée et projetée à la volée sous le premier titre `#` (`12 / 18 tâches complétées (67%)`), sans polluer le fichier sur disque.
- **Bijectivité Kanban** : Déplacer une carte vers « En cours » modifie immédiatement sa case en `- [/]` sur le disque.

### 🧠 4. Kit IA Universel & Registre de Mémoire Persistante
Knit élimine l'amnésie des agents IA entre conversations tout en préservant le budget de tokens :
- **Registre Compact [`.knit/AI_MEMORY.md`](.knit/AI_MEMORY.md)** : Fichier partagé ultra-synthétique de **~380 tokens** lu au démarrage d'une session par n'importe quelle IA (Cursor, Claude Code, Antigravity, Copilot, Windsurf, Cline, Aider).
- **Règles Générées par le Wizard** : Génération des kits d'instructions `.cursor/rules/`, `CLAUDE.md`, `.agents/skills/knit/`, `.github/copilot-instructions.md`.
- **Règle de Synchronisation Continue** : Tout ajout de fonctionnalité de coffre est immédiatement répercuté dans les règles IA.

### ⚡ 5. Ergonomie Sérénité & Performance Zéro Saccade
- **Mode Zen (`Ctrl+Shift+F`)** : Masquage en 1 clic de l'interface pour une concentration absolue dans une colonne épurée de 760px.
- **Appairage P2P LAN Simplifié** : Invitation instantanée par **Code PIN éphémère à 6 chiffres** ou **QR Code**, sans copier de clés de 64 caractères.
- **Lazy-Rendering (`IntersectionObserver`)** : Les blocs Mermaid et requêtes Dataview ne sont calculés que lorsqu'ils entrent dans le viewport lors du scroll (ouverture instantanée en 0ms).
- **Flush Disque Atomique (250ms)** : Frappes en RAM CRDT en < 1ms, écriture disque debouncée avec hachage XXH3 WriteGuard pour préserver la durée de vie des SSD.

---

## 🏛️ Les 9 Piliers Fondateurs

| # | Pilier | En une phrase |
|---|---|---|
| 1 | 📁 **Local-First** | Vos fichiers restent sur votre disque. Aucun compte cloud obligatoire. |
| 2 | 🔗 **P2P Sans Serveur** | Connexions directes chiffrées de bout en bout (QUIC / Iroh / mDNS). |
| 3 | 📝 **Markdown Pur** | Aucune base de données opaque : le texte brut est la source unique de vérité. |
| 4 | 🤖 **Agent-Friendly** | Les IA sont des citoyennes de première classe avec mémoire persistante dédiée. |
| 5 | ⚡ **Zéro Conflit** | Les CRDT (Yjs) garantissent une fusion mathématique parfaite sans perte de données. |
| 6 | 🎨 **UI/UX Calme & Minimaliste** | Typographie Inter, design tokens HSL (`--knit-hue`), thème clair/sombre. |
| 7 | 🖥️ **Multiplateforme** | Application native ultra-légère (~15 Mo) via Tauri v2 sur Windows, macOS et Linux. |
| 8 | 🧩 **Modulaire & Extensible** | Noyau Rust `knit-core` découplé de l'interface graphique. |
| 9 | 📊 **Mermaid & Vues Intégrées** | Diagrammes, Kanban, Tableaux et Agenda rendus dynamiquement sans plugin lourd. |

---

## 🛠️ Stack Technique

```
knit/
├── knit-core/           # Bibliothèque métier Rust
│   ├── src/
│   │   ├── crdt/        # Intégration CRDT & pont Yjs
│   │   ├── fs/          # File watcher notify & WriteGuard XXH3
│   │   ├── p2p/         # Transport Iroh QUIC, mDNS & Iroh Blobs
│   │   ├── index/       # KnitSuggestIndex & KnitCalendarIndex en RAM (< 2ms)
│   │   └── markdown/    # Parseur Frontmatter YAML & diffs textuels
│   └── Cargo.toml
│
└── knit-app/            # Application cliente Tauri v2
    ├── src-tauri/       # Backend Rust Tauri (IPC commands, permissions)
    └── src/             # Frontend React 19 + TypeScript + Vite
        ├── components/  # Éditeur CodeMirror 6, Kanban, Table, Sidebar, Tabs, Modales
        ├── stores/      # Stores d'état (vaultStore, networkStore, toastStore)
        └── theme/       # CSS tokens HSL & DuotoneIcons
```

---

## 🚀 Démarrage Rapide

### Prérequis
- [Node.js](https://nodejs.org/) (v18+)
- [Rust & Cargo](https://rustup.rs/) (v1.75+)

### Lancement en Développement
```bash
# Cloner le dépôt
git clone https://github.com/Domaine-Tech/knit.git
cd knit

# Lancer sous Windows (PowerShell) :
.\dev.ps1               # Mode complet application bureau (Tauri v2 + Vite HMR)
.\dev.ps1 -Mode web     # Mode navigateur Web pur

# Lancer sous Linux / macOS (Bash) :
./dev.sh                # Mode complet application bureau
./dev.sh web            # Mode navigateur Web pur
```

Consultez le guide complet des commandes de tests et de build : **[COMMANDS.md](COMMANDS.md)**.

---

## 📚 Documentation Officielle

- **[docs/MARKDOWN_SPEC.md](docs/MARKDOWN_SPEC.md)** : Spécification officielle du Markdown Knit, syntaxe des 7 statuts de tâches, dates, WikiLinks et vues.
- **[docs/UI_UX.md](docs/UI_UX.md)** : Design tokens, ergonomie collaborative, Mode Zen, popover d'autocomplétion et accessibilité.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** : Architecture système, boucle de synchronisation FS ↔ CRDT, et moteurs d'indexation Rust.
- **[docs/PILIERS.md](docs/PILIERS.md)** : Détail approfondi des 9 piliers architecturaux.
- **[docs/VISION.md](docs/VISION.md)** : Vision du projet, problématiques résolues et cas d'usage.
- **[docs/WIZARD.md](docs/WIZARD.md)** : Parcours d'accueil, création et jonction P2P de coffres-forts.

---

## 🗺️ Roadmap & Méthodologie Sprints

Le projet suit scrupuleusement la méthodologie SemVer et les sprints documentés dans **[`versions/`](versions/)** :

- [x] **v0.1.0 — Éditeur Local & Boucle FS ↔ CRDT** : Live preview CodeMirror 6, WriteGuard XXH3, Corbeille OS native ([Changelog v0.1.0](versions/v0.1.0/CHANGELOG.md)).
- [x] **v0.2.0 — Réseau P2P & Résilience** : Transport Iroh QUIC, mDNS local, invitations P2P et synchronisation des assets ([Changelog v0.2.0](versions/v0.2.0/CHANGELOG.md)).
- [ ] **v0.3.0 — Vues Projets, Autocomplétion & Mermaid** : Doc-Driven Views (Kanban/Table), autocomplétion omni-trigger (`B-052`), smart UX (`B-053`), tâches étendues (`B-054`), mode Zen (`B-055`) ([Changelog v0.3.0](versions/v0.3.0/CHANGELOG.md)).
- [ ] **v0.4.0 — Requêtes Dataview & Vues Immersives** : Blocs dynamiques `knit-query`, Agenda global multi-collaborateurs (`B-031a`), Canvas infini, Diaporama ([Changelog v0.4.0](versions/v0.4.0/CHANGELOG.md)).
- [ ] **v1.0.0 — Production Release** : Wizard finalisé, installateurs multiplateformes, présence collaborative avancée ([Changelog v1.0.0](versions/v1.0.0/CHANGELOG.md)).

Consultez le **[Backlog Global](versions/BACKLOG.md)** pour le détail de l'ensemble des User Stories.

---

## 📄 Licence

Ce projet est distribué sous licence MIT. Vos notes, vos données et vos coffres restent votre propriété exclusive à vie.
