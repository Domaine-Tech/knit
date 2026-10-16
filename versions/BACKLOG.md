# 📋 Backlog Global — Knit

> Ce fichier est la source de vérité pour toutes les tâches du projet.
> Il peut être modifié **à tout moment**, y compris en milieu de sprint.
>
> Dernière mise à jour : 2026-10-16

---

## Légende

| Icône | Statut | | Icône | Priorité |
|---|---|---|---|---|
| 💡 | Nouveau | | 🔴 | Critique |
| 📋 | Planifié | | 🟠 | Haute |
| 🔄 | En cours | | 🟡 | Moyenne |
| ✅ | Terminé | | 🟢 | Basse |
| ❌ | Annulé | | | |
| ⏸️ | Suspendu | | | |

---

## v0.1.0 — Éditeur Local

> L'application ouvre un dossier, affiche et édite des fichiers `.md`, et reste synchronisée avec le système de fichiers.

### Sprint 1 — Fondations

| # | Tâche | Priorité | Statut | Sprint |
|---|---|---|---|---|
| B-001 | Scaffolder le projet Tauri v2 + React | 🔴 | ✅ | Sprint 1 |
| B-002 | Intégrer CodeMirror 6 avec `@codemirror/lang-markdown` | 🔴 | ✅ | Sprint 1 |
| B-002a | Recherche locale & remplacement (`Ctrl+F`, `Ctrl+H` via `@codemirror/search`) | 🔴 | ✅ | Sprint 1 |
| B-003 | Créer le composant Sidebar (arbre de fichiers) | 🟠 | ✅ | Sprint 1 |
| B-003b | Système d'onglets (Multi-tabs, clic molette open/close, drag & drop, Ctrl+W/Tab) | 🔴 | ✅ | Sprint 1 |
| B-004 | Implémenter la lecture/écriture de fichiers via Tauri IPC | 🔴 | ✅ | Sprint 1 |
| B-005 | Créer le Design Token System (CSS variables) | 🟠 | ✅ | Sprint 1 |
| B-006 | Implémenter le thème clair/sombre + slider hue | 🟡 | ✅ | Sprint 1 |
| B-006a | Intégrer les icônes Reicon (style Duotone) adaptées à `--knit-hue` | 🟠 | ✅ | Sprint 1 |
| B-006b | Système de Toast centralisé (bottom-right, animations, store optimisé) | 🟠 | ✅ | Sprint 1 |
| B-006c | Système de Menu Contextuel centralisé (clic droit personnalisé, désactivation natif) | 🟠 | ✅ | Sprint 1 |

### Sprint 2 — CRDT & File Watcher

| # | Tâche | Priorité | Statut | Sprint |
|---|---|---|---|---|
| B-007 | Intégrer Yjs avec `y-codemirror.next` | 🔴 | ✅ | Sprint 2 |
| B-008 | Implémenter le File Watcher Rust (crate `notify`) | 🔴 | ✅ | Sprint 2 |
| B-009 | Implémenter le WriteGuard (triple garde anti-boucle) | 🔴 | ✅ | Sprint 2 |
| B-010 | Boucle CRDT ↔ FS (écriture `.md` depuis CRDT, injection depuis watcher) | 🔴 | ✅ | Sprint 2 |
| B-011 | Parseur YAML frontmatter (lecture/écriture) | 🟠 | ✅ | Sprint 2 |
| B-011a | Gestion du presse-papier & paste d'images (`Ctrl+V`, Drag&Drop vers `assets/`) | 🟠 | ✅ | Sprint 2 |
| B-011b | Refactoring automatique des liens (mise à jour auto lors du déplacement/renommage) | 🔴 | ✅ | Sprint 2 |
| B-012 | Test d'intégration : modifier un `.md` dans Cursor → mise à jour dans Knit | 🟠 | ✅ | Sprint 2 |
| B-012a | Suppression réversible dans la Corbeille de l'OS (Win/Mac/Linux) & Undo | 🟠 | ✅ | Sprint 2 |
| B-012b | Résoudre le staging `.knit/trash` & restauration OS native préservant le chemin d'origine | 🟠 | ✅ | Sprint 2 |

---

## v0.2.0 — Réseau P2P

> Deux instances de Knit sur deux PC se synchronisent en temps réel via P2P.

### Sprint 3 — Iroh & Transport

| # | Tâche | Priorité | Statut | Sprint |
|---|---|---|---|---|
| B-013 | Intégrer Iroh dans le backend Rust de Tauri | 🔴 | ✅ | Sprint 3 |
| B-014 | Implémenter le transport Yjs sur les streams QUIC d'Iroh | 🔴 | ✅ | Sprint 3 |
| B-015 | Générer et gérer les keypairs Ed25519 (identité pair) | 🔴 | ✅ | Sprint 3 |
| B-016 | Implémenter la découverte LAN via mDNS (`mdns-sd`) | 🟠 | ✅ | Sprint 3 |
| B-017 | Implémenter le protocole d'invitation (code `knit://join/...`) | 🟠 | ✅ | Sprint 3 |
| B-017a | Synchronisation P2P des médias (`assets/`) via Iroh Blobs | 🟠 | ✅ | Sprint 3 |

### Sprint 4 — Résilience & Offline

| # | Tâche | Priorité | Statut | Sprint |
|---|---|---|---|---|
| B-018 | Gestion de la déconnexion/reconnexion (rejouer les ops manquées) | 🔴 | ✅ | Sprint 4 |
| B-019 | Implémenter les snapshots/compaction Yjs (toutes les 200 ops) | 🟠 | ✅ | Sprint 4 |
| B-020 | Stocker les snapshots dans `.knit/snapshots/` | 🟡 | ✅ | Sprint 4 |
| B-020a | Profil utilisateur enrichi (Nom, Prénom, Email, Rôle & Statut) dans `.knit/identity/profile.json` & UI | 🟠 | ✅ | Sprint 4 |
| B-020b | Synchronisation P2P d'avatars personnalisés via Iroh Blobs & fallback initiales | 🟠 | ✅ | Sprint 4 |
| B-020c | Signatures cryptographiques Ed25519 des snapshots, Privacy Toggle & interfaçage Git auto | 🟡 | ✅ | Sprint 4 |
| B-021 | Test : 2 PC en LAN synchronisent un coffre-fort en temps réel | 🔴 | ✅ | Sprint 4 |
| B-022 | Test : un PC hors-ligne pendant 1h resynchronise correctement | 🟠 | ✅ | Sprint 4 |

---

## v0.3.0 — Vues Projet & Mermaid

> Transformer les fichiers `.md` en vues dynamiques et rendre les diagrammes Mermaid.

### Sprint 5 — Kanban & Navigation Clavier

| # | Tâche | Priorité | Statut | Sprint |
|---|---|---|---|---|
| B-023 | Vue Kanban : colonnes basées sur `statut:` du frontmatter | 🔴 | 📋 | Sprint 5 |
| B-024 | Vue Tableau : liste filtrable/triable de toutes les tâches | 🟠 | 📋 | Sprint 5 |
| B-025 | Drag & Drop Kanban (glisser = modifier le frontmatter) | 🟠 | 📋 | Sprint 5 |
| B-026 | Recherche globale dans tout le coffre (`Ctrl+Shift+F` avec snippets) | 🔴 | 📋 | Sprint 5 |
| B-026a | Quick Switcher (`Ctrl+O`) & Palette de commandes (`Ctrl+P`) (Obsidian) | 🔴 | 📋 | Sprint 5 |
| B-026b | WikiLinks bidirectionnels `[[Note]]` avec autocomplétion (Obsidian) | 🟠 | 📋 | Sprint 5 |
| B-026c | Système de Tags (`#inline` et `tags: [...]` en frontmatter, volet de filtres) | 🟠 | 📋 | Sprint 5 |

### Sprint 6 — Mermaid, Slash Command & Polish Éditeur

| # | Tâche | Priorité | Statut | Sprint |
|---|---|---|---|---|
| B-027 | Rendu Mermaid inline dans CodeMirror 6 (WidgetType) | 🔴 | 📋 | Sprint 6 |
| B-028 | Coloration syntaxique Mermaid (`codemirror-lang-mermaid`) | 🟠 | 📋 | Sprint 6 |
| B-029 | Thème Mermaid synchronisé avec `--knit-hue` | 🟡 | 📋 | Sprint 6 |
| B-030 | Mode code ↔ rendu (clic sur le diagramme pour éditer) | 🟠 | 📋 | Sprint 6 |
| B-030a | Menu Slash Command (`/`) & Callouts GFM (`> [!NOTE]`) (Notion) | 🟠 | 📋 | Sprint 6 |
| B-030b | Multi-onglets & Split View (`Ctrl+\`) (Obsidian) | 🟡 | 📋 | Sprint 6 |
| B-030c | Mode Live Preview (style Obsidian : masquer balises Markdown hors curseur) | 🔴 | 📋 | Sprint 6 |
| B-031 | Debounce 300ms sur le rendu Mermaid | 🟡 | 📋 | Sprint 6 |

---

## v1.0.0 — Production Release

> Application complète, polie, distribuable.

### Sprint 7 — Wizard & Finalisation

| # | Tâche | Priorité | Statut | Sprint |
|---|---|---|---|---|
| B-032 | Wizard d'initialisation : flux "Créer un coffre-fort" | 🔴 | 📋 | Sprint 7 |
| B-033 | Wizard d'initialisation : flux "Rejoindre un coffre-fort" | 🔴 | 📋 | Sprint 7 |
| B-034 | Page de paramètres (thème, hue, réseau) | 🟠 | 📋 | Sprint 7 |
| B-034a | Corbeille 100% intégrée (.knit/trash/) : réglage dans les paramètres (OS vs Knit), volet dédié avec prévisualisation, restauration ciblée et vidage | 🟠 | 📋 | Sprint 7 |
| B-035 | Présence collaborative (avatars sidebar, infobulle, téléportation, curseurs sobres) | 🟡 | 📋 | Sprint 7 |
| B-035b | Volet Historique de versions & Time Travel (Diff visuel + Restauration) | 🟠 | 📋 | Sprint 7 |
| B-036 | Créer le fichier `.knitshare` et la structure par défaut | 🟠 | 📋 | Sprint 7 |

### Sprint 8 — Distribution & Polish

| # | Tâche | Priorité | Statut | Sprint |
|---|---|---|---|---|
| B-037 | Installateur Windows (`.msi` / `.exe`) | 🔴 | 📋 | Sprint 8 |
| B-038 | Installateur Linux (`.AppImage` / `.deb`) | 🔴 | 📋 | Sprint 8 |
| B-039 | Notifications système (nouveau pair connecté, sync terminée) | 🟡 | 📋 | Sprint 8 |
| B-040 | Tray icon avec menu contextuel | 🟡 | 📋 | Sprint 8 |
| B-041 | Tests end-to-end (Tauri + 2 pairs P2P) | 🟠 | 📋 | Sprint 8 |
| B-042 | README final + screenshots + documentation utilisateur | 🟠 | 📋 | Sprint 8 |

---

## Backlog non planifié (post-v1.0.0)

> Idées et fonctionnalités à planifier dans de futures versions.

| # | Tâche | Priorité | Statut |
|---|---|---|---|
| B-100 | Vue Calendrier (basée sur `echeance:` et `sprint:`) | 🟡 | 💡 |
| B-101 | Historique / Time Travel (exploiter l'OpLog Yjs) | 🟡 | 💡 |
| B-102 | Système de permissions par fichier/dossier | 🟡 | 💡 |
| B-103 | Journal d'activité (activity feed) | 🟢 | 💡 |
| B-104 | Templates de tâches et pages wiki (`.knit/templates/`) | 🟢 | 💡 |
| B-105 | CLI `knit daemon` (mode headless) | 🟡 | 💡 |
| B-106 | CLI `knit new tache "Nom"` (création rapide) | 🟢 | 💡 |
| B-107 | Export/Import Git (commit & push intégré) | 🟡 | 💡 |
| B-108 | Système de plugins pour vues custom | 🟢 | 💡 |
| B-109 | Mode Présentation (Markdown → slides) | 🟢 | 💡 |
| B-110 | Diagrammes Mermaid : `gantt`, `classDiagram` | 🟡 | 💡 |
| B-111 | Diagrammes Mermaid : `pie`, `mindmap`, `timeline`, `gitGraph` | 🟢 | 💡 |
| B-112 | Support macOS | 🟡 | 💡 |
| B-113 | Application mobile (Tauri mobile) | 🟢 | 💡 |
