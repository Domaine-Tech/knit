//! Templates générés dans un coffre utilisateur (kit agents + playbook).
//! Contenu d'usage distinct des règles de développement du dépôt Knit.

pub fn knitshare_yaml(vault_name: &str, vault_id: Option<&str>) -> String {
    let name = vault_name.replace('"', "'");
    let id_line = match vault_id {
        Some(id) if !id.trim().is_empty() => {
            format!("id: \"{}\"\n", id.replace('"', "'"))
        }
        _ => String::new(),
    };
    format!(
        r#"# .knitshare — Configuration partagée du coffre-fort Knit
# Répliqué entre les dossiers locaux qui portent le même id.
# Le dossier .knit/ (profil machine, cache, corbeille) ne quitte pas cette machine.
# Lisible et modifiable par les humains comme par les agents IA.

nom: "{name}"
{id_line}version: 2

structure:
  wiki: "wiki/"
  taches: "projet/taches/"
  sprints: "projet/sprints/"
  assets: "assets/"

conventions:
  statuts: [backlog, a-faire, en-cours, en-revue, termine]
  priorites: [basse, moyenne, haute, critique]
  format_id: "task-{{NNN}}"

mermaid:
  theme_sync: true
"#,
        name = name,
        id_line = id_line,
    )
}

pub fn local_config_yaml(hue: u16, theme: &str, trash_mode: &str, lan_only: bool) -> String {
    format!(
        r#"# .knit/config.yaml — Configuration STRICTEMENT locale (jamais synchronisée)
theme: {theme}
hue: {hue}
trash_mode: {trash_mode}
lan_only: {lan_only}
"#
    )
}

pub fn accueil_md(vault_name: &str) -> String {
    format!(
        r#"---
type: note
titre: Accueil
---

# {name}

Bienvenue dans votre coffre-fort Knit. Éditez cette page librement.

- Tâches : `projet/taches/`
- Wiki : `wiki/`
- Médias : `assets/`
- Config partagée : `.knitshare`
- Mémoire agents (locale) : `.knit/AI_MEMORY.md`

Consultez `GUIDE_IA.md` pour maximiser Knit avec un agent IA.
"#,
        name = vault_name
    )
}

pub fn ai_memory_seed() -> &'static str {
    r#"# Mémoire Agentique — Coffre

> Registre inter-sessions (~400 tokens). Lire au démarrage ; mettre à jour à chaque jalon.
> Ce fichier est LOCAL (`.knit/`) — ne jamais y placer de secrets ou clés privées.

## Décisions
- (aucune encore)

## Historique récent
- Coffre initialisé.

## Tâches actives
- [ ] Clarifier les conventions d'équipe dans `.knitshare`
"#
}

pub fn guide_ia_md() -> &'static str {
    r#"# Guide d'exploitation Knit pour agents IA

> Playbook généré à l'init du coffre. Maximiser Knit **au service de l'humain**.

## Principes
1. Markdown pur CommonMark / GFM sur disque — zéro balise HTML propriétaire.
2. `.knit/` est local (cache, corbeille, snapshots, état CRDT, AI_MEMORY) — ne jamais le synchroniser ni le versionner. La clé et le profil de la personne vivent dans le répertoire de l'application, pas dans le coffre.
3. `.knitshare` porte le `nom`, l'`id` du coffre et les conventions. Il se réplique entre les dossiers du même id. Éditable à la main.
4. Médias dans `assets/` via `![légende](assets/fichier.ext)`.

## Tâches étendues (7 statuts)
- `- [ ]` à faire · `- [/]` en cours · `- [x]` terminé · `- [-]` annulé
- `- [?]` en attente · `- [>]` délégué · `- [!]` bloqué
- Priorités : `!p1` `!p2` `!p3`
- Dates : `@YYYY-MM-DD` ou `@YYYY-MM-DD HH:mm-HH:mm`
- Assignations : `@collaborateur` ou `@vault`

## Doc-Driven Views
Frontmatter `type:` : `note` | `kanban` | `table` | `calendar` | `canvas` | `slides` | `gallery`

## Blocs dynamiques (Live Preview)
Fences : `knit-toc`, `knit-files`, `knit-query`, `knit-tasks` (corps `clé: valeur`).
Slash : `/sommaire`, `/fichiers`, `/requete`, `/taches-globales`.

## Navigation
- WikiLinks `[[Note]]` / `[[Note#Titre]]`
- Backlinks automatiques
- Structure conseillée : `wiki/`, `projet/taches/`, `projet/sprints/`, `assets/`

## Handoff
Mettre à jour `.knit/AI_MEMORY.md` à chaque jalon (budget ~50–70 lignes).
"#
}

pub fn knit_md(vault_name: &str) -> String {
    format!(
        r#"# KNIT.md — Guide universel pour agents IA

Coffre : **{name}**

## Règles absolues
1. Écrire uniquement du Markdown / YAML lisible par un humain.
2. Respecter le frontmatter YAML en tête de fichier (`---`).
3. Ne jamais modifier ni versionner `.knit/` (cache, corbeille, snapshots, état CRDT). La personne n'est pas dans le coffre. `.knitshare` porte `nom` et `id`.
4. Placer les médias dans `assets/`.
5. Lire `.knitshare` pour les conventions d'équipe (statuts, structure).
6. Consulter `GUIDE_IA.md` pour les capacités avancées (tâches, vues, blocs).

## Structure typique
```
.knitshare
KNIT.md
GUIDE_IA.md
assets/
wiki/
projet/taches/
projet/sprints/
.knit/          # local uniquement
```
"#,
        name = vault_name
    )
}

pub fn cursorrules() -> &'static str {
    r#"# Knit — Règles Cursor (coffre utilisateur)

- Markdown pur CommonMark + frontmatter YAML.
- Ne jamais toucher `.knit/` (local : cache, corbeille, état CRDT, AI_MEMORY).
- Config partagée : `.knitshare` (`nom`, `id`).
- Médias : `assets/`.
- Tâches : 7 statuts `- [ ]` `/` `x` `-` `?` `>` `!`, priorités `!p1..p3`, dates `@YYYY-MM-DD`.
- Vues : frontmatter `type: note|kanban|table|calendar|canvas|slides|gallery`.
- Blocs : ```knit-toc|files|query|tasks```
- Voir `GUIDE_IA.md` et `KNIT.md`.
"#
}

pub fn cursor_mdc() -> &'static str {
    r#"---
description: Règles Knit pour l'édition du coffre Markdown
globs: "**/*.{md,yaml,yml}"
alwaysApply: true
---

# Knit — Édition du coffre

- Markdown pur, frontmatter YAML intact.
- Protéger `.knit/` (jamais synchronisé / versionné).
- `.knitshare` = `nom`, `id` et conventions d'équipe.
- Assets dans `assets/`.
- Capacités : voir `GUIDE_IA.md`.
"#
}

pub fn claude_md() -> &'static str {
    r#"# CLAUDE.md — Directives coffre Knit

1. Markdown pur + YAML frontmatter.
2. `.knit/` local ; personne hors coffre ; `.knitshare` (`nom` + `id`) répliqué.
3. Ne jamais injecter de balises HTML propriétaires.
4. Tâches étendues, Doc-Driven Views et blocs `knit-*` : `GUIDE_IA.md`.
5. Handoff : mettre à jour `.knit/AI_MEMORY.md` après chaque jalon.
"#
}

pub fn agents_md() -> &'static str {
    r#"# AGENTS.md — Knit

Avant toute édition : lire `KNIT.md`, `GUIDE_IA.md` et `.knitshare`.
Protéger `.knit/`. Préférer les conventions du coffre aux hypothèses.
"#
}

pub fn skill_md() -> &'static str {
    r#"---
name: knit
description: Édition et exploitation d'un coffre Knit (Markdown local-first).
---

# Skill Knit (coffre)

## Quand l'utiliser
Création/édition de notes, tâches, kanban, agenda, canvas, blocs dynamiques.

## Règles
- Markdown pur ; `.knit/` intouchable pour les secrets.
- Lire `.knitshare` et `GUIDE_IA.md`.
- Statuts tâches : `- [ ]` `[/]` `[x]` `[-]` `[?]` `[>]` `[!]`.
"#
}

pub fn copilot_instructions() -> &'static str {
    r#"# GitHub Copilot — Coffre Knit

Suggestions en Markdown / YAML uniquement.
Respecter frontmatter, `.knitshare`, `assets/`, et ne jamais proposer de secrets dans `.knit/`.
Référence : `GUIDE_IA.md`.
"#
}

pub fn windsurf_rules() -> &'static str {
    r#"# Windsurf — Knit
Markdown pur, frontmatter YAML, `.knit/` local, `.knitshare` partagé, médias dans `assets/`.
Voir GUIDE_IA.md.
"#
}

pub fn clinerules() -> &'static str {
    r#"# Cline / Roo — Knit
Éditer le coffre en Markdown pur. Protéger `.knit/`. Suivre GUIDE_IA.md et .knitshare.
"#
}

pub fn aider_conf() -> &'static str {
    r#"# Aider — Knit
read: KNIT.md
read: GUIDE_IA.md
"#
}

pub fn gitignore_knit() -> &'static str {
    r#"# Knit — données locales (ne jamais versionner)
.knit/
"#
}
