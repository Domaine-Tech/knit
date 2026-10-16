# 🧶 Knit

> Application collaborative local-first & P2P pour le wiki, le suivi de projet et la planification, en Markdown pur — pensée pour les humains *et* les agents IA.

---

## Qu'est-ce que Knit ?

Knit est un espace de travail collaboratif qui synchronise des fichiers Markdown en peer-to-peer, sans serveur central. Les humains éditent via une interface moderne (Tauri + CodeMirror 6), les agents IA (Cursor, Claude Code, Antigravity) éditent directement les fichiers `.md` — et tout se synchronise en temps réel, sans conflit.

### En une phrase

**Un coffre-fort de fichiers Markdown, synchronisé en P2P, éditable par des humains et des IA, sans jamais perdre de données.**

---

## Les 9 Piliers

| # | Pilier | En une phrase |
|---|---|---|
| 1 | 📁 **Local-First** | Tes fichiers, ton disque, ton contrôle total |
| 2 | 🔗 **P2P Sans Serveur** | Les machines se parlent directement, chiffré de bout en bout |
| 3 | 📝 **Markdown Pur** | Le format universel, lisible partout, par tous |
| 4 | 🤖 **Agent-Friendly** | Les IA sont des citoyens de première classe dans le vault |
| 5 | ⚡ **Zéro Conflit** | Les CRDT garantissent la fusion sans jamais perdre de données |
| 6 | 🎨 **UI/UX Premium** | Simple, arrondie, thème centralisé, couleur personnalisable |
| 7 | 🖥️ **Multiplateforme** | Natif sur Windows et Linux, léger et rapide |
| 8 | 🧩 **Modulaire** | Core séparé, daemon headless, extensible par design |
| 9 | 📊 **Mermaid Natif** | Diagrammes rendus live, thématisés, directement dans l'éditeur |

---

## Stack technique

| Composant | Technologie |
|---|---|
| Shell natif | Tauri v2 (Rust + Web) |
| Moteur CRDT | Yjs |
| Réseau P2P | Iroh (QUIC, E2E, Blobs) |
| Éditeur | CodeMirror 6 |
| File Watcher | notify (Rust) + WriteGuard (XXH3) |
| Interface | React + CSS Tokens HSL |
| Icônes | Reicon (style Duotone) |
| Diagrammes | Mermaid.js |

---

## Démarrage rapide & Commandes

Consultez le guide des commandes : **[COMMANDS.md](COMMANDS.md)**

```bash
# Sous Windows PowerShell :
.\dev.ps1               # Mode watch complet (Tauri v2 + Vite HMR)
.\dev.ps1 -Mode web     # Mode Web pur (navigateur)

# Sous Linux / macOS :
./dev.sh                # Mode watch complet (Tauri v2 + Vite HMR)
./dev.sh web            # Mode Web pur (navigateur)
```

---

## Documentation

| Document | Description |
|---|---|
| [COMMANDS.md](COMMANDS.md) | Guide rapide des commandes de développement, tests et build |
| [docs/MARKDOWN_SPEC.md](docs/MARKDOWN_SPEC.md) | Spécification officielle du Markdown Knit, YAML Frontmatter & Doc-Driven Views |
| [docs/VISION.md](docs/VISION.md) | Vision, problème résolu, architecture technique |
| [docs/PILIERS.md](docs/PILIERS.md) | Les 9 piliers fondateurs détaillés |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture technique, modules Tauri/Rust, protocole de synchronisation |
| [docs/UI_UX.md](docs/UI_UX.md) | Design system, tokens CSS, palette HSL dynamique et intégration Mermaid |
| [docs/SOLUTIONS.md](docs/SOLUTIONS.md) | Solutions aux défis techniques |
| [docs/WIZARD.md](docs/WIZARD.md) | Wizard d'initialisation (créer/rejoindre un coffre) |

## Gestion de projet

| Document | Description |
|---|---|
| [versions/VERSIONING.md](versions/VERSIONING.md) | Système de versioning et méthodologie sprints |
| [versions/BACKLOG.md](versions/BACKLOG.md) | Backlog global (modifiable à tout moment) |
| [versions/v0.1.0/](versions/v0.1.0/) | Version 0.1.0 — Éditeur Local (✅ Livrée - Sprints 1 & 2) |
| [versions/v0.2.0/](versions/v0.2.0/) | Version 0.2.0 — Réseau P2P & Résilience (✅ Livrée - Sprints 3 & 4) |
| [versions/v0.3.0/](versions/v0.3.0/) | Version 0.3.0 — Vues Projet, Kanban & Mermaid (🔄 En cours - Sprint 6) |
| [versions/v1.0.0/](versions/v1.0.0/) | Version 1.0.0 — Production Release (📋 Planifiée - Sprints 7 & 8) |

---

## Statut actuel

🔄 **Phase** : Développement v0.3.0 (Sprint 5 ✅ Terminé, Sprint 6 📋 Planifié)  
📅 **Dernière mise à jour** : 2026-10-16
