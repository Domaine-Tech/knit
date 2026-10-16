# Changelog — v0.1.0

> Version 0.1.0 — Éditeur Local & Boucle de Synchronisation FS (Sprint 1 & Sprint 2 achevés).
> Statut : ✅ Terminé (prêt pour v0.2.0 P2P Réseau)

---

## ✨ Nouveautés

- **Scaffolding de l'application** : Tauri v2 avec frontend React + TypeScript.
- **Éditeur Markdown brut** : Intégration de CodeMirror 6 avec `@codemirror/lang-markdown` sans perte de formattage.
- **Explorateur de coffre-fort** : Sidebar avec arborescence des fichiers et dossiers locaux.
- **Système Multi-Onglets (Tabs)** :
  - Clic molette sur un fichier de la sidebar : ouverture directe dans un nouvel onglet.
  - Clic molette sur un onglet : fermeture instantanée (`Ctrl+W`).
  - Mode aperçu (*preview*) vs permanent, réorganisation par drag-and-drop et raccourcis universels (`Ctrl+Tab`, `Ctrl+Shift+T`).
- **Design System sobre & arrondi** : Variables CSS unifiées, thème clair/sombre, personnalisation de la teinte primaire (`--knit-hue`).
- **Iconographie Reicon Duotone** : Icônes vectorielles légères avec coloration dynamique de la seconde couche selon la teinte active.
- **Système de Toast centralisé** : Notifications non intrusives en bas à droite (info, warning, error, success, sync animé) avec empilement fluide.
- **Gestion intuitive des images** : Copier-coller (`Ctrl+V`) et glisser-déposer enregistrant les visuels dans `assets/` avec lien Markdown instantané.
- **Synchronisation CRDT ↔ Système de fichiers** :
  - Intégration de Yjs (`y-codemirror.next`).
  - File watcher Rust ultra-rapide basé sur `notify`.
  - Triple garde anti-boucle infinie (flag `isWriting`, hash XXH3, debounce 100ms).
- **Frontmatter YAML** : Détection, parsing et préservation transparente des métadonnées (LF et CRLF préservés).
- **Refactoring Automatique des Liens (Auto-Link Update)** : Déplacer ou renommer une note, un dossier ou une image met à jour instantanément tous les liens relatifs et WikiLinks du coffre pour bannir les liens brisés, tout en conservant les titres de liens (`"titre"`).
- **Suppression Réversible & Sécurisée (Corbeille OS & Undo)** : Suppression directe et fluide depuis le menu contextuel de la sidebar, envoi vers la Corbeille native de l'OS (Windows, macOS, Linux via crate `trash`), toast avec bouton « Annuler » (8s) et annulation globale instantanée avec `Ctrl+Z` (`historyStore`).
- **Restauration Native & Auto-Recovery (B-012b)** : Le commit différé vers la Corbeille OS s'effectue depuis l'emplacement d'origine dans le coffre, assurant qu'une restauration native depuis la Corbeille du système restitue le fichier à sa place originale. Détection et restauration automatique des éléments orphelins au chargement du coffre.
- **Détection des Backlinks** : Exploration des références entrantes dans le coffre et affichage dynamique de badges cliquables dans l'en-tête de l'éditeur.

---

## 🐛 Corrections

- Résolution de la restauration native depuis la Corbeille de l'OS vers le dossier temporaire `.knit/trash/`.
- Prise en charge du renommage récursif des sous-dossiers dans le recalcul des liens et la mise à jour des onglets ouverts.
- Élimination des réécritures disque redondantes lors de la réception des événements de synchronisation externe.
- Prise en charge des sauts de ligne Windows (`\r\n`) sans altération du formattage dans le parseur de frontmatter YAML.

---

## ⚠️ Points d'attention / Limitations connues

- Aucune limitation bloquante restante sur le périmètre de l'Éditeur Local et du File Watcher (Sprint 1 & Sprint 2 achevés à 100%).

---

## 🔧 Technique

- Architecture IPC Tauri asynchrone pour les I/O disque sans bloquer le thread de rendu.
- Mécanisme de hachage XXH3 en mémoire pour éliminer les échos du file watcher.

---

## 💥 Breaking Changes

- Initial release de la spécification de coffre-fort local.
