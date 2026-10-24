# Sprint 7 — Wizard d'Initialisation & Collaboration Visuelle

> Objectif : Rendre l'onboarding intuitif grâce au Wizard (créer/rejoindre en 3 écrans max), introduire `.knitshare` et afficher les curseurs des collaborateurs en temps réel.

| Info | Détail |
|---|---|
| **Version** | v1.0.0 (runtime inchangé : 0.4.0 jusqu'au Sprint 8) |
| **Durée** | 2027-01-12 → 2027-01-26 (2 semaines) |
| **Statut** | ✅ Terminé |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-032 | Wizard d'initialisation : flux "Créer un coffre-fort" (3 écrans) | 🔴 | ✅ | — |
| B-033 | Wizard d'initialisation : flux "Rejoindre un coffre-fort" (2 écrans : code + connexion) | 🔴 | ✅ | — |
| B-034 | Page de paramètres (thème, hue, état réseau, diagnostics) | 🟠 | ✅ | — |
| B-034a | Corbeille 100% intégrée (.knit/trash/) : sélecteur de mode dans les paramètres (OS vs Knit), volet dédié avec prévisualisation, restauration ciblée et vidage | 🟠 | ✅ | — |
| B-035 | Présence collaborative (avatars sidebar, infobulle, téléportation, curseurs sobres) | 🟡 | ✅ | — |
| B-035b | Volet Historique de versions & Time Travel (Diff visuel + Restauration) | 🟠 | ✅ | — |
| B-036 | Créer le fichier `.knitshare` et la structure par défaut d'un vault | 🟠 | ✅ | — |
| B-017b | Appairage P2P LAN Simplifié (Code PIN éphémère à 6 chiffres & QR Code dynamique) | 🟠 | ✅ | — |
| B-043 | Kit Universel de Règles & Skills Multi-Agents IA (Cursor `.cursor/rules/`, Claude `CLAUDE.md`, Antigravity `.agents/skills/`, Copilot `.github/`, Windsurf, Cline) | 🔴 | ✅ | — |
| B-043a | Playbook d'exploitation Knit pour agents IA (doc init coffre : maximiser capacités au service de l'humain) | 🔴 | ✅ | — |
| B-051 | Mode "Réseau Local Strict / Air-Gapped" (LAN-Only Toggle coupant les relays WAN) | 🟡 | ✅ | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [x] Au premier lancement (aucun coffre ouvert), le Wizard s'affiche automatiquement.
- [x] Créer un coffre initialise le dossier choisi, le sous-dossier `.knit/`, le fichier `.knitshare` et génère un code d'invitation (ticket + PIN après démarrage P2P).
- [x] Rejoindre un coffre résout le code d'invitation ou le PIN LAN, établit la connexion P2P et ouvre le dossier local (coquille `prepare_join_vault`). *La réplication complète de l'arbre Markdown distant est reportée (B-114).*
- [x] Les paramètres permettent de basculer entre Corbeille OS et Corbeille 100% intégrée (`.knit/trash/`), avec un volet dédié permettant d'explorer les fichiers supprimés, les prévisualiser, les restaurer à leur place d'origine ou vider la corbeille.
- [x] Les curseurs des autres utilisateurs s'affichent avec leur couleur, leurs initiales et un badge intelligent.
- [x] Le volet d'historique permet de comparer les diffs et de restaurer n'importe quelle version passée en 1 clic.
- [x] Le fichier `.knitshare` est lisible et modifiable à la main par un humain ou une IA.
- [x] **Kit Universel IA Agentiques (B-043)** : Le Wizard et `init_vault` génèrent un kit exhaustif pour TOUTES les IA agentiques :
  - `KNIT.md` (guide racine universel pour tout LLM)
  - `.cursor/rules/knit.mdc` & `.cursorrules` (Cursor IDE)
  - `CLAUDE.md` (Claude Code CLI & Anthropic agents)
  - `.agents/skills/knit/SKILL.md` & `AGENTS.md` (Antigravity & Gemini CLI)
  - `.github/copilot-instructions.md` (GitHub Copilot)
  - `.windsurfrules` (Windsurf IDE)
  - `.clinerules` & `.aider.conf.yml` (Cline, Roo Code & Aider)
  - Chaque fichier enseigne le respect strict du frontmatter YAML, la protection du `.knit/`, l'utilisation de `assets/` et la non-régression Markdown pur.
- [x] **Playbook d'exploitation IA (B-043a)** : En plus des règles de non-régression, le Wizard / `init_vault` génère une documentation d'usage (`GUIDE_IA.md` et/ou section dédiée dans `KNIT.md`) pour que l'agent maximise Knit *au service de l'humain* : 7 statuts & `!p1..p3`, Doc-Driven Views (`type:`), blocs dynamiques `knit-toc|files|query|tasks`, slash commands, WikiLinks & backlinks, `assets/`, structure `wiki/` / `projet/taches/`, protocole handoff `.knit/AI_MEMORY.md`. Zéro implémentation hors Sprint 7.
- [x] **Mode Réseau Local Strict / Air-Gapped (B-051)** : Switch dans les paramètres désactivant les relays WAN Iroh (`N0DisableRelay`) au prochain démarrage réseau ; mDNS LAN conservé. *Air-gap OS total et hot-reload Iroh hors périmètre.*
- [x] **Appairage PIN/QR (B-017b)** : Un code PIN éphémère à 6 chiffres et un QR Code ISO (payload = PIN) permettent d'inviter un pair LAN sans coller le ticket `knit://join/...` long. Rafraîchissement PIN + republication mDNS.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| 2026-10-18 | B-043a Playbook d'exploitation IA | Compléter B-043 : règles + doc pour maximiser Knit au service de l'humain à l'init | Oui |
| 2026-10-24 | B-017b Appairage PIN/QR | Déjà au backlog Sprint 7 ; réintégré au tableau et DoD du SPRINT.md | Oui |
| 2026-10-24 | B-114 Réplication initiale coffre au join | Écart DoD audit Prompt 10 : join = connexion P2P, pas miroir de fichiers | Non (backlog / Sprint 8+) |
| 2026-10-24 | B-115 Visibilité arbre | Build exclus ; `.knit`/dots dans l'arbre (toggle œil) ; purge index à la bascule | Oui |
| 2026-10-24 | B-116 Registre / VaultSwitcher | Liste coffres locaux, switcher `Ctrl+Shift+O`, Wizard si pas de `.knitshare` | Oui |
| 2026-10-24 | Fix agenda démo | Skip IPC `get_calendar_index` / `get_vault_index` si `isDemoVaultPath` | Oui (correctif) |

---

## Rétrospective

### Ce qui a bien marché
- Réutilisation du socle P2P (tickets Iroh, awareness Yjs, snapshots, corbeille) pour livrer le Wizard sans réécrire le moteur.
- Schéma `.knitshare` unifié (exemple + démo) et `init_vault` testé unitairement.
- Runtime maintenu en 0.4.0 : v1.0.0 reste alignée sur le Sprint 8 packaging.
- Clôture audit Prompt 10 : QR ISO (`uqr`), await `startNetwork` avant ticket/PIN/join, menus réseau, clic molette corbeille/historique.

### Ce qu'on peut améliorer
- Join = connexion P2P + coquille locale ; la réplication initiale de l'arbre Markdown est B-114.
- Le mode LAN strict demande un redémarrage réseau (re-ouvrir le coffre) ; un hot-reload de l'endpoint Iroh serait plus fluide.
- Polissage post-clôture (B-115/B-116, agenda démo) : documenté dans CHANGELOG / ajouts.
- Contrôles clôture Prompt 10 (2026-10-24) : `cargo check --workspace` OK ; 4/4 tests `vault::init` OK ; `npm run lint` OK (warnings préexistants hors erreur). Runtime maintenu 0.4.0.
