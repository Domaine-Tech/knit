# Sprint 2 — CRDT & File Watcher

> Objectif : Relier CodeMirror à Yjs et connecter le File Watcher Rust avec le système de triple garde pour garantir une coexistence sans boucle avec les agents IA externes.

| Info | Détail |
|---|---|
| **Version** | v0.1.0 |
| **Durée** | 2026-11-03 → 2026-11-17 (2 semaines) |
| **Statut** | ✅ Terminé |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-007 | Intégrer Yjs avec `y-codemirror.next` pour la structure de document | 🔴 | ✅ | Antigravity |
| B-008 | Implémenter le File Watcher Rust (crate `notify` avec filtre d'extensions) | 🔴 | ✅ | Antigravity |
| B-009 | Implémenter le `WriteGuard` (flag `is_writing` + hash XXH3 + debounce 100ms) | 🔴 | ✅ | Antigravity |
| B-010 | Boucle bidirectionnelle CRDT ↔ FS (CRDT écrit sur FS, FS injecte dans Yjs) | 🔴 | ✅ | Antigravity |
| B-011 | Parseur YAML frontmatter (lecture/écriture propre sans casser le Markdown) | 🟠 | ✅ | Antigravity |
| B-011a | Gestion du presse-papier & paste d'images (`Ctrl+V`, Drag&Drop vers `assets/`) | 🟠 | ✅ | Antigravity |
| B-011b | Refactoring automatique des liens (mise à jour auto lors du déplacement/renommage) | 🔴 | ✅ | Antigravity |
| B-012 | Test d'intégration : modifier un `.md` dans Cursor/IDE externe → synchro Knit | 🟠 | ✅ | Antigravity |
| B-012a | Suppression réversible dans la Corbeille de l'OS (Win/Mac/Linux) & Undo | 🟠 | ✅ | Antigravity |

---

## Critères d'acceptation (DoD - Definition of Done)

- [x] Toute modification saisie dans Knit met à jour le fichier `.md` sur le disque en < 150ms.
- [x] L'écriture sur disque ne déclenche pas de rebond ou de boucle infinie dans le File Watcher (Triple Garde : flag `is_writing` + hash `XXH3` + debounce 100ms).
- [x] Une modification externe (via Cursor, VS Code, script shell ou Claude Code) met à jour l'éditeur Knit en temps réel sans perte de curseur grâce aux transactions granulaires `fast-diff` dans Yjs.
- [x] Les frontmatters YAML sont préservés à l'identique (clés, indentations, sauts de ligne) avec barre d'en-tête interactive et bascule d'état de tâche en un clic.
- [x] Coller une image (`Ctrl+V`) ou la glisser-déposer enregistre le binaire dans `assets/` et insère le lien Markdown instantanément.
- [x] Déplacer ou renommer un fichier met à jour automatiquement tous les liens relatifs et WikiLinks qui pointaient vers lui dans l'ensemble du coffre via `refactor_links_in_vault`.
- [x] Suppression réversible & sécurisée : envoi vers la Corbeille native de l'OS (Windows, macOS, Linux FreeDesktop) via `trash`, suppression fluide sans modale bloquante, toast avec bouton « Annuler » (8s) et annulation globale via `Ctrl+Z` (`historyStore`).
- [x] Test automatisé de concurrence : écriture simultanée interne et externe sans corruption (`test_concurrent_writes_and_watcher_anti_loop`).

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| 2026-10-16 | Modal de renommage & refactoring dans la Sidebar | Permettre le renommage/déplacement avec refactoring atomique depuis l'UI | Oui |
| 2026-10-16 | Suppression réversible dans la Corbeille de l'OS (Windows, macOS, Linux) | Envoi vers la Corbeille native du système d'exploitation via la crate Rust `trash`, suppression fluide sans modale bloquante, bouton « Annuler » dans le toast (8s) et support centralisé du raccourci `Ctrl+Z` (`historyStore`) | Oui |

---

## Rétrospective

### Ce qui a bien marché
- Intégration de CodeMirror 6 avec `yCollab` et `crdtManager` : synchronisation instantanée bidirectionnelle sans régression sur les fonctionnalités du Sprint 1.
- Moteur de Triple Garde `WriteGuard` (hash XXH3 + debounce + flag atomique) validé par les tests de concurrence : zéro consommation CPU en boucle fermée.
- Refactoring automatique des liens Markdown et WikiLinks opérationnel sur l'ensemble de l'arborescence lors des déplacements/renommages.
- Respect strict des critères de typage et de propreté du code : `oxlint` et `cargo clippy --workspace` avec 0 warning, 14 tests unitaires/intégration au vert.

### Ce qu'on peut améliorer
- **Système de corbeille / Ctrl+Z du tree (À revoir)** :
  - *Comportement actuel* : Le mécanisme en deux temps (mise en staging immédiate dans `.knit/trash/<trash_id>/` pour permettre l'annulation réactive via toast et `Ctrl+Z` / `historyStore`, puis commit différé vers la corbeille native de l'OS avec `trash::delete`) est ergonomique dans l'application.
  - *Problème de restauration native OS* : L'OS mémorise l'emplacement du fichier au moment de la suppression. Comme il est supprimé depuis `.knit/trash/<trash_id>/`, une restauration manuelle depuis la Corbeille de l'OS (Recycle Bin Windows / Corbeille Mac / Linux) restaure le fichier dans `.knit/trash/...` au lieu de son chemin d'origine dans le coffre.
  - *Pistes d'évolution* : Revoir le cycle de vie staging vs suppression directe dans la corbeille OS, ou implémenter un watcher/restaurateur automatique des éléments replacés dans `.knit/trash`, ou une vue Corbeille dédiée dans Knit exploitant `meta.json`.
- Préparer la sérialisation des états CRDT vers les streams QUIC Iroh pour le Sprint 3 (Réseau P2P & Transport).
