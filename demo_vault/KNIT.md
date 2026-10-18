# Directives IA pour ce coffre-fort

- Conserver le Markdown pur sans format propriétaire.
- Préserver les frontmatters YAML (`type:`, `statut:`, `priorite:`, `titre:`, etc.).
- Travailler directement dans les fichiers locaux sur disque.
- Respecter la règle Zéro-Émoji dans l'UI et le code applicatif (icônes vectorielles uniquement).

## Vues pilotées par le document (Doc-Driven Views)

Le frontmatter `type: ...` active dynamiquement la vue correspondante sans altérer la pureté Markdown :

- `type: note` (ou omis) — Éditeur Live Preview Obsidian avec masquage discret hors curseur.
- `type: kanban` — Tableau agile avec colonnes par `## Titre` et cartes réordonnables.
- `type: calendar` — Agenda **scoped** (onglet fichier) avec multi-vues Mois/Semaine/Jour/Liste et détection `@YYYY-MM-DD`. L'Agenda **global** du coffre s'ouvre en modale (Header / `Ctrl+Shift+A`), pas en onglet.
- `type: canvas` — Tableau blanc infini JSON-Canvas avec cartes, flèches et import par D&D.
- `type: slides` — Diaporama interactif plein écran découpé par séparateurs horizontaux `---`.
- `type: gallery` — Base de données visuelle sous forme de cartes d'après `[[WikiLinks]]` et `assets/`.
- `type: table` — Vue synthétique tabulaire avec recherche et tri dynamique.

## Standard Drag-and-Drop (D&D)

- **Indicateur d'insertion** : Filet d'accentuation `var(--knit-primary)` avec pastille d'ancrage lumineuse (8px).
- **Fantôme** : Carte traînée semi-transparente (`opacity: 0.35`) avec curseur `grabbing`.
- **Surbrillance** : Conteneur récepteur illuminé (`border: 1px dashed var(--knit-primary)`, halo doux).
- **Cross-DnD** : Les cartes Kanban peuvent être déposées dans l'Agenda ; les notes de la barre latérale peuvent être déposées sur le Canvas.

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

## Tâches étendues & HTML sécurisé

- Statuts : `- [ ]` `- [/]` `- [x]` `- [-]` `- [?]` `- [>]` `- [!]`.
- Priorités : `!p1` `!p2` `!p3`. Dates : `@YYYY-MM-DD`. Assignations : `@collaborateur` ou `@vault`.
- HTML inline sécurisé : `<kbd>`, `<u>`, `<mark>`, `<sub>`, `<sup>`, `<br>`, `<details>`, `<summary>`.
- Banc d'essai : [[html-securise.md]] (B-059). Spec : `docs/MARKDOWN_SPEC.md` §8.

