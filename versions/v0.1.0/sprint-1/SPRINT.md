# Sprint 1 — Fondations de l'Éditeur

> Objectif : Mettre en place le squelette Tauri v2 + React, l'éditeur CodeMirror 6, l'arborescence de fichiers et le système de design avec sélecteur de teinte.

| Info | Détail |
|---|---|
| **Version** | v0.1.0 |
| **Durée** | 2026-10-20 → 2026-11-03 (2 semaines) |
| **Statut** | 📋 Planifié |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-001 | Scaffolder le projet Tauri v2 + React + TypeScript | 🔴 | 📋 | — |
| B-002 | Intégrer CodeMirror 6 avec `@codemirror/lang-markdown` | 🔴 | 📋 | — |
| B-003 | Créer le composant Sidebar (arbre récursif de fichiers `.md`) | 🟠 | 📋 | — |
| B-004 | Implémenter la lecture/écriture de fichiers via commandes Tauri IPC | 🔴 | 📋 | — |
| B-005 | Créer le Design Token System (variables CSS HSL, rayons arrondis) | 🟠 | 📋 | — |
| B-006 | Implémenter le thème clair/sombre + slider interactif `--knit-hue` | 🟡 | 📋 | — |
| B-006a | Intégrer les icônes Reicon (style Duotone) adaptées à `--knit-hue` | 🟠 | 📋 | — |
| B-006b | Système de Toast centralisé (bottom-right, animations, store optimisé) | 🟠 | 📋 | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [ ] L'application démarre rapidement (< 1s) sous Windows et Linux.
- [ ] On peut sélectionner un dossier local via une boîte de dialogue native.
- [ ] L'arbre affiche l'ensemble des fichiers `.md` du dossier sélectionné.
- [ ] Cliquer sur un fichier l'ouvre dans CodeMirror 6 avec coloration syntaxique Markdown.
- [ ] Sauvegarder (`Ctrl+S` ou auto-save) écrit le contenu exact sur le disque.
- [ ] Le slider de couleur ajuste instantanément l'accent de l'application sans rechargement.
- [ ] Les icônes Reicon en mode Duotone intègrent la couleur primaire dynamiquement.
- [ ] Le système de Toast affiche des messages en bas à droite avec auto-dismiss et animation de stack.

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
