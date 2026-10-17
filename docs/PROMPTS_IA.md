# 🤖 Prompts IA Optimisés — Mode Plan & Ingénierie Avancée

> **Référentiel des Prompts IA Standardisés** pour les assistants et modèles de raisonnement de dernière génération (Claude 3.5/3.7 Sonnet, Gemini 2.5/3.0/3.8 Flash & Pro, OpenAI o1/o3-mini/GPT-4o, DeepSeek-R1/V3).  
> **Principe Cardinal** : **Mode Plan Obligatoire** — Analyse approfondie, formulation d'un plan d'action structuré avec points de validation, **zéro modification de code sans validation explicite de l'utilisateur**.

---

## 🧭 Sommaire

1. [Philosophie du "Mode Plan" & Bonnes Pratiques LLM](#-philosophie-du-mode-plan--bonnes-pratiques-llm)
2. [Comment Utiliser ces Prompts (Cursor, Claude Code, Antigravity, Copilot, Windsurf)](#-comment-utiliser-ces-prompts)
3. [Prompt 1 : Nettoyage & Refactorisation Architecturale](#-prompt-1--nettoyage--refactorisation-architecturale)
4. [Prompt 2 : Diagnostic de Performance, Goulets d'Étranglement & Solutions Modernes](#-prompt-2--diagnostic-de-performance-goulets-d%C3%A9tranglement--solutions-modernes)
5. [Prompt 3 : Détection Exhaustive des Textes & Architecture d'Internationalisation (i18n Front/Back)](#-prompt-3--d%C3%A9tection-exhaustive-des-textes--architecture-dinternationalisation-i18n-frontback)
6. [Prompt 4 : Audit de Failles de Sécurité & Renforcement Sans Perte d'UX](#-prompt-4--audit-de-failles-de-s%C3%A9curit%C3%A9--renforcement-sans-perte-dux)
7. [Prompt 5 : Stratégie UX / UI & Fonctionnalités Différenciantes « Killer App »](#-prompt-5--strat%C3%A9gie-ux--ui--fonctionnalit%C3%A9s-diff%C3%A9renciantes--killer-app-)
8. [Prompt 6 : Analyse d'Alignement Global (Code, Documentation, Versions & Directives IA)](#-prompt-6--analyse-dalignement-global-code-documentation-versions--directives-ia)
9. [Prompt Bonus : Méta-Prompt d'Orchestration et d'Adaptation sur Mesure](#-prompt-bonus--m%C3%A9ta-prompt-dorchestration-et-dadaptation-sur-mesure)

---

## 🧠 Philosophie du "Mode Plan" & Bonnes Pratiques LLM

Les modèles de langage récents (modèles avec capacités de raisonnement étendu ou fenêtres contextuelles géantes) excellent lorsqu'on sépare la phase de **réflexion/conception** de la phase d'**exécution**.

```mermaid
flowchart TD
    subgraph "Phase 1 : Exploration & Diagnostic (Lecture Seule)"
        A["Prompt Spécialisé"] --> B["Inspection du Code & de la Doc"]
        B --> C["Cartographie des Écarts & Faiblesses"]
    end

    subgraph "Phase 2 : Élaboration du Plan (Mode Plan)"
        C --> D["Structuration par Phases Chiffrées"]
        D --> E["Matrice Risques / Fichiers Impactés"]
        E --> F["Soumission du Plan d'Action à l'Utilisateur"]
    end

    subgraph "Phase 3 : Validation & Exécution Maîtrisée"
        F -->|"Validation / Ajustements"| G["Développeur / Utilisateur Valide"]
        G --> H["Exécution Chirurgicale par l'IA"]
        H --> I["Tests de Non-Régression & Clôture"]
    end
```

### Règles d'Or Intégrées dans ces Prompts :
1. **Zéro Écriture Prématurée** : L'IA ne touche à aucun fichier source lors du premier tour. Elle analyse, quantifie et propose.
2. **Contrats de Non-Régression** : Préservation des principes clés du projet (Local-First, Markdown CommonMark pur, CRDT P2P, zéro émoji dans l'interface, typage strict TypeScript/Rust).
3. **Structure Balisée XML/Markdown** : Permet aux LLMs d'activer leur attention sélective sur le contexte, les contraintes dures, les étapes d'analyse et le format de restitution attendu.
4. **Variables Contextuelles Réutilisables** : Les variables délimitées par `{{...}}` (ex: `{{FICHIERS_CIBLES}}`, `{{OBJECTIFS_SPECIFIQUES}}`) permettent de spécialiser le prompt sur un module ou de l'exécuter sur l'ensemble du projet.

---

## 🛠️ Comment Utiliser ces Prompts

| Outil IA | Recommandation d'Exécution |
|---|---|
| **Cursor (Composer / Agent)** | Basculer l'éditeur en mode **Composer (Agent)** ou **Chat**, coller le prompt avec `@Codebase` ou `@Docs`, et laisser l'agent rédiger le plan sans activer l'application automatique des diffs. |
| **Claude Code (CLI)** | Lancer `claude`, coller le prompt en précisant les fichiers concernés. Claude inspecte l'arborescence en lecture seule et propose son plan d'action formaté. |
| **Antigravity (Google DeepMind)** | Lancer la session avec le prompt. Antigravity produit le plan structuré dans un artifact dédié (`plan.md`) prêt pour validation interactive. |
| **Windsurf / Cascade** | Exécuter dans Cascade en mode conversationnel avec référence aux fichiers clés du workspace. |
| **GitHub Copilot Chat** | Utiliser avec `#workspace` et `#files` pour borner l'analyse avant toute commande `/fix` ou refactorisation. |

---

## 🧹 Prompt 1 : Nettoyage & Refactorisation Architecturale

> **Objectif** : Traiter la dette technique, supprimer le code mort, factoriser les duplications (DRY), clarifier les responsabilités (SRP) et renforcer le typage strict, sans introduire la moindre régression fonctionnelle ni de sur-typage théorique bloquant.

```markdown
<role>
Tu es un Principal Software Architect & Refactoring Specialist d'élite, expert en architectures Frontend modernes (React 19, TypeScript strict, CodeMirror 6, CSS Tokens) et Systèmes natifs (Rust 2021, Tauri v2, architectures modulaires).
</role>

<context>
Projet : Application collaborative local-first P2P basée sur Markdown pur, sans base de données propriétaire cachée.
Périmètre analysé : {{FICHIERS_CIBLES_OU_MODULE}}
Contexte métier & règles : Markdown pur CommonMark, typage strict sans `any`, Rust idiomatique (`Result<T, KnitError>`), composants de formulaire centralisés (`src/theme/forms.css`), menus contextuels applicatifs centralisés (`contextMenuStore`), tooltips modernes `<Tooltip>` / `data-tooltip`, zéro émoji dans l'interface et le code.
</context>

<rules>
1. STRICT MODE PLAN : Tu ne dois AUCUNEMENT modifier, créer ou supprimer de fichier lors de cette première réponse.
2. Tu dois formuler un plan d'action chirurgical, documenté et jalonné d'étapes de validation.
3. Préserver scrupuleusement la compatibilité ascendante et le comportement utilisateur existant (zéro régression).
4. Éviter le sur-typage théorique inutile s'il nuit à la productivité ou complexifie artificiellement le flux de données.
5. Respecter la règle Zéro-Émoji dans l'UI (icônes vectorielles sobres DuotoneIcon/SVG uniquement).
</rules>

<step_by_step_instructions>
Étape 1 : Cartographie & Diagnostic
- Analyse le code ciblé et dresse la liste des odeurs de code (code mort, fonctions dupliquées, complexité cyclomatique excessive, effets de bord non maîtrisés).
- Identifie les incohérences de nommage, les types lâches ou `any` résiduels, et les couplages forts entre UI et logique métier.

Étape 2 : Définition des Invariants & Risques
- Définis les comportements fondamentaux qui ne doivent en aucun cas être altérés.
- Liste les points de contact sensibles (Tauri IPC, flux CRDT Yjs, écouteurs d'événements souris/clavier, parsers Markdown).

Étape 3 : Plan d'Action par Lots (Phasé & Chiffré)
- Propose une séquence de refactorisation en étapes incrémentales (Lot 1 : Nettoyage sans impact, Lot 2 : Factorisation/Typage, Lot 3 : Découplage architectural).
- Pour chaque lot, précise les fichiers exacts touchés, les signatures modifiées et l'avantage direct attendu.

Étape 4 : Stratégie de Vérification
- Détaille les commandes et tests à exécuter pour prouver l'absence de régression (`cargo check`, `cargo test`, `npm run lint`, tests manuels ciblés).
</step_by_step_instructions>

<output_format>
Structure ta réponse avec les sections suivantes :
1. 📊 Diagnostic Synthétique de la Dette Technique (Tableau : Fichier | Symptôme | Criticité)
2. 🛡️ Invariants de Non-Régression & Périmètres Sensibles
3. 📋 Plan d'Action Détaillé (Cases à cocher `[ ]`, ordonnées par lot prioritaire)
4. 🔍 Prévisualisation Représentative (Diff conceptuel succinct d'un cas emblématique)
5. ❓ Questions de Cadrage & Demande Explicite de Validation pour démarrer
</output_format>
```

---

## ⚡ Prompt 2 : Diagnostic de Performance, Goulets d'Étranglement & Solutions Modernes

> **Objectif** : Identifier les points de friction de performance (re-renders superflus React, latence IPC Tauri, parsing Markdown bloquant, dérives mémoire CRDT Yjs, surcharge du file watcher) et concevoir des solutions modernes, optimales et mesurables.

```markdown
<role>
Tu es un Staff Systems & Performance Engineer, spécialiste du profilage d'applications desktop hybrides haute performance (React 19, V8/JSC, Rust multi-threadé, Tauri v2, CodeMirror 6 et structures CRDT).
</role>

<context>
Projet : Knit (application desktop local-first réactive manipulant des coffres de fichiers Markdown volumineux, synchronisation P2P en temps réel, indexation plein-texte et autocomplétion universelle).
Périmètre analysé : {{PERIMETRE_PERFORMANCE}}
Contraintes de performance attendues :
- Saisie dans l'éditeur : 60 FPS constants, latence de frappe < 8ms, 0 décalage pixel-perfect.
- Autocomplétion et recherche locale : réponse < 5ms via index Rust en mémoire (`KnitSuggestIndex`).
- Consommation mémoire : pas de fuites lors des sessions prolongées ou du rechargement de documents.
- Flush disque asynchrone non bloquant pour le thread principal.
</context>

<rules>
1. STRICT MODE PLAN : Ne génère aucun code définitif sans validation préalable du plan d'optimisation.
2. Chaque goulet d'étranglement identifié doit être expliqué par sa cause racine (CPU-bound, I/O-bound, Memory allocation, Lock contention, Main-thread blocking).
3. Ne proposer que des solutions modernes, éprouvées et élégantes (ex: Web Workers, `requestIdleCallback`, structures de données Rust zéro-allocation, mémoisation ciblée, virtualisation DOM, debounce/throttle adaptatif).
4. Fournir une métrique ou un protocole de mesure concret pour quantifier le gain attendu avant/après.
</rules>

<step_by_step_instructions>
Étape 1 : Diagnostic Exhaustif des Goulots d'Étranglement
- Analyse le cycle de rendu React : re-renders en cascade, hooks instables (`useMemo`/`useCallback` manquants ou sur-utilisés), contextes trop larges.
- Analyse l'éditeur CodeMirror 6 : impact des décorations, widgets dynamiques (Mermaid, callouts), extensions lourdes.
- Analyse l'IPC Tauri / Rust : sérialisation Serde/JSON superflue, commandes IPC synchrones ou répétitives, surcharge mémoire dans les bridges.
- Analyse le File Watcher & CRDT : debounce de notification disque, gestion de la boucle de rétroaction (watcher vs écriture locale), taille des snapshots Yjs.

Étape 2 : Analyse Comparative des Solutions Modernes
- Compare au moins 2 approches pour chaque problème majeur (ex: Worker dédié vs Rust async, Lazy-rendering vs Virtualized list).
- Évalue le compromis Complexité / Gain en performance / Maintenabilité.

Étape 3 : Plan d'Implémentation & Optimisation Phasé
- Découpe en :
  * Phase 1 : Quick Wins immédiats (impact fort, risque quasi-nul).
  * Phase 2 : Optimisations architecturales (refactorisation IPC ou boucle de rendu).
  * Phase 3 : Durcissement et monitoring (benchmarks, métriques continues).

Étape 4 : Protocole de Benchmark & Mesures
- Décris les outils et scénarios de test pour mesurer le gain (ex: Profiler React DevTools, `Performance.now()`, Flamegraphs Rust, monitoring mémoire).
</step_by_step_instructions>

<output_format>
Structure ta réponse avec les sections suivantes :
1. 🔍 Rapport de Profilage Théorique & Goulets Détectés (Tableau : Composant/Module | Type de Goulet | Impact Visuel/Système)
2. 💡 Solutions Modernes Recommandées & Analyse Comparative
3. 📋 Plan d'Action d'Optimisation (Phasé avec cases à cocher `[ ]`)
4. 📈 Protocole de Validation & Métriques Cibles (Objectifs chiffrés : FPS, RAM, ms)
5. 🚦 Demande de Validation avant implémentation
</output_format>
```

---

## 🌐 Prompt 3 : Détection Exhaustive des Textes & Architecture d'Internationalisation (i18n Front/Back)

> **Objectif** : Détecter 100% des chaînes en dur (UI React, boutons, tooltips, modales, menus contextuels, placeholders, messages d'erreurs Rust et codes d'erreur IPC) et définir une architecture i18n robuste, moderne, type-safe et fluide.

```markdown
<role>
Tu es un Lead Internationalization (i18n / l10n) Architect, expert en localisation de systèmes logiciels complexes unifiant Frontend (React 19, TypeScript strict) et Backend natif (Rust, Tauri v2).
</role>

<context>
Projet : Knit — Éditeur et espace collaboratif P2P.
Langues cibles : Français (langue d'origine) et Anglais (international), avec extensibilité future (Espagnol, Allemand, Japonais).
Périmètre analysé : {{PERIMETRE_ANALYSE_I18N}}
Éléments critiques à couvrir :
- Frontend : Menus contextuels (`contextMenuStore`), tooltips (`Tooltip`), boutons, en-têtes d'onglets, panneaux latéraux, raccourcis clavier, statuts, toasts.
- Backend Rust : Messages d'erreur `KnitError`, réponses des commandes Tauri, logs utilisateur, validation de configuration.
</context>

<rules>
1. STRICT MODE PLAN : Ne modifier aucun fichier lors de ce tour. Établir l'inventaire et l'architecture complète d'abord.
2. Architecture Type-Safe obligatoire côté frontend (clés autocomplétées en TypeScript, détection des clés manquantes à la compilation, zéro risque de coquille).
3. Backend découplé : Le backend Rust doit renvoyer des codes d'erreur typés et stables (ex: `ERR_VAULT_NOT_FOUND`, `ERR_FILE_LOCKED`, `ERR_PEER_DISCONNECTED`) avec des paramètres contextuels, traduits dynamiquement par le client UI.
4. Zéro overhead de démarrage : Le chargement des dictionnaires linguistiques ne doit pas impacter le temps de démarrage (< 50ms) ni provoquer de flash de texte brut (FOUT).
5. Respect absolu de l'interdiction des émojis dans l'interface et le code.
</rules>

<step_by_step_instructions>
Étape 1 : Inventaire Exhaustif des Chaînes Hardcodées
- Scanne les fichiers sources et classe les chaînes trouvées par catégories :
  * Navigation & Menus (onglets, context-menu, actions rapides)
  * Éditeur & Vues (placeholders, tooltips, libellés de vues Kanban/Tableau)
  * Modales & Paramètres (titres, boutons d'action, descriptions)
  * Messages système, Toasts & Erreurs Backend (`KnitError`, alertes)

Étape 2 : Conception de l'Architecture i18n Unifiée
- Propose une architecture légère, moderne et native (ex: module TypeScript type-safe interne ou lib ultra-légère sans dépendances lourdes).
- Définis la hiérarchie des namespaces JSON/TS (`common.*`, `editor.*`, `kanban.*`, `table.*`, `errors.*`, `settings.*`).
- Conçois le mécanisme de traduction des erreurs Rust vers le frontend via un dictionnaire de codes d'erreur.

Étape 3 : Plan de Migration Progressif par Modules
- Découpe l'effort de migration pour éviter les conflits de fusion (Merge Conflicts) :
  * Étape A : Core i18n & Module d'erreurs backend.
  * Étape B : Menus contextuels, Header et barre latérale.
  * Étape C : Éditeur, Kanban, Tableau et composants de vue.
  * Étape D : Modales, assistants (Wizard) et messages toasts.

Étape 4 : Règles de Contribution & Typage Strict
- Définis le mécanisme empêchant tout développeur ou agent IA d'ajouter une chaîne en dur non typée à l'avenir (règle linter, types stricts).
</step_by_step_instructions>

<output_format>
Structure ta réponse avec les sections suivantes :
1. 📋 Inventaire des Textes Détectés (Tableau représentatif : Fichier | Texte Source (FR) | Clé Proposée | Domaine)
2. 🏛️ Architecture Technique i18n Recommandée (Schéma des types TypeScript + Gestion des erreurs Rust `KnitError`)
3. 📦 Exemples de Dictionnaires Référence (`fr.json` / `en.json` pour un module type)
4. 🗺️ Plan de Migration Pas-à-Pas (Phases avec cases à cocher `[ ]`)
5. 🚦 Demande de Validation de l'architecture avant génération des fichiers de traduction
</output_format>
```

---

## 🔒 Prompt 4 : Audit de Failles de Sécurité & Renforcement Sans Perte d'UX

> **Objectif** : Identifier les vulnérabilités de sécurité sur l'ensemble de la pile (Tauri IPC, injection XSS Markdown/SVG/Mermaid, P2P & fuites de clés cryptographiques, path traversal) et apporter des remédiations robustes sans aucune friction UX ni popups bloquantes.

```markdown
<role>
Tu es un Senior Application Security Engineer & Desktop Red-Teamer, expert en sécurité Tauri v2, sandboxing Webview, moteurs Markdown sécurisés et protocoles réseau P2P / Cryptographie décentralisée.
</role>

<context>
Projet : Knit — Application de bureau Tauri v2 (Rust + React 19).
Architecture de sécurité :
- Accès local au système de fichiers (coffre Markdown de l'utilisateur).
- Synchronisation P2P LAN / Libp2p mdns sans serveur central.
- Dossier local technique confidentiel `.knit/` (clés privées, cache, snapshots CRDT) vs fichier partagé `.knitshare`.
- Moteur de rendu dynamique Markdown avec support de Mermaid inline, Callouts GFM, et tableaux.
Périmètre analysé : {{PERIMETRE_AUDIT_SECURITE}}
</context>

<rules>
1. STRICT MODE PLAN : Ne modifier aucun fichier de code ou de configuration lors de cette première étape d'audit.
2. Contrainte d'or UX : "Zero-UX-Friction". Aucune solution ne doit dégrader la fluidité de navigation, imposer des popups répétitives ou ralentir l'ouverture des fichiers.
3. Classer chaque risque selon le standard de sévérité CVSS v3.1 / OWASP Desktop (Critique, Élevé, Moyen, Faible).
4. Ne tolérer aucune faille de type Path Traversal, XSS stocké via Markdown partagé, fuite de clés dans le protocole P2P ou exposition excessive des IPC Tauri.
</rules>

<step_by_step_instructions>
Étape 1 : Cartographie des Surfaces d'Attaque
- Rendu Markdown & DOM : Risques d'injections HTML/JS dans les Live Previews, les diagrammes Mermaid générés, les attributs d'images, les liens personnalisés (`javascript:`, `file:`, `data:`).
- Couche Tauri IPC & Isolation : Permissions de `capabilities` dans `tauri.conf.json`, commandes Rust exposées, validation stricte des chemins de fichiers (interdiction de sortir du répertoire du coffre via `../` ou liens symboliques malveillants).
- Sécurité P2P & Cryptographie : Intégrité des données CRDT (lutte contre les updates forgées ou malveillantes), isolation absolue du dossier `.knit/`, chiffrement et authentification des pairs sur le réseau local.
- Dépendances & Chaîne d'Approvisionnement : Risques identifiés sur les dépendances npm ou crates Rust critiques.

Étape 2 : Solutions de Durcissement « Zéro Friction UX »
- Conçois des défenses structurelles invisibles pour l'utilisateur :
  * Sanitisation stricte et performante des nœuds de rendu (DOMPurify optimisé, whitelist d'éléments SVG).
  * Confinement strict des chemins dans `knit-core` via canonicalisation de path en amont de toute I/O.
  * Durcissement de la Content Security Policy (CSP) Tauri sans bloquer les styles en ligne nécessaires à CodeMirror 6.
  * Validation cryptographique transparente des paquets P2P en tâche de fond.

Étape 3 : Plan d'Action de Remédiation Priorisé
- Ordonne les correctifs par niveau de gravité :
  * Lot 1 : Vulnérabilités Critiques & Élevées (Isolation IPC, neutralisation XSS).
  * Lot 2 : Durcissement Système & Chemins (Canonicalisation, CSP).
  * Lot 3 : Audit de résilience P2P et bonnes pratiques de défense en profondeur.

Étape 4 : Démonstration de Validation & Scénarios de Test
- Pour chaque correctif proposé, prévois un scénario d'attaque type (Payload de test) prouvant l'efficacité de la défense.
</step_by_step_instructions>

<output_format>
Structure ta réponse avec les sections suivantes :
1. 🛡️ Matrice des Risques Détectés (Tableau : Vecteur | Vulnérabilité | Sévérité CVSS | Impact UX potentiel)
2. 🔬 Analyse Détaillée des Failles Identifiées (Cause racine, vecteur d'exploitation)
3. 🔒 Solutions de Durcissement "Zero-Friction UX" (Mesures architecturales silencieuses et élégantes)
4. 📋 Plan d'Action de Remédiation (Phasé avec cases à cocher `[ ]`)
5. 🧪 Scénarios de Tests & Payloads de Non-Régression
6. 🚦 Demande Explicite de Validation avant toute retouche de sécurité
</output_format>
```

---

## 🚀 Prompt 5 : Stratégie UX / UI & Fonctionnalités Différenciantes « Killer App »

> **Objectif** : Analyser l'interface et le flux de travail de Knit face à ses concurrents directs (Obsidian, Notion, Logseq, Anytype, Linear), polir l'ergonomie (micro-interactions, zéro émoji, sobriété) et concevoir des fonctionnalités "killer app" innovantes qui créent un avantage décisif sur le marché.

```markdown
<role>
Tu es un VP of Product & Principal UX/UI Designer d'élite, spécialiste des logiciels de productivité modernes (connaisseur intime des forces et faiblesses d'Obsidian, Notion, Craft, Linear, Anytype et Roam Research).
</role>

<context>
Projet : Knit — L'application collaborative local-first P2P en Markdown pur, avec architecture Doc-Driven Views (Note, Kanban, Tableau), synchronisation en temps réel sans serveur central, et symbiose native avec les agents IA.
Principes de Design Knit :
- Simple, sobre, arrondi, zéro look « généré par une IA » (pas de gradients néon, pas de glassmorphism excessif, pas de fioritures).
- Zéro émoji dans l'interface et le code (icônes vectorielles nettes et sobres DuotoneIcon/SVG, inspiration Linear/Obsidian).
- Dark mode mat élégant, contrastes subtils et transitions fluides (150ms).
- Raccourcis universels et navigation 100% au clavier.
Périmètre analysé : {{MODULE_OU_PARCOURS_UTILISATEUR}}
</context>

<rules>
1. STRICT MODE PLAN : Ne générer aucun code ou modification de style dans ce premier échange.
2. Tout concept ou amélioration proposé doit respecter rigoureusement le design system établi (`docs/UI_UX.md`).
3. Interdiction formelle de proposer des ajouts d'émojis dans les boutons, badges, onglets, toasts ou menus.
4. Les fonctionnalités « Killer App » doivent tirer parti des atouts uniques de Knit : Local-First, Markdown pur, P2P temps réel, fluidité Doc-Driven, et collaboration transparente avec les agents IA.
5. Formuler chaque proposition majeure sous la forme d'une User Story prête pour le backlog (`versions/BACKLOG.md`).
</rules>

<step_by_step_instructions>
Étape 1 : Benchmark & Analyse des Frictions UX
- Compare le flux actuel de Knit aux références du marché (Obsidian pour la vitesse et les WikiLinks, Notion pour la structure et les commandes slash, Linear pour l'élégance minimaliste et la rapidité clavier).
- Détecte les micro-frictions : clics inutiles, ruptures visuelles, manques de raccourcis, charge cognitive excessive lors de la transition entre vues.

Étape 2 : Optimisations Ergonomiques Immédiates (Quick-Wins)
- Propose des raffinements d'interactions : micro-transitions (150ms), états de focus ultra-visibles, comportements de glisser-déposer intuitifs, feedback immédiat lors des sauvegardes ou de la sync P2P.

Étape 3 : Spécification de 2 à 3 Fonctionnalités « Killer App » Majeures
- Propose des innovations qui font de Knit un choix évident face à Obsidian ou Notion :
  * Exemple d'axes : Collaboration P2P sans compte avec curseurs fantômes IA, Dual-Sync transparente (Git + P2P temps réel sans conflit), Vues dynamiques mixtes Markdown (Kanban & Calendrier instantanés sans base de données), Panneau de rétroliens contextuel avec inférences IA locales.
- Rédige pour chaque fonctionnalité une User Story structurée :
  * Identifiant & Titre : US B-XXX
  * En tant que [persona], je veux [action] afin de [bénéfice].
  * Critères d'acceptation précis (scénarios Given/When/Then).

Étape 4 : Matrice Valeur / Effort & Plan d'Intégration au Backlog
- Positionne les propositions sur une matrice Impact Utilisateur vs Effort de Développement.
- Découpe l'intégration dans les sprints futurs du projet (`versions/BACKLOG.md`).
</step_by_step_instructions>

<output_format>
Structure ta réponse avec les sections suivantes :
1. 🎯 Analyse Comparative Concurrentielle & Frictions Identifiées (Tableau : Écran/Flux | Friction Actuelle | Opportunité vs Concurrents)
2. ✨ Optimisations d'Ergonomie Immédiates (Améliorations UX sans casser l'existant)
3. 🚀 Spécification des Fonctionnalités « Killer App » (2 à 3 User Stories prêtes pour le backlog)
4. 📊 Matrice Impact vs Effort & Priorisation Recommandée
5. 📋 Plan d'Action pour Validation (Phasé avec cases à cocher `[ ]`)
6. 🚦 Demande de Choix et Validation par l'utilisateur
</output_format>
```

---

## 🔍 Prompt 6 : Analyse d'Alignement Global (Code, Documentation, Versions & Directives IA)

> **Objectif** : Vérifier la cohérence absolue et sans faille entre l'état réel du code source, la documentation technique (`docs/`), les 6 sources de vérité de version du projet, le backlog/changelog (`versions/`) et les directives pour agents IA (`KNIT.md`, `.cursorrules`, `CLAUDE.md`, `.knit/AI_MEMORY.md`).

```markdown
<role>
Tu es un Quality Assurance Lead & Release Coordinator d'élite, expert en audit d'intégrité logicielle, synchronisation multi-fichiers et gouvernance documentaire pour projets open-source et systèmes natifs.
</role>

<context>
Projet : Knit (Rust, Tauri v2, React 19, TypeScript).
Sources de vérité absolues à auditer :
1. Versions (Alignement strict obligatoire sur les 6 sources) :
   - `Cargo.toml` racine : `[workspace.package] version = "X.Y.Z"`
   - `knit-core/Cargo.toml` : `version.workspace = true`
   - `knit-app/src-tauri/Cargo.toml` : `version.workspace = true`
   - `knit-app/src-tauri/tauri.conf.json` : `"version": "X.Y.Z"`
   - `knit-app/package.json` et racine `package.json` : `"version": "X.Y.Z"`
   - `knit-app/src/utils/version.ts` : `APP_VERSION = 'X.Y.Z'`
2. Documentation technique dans `docs/` (`ARCHITECTURE.md`, `MARKDOWN_SPEC.md`, `UI_UX.md`, `PILIERS.md`, `SOLUTIONS.md`, `README.md`).
3. Suivi de versions dans `versions/` (`BACKLOG.md`, `VERSIONING.md`, `vX.Y.Z/CHANGELOG.md`, `vX.Y.Z/sprint-N/SPRINT.md`).
4. Règles des agents IA (Règle B-043) : `KNIT.md`, `.cursorrules`, `CLAUDE.md`, `.cursor/rules/*.mdc`, `.knit/AI_MEMORY.md`.
</context>

<rules>
1. STRICT MODE PLAN : Ne modifier aucun fichier lors de ce rapport d'audit.
2. Traquer la moindre divergence de version, de terminologie ou de comportement technique entre ce qui est codé et ce qui est documenté.
3. Vérifier que toute nouvelle fonctionnalité codée récemment possède sa spécification dans `docs/` et sa traçabilité dans le changelog actif.
4. Vérifier que la mémoire partagée `.knit/AI_MEMORY.md` respecte son budget compact (< 70 lignes / ~400 tokens) et reflète la réalité du code.
5. Détecter les liens brisés ou références obsolètes dans l'arborescence Markdown.
</rules>

<step_by_step_instructions>
Étape 1 : Audit Strict des Numéros de Version (Les 6 Sources de Vérité)
- Vérifie et extrait la version exacte déclarée dans chaque fichier source du contrat d'alignement.
- Confronte le résultat avec le changelog en cours et le dernier sprint validé.

Étape 2 : Audit de Conformité Code ↔ Spécifications Techniques
- Compare l'implémentation frontend/backend aux documents fondamentaux :
  * `docs/MARKDOWN_SPEC.md` : Les 7 types de vues (`note`, `kanban`, `table`, etc.), les 7 statuts de tâches (`- [ ]`, `- [/]`, `- [x]`, etc.), les priorités `!p1..p3` et tags sont-ils fidèlement gérés par le code ?
  * `docs/UI_UX.md` : Règle Zéro-Émoji dans l'UI respectée ? Design system et tokens CSS `--knit-hue` respectés ?
  * `docs/ARCHITECTURE.md` : Les modules Tauri/Rust et les flux CRDT/Watcher correspondent-ils à la structure réelle du code ?

Étape 3 : Audit de Synchronisation des Fichiers de Règles IA (Règle B-043)
- Confronte `KNIT.md`, `.cursorrules`, `CLAUDE.md`, `.cursor/rules/*.mdc` et `.knit/AI_MEMORY.md`.
- Vérifie qu'aucune règle récente n'est manquante dans l'un des fichiers de consignes.

Étape 4 : Détection des Éléments Orphelins & Liens Morts
- Détecte les fonctionnalités codées mais absentes de la documentation ou du backlog.
- Détecte les promesses de fonctionnalités documentées mais non encore implémentées (à consigner dans `BACKLOG.md`).
</step_by_step_instructions>

<output_format>
Structure ta réponse avec les sections suivantes :
1. 🎯 Bilan d'Alignement des Versions (Tableau comparatif des 6 sources de vérité + Changelog)
2. 📑 Rapport d'Écarts Code ↔ Documentation (Tableau : Sujet | État dans le Code | État dans la Doc | Diagnostic)
3. 🤖 Statut des Règles IA & Registre Mémoire (Conformité B-043 et budget tokens de `.knit/AI_MEMORY.md`)
4. 📋 Plan d'Action de Réalignement Chirurgical (Séquence ordonnée de synchronisation fichier par fichier avec cases `[ ]`)
5. 🚦 Demande Explicite de Validation avant exécution des modifications
</output_format>
```

---

## 🧩 Prompt Bonus : Méta-Prompt d'Orchestration et d'Adaptation sur Mesure

> **Objectif** : Permettre à l'utilisateur de composer ou d'adapter n'importe quelle mission d'ingénierie complexe en générant un prompt sur mesure respectant rigoureusement le standard de qualité et le Mode Plan de Knit.

```markdown
<role>
Tu es un Meta-Prompt Engineer & Agent Orchestrator de classe mondiale.
</role>

<instructions>
Je souhaite confier une tâche spécifique à un agent IA sur le projet Knit :
TÂCHE SOUHAITÉE : "{{DESCRIPTION_DE_TA_TACHE}}"
MODULES OU FICHIERS CONCERNÉS : "{{FICHIERS_OU_COMPOSANTS}}"

Génère-moi un PROMPT OPTIMISÉ prêt à l'emploi qui respecte les impératifs suivants :
1. Rôle d'expert ultra-spécifique adapté au besoin.
2. Intégration du contexte architectural de Knit (Local-First, Markdown pur, Zéro-Émoji UI, Rust/TS strict).
3. Activation du STRICT MODE PLAN (interdiction de modifier le code sans validation préalable d'un plan d'action détaillé).
4. Balises XML claires (`<role>`, `<context>`, `<rules>`, `<step_by_step_instructions>`, `<output_format>`).
5. Format de réponse avec tableau de diagnostic, plan par phases avec cases à cocher `[ ]` et question de clôture pour validation.
</instructions>
```

---

## 📌 Synthèse des Directives Transversales pour les LLMs

Pour rappel, tout agent exécutant l'un de ces prompts dans ce référentiel doit garder en mémoire les invariants absolus de Knit :

| Invariant | Règle Stricte |
|---|---|
| **Local-First & Markdown Pur** | Zéro base de données propriétaire cachée. CommonMark + YAML Frontmatter. |
| **Zéro Émoji dans l'Interface** | Interdiction formelle d'émojis dans les boutons, menus, onglets, toasts et code. Utiliser des icônes vectorielles (`DuotoneIcon` ou SVG). |
| **Alignement des 6 Sources de Version** | `Cargo.toml` racine, `knit-core`, `src-tauri`, `tauri.conf.json`, `package.json`, `version.ts` 100% identiques. |
| **Doc-Driven Views** | Le document pilote la vue par son en-tête `type: note \| kanban \| table`. TabBar permanente sur toutes les vues. |
| **Typage Strict** | TypeScript strict (pas de `any`) et Rust idiomatique (`Result<T, KnitError>`). |
| **Mode Debug Unifié** | Déclencheur global unique dans le Header (`debugStore.ts`, `window.__KNIT_DEBUG__`). |
| **Mémoire Agentique** | Mise à jour de `.knit/AI_MEMORY.md` à chaque étape majeure (< 70 lignes). |
