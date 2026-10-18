# Directives IA pour ce coffre-fort

- Conserver le Markdown pur sans format propriétaire.
- Préserver les frontmatters YAML (`type:`, `statut:`, `priorite:`, `titre:`, etc.).
- Travailler directement dans les fichiers locaux sur disque.
- Respecter la règle Zéro-Émoji dans l'UI et le code applicatif (icônes vectorielles uniquement).

## Blocs dynamiques reconnus (Sprint 6bis)

Les fences suivants sont des **projections mémoire** (Live Preview). Ne jamais y injecter de HTML propriétaire :

- ```` ```knit-toc ```` — sommaire (`depth`, `collapsible`) ; slash `/sommaire`
- ```` ```knit-files ```` — index dossier (`folder`, `sort`, `limit`, `layout`) ; slash `/fichiers`
- ```` ```knit-query ```` — Dataview (`from`, `where`, `sort`, `columns`) ; slash `/requete`
- ```` ```knit-tasks ```` — agrégateur `- [ ]` (`from`, `status`, `group_by`) ; slash `/taches-globales`

Référence démo : [[blocs-dynamiques.md]]. Spécification : `docs/MARKDOWN_SPEC.md` §7.

## Médias (`assets/`)

- Syntaxe Live Preview : `![légende](assets/fichier.ext)` sur une ligne seule.
- Banc d'essai : [[live-preview.md]] section Images ; fichiers dans `assets/`.

## Tâches étendues (B-054)

Statuts : `- [ ]` `- [/]` `- [x]` `- [-]` `- [?]` `- [>]` `- [!]`.
Priorités : `!p1` `!p2` `!p3`. Dates : `@YYYY-MM-DD`. Assignations : `@collaborateur` ou `@vault`.
