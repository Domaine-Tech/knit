---
type: note
titre: Banc d'Essai Liens et Survol
statut: valider
priorite: haute
assigne: Thomas
tags: [demo, liens, navigation, hover-preview, live-preview]
id: DEMO-LIENS-001
---

# Banc d'Essai : Navigation et Survol des Liens dans Knit

Ce document valide le comportement complet des liens (WikiLinks, liens Markdown, URLs web, ancres et fichiers externes) au **survol (Hover Preview flottant)** et au **Ctrl + Clic**.

---

## 1. Liens dans les Tableaux Markdown GFM

Les tableaux sont rendus par le widget immersif `TableCardWidget`. Survolez chaque lien pour verifier l'apparition du tooltip avec l'icone et l'extrait contextuel. Maintenez **Ctrl** et cliquez pour naviguer.

| Type de Cible | Cible & Syntaxe | Statut / Role | Action au Ctrl + Clic |
| :--- | :--- | :---: | :--- |
| **WikiLink Simple** | [[document-long.md]] | `Existant` | Ouvre le document long dans un onglet Knit |
| **WikiLink avec Alias** | [[table.md|Vue Tableau Demo]] | `Vue Table` | Ouvre la vue Tableau filtrable |
| **Vue Kanban** | [[kanban.md|Tableau de bord Sprint]] | `Vue Kanban` | Bascule vers la vue Kanban interactive |
| **Code avec Barres** | `git log --oneline \| head -n 5` | `Terminal` | Barre verticale dans bloc de code inline |
| **Barre Echappee** | Syntaxe avec \| barre \| protegee | `Formatage` | Barres echappees au standard Markdown |
| **Lien avec Barre** | [Domaine-Tech \| GitHub](https://github.com/Domaine-Tech/knit) | `Internet` | Pipe dans l'intitule d'un lien Markdown standard |
| **Ancre Interne** | [[#3. Ancres et Defilement Integre]] | `Navigation` | Fait defiler la page jusqu'a la section 3 |
| **Lien Web Externe** | [GitHub Domaine-Tech/knit](https://github.com/Domaine-Tech/knit) | `Internet` | Lance le navigateur web par defaut |
| **URL Brute** | https://tauri.app | `Documentation` | Ouvre Tauri v2 dans le navigateur |
| **Dossier Local** | [Dossier .knit](./.knit/) | `Systeme` | Ouvre l'explorateur de fichiers de l'OS |
| **Nouvelle Note** | [[wiki/nouvelle-note]] | `Creation` | Propose et cree la nouvelle note dans le coffre |

---

## 2. Liens dans le Texte Libre et Listes de Taches

- [ ] Consulter l'architecture generale dans [[document-long.md]] !p1 @Thomas
- [x] Verifier les metadonnees de la vue [[table.md|Inventaire Composants]] !p2
- [ ] Tester le glisser-deposer dans le Kanban [[kanban.md]] !p2
- [ ] Consulter la documentation officielle sur [le site de Tauri](https://tauri.app)

Lien inline au milieu d'un paragraphe : vous pouvez verifier que [[document-long.md]] affiche l'apercu du texte sans les marqueurs frontmatter YAML.

---

## 3. Ancres et Defilement Integre

Cliquez sur l'ancre ci-dessous pour tester le defilement automatique :
- Aller au tableau des liens : [[#1. Liens dans les Tableaux Markdown GFM]]
- Aller aux callouts de test : [[#4. Liens dans les Callouts et Alertes GFM]]

---

## 4. Liens dans les Callouts et Alertes GFM

> [!NOTE]
> Information contextuelle sur la navigation : tous les liens internes sont resolus de maniere relative.
