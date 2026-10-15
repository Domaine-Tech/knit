# Sprint 2 — CRDT & File Watcher

> Objectif : Relier CodeMirror à Yjs et connecter le File Watcher Rust avec le système de triple garde pour garantir une coexistence sans boucle avec les agents IA externes.

| Info | Détail |
|---|---|
| **Version** | v0.1.0 |
| **Durée** | 2026-11-03 → 2026-11-17 (2 semaines) |
| **Statut** | 📋 Planifié |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-007 | Intégrer Yjs avec `y-codemirror.next` pour la structure de document | 🔴 | 📋 | — |
| B-008 | Implémenter le File Watcher Rust (crate `notify` avec filtre d'extensions) | 🔴 | 📋 | — |
| B-009 | Implémenter le `WriteGuard` (flag `is_writing` + hash XXH3 + debounce 100ms) | 🔴 | 📋 | — |
| B-010 | Boucle bidirectionnelle CRDT ↔ FS (CRDT écrit sur FS, FS injecte dans Yjs) | 🔴 | 📋 | — |
| B-011 | Parseur YAML frontmatter (lecture/écriture propre sans casser le Markdown) | 🟠 | 📋 | — |
| B-011a | Gestion du presse-papier & paste d'images (`Ctrl+V`, Drag&Drop vers `assets/`) | 🟠 | 📋 | — |
| B-012 | Test d'intégration : modifier un `.md` dans Cursor/IDE externe → synchro Knit | 🟠 | 📋 | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [ ] Toute modification saisie dans Knit met à jour le fichier `.md` sur le disque en < 150ms.
- [ ] L'écriture sur disque ne déclenche pas de rebond ou de boucle infinie dans le File Watcher.
- [ ] Une modification externe (via Cursor, VS Code, script shell ou Claude Code) met à jour l'éditeur Knit en temps réel sans perte de curseur.
- [ ] Les frontmatters YAML sont préservés à l'identique (clés, indentations, sauts de ligne).
- [ ] Coller une image (`Ctrl+V`) ou la glisser-déposer enregistre le binaire dans `assets/` et insère le lien Markdown instantanément.
- [ ] Test automatisé de concurrence : écriture simultanée interne et externe sans corruption.

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
