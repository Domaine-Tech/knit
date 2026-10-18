# Directives de Test : Desktop Tauri vs Navigateur Web

> **Règle Universelle pour tout Agent IA** travaillant sur le projet Knit.

## ⛔ INTERDICTION DES TESTS VIA NAVIGATEUR POUR LES COMPORTEMENTS NATIFS DESKTOP

Ne **JAMAIS** utiliser de sous-agent navigateur (headless browser, Puppeteer, CDP, `browser_subagent`) pour tenter de tester ou valider des comportements dépendant du runtime natif desktop :
- **Glisser-Déposer (Drag & Drop) OLE / WebView2** (ex: cartes Kanban, réordonnancement de colonnes ou d'onglets).
- **Écritures réelles sur le système de fichiers (`write_vault_file`) et File Watcher Rust (`notify`)**.
- **Commandes IPC Tauri (`invoke`) et permissions IPC**.
- **Gestion des fenêtres, décorations natives, raccourcis clavier globaux et menus contextuels natifs**.

### Pourquoi ces tests en navigateur sont impossibles et contre-productifs :
1. **Absence du Backend Rust (`isTauriEnvironment() === false`)** :
   Dans un navigateur web standard (`localhost:5173`), `window.__TAURI_INTERNALS__` est absent. L'application bascule automatiquement en mode démonstration mémoire pure (`localContents`). Aucune commande Rust n'est invoquée, aucun fichier Markdown n'est écrit sur le disque réel, et aucun événement du file watcher n'est généré.
2. **Incompatibilité des Gestes OLE / Drag-and-Drop dans WebView2** :
   Sous Windows, WebView2 exploite les API OLE natives (`DoDragDrop`, `IDropTarget`). Les événements synthétiques de souris dispatchés par Puppeteer/CDP ne reproduisent pas les flux de capture de pointeur, les états de verrouillage de session de drag, ni les contraintes de temporisation `dragend` spécifiques à WebView2.
3. **Perte de temps et faux négatifs/positifs** :
   Simuler ces flux dans un navigateur produit des erreurs trompeuses ou des échecs de simulation qui n'ont aucun rapport avec le comportement réel dans l'exécutable natif `knit-app.exe`.

## ✅ MÉTHODE DE DIAGNOSTIC ET VALIDATION OBLIGATOIRE

1. **Résolution rigoureuse À LA SOURCE** :
   - Analyser le cycle de vie des composants React (clés React stables, états optimistes, suppression des fuites de clés).
   - Analyser le cycle des événements HTML5 & OLE (défération des mutations après `dragend`, `userSelect: none`, styles de curseurs).
   - Analyser le code Rust et la configuration Tauri (`tauri.conf.json`, `dragDropEnabled`, guards anti-boucles XXH3).
2. **Validation par Compilateurs & Linters** :
   - `npm run build` (validation TypeScript et bundle Vite).
   - `npm run lint` (validation oxlint sans erreurs ni avertissements).
   - `cargo check` / `cargo test` (validation du moteur système Rust).
3. **Validation Réelle par l'Utilisateur** :
   - Inviter l'utilisateur à vérifier directement dans la fenêtre native de l'application Knit lancée via Tauri (`dev.ps1` ou `cargo tauri dev`).
