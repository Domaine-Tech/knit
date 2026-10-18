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

Cases a cocher `- [ ]` du dossier `projet` (et sous-dossiers). Cocher ici met a jour le fichier source via CRDT / ecriture disque.

```knit-tasks
from: "projet"
status: all
group_by: file
```

Taches encore a faire dans tout le coffre :

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
| knit-toc | 6bis | Livre |
| knit-query | 6bis | Livre |
| Agenda global | 6ter | Planifie |

---

## Sections pour le sommaire

### Architecture locale

L'index Frontmatter vit en memoire (`vaultStore.queryFiles()`). Aucune base opaque.

### Collaboration

Les mutations de `knit-tasks` et du statut dans `knit-query` respectent le Markdown pur et le flux Yjs lorsqu'un document est ouvert.
