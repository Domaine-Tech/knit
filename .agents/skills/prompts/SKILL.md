---
name: prompts-ia
description: Déclencheur et exécuteur automatique des 7 prompts IA standardisés en Mode Plan (Nettoyage, Performance, Traduction/i18n, Sécurité, UX/Killer App, Alignement Code/Doc/Versions, Collaboration P2P) définis dans docs/PROMPTS_IA.md. S'active lorsque l'utilisateur demande "fait prompt X", "exécute le prompt X", ou mentionne un prompt de la documentation.
---

# Skill : Prompts IA Standardisés & Mode Plan (Knit)

Ce skill permet d'exécuter instantanément l'un des 7 prompts spécialisés de [docs/PROMPTS_IA.md](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md) lorsqu'un utilisateur tape une commande de type :
- `fait prompt 1` / `exécute le prompt 1` / `prompt 1`
- `fait prompt 2` / `prompt 2`
- `fait prompt 3` / `prompt 3`
- `fait prompt 4` / `prompt 4`
- `fait prompt 5` / `prompt 5`
- `fait prompt 6` / `prompt 6`
- `fait prompt 7` / `prompt 7`
- `fait prompt bonus` / `meta prompt`

---

## 🎯 Table de Correspondance des Prompts

| Déclencheur | Thématique | Rôle Adopté | Fichier Référence |
|---|---|---|---|
| **Prompt 1** | **Nettoyage & Refactorisation** | *Principal Software Architect & Refactoring Specialist* | `docs/PROMPTS_IA.md#prompt-1` |
| **Prompt 2** | **Optimisation & Performance** | *Staff Systems & Performance Engineer* | `docs/PROMPTS_IA.md#prompt-2` |
| **Prompt 3** | **Détection Textes & Traduction (i18n)** | *Lead i18n & l10n Architect* | `docs/PROMPTS_IA.md#prompt-3` |
| **Prompt 4** | **Sécurité & Durcissement (Zero-UX-Loss)**| *Senior Application Security Engineer* | `docs/PROMPTS_IA.md#prompt-4` |
| **Prompt 5** | **UX Excellence & Killer App** | *VP of Product & Principal UX/UI Designer* | `docs/PROMPTS_IA.md#prompt-5` |
| **Prompt 6** | **Alignement Code, Doc & Versions** | *QA Lead & Release Coordinator* | `docs/PROMPTS_IA.md#prompt-6` |
| **Prompt 7** | **Collaboration P2P & Présence** | *Principal Distributed Systems & Collaboration Designer* | `docs/PROMPTS_IA.md#prompt-7` |
| **Prompt Bonus** | **Méta-Prompt sur Mesure** | *Meta-Prompt Engineer & Agent Orchestrator* | `docs/PROMPTS_IA.md#prompt-bonus` |

---

## 📋 Procédure d'Exécution Obligatoire

Dès détection d'une commande `fait prompt X` :

1. **Lire le prompt source** : Ouvrir et lire le bloc exact correspondant dans [docs/PROMPTS_IA.md](file:///d:/Dev/Repos/knit/docs/PROMPTS_IA.md).
2. **Adopter la posture & les règles** :
   - Endosser le `<role>` défini.
   - Intégrer le contexte du projet Knit (Local-First, Markdown pur, Zéro émoji UI, Rust/TS strict).
   - Déterminer le périmètre : si l'utilisateur a précisé des fichiers ou un module, cibler ce périmètre ; sinon, analyser l'ensemble du projet ou le module actif.
3. **STRICT MODE PLAN (Règle Absolue)** :
   - **INTERDICTION STRICTE de modifier ou créer des fichiers de code dans la première réponse**.
   - Analyser en lecture seule.
   - Formuler un diagnostic structuré (tableaux, métriques, constats).
   - Rédiger un **Plan d'Action détaillé par phases avec cases à cocher `[ ]`**.
   - Conclure en demandant explicitement la validation de l'utilisateur pour lancer les modifications.
