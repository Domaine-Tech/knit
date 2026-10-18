---
type: slides
title: Présentation Knit
---

# Knit v0.4.0
### Workspace Collaboratif Local-First en Markdown Pur
*Zéro serveur central · Zéro format propriétaire · Résilience P2P*

---

## Les Piliers Fondamentaux de Knit
- **Local-First Absolu** : Vos notes sont de simples fichiers `.md` stockés sur votre disque dur.
- **Réseau P2P Sécurisé** : Synchronisation temps réel via Iroh (streams QUIC, chiffrement Ed25519).
- **Moteur CRDT Yjs** : Résolution mathématique des conflits sans écrasement de contenu.
- **Zéro Verrouillage** : Compatible 100% avec Obsidian, VS Code, Git et n'importe quel outil Markdown.

---

## Doc-Driven Views (L'Architecture Réversible)
*Une seule note, plusieurs représentations visuelles sans base opaque :*
- `type: note` : Éditeur Live Preview élégant inspiré d'Obsidian.
- `type: kanban` : Tableaux agiles multi-colonnes réordonnables.
- `type: calendar` : Agenda complet et échéancier du coffre.
- `type: canvas` : Tableau blanc infini JSON-Canvas.
- `type: slides` : Diaporama plein écran style Marp/Slidev.
- `type: gallery` : Base de données visuelle par cartes.

---

## Sprint 6bis — Dataview & Blocs Dynamiques
- Sommaire automatique à la frappe : ` ```knit-toc ` ou `/sommaire`
- Index réactif de dossiers : ` ```knit-files ` ou `/fichiers`
- Tableaux de requêtes déclaratives : ` ```knit-query ` ou `/requete`
- Agrégateur transversal de tâches : ` ```knit-tasks ` ou `/taches-globales`
- Assistant de tableaux interactifs avec navigation <kbd>Tab</kbd> et alignement contextuel.

---

## Sprint 6ter — Vues Immersives & Drag-and-Drop Unifié
- **D&D Calqué sur le Kanban** : Ligne lumineuse d'insertion `CalendarDropIndicator`, sustentation fantôme 0.35, surbrillance des conteneurs cibles.
- **Cross-DnD** : Glisser des cartes Kanban vers l'Agenda pour les planifier, ou des notes de l'arbre sur le Canvas.
- **Graphe 2D Interactif** : Visualisation en réseau de force de vos WikiLinks.
- **HTML Standardisé Sécurisé** : `<kbd>`, `<u>`, `<mark>`, `<details>`, `<summary>` sans risque XSS.

---

## Raccourcis Clavier & Contrôles
- **Diapositive suivante** : <kbd>→</kbd>, <kbd>Espace</kbd>, <kbd>PageDown</kbd>
- **Diapositive précédente** : <kbd>←</kbd>, <kbd>PageUp</kbd>
- **Plein écran immersif** : Touche <kbd>F</kbd>
- **Quitter le plein écran** : <kbd>Échap</kbd>
- **Mode Source** : Bouton *Source* dans la barre d'onglets pour modifier le Markdown.
