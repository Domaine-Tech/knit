---
type: note
titre: Test Exhaustif des Liens et Survol
statut: valider
priorite: haute
assigne: Thomas
tags: [test, liens, navigation, hover-preview, live-preview]
id: TEST-LIENS-001
---

# Banc d'Essai : Navigation et Survol des Liens dans Knit

Ce document valide le comportement complet des liens (WikiLinks, liens Markdown, URLs web, ancres et fichiers externes) au **survol (Hover Preview flottant)** et au **Ctrl + Clic**.

---

## 1. Liens dans les Tableaux Markdown GFM

Les tableaux sont rendus par le widget immersif `TableCardWidget`. Survolez chaque lien pour vérifier l'apparition du tooltip avec l'icône et l'extrait contextuel. Maintenez **Ctrl** et cliquez pour naviguer.

| Type de Cible | Cible & Syntaxe | Statut / Rôle | Action au Ctrl + Clic |
| :--- | :--- | :---: | :--- |
| **WikiLink Simple** | [[test-long-document.md]] | `Existant` | Ouvre le document long dans un onglet Knit |
| **WikiLink avec Alias** | [[test-table.md|Vue Tableau Démo]] | `Vue Table` | Ouvre la vue Tableau filtrable |
| **Vue Kanban** | [[test-kanban.md|Tableau de bord Sprint]] | `Vue Kanban` | Bascule vers la vue Kanban interactive |
| **Code avec Barres** | `git log --oneline \| head -n 5` | `Terminal` | Barre verticale dans bloc de code inline |
| **Barre Échappée** | Syntaxe avec \| barre \| protégée | `Formatage` | Barres échappées au standard Markdown |
| **Lien avec Barre** | [Domaine-Tech \| GitHub](https://github.com/Domaine-Tech/knit) | `Internet` | Pipe dans l'intitulé d'un lien Markdown standard |
| **Ancre Interne** | [[#3. Ancres et Défilement Intégré]] | `Navigation` | Fait défiler la page jusqu'à la section 3 |
| **Lien Web Externe** | [GitHub Domaine-Tech/knit](https://github.com/Domaine-Tech/knit) | `Internet` | Lance le navigateur web par défaut |
| **URL Brute** | https://tauri.app | `Documentation` | Ouvre Tauri v2 dans le navigateur |
| **Dossier Local** | [Dossier .knit](./.knit/) | `Système` | Ouvre l'explorateur de fichiers de l'OS |
| **Fichier Externe** | [Cahier des charges](./spec.docx) | `Bureautique` | Ouvre Microsoft Word ou le logiciel associé |
| **Nouvelle Note** | [[wiki/nouvelle-idee-projet]] | `Création` | Propose et crée la nouvelle note dans le coffre |

---

## 2. Liens dans le Texte Libre et Listes de Tâches

- [ ] Consulter l'architecture générale dans [[test-long-document.md]] !p1 @Thomas
- [x] Vérifier les métadonnées de la vue [[test-table.md|Inventaire Composants]] !p2
- [ ] Tester le glisser-déposer dans le Kanban [[test-kanban.md]] !p2
- [ ] Consulter la documentation officielle sur [le site de Tauri](https://tauri.app)
- [ ] Ouvrir le dossier de configuration locale : [Configuration](./.knit/)

Lien inline au milieu d'un paragraphe : vous pouvez vérifier que [[test-long-document.md]] affiche l'aperçu du texte sans les marqueurs frontmatter YAML.

---

## 3. Ancres et Défilement Intégré

Cliquez sur l'ancre ci-dessous pour tester le défilement automatique :
- Aller au tableau des liens : [[#1. Liens dans les Tableaux Markdown GFM]]
- Aller aux callouts de test : [[#4. Liens dans les Callouts et Alertes GFM]]

---

## 4. Liens dans les Callouts et Alertes GFM

> [!NOTE]
> Information contextuelle : vous pouvez également survoler et cliquer sur des liens situés à l'intérieur d'alertes, comme [[test-long-document.md]] ou [le site GitHub](https://github.com/Domaine-Tech/knit).

> [!TIP]
> Astuce de navigation : la combinaison **Ctrl + Clic** fonctionne de façon uniforme dans l'ensemble de Knit :
> - En mode Live Preview (Obsidian-style)
> - En mode Source brute (CodeMirror)
> - Dans les cellules de tableaux GFM
> - Dans les vues Doc-Driven (Tableau et Kanban)
