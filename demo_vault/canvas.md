---
type: canvas
title: Tableau blanc interactif (JSON-Canvas)
---

# Tableau Blanc Infini (JSON-Canvas)

Cette note s'ouvre en **vue Canvas** (`type: canvas`). Elle fournit une surface infinie avec pan/zoom, cartes déplaçables, connecteurs fléchés, et **ingestion par glisser-déposer de notes**.

```canvas
{
  "nodes": [
    {
      "id": "n1",
      "type": "file",
      "x": 60,
      "y": 180,
      "width": 240,
      "height": 110,
      "file": "accueil.md",
      "text": "Knit Workspace (Local-First)"
    },
    {
      "id": "n2",
      "type": "file",
      "x": 380,
      "y": 40,
      "width": 220,
      "height": 95,
      "file": "wiki/architecture.md",
      "text": "Moteur CRDT (Yjs + Iroh)"
    },
    {
      "id": "n3",
      "type": "file",
      "x": 380,
      "y": 180,
      "width": 220,
      "height": 95,
      "file": "blocs-dynamiques.md",
      "text": "Doc-Driven Views & Dataview"
    },
    {
      "id": "n8",
      "type": "file",
      "x": 380,
      "y": 320,
      "width": 220,
      "height": 95,
      "file": "liens-navigation.md",
      "text": "Graphe 2D & Navigation"
    },
    {
      "id": "n4",
      "type": "file",
      "x": 720,
      "y": 40,
      "width": 220,
      "height": 90,
      "file": "projet/agenda.md",
      "text": "Agenda & Echeancier du Projet"
    },
    {
      "id": "n5",
      "type": "file",
      "x": 720,
      "y": 150,
      "width": 220,
      "height": 90,
      "file": "kanban.md",
      "text": "Kanban Agile"
    },
    {
      "id": "n6",
      "type": "file",
      "x": 720,
      "y": 260,
      "width": 220,
      "height": 90,
      "file": "galerie.md",
      "text": "Galerie Multimedia"
    },
    {
      "id": "n7",
      "type": "file",
      "x": 720,
      "y": 370,
      "width": 220,
      "height": 90,
      "file": "diaporama.md",
      "text": "Diaporama Plein Ecran"
    }
  ],
  "edges": [
    { "id": "e1", "fromNode": "n1", "toNode": "n2" },
    { "id": "e2", "fromNode": "n1", "toNode": "n3" },
    { "id": "e3", "fromNode": "n1", "toNode": "n8" },
    { "id": "e4", "fromNode": "n3", "toNode": "n4" },
    { "id": "e5", "fromNode": "n3", "toNode": "n5" },
    { "id": "e6", "fromNode": "n3", "toNode": "n6" },
    { "id": "e7", "fromNode": "n3", "toNode": "n7" },
    { "id": "e8", "fromNode": "n8", "toNode": "n4" }
  ]
}
```

---

## Guide d'Utilisation du Canvas (Sprint 6ter)

- **Navigation fluide** : Cliquez-glissez sur le fond pour vous déplacer (Pan) ; utilisez la molette de la souris avec <kbd>Ctrl</kbd> (ou les boutons `+` / `−` de la barre d'outils) pour zoomer de 40% à 200%.
- **Déplacement de cartes avec élévation (Style Kanban)** : Glissez une carte pour la repositionner. Elle s'élève avec une bordure dorée `var(--knit-primary)` et une ombre projetée dynamique.
- **Ouverture directe** : Double-cliquez sur n'importe quelle carte liée à une note pour ouvrir l'onglet correspondant.
- **Glisser-Déposer de Notes (Cross-DnD)** : Glissez n'importe quel fichier `.md` depuis la barre latérale directement sur le tableau blanc pour instancier instantanément une carte liée aux coordonnées de votre curseur.
- **Ajout rapide** : Cliquez sur le bouton *"Ajouter une carte"* dans la barre supérieure pour poser une nouvelle note libre.
- **Bascule Source `</>`** : Retrouvez le format texte brut JSON-Canvas à tout moment en cliquant sur le bouton *Source*.
