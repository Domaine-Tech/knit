# Sprint 1 — Fondations de l'Éditeur

> Objectif : Mettre en place le squelette Tauri v2 + React, l'éditeur CodeMirror 6, l'arborescence de fichiers et le système de design avec sélecteur de teinte.

| Info | Détail |
|---|---|
| **Version** | v0.1.0 |
| **Durée** | 2026-10-20 → 2026-11-03 (2 semaines) |
| **Statut** | ✅ Terminé |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-001 | Scaffolder le projet Tauri v2 + React + TypeScript | 🔴 | ✅ | Antigravity |
| B-002 | Intégrer CodeMirror 6 avec `@codemirror/lang-markdown` | 🔴 | ✅ | Antigravity |
| B-002a | Recherche locale & remplacement (`Ctrl+F`, `Ctrl+H` via `@codemirror/search`) | 🔴 | ✅ | Antigravity |
| B-003 | Créer le composant Sidebar (arbre récursif de fichiers `.md`) | 🟠 | ✅ | Antigravity |
| B-003b | Système d'onglets (Multi-tabs, clic molette open/close, drag & drop, Ctrl+W/Tab) | 🔴 | ✅ | Antigravity |
| B-004 | Implémenter la lecture/écriture de fichiers via commandes Tauri IPC | 🔴 | ✅ | Antigravity |
| B-005 | Créer le Design Token System (variables CSS HSL, rayons arrondis) | 🟠 | ✅ | Antigravity |
| B-006 | Implémenter le thème clair/sombre + slider interactif `--knit-hue` | 🟡 | ✅ | Antigravity |
| B-006a | Intégrer les icônes Reicon (style Duotone) adaptées à `--knit-hue` | 🟠 | ✅ | Antigravity |
| B-006b | Système de Toast centralisé (bottom-right, animations, store optimisé) | 🟠 | ✅ | Antigravity |
| B-006c | Système de Menu Contextuel centralisé (clic droit personnalisé, désactivation natif) | 🟠 | ✅ | Antigravity |

---

## Critères d'acceptation (DoD - Definition of Done)

- [x] L'application démarre rapidement (< 1s) sous Windows et Linux.
- [x] On peut sélectionner un dossier local via une boîte de dialogue native.
- [x] L'arbre affiche l'ensemble des fichiers `.md` du dossier sélectionné.
- [x] Cliquer sur un fichier l'ouvre dans un onglet (mode aperçu ou permanent).
- [x] `Ctrl+F` ouvre la recherche dans le fichier avec compteur et surlignage instantané.
- [x] Le clic molette sur un fichier de la sidebar l'ouvre dans un nouvel onglet permanent.
- [x] Le clic molette sur un onglet ferme immédiatement l'onglet (`Ctrl+W`).
- [x] Sauvegarder (`Ctrl+S` ou auto-save) écrit le contenu exact sur le disque.
- [x] Le slider de couleur ajuste instantanément l'accent de l'application sans rechargement.
- [x] Les icônes Reicon en mode Duotone intègrent la couleur primaire dynamiquement.
- [x] Le système de Toast affiche des messages en bas à droite avec auto-dismiss et animation de stack.
- [x] Le clic droit navigateur natif est désactivé et remplacé par un menu contextuel applicatif sur-mesure (Sidebar, Onglets, Éditeur).

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| 2026-10-15 | B-006c : Menu Contextuel centralisé | Remplacer le clic droit webview natif par un menu applicatif sur-mesure (Sidebar, Onglets, Éditeur) | Oui |

---

## Rétrospective

### Ce qui a bien marché
- Architecture modulaire Cargo (`knit-core` + `knit-app`) propre et découplée garantissant zéro dette technique pour le Sprint 2.
- Intégration de CodeMirror 6 avec `@codemirror/lang-markdown` et `@codemirror/search`.
- Respect total du Design System sans dégradés néon IA (`tokens.css` fidèle à `docs/UI_UX.md`).
- Multi-onglets universel respectant le clic molette et l'ensemble des raccourcis clavier.

### Ce qu'on peut améliorer
- Préparer l'infrastructure du Sprint 2 (CRDT Yjs, File Watcher `notify` et WriteGuard).
