# Sprint 7 — Wizard d'Initialisation & Collaboration Visuelle

> Objectif : Rendre l'onboarding intuitif grâce au Wizard (créer/rejoindre en 3 écrans max), introduire `.knitshare` et afficher les curseurs des collaborateurs en temps réel.

| Info | Détail |
|---|---|
| **Version** | v1.0.0 |
| **Durée** | 2027-01-12 → 2027-01-26 (2 semaines) |
| **Statut** | 📋 Planifié |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-032 | Wizard d'initialisation : flux "Créer un coffre-fort" (3 écrans) | 🔴 | 📋 | — |
| B-033 | Wizard d'initialisation : flux "Rejoindre un coffre-fort" (3 écrans) | 🔴 | 📋 | — |
| B-034 | Page de paramètres (thème, hue, état réseau, diagnostics) | 🟠 | 📋 | — |
| B-034a | Corbeille 100% intégrée (.knit/trash/) : sélecteur de mode dans les paramètres (OS vs Knit), volet dédié avec prévisualisation, restauration ciblée et vidage | 🟠 | 📋 | — |
| B-035 | Présence collaborative (avatars sidebar, infobulle, téléportation, curseurs sobres) | 🟡 | 📋 | — |
| B-035b | Volet Historique de versions & Time Travel (Diff visuel + Restauration) | 🟠 | 📋 | — |
| B-036 | Créer le fichier `.knitshare` et la structure par défaut d'un vault | 🟠 | 📋 | — |
| B-043 | Kit Universel de Règles & Skills Multi-Agents IA (Cursor `.cursor/rules/`, Claude `CLAUDE.md`, Antigravity `.agents/skills/`, Copilot `.github/`, Windsurf, Cline) | 🔴 | 📋 | — |
| B-043a | Playbook d'exploitation Knit pour agents IA (doc init coffre : maximiser capacités au service de l'humain) | 🔴 | 📋 | — |
| B-051 | Mode "Réseau Local Strict / Air-Gapped" (LAN-Only Toggle coupant tout trafic Internet) | 🟡 | 📋 | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [ ] Au premier lancement (aucun coffre ouvert), le Wizard s'affiche automatiquement.
- [ ] Créer un coffre initialise le dossier choisi, le sous-dossier `.knit/`, le fichier `.knitshare` et génère un code d'invitation.
- [ ] Rejoindre un coffre résout le code d'invitation, télécharge l'état initial via P2P et ouvre le dossier local synchronisé.
- [ ] Les paramètres permettent de basculer entre Corbeille OS et Corbeille 100% intégrée (`.knit/trash/`), avec un volet dédié permettant d'explorer les fichiers supprimés, les prévisualiser, les restaurer à leur place d'origine ou vider la corbeille.
- [ ] Les curseurs des autres utilisateurs s'affichent avec leur couleur, leurs initiales et un badge intelligent.
- [ ] Le volet d'historique permet de comparer les diffs et de restaurer n'importe quelle version passée en 1 clic.
- [ ] Le fichier `.knitshare` est lisible et modifiable à la main par un humain ou une IA.
- [ ] **Kit Universel IA Agentiques (B-043)** : Le Wizard et `init_vault` génèrent un kit exhaustif pour TOUTES les IA agentiques :
  - `KNIT.md` (guide racine universel pour tout LLM)
  - `.cursor/rules/knit.mdc` & `.cursorrules` (Cursor IDE)
  - `CLAUDE.md` (Claude Code CLI & Anthropic agents)
  - `.agents/skills/knit/SKILL.md` & `AGENTS.md` (Antigravity & Gemini CLI)
  - `.github/copilot-instructions.md` (GitHub Copilot)
  - `.windsurfrules` (Windsurf IDE)
  - `.clinerules` & `.aider.conf.yml` (Cline, Roo Code & Aider)
  - Chaque fichier enseigne le respect strict du frontmatter YAML, la protection du `.knit/`, l'utilisation de `assets/` et la non-régression Markdown pur.
- [ ] **Playbook d'exploitation IA (B-043a)** : En plus des règles de non-régression, le Wizard / `init_vault` génère une documentation d'usage (`GUIDE_IA.md` et/ou section dédiée dans `KNIT.md`) pour que l'agent maximise Knit *au service de l'humain* : 7 statuts & `!p1..p3`, Doc-Driven Views (`type:`), blocs dynamiques `knit-toc|files|query|tasks`, slash commands, WikiLinks & backlinks, `assets/`, structure `wiki/` / `projet/taches/`, protocole handoff `.knit/AI_MEMORY.md`. Zéro implémentation hors Sprint 7.
- [ ] **Mode Réseau Local Strict / Air-Gapped (B-051)** : Switch dans les paramètres désactivant les relays WAN Iroh et bornant le trafic aux échanges LAN directs (mDNS pur, 0 paquet sortant sur Internet).

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| 2026-10-18 | B-043a Playbook d'exploitation IA | Compléter B-043 : règles + doc pour maximiser Knit au service de l'humain à l'init | Oui |

---

## Rétrospective

*(À compléter à la fin du sprint)*

### Ce qui a bien marché
- 

### Ce qu'on peut améliorer
- 
