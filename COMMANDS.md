# 🛠️ Guide des Commandes Développeur — Knit

> Ce mémo regroupe toutes les commandes utiles pour développer, tester, linter et builder Knit en local avec rechargement automatique.

---

## 🚀 1. Lancement de l'Application (Watch Mode)

Le projet intègre un rechargement automatique à chaque modification de code :
- **Frontend** : HMR Vite instantané (< 50ms) pour les fichiers `.tsx`, `.ts`, `.css`.
- **Backend Rust** : Recompilation et redémarrage automatique via Tauri CLI dès qu'un fichier `.rs` est modifié.

### Depuis la racine du projet

| Commande | Environnement | Description |
|---|---|---|
| `.\dev.ps1` | Windows PowerShell | **(Recommandé)** Lance l'application Tauri de bureau en mode watch complet. |
| `.\dev.ps1 -Mode web` | Windows PowerShell | Lance l'application dans le navigateur (`http://localhost:5173`) avec HMR ultra-rapide. |
| `./dev.sh` | Linux / macOS / Git Bash | Lance l'application Tauri de bureau en mode watch complet. |
| `./dev.sh web` | Linux / macOS / Git Bash | Lance la version Web dans le navigateur. |
| `npm run dev` | Tout OS | Alias vers `npm --prefix knit-app run tauri dev`. |
| `npm run dev:web` | Tout OS | Alias vers `npm --prefix knit-app run dev` (Vite Web pur). |

---

## 🧪 2. Tests & Qualité de Code

À exécuter avant chaque commit pour s'assurer de l'absence de régression ou de dette technique :

```bash
# Lancer tous les tests unitaires et d'intégration (knit-core + knit-app)
npm run test
# ou directement avec Cargo :
cargo test --workspace

# Vérifier le typage, oxlint et clippy (0 warning exigé)
npm run lint
# ou manuellement :
cargo clippy --workspace && npm --prefix knit-app run lint

# Compiler l'ensemble du projet en production
npm run build
```

---

## 🦀 3. Commandes Rust & Workspace Cargo

Le workspace Rust racine supervise les crates `knit-core` et `knit-app/src-tauri` :

```bash
# Vérification rapide de la syntaxe de tous les crates
cargo check --workspace

# Lancer les tests uniquement sur le moteur de base
cargo test -p knit-core

# Lancer les tests avec affichage des logs console
cargo test --workspace -- --nocapture

# Formattage automatique du code Rust
cargo fmt --all
```

---

## 🌐 4. Commandes Frontend (`knit-app`)

Pour intervenir directement dans le sous-dossier `knit-app` :

```bash
cd knit-app

# Démarrer le serveur de développement Vite seul
npm run dev

# Compiler et vérifier les types TypeScript
npm run build

# Analyser le code avec oxlint
npm run lint

# Exécuter les commandes Tauri CLI
npm run tauri -- dev
npm run tauri -- build
npm run tauri -- icon ./app-icon.svg
```

---

## ⌨️ 5. Raccourcis Clavier & Conventions Souris (Studio Knit)

Testez l'application en respectant les standards universels intégrés au Sprint 1 :

### 🖱️ Souris & Molette
- **Clic gauche simple sur un fichier** : Ouvre le fichier en mode **Aperçu** (*titre en italique*).
- **Double-clic sur un fichier** : Fige l'onglet en mode **Permanent** (*titre droit*).
- **Clic Molette sur un fichier (sidebar)** : Ouvre immédiatement le fichier dans un **nouvel onglet permanent** en arrière-plan.
- **Clic Molette sur un onglet** : **Ferme immédiatement l'onglet** (convention Chrome / VS Code).
- **Double-clic sur la barre d'onglets** : Crée une nouvelle note vierge (`Ctrl+N`).
- **Glisser-Déposer d'onglet** : Réorganise les onglets horizontalement.

### ⌨️ Clavier
| Raccourci | Action |
|---|---|
| `Ctrl + S` | Sauvegarder la note active sur le disque. |
| `Ctrl + O` | **Quick Switcher** : Sauter instantanément à n'importe quelle note (< 10ms). |
| `Ctrl + P` | **Palette de commandes** : Exécuter toutes les actions sans la souris. |
| `Ctrl + Shift + F` | **Recherche globale** : Recherche plein-texte dans tout le coffre avec snippets. |
| `Ctrl + Shift + K` | **Bascule Kanban** : Ouvrir la vue Kanban du projet. |
| `Ctrl + F` | Ouvrir la barre de recherche locale dans l'éditeur CodeMirror 6. |
| `Ctrl + H` | Ouvrir la boîte de remplacement dans l'éditeur. |
| `Ctrl + W` | Fermer l'onglet actif. |
| `Ctrl + Shift + T` | Rouvrir le dernier onglet fermé (historique). |
| `Ctrl + Tab` | Passer à l'onglet suivant. |
| `Ctrl + Shift + Tab` | Revenir à l'onglet précédent. |
| `Ctrl + 1` à `Ctrl + 8` | Sauter directement à l'onglet 1 à 8. |
| `Ctrl + 9` | Sauter au dernier onglet de la barre. |
| `Ctrl + N` | Créer une nouvelle note Markdown. |
| `Ctrl + Z` | Annuler la dernière action (suppression de note, déplacement, édition). |
| `[[` | Autocomplétion intelligente des **WikiLinks**. |
| `#` | Autocomplétion intelligente des **Tags** du coffre. |

---

## 📁 6. Rappel des Emplacements Clés

- **`.knit/`** : Dossier technique strictement **local** (clés privées, caches, snapshots CRDT). Ne JAMAIS le versionner ni le propager en P2P.
- **`.knitshare`** : Fichier YAML partagé du coffre (nom du coffre, statuts autorisés). Doit être synchronisé.
- **`assets/`** : Répertoire dédié aux images et pièces jointes (transférées par Iroh Blobs).
- **`versions/BACKLOG.md`** : Source de vérité vivante pour les tâches et sprints du projet.
