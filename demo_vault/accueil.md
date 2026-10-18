---
type: note
titre: Bienvenue dans Knit
tags: [accueil, guide, sprint-6bis, local-first]
---

# Bienvenue dans Knit

Knit est votre environnement de documentation, de wiki et de gestion de projet **Local-First**, **Peer-to-Peer** et en **Markdown Pur**.

> [!NOTE]
> Zero base de donnees cachee ni format proprietaire : vos notes restent lisibles avec n'importe quel editeur de texte (Obsidian, VS Code, micro, Vim).

![Logo Knit](assets/logo-knit.svg)

---

## Decouverte des Vues Pilotees par le Document (Doc-Driven Views)

Explorez les modules interactifs complets inclus dans ce coffre :

- [[blocs-dynamiques.md|Blocs Dynamiques & Dataview (Sprint 6bis)]] : `knit-toc`, `knit-files`, `knit-query`, `knit-tasks`, slash `/sommaire`… et assistant de tableaux.
- [[live-preview.md|Demonstration Live Preview]] : Rendu Obsidian, 7 statuts, priorites `!p1`-`!p3`, images `assets/`, callouts, blocs de code, Mermaid reactif a `--knit-hue`.
- [[kanban.md|Tableau Kanban]] : Vue de gestion agile (`type: kanban`) avec colonnes thematiques, glisser-deposer de cartes et synchronisation Markdown.
- [[table.md|Vue Synthetique Tableau]] : Vue tableau filtrable et triable (`type: table`).
- [[liens-navigation.md|Navigation & Retroliens]] : WikiLinks `[[...]]`, ancres internes `[[#...]]`, apercu au survol (Hover Preview) et retroliens.
- [[document-long.md|Test de Performance Document Long]] : Banc d'essai dense pour valider la reactivite du Live Preview.
- [[wiki/architecture.md|Architecture Technique]] & [[wiki/piliers.md|Les 9 Piliers de Knit]].

---

## Capacites demontrees dans ce coffre

| Domaine | Contenu demo | Note de reference |
| :--- | :--- | :--- |
| Live Preview | Titres, taches, formatage, tableaux, code, Mermaid, callouts | [[live-preview.md]] |
| Medias | `![...](assets/...)`, SVG locaux, URL https, collage Ctrl+V | [[live-preview.md#9. Images et Medias Locaux (assets/)]] |
| Dataview | `knit-toc`, `knit-files`, `knit-query`, `knit-tasks` | [[blocs-dynamiques.md]] |
| Vues Doc-Driven | `type: note`, `kanban`, `table`, `tache` | [[kanban.md]], [[table.md]] |
| Navigation | WikiLinks, ancres, hover, liens dans callouts | [[liens-navigation.md]] |
| Journal | Note quotidienne `journal/YYYY-MM-DD.md` | [[journal/2026-10-17.md]] |

Les taches d'exemple pour les requetes se trouvent dans [[projet/taches/task-001-index-frontmatter.md|projet/taches/]]. Les medias sont dans le dossier `assets/`.

---

## Sprint 6bis — Apercu rapide

| Bloc / Fonction | Slash | Role |
| :--- | :--- | :--- |
| `knit-toc` | `/sommaire` | Sommaire cliquable de la note |
| `knit-files` | `/fichiers` | Index automatique d'un dossier |
| `knit-query` | `/requete` | Tableau Dataview (`from` / `where` / `columns`) |
| `knit-tasks` | `/taches-globales` | Agregateur de cases `- [ ]` transversal |
| Assistant tableaux | — | Toolbar `+ Ligne` / `+ Colonne` / Alignement |

---

## Raccourcis Clavier Essentiels

| Action | Raccourci Clavier | Description |
| :--- | :---: | :--- |
| **Sauter a un fichier** | <kbd>Ctrl+O</kbd> | Quick Switcher instantane avec recherche floue |
| **Palette de commandes** | <kbd>Ctrl+P</kbd> | Liste de toutes les actions applicatives |
| **Bascule Source / Live Preview** | <kbd>Ctrl+E</kbd> | Permute entre Markdown brut et vue visuelle |
| **Scinder l'espace de travail** | <kbd>Ctrl+\\</kbd> | Split View avec groupes d'onglets independants |
| **Mode Zen Immersif** | <kbd>Ctrl+Shift+F</kbd> | Masque les barres pour une concentration totale |
| **Note Quotidienne** | <kbd>Ctrl+Shift+J</kbd> | Ouvre ou genere le journal du jour |
| **Packager Contexte IA** | <kbd>Ctrl+Shift+C</kbd> | Copie la note propre pour les agents IA |

> [!TIP]
> Les raccourcis Split / Zen / Hover Preview sont des gestes UI : ils ne s'ecrivent pas dans le Markdown mais sont pleinement disponibles dans l'application.

---

*Selectionnez un fichier dans la barre laterale ou cliquez sur l'un des liens ci-dessus pour debuter.*
