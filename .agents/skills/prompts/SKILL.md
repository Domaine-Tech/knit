---
name: prompts-ia
description: Déclencheur et exécuteur automatique des 12 prompts IA standardisés et catégorisés en Mode Plan (Refactoring, Performance, Traduction/i18n, Sécurité, UX/Killer App, Alignement Code/Doc/Versions, Collaboration P2P, Tests & QA, Centralisation Types/Utils/CRDT, Réalisation & Clôture de Sprint, Commit & Push Intelligent avec bump PATCH sur main, Audit Typage Strict) définis dans docs/PROMPTS_IA.md. S'active lorsque l'utilisateur demande "fait prompt X", "exécute le prompt X", "réalise sprint X", "commit et push", "push", "audit typage" ou mentionne un prompt du référentiel.
---

# Skill : Prompts IA Standardisés & Mode Plan (Knit)

Ce skill permet d'exécuter instantanément l'un des 12 prompts spécialisés de [docs/PROMPTS_IA.md](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md) lorsqu'un utilisateur tape une commande de type :
- `fait prompt 1` / `exécute le prompt 1` / `prompt 1`
- `fait prompt 2` / `prompt 2`
- `fait prompt 3` / `prompt 3`
- `fait prompt 4` / `prompt 4`
- `fait prompt 5` / `prompt 5`
- `fait prompt 6` / `prompt 6`
- `fait prompt 7` / `prompt 7`
- `fait prompt 8` / `prompt 8`
- `fait prompt 9` / `prompt 9` (Centralisation Types, Utils, Hooks React & Moteur CRDT)
- `fait prompt 10` / `prompt 10` / `réalise sprint X` / `exécute sprint X` / `clôture sprint X` (Audit & Clôture de Sprint)
- `fait prompt 11` / `prompt 11` / `commit et push` / `smart commit` / `push` (Commit & Push Intelligent — bump PATCH si main)
- `fait prompt 12` / `prompt 12` / `audit typage` (Audit Typage Strict TS/Rust)
- `fait prompt bonus` / `meta prompt`

---

## 🎯 Correspondance des 12 Prompts par Catégorie

### 🏗️ Architecture, Typage & Refactorisation
- **Prompt 1** : **Nettoyage & Refactorisation** (`fait prompt 1`)
  - *Rôle* : Principal Software Architect & Refactoring Specialist
  - *Réf* : [docs/PROMPTS_IA.md#prompt-1](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-1--nettoyage--refactorisation-architecturale)
- **Prompt 9** : **Centralisation Types, Utils, Hooks React & CRDT** (`fait prompt 9`)
  - *Rôle* : Principal Systems Integrity & Software Architect
  - *Réf* : [docs/PROMPTS_IA.md#prompt-9](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-9--audit--centralisation--types-utilitaires-hooks-react--moteur-crdt)
- **Prompt 12** : **Audit Typage Strict (TS/Rust)** (`fait prompt 12` / `audit typage`)
  - *Rôle* : Principal TypeScript & Rust Type-Safety Engineer
  - *Réf* : [docs/PROMPTS_IA.md#prompt-12](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-12--audit-typage-strict-tsrust--z%C3%A9ro-any-null-safety--contrats-ipc)

### ⚡ Performance & Sécurité
- **Prompt 2** : **Optimisation & Performance** (`fait prompt 2`)
  - *Rôle* : Staff Systems & Performance Engineer
  - *Réf* : [docs/PROMPTS_IA.md#prompt-2](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-2--diagnostic-de-performance-goulets-d%C3%A9tranglement--solutions-modernes)
- **Prompt 4** : **Sécurité & Durcissement (Zero-UX-Loss)** (`fait prompt 4`)
  - *Rôle* : Senior Application Security Engineer
  - *Réf* : [docs/PROMPTS_IA.md#prompt-4](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-4--audit-de-failles-de-s%C3%A9curit%C3%A9--renforcement-sans-perte-dux)

### 🎨 Produit & Expérience
- **Prompt 3** : **Détection Textes & Traduction (i18n)** (`fait prompt 3`)
  - *Rôle* : Lead i18n & l10n Architect
  - *Réf* : [docs/PROMPTS_IA.md#prompt-3](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-3--d%C3%A9tection-exhaustive-des-textes--architecture-dinternationalisation-i18n-frontback)
- **Prompt 5** : **UX Excellence & Killer App** (`fait prompt 5`)
  - *Rôle* : VP of Product & Principal UX/UI Designer
  - *Réf* : [docs/PROMPTS_IA.md#prompt-5](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-5--strat%C3%A9gie-ux--ui--fonctionnalit%C3%A9s-diff%C3%A9renciantes--killer-app-)

### 👥 Collaboration & Tests
- **Prompt 7** : **Collaboration P2P & Présence** (`fait prompt 7`)
  - *Rôle* : Principal Distributed Systems & Collaboration Designer
  - *Réf* : [docs/PROMPTS_IA.md#prompt-7](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-7--collaboration-temps-r%C3%A9el-p2p-pr%C3%A9sence--exp%C3%A9rience-multi-utilisateurs)
- **Prompt 8** : **Tests, Couverture & Assurance Qualité** (`fait prompt 8`)
  - *Rôle* : Lead QA Automation Engineer & Test Architect
  - *Réf* : [docs/PROMPTS_IA.md#prompt-8](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-8--strat%C3%A9gie-de-tests-couverture--assurance-qualit%C3%A9-rust-react-tauri--p2pcrdt)

### 🚀 Sprints, Git & Gouvernance
- **Prompt 6** : **Alignement Code, Doc & Versions** (`fait prompt 6`)
  - *Rôle* : QA Lead & Release Coordinator
  - *Réf* : [docs/PROMPTS_IA.md#prompt-6](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-6--analyse-dalignement-global-code-documentation-versions--directives-ia)
- **Prompt 10** : **Réalisation & Clôture de Sprint (X)** (`fait prompt 10` / `réalise sprint X`)
  - *Rôle* : Lead Agile Delivery Manager & Principal Full-Stack Engineer
  - *Réf* : [docs/PROMPTS_IA.md#prompt-10](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-10--r%C3%A9alisation-audit-davancement--cl%C3%B4ture-de-sprint-sprint-x)
- **Prompt 11** : **Commit & Push Intelligent** (`fait prompt 11` / `commit et push` / `push`)
  - *Rôle* : Lead DevOps, Release Engineer & Git Master
  - *Action clé* : évaluer version vs docs/tags ; **bump PATCH** sur push `main` pour relancer Release
  - *Réf* : [docs/PROMPTS_IA.md#prompt-11](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-11--commit--push-intelligent-qualit%C3%A9-alignement-versions--commits-atomiques)

### 🧩 Méta-Outils
- **Prompt Bonus** : **Méta-Prompt sur Mesure** (`fait prompt bonus`)
  - *Rôle* : Meta-Prompt Engineer & Agent Orchestrator
  - *Réf* : [docs/PROMPTS_IA.md#prompt-bonus](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md#-prompt-bonus--m%C3%A9ta-prompt-dorchestration-et-dadaptation-sur-mesure)

---

## 📋 Procédure d'Exécution Obligatoire

Dès détection d'une commande `fait prompt X` ou `réalise sprint X` :

1. **Lire le prompt source** : Ouvrir et lire le bloc exact correspondant dans [docs/PROMPTS_IA.md](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md).
2. **Adopter la posture & les règles** :
   - Endosser le `<role>` défini.
   - Intégrer le contexte du projet Knit (Local-First, Markdown pur, Zéro émoji UI, Rust/TS strict).
   - Déterminer le périmètre : si l'utilisateur a précisé des fichiers, un module, ou un identifiant de sprint (`sprint-X`), cibler ce périmètre ; sinon, analyser l'ensemble du projet ou le sprint actif.
3. **STRICT MODE PLAN (Règle Absolue)** :
   - **INTERDICTION STRICTE de modifier ou créer des fichiers de code dans la première réponse**.
   - Analyser en lecture seule.
   - Formuler un diagnostic structuré (tableaux, métriques, constats, preuves dans le code).
   - Rédiger un **Plan d'Action détaillé par phases avec cases à cocher `[ ]`**.
   - Conclure en demandant explicitement la validation de l'utilisateur pour lancer les modifications.
