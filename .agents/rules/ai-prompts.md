# Règle de Déclenchement Rapide des Prompts IA Standardisés

> Règle universelle pour tout agent IA (Antigravity, Cursor, Claude Code, Copilot, Windsurf).

Lorsqu'un utilisateur tape dans le chat une commande courte du type :
- `fait prompt 1` / `exécute prompt 1` / `prompt 1` : Nettoyage et Refactorisation
- `fait prompt 2` / `exécute prompt 2` / `prompt 2` : Optimisation & Performance (Goulets d'étranglement)
- `fait prompt 3` / `exécute prompt 3` / `prompt 3` : Détection des Textes & Internationalisation (i18n Front/Back)
- `fait prompt 4` / `exécute prompt 4` / `prompt 4` : Audit de Sécurité & Renforcement Sans Perte d'UX
- `fait prompt 5` / `exécute prompt 5` / `prompt 5` : Solutions UX & Fonctionnalités « Killer App »
- `fait prompt 6` / `exécute prompt 6` / `prompt 6` : Analyse d'Alignement Global (Code, Doc, Versions & Directives IA)
- `fait prompt 7` / `exécute prompt 7` / `prompt 7` : Collaboration P2P, Présence & Expérience Multi-Utilisateurs
- `fait prompt 8` / `exécute prompt 8` / `prompt 8` : Stratégie de Tests, Couverture & Assurance Qualité
- `fait prompt 9` / `exécute prompt 9` / `prompt 9` : Audit & Centralisation : Types, Utilitaires & Moteur CRDT
- `fait prompt 10` / `exécute prompt 10` / `prompt 10` / `réalise sprint X` / `clôture sprint X` : Réalisation, Audit d'Avancement & Clôture de Sprint
- `fait prompt 11` / `exécute prompt 11` / `prompt 11` / `commit et push` / `smart commit` / `push` : Commit & Push Intelligent (évaluer version vs docs ; **bump PATCH** si push `main` → Release CI)
- `fait prompt 12` / `exécute prompt 12` / `prompt 12` / `audit typage` : Audit Typage Strict (TS/Rust — zéro any, null-safety, IPC)
- `fait prompt bonus` / `meta prompt` : Méta-Prompt d'Orchestration sur Mesure

L'agent DOIT :
1. Charger le prompt correspondant depuis `docs/PROMPTS_IA.md`.
2. Adopter le rôle expert, le contexte et les contraintes associées.
3. **Opérer en STRICT MODE PLAN** :
   - Analyser le codebase en lecture seule.
   - Ne modifier aucun code lors de la première réponse.
   - Produire un plan d'action structuré par phases avec cases à cocher `[ ]`.
   - Attendre la validation explicite de l'utilisateur avant d'implémenter.
4. **Interdiction Formelle des Tests Navigateur pour les Flux Natifs** :
   - Consulter la règle `.agents/rules/tauri-testing.md`.
   - Ne jamais utiliser de sous-agent navigateur pour tester des fonctionnalités dépendantes de Rust/Tauri (Drag & Drop OLE, I/O fichiers, watchers, IPC) car `isTauriEnvironment() === false` en dev web et les gestes OLE ne sont pas simulables. Toujours résoudre à la source et faire tester l'utilisateur dans l'application native `knit-app.exe`.
