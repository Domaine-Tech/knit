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
- **Frontmatter YAML** : Détection, parsing et préservation transparente des métadonnées.
- **Refactoring Automatique des Liens (Auto-Link Update)** : Déplacer ou renommer une note ou une image met à jour instantanément tous les liens relatifs et WikiLinks du coffre pour bannir les liens brisés.
- **Suppression Réversible & Sécurisée (Corbeille OS & Undo)** : Suppression directe et fluide depuis le menu contextuel de la sidebar, envoi dans la Corbeille native de l'OS (Windows, macOS, Linux via crate `trash`), toast avec bouton « Annuler » (8s) et annulation globale instantanée avec `Ctrl+Z` (`historyStore`).

---

## 🐛 Corrections

- *(Prévues au fil des tests d'intégration du Sprint 2)*

---

## ⚠️ Points d'attention / Limitations connues

- **Restauration Corbeille OS** : La mise en staging dans `.knit/trash/` permet une annulation réactive fluide (`Ctrl+Z`, toast Undo), mais une restauration déclenchée directement depuis la corbeille native de l'OS (Recycle Bin) replace l'élément dans `.knit/trash/...` au lieu de son chemin d'origine. Système de staging et restauration à revoir/affiner.

---

## 🔧 Technique

- Architecture IPC Tauri asynchrone pour les I/O disque sans bloquer le thread de rendu.
- Mécanisme de hachage XXH3 en mémoire pour éliminer les échos du file watcher.

---

## 💥 Breaking Changes

- Initial release de la spécification de coffre-fort local.
