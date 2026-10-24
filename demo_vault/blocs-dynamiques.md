---
type: note
titre: Blocs Dynamiques & Dataview
statut: en-cours
priorite: haute
assigne: vault
tags: [demo, dataview, sprint-6bis, knit-query]
id: DEMO-DV-001
---

# Blocs Dynamiques & Requetes (Sprint 6bis)

Cette note demontre les blocs de code declaratifs Knit. Leur contenu sur le disque reste du Markdown pur ; le Live Preview projette une vue interactive en memoire.

> [!TIP]
> Inserez rapidement un bloc via Slash : `/sommaire`, `/fichiers`, `/requete`, `/taches-globales`.
> Basculez en mode Source (<kbd>Ctrl+E</kbd>) pour editer le fence brut.

---

## Sommaire de cette note

```knit-toc
depth: 3
collapsible: true
```

---

## Index des fichiers du dossier wiki

```knit-files
folder: "wiki"
sort: updated desc
limit: 10
layout: table
```

### Variante liste (layout: list)

```knit-files
folder: "assets"
sort: name asc
limit: 10
layout: list
```

Medias locaux demontres dans [[live-preview.md#9. Images et Medias Locaux (assets/)|Live Preview — Images]].

---

## Requete Frontmatter (style Dataview)

Filtre les notes dont le statut n'est pas `termine`, triees par priorite :

```knit-query
from: "projet"
where: statut != "termine"
sort: priorite desc
columns: [titre, statut, priorite, assigne, path]
```

Toutes les notes du coffre avec un frontmatter :

```knit-query
from: ""
where: type = "note"
sort: titre asc
columns: [titre, statut, tags, path]
limit: 12
```

---

## Agregateur de taches transversales

Cases `- [ ]` agregees depuis plusieurs fichiers. Cocher ici met a jour le fichier source.

**Comportement :**
- Ordre fixe : fichiers A→Z, puis numero de ligne (un fichier ne saute pas apres une coche).
- `status: all` — toutes les taches restent visibles ; cocher change juste la case.
- `status: todo` — seules les taches a faire ; cocher **retire** la ligne de cette liste (normal).
- `group_by: file` — un groupe par fichier ; si toutes les taches d'un fichier sortent du filtre, le groupe disparait.

```knit-tasks
from: "projet"
status: all
group_by: file
```

Taches encore a faire dans tout le coffre (`status: todo` — cocher = disparait de la liste) :

```knit-tasks
from: ""
status: todo
group_by: file
```

---

## Assistant de tableaux (B-047)

Placez le curseur dans le tableau ci-dessous (mode Source ou edition) : une mini-toolbar apparait (`+ Ligne`, `+ Colonne`, Alignement, Supprimer, Aligner).

| Module | Sprint | Statut |
| --- | --- | --- |
| Index Frontmatter | 6bis | Livre |
| knit-toc & knit-files | 6bis | Livre |
| knit-query & knit-tasks | 6bis | Livre |
| Agenda & Echeancier (B-045) | 6ter | Livre |
| Canvas infini 2D (B-046) | 6ter | Livre |
| Diaporama plein ecran (B-047) | 6ter | Livre |
| Galerie de cartes (B-048) | 6ter | Livre |
| Graphe local 2D (B-049) | 6ter | Livre |
| HTML securise (B-050) | 6ter | Livre |
| Drag-and-Drop unifie | 6ter | Livre |

---

## Sections pour le sommaire

### Architecture locale

L'index Frontmatter vit en memoire (`vaultStore.queryFiles()`). Aucune base opaque.

### Collaboration

Les mutations de `knit-tasks` et du statut dans `knit-query` respectent le Markdown pur et le flux Yjs lorsqu'un document est ouvert.
