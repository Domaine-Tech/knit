---
type: note
titre: HTML Securise en Live Preview
statut: en-cours
priorite: haute
assigne: vault
tags: [demo, html, security, sanitize, sprint-6ter, B-059]
id: DEMO-HTML-001
---

# HTML Securise en Live Preview (B-059)

Banc d'essai exhaustif de la whitelist HTML projetee hors curseur. Le Markdown reste du texte standard sur disque ; le Live Preview assainit et stylise uniquement les balises autorisees.

> [!TIP]
> Placez le curseur **dans** une balise pour retrouver le source editable. Hors curseur, le widget masque le balisage.
> Basculez en mode Source avec <kbd>Ctrl+E</kbd> pour editer le HTML brut.

> [!WARNING]
> Toute balise hors whitelist (`<script>`, `<iframe>`, `<style>`, attributs `onclick`, etc.) est neutralisee. Voir la section [Securite anti-XSS](#6-securite-anti-xss).

---

## Sommaire

```knit-toc
depth: 2
collapsible: true
```

---

## 1. Touches clavier `<kbd>`

Les raccourcis Knit s'affichent comme des touches bombees :

| Action | Sequence |
| :--- | :--- |
| Quick Switcher | <kbd>Ctrl</kbd> + <kbd>O</kbd> |
| Palette de commandes | <kbd>Ctrl</kbd> + <kbd>P</kbd> |
| Source / Live Preview | <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Mode Zen | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>F</kbd> |
| Note quotidienne | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>J</kbd> |
| Diaporama plein ecran | <kbd>F</kbd> puis <kbd>Echap</kbd> pour quitter |

Combinaisons dans une phrase : ouvrez le fichier avec <kbd>Ctrl</kbd>+<kbd>O</kbd>, puis basculez avec <kbd>Ctrl</kbd>+<kbd>E</kbd>.

---

## 2. Soulignement & surlignage

- Soulignement semantique : <u>passage souligne discretement</u> sans confondre avec un lien.
- Surlignage feutre : <mark>element critique</mark> qui attire l'oeil sans neon.
- Melange Markdown + HTML : **gras** et <mark>surlignage</mark>, *italique* et <u>souligne</u>.
- Dans une tache : - [ ] Relire le <mark>contrat d'API</mark> avant merge !p1 @Thomas

---

## 3. Indices, exposants & saut de ligne

Formules et unites :

- Eau : H<sub>2</sub>O — dioxyde de carbone : CO<sub>2</sub>
- Relativite : E = mc<sup>2</sup>
- Puissances : 2<sup>10</sup> = 1024 — unites : m<sup>3</sup>, km<sup>2</sup>
- Chimie organique : C<sub>6</sub>H<sub>12</sub>O<sub>6</sub>

Retour a la ligne force (`<br>`) sans nouveau paragraphe :

Premier vers d'un couplet<br>
Deuxieme vers colle juste en dessous<br>
Troisieme vers — utile pour adresses ou poesie courte.

---

## 4. Accordeons `<details>` / `<summary>`

### Ferme par defaut

<details>
<summary>Architecture P2P & chiffrement (cliquer pour ouvrir)</summary>

Contenu masque jusqu'au clic :
- Synchronisation **Iroh** (QUIC) de bout en bout
- Fichiers `.md` en clair sur le disque local
- `.knit/` strictement local ; la cle de personne est hors du coffre
- `.knitshare` porte `nom` et `id`, replique entre les dossiers du meme coffre
- Voir aussi [[wiki/architecture.md|Architecture Technique]]
</details>

### Ouvert par defaut (`open`)

<details open>
<summary>Checklist de livraison B-059 (deja deployee)</summary>

- [x] Whitelist inline `<kbd>` `<u>` `<mark>` `<sub>` `<sup>` `<br>`
- [x] Blocs `<details>` / `<summary>`
- [x] Sanitizer partage avec `renderSimpleMarkdown`
- [x] Masquage hors curseur / edition au curseur
</details>

### Accordeon avec tableau & liens

<details>
<summary>Tableau de conformite whitelist</summary>

| Balise | Role | Exemple rendu |
| :--- | :--- | :--- |
| `<kbd>` | Touche clavier | <kbd>Enter</kbd> |
| `<u>` | Soulignage | <u>texte</u> |
| `<mark>` | Surlignage | <mark>alerte</mark> |
| `<sub>` / `<sup>` | Indice / exposant | H<sub>2</sub>O / x<sup>2</sup> |
| `<br>` | Saut force | ligne A<br>ligne B |
| `<details>` | Accordeon | voir sections ci-dessus |

Navigation : [[live-preview.md|Live Preview complet]] · [[accueil.md|Accueil]] · [[liens-navigation.md|Liens & Survol]]
</details>

### Accordeons empiles

<details>
<summary>FAQ — Puis-je utiliser du HTML libre ?</summary>

Non. Knit n'autorise **que** la whitelist ci-dessus. Le reste est strippe pour proteger le coffre local et les pairs P2P.
</details>

<details>
<summary>FAQ — Ou est la spec officielle ?</summary>

`docs/MARKDOWN_SPEC.md` §8 (B-059). Tache de reference : [[projet/taches/task-012-support-html-securise.md|task-012]].
</details>

---

## 5. Composition dans le reste du Markdown

Callout avec HTML inline :

> [!NOTE]
> Raccourci Quick Switcher : <kbd>Ctrl</kbd>+<kbd>O</kbd>. Point <mark>critique</mark> : ne jamais injecter de script dans une note partagee.

Liste a puces mixte :

1. Ouvrir [[kanban.md|le Kanban]]
2. Filtrer les cartes <mark>bloquantes</mark>
3. Valider avec <kbd>Ctrl</kbd>+<kbd>S</kbd> (sauvegarde auto deja active)

Citation :

> La formule H<sub>2</sub>O reste lisible en Markdown pur meme sans Knit.
> Le Live Preview ajoute seulement la projection visuelle.

---

## 6. Securite anti-XSS

Ce qui **est neutralise** (ne s'affiche pas / n'execute rien) :

| Intrusion | Traitement |
| :--- | :--- |
| `<script>…</script>` | Balise retiree |
| `<iframe src="…">` | Balise retiree |
| `<style>…</style>` | Balise retiree |
| `onclick="…"` / `onerror="…"` | Attribut retire |
| `javascript:` dans `href`/`src` | URL neutralisee |
| `<div>`, `<span>`, `<img>`, etc. | Hors whitelist → strip |

Exemple pedagogique (apres assainissement, seul le texte survit) :

Avant assainissement (source) : une balise `script` malveillante serait retiree.
Apres : seul le texte utile demeure — <mark>aucune execution</mark>.

---

## 7. Edition & comportement Live Preview

| Situation | Comportement |
| :--- | :--- |
| Curseur **hors** de la balise | Widget rendu (touches, mark, accordeon) |
| Curseur **dans** la balise / le bloc | Source HTML visible et editable |
| Double-clic / mode Source | Fence et HTML bruts (`Ctrl+E`) |
| Contenu P2P distant | Meme sanitizer a l'arrivee |

> [!TIP]
> Pour un tour d'horizon Live Preview (taches, Mermaid, images, callouts), ouvrez [[live-preview.md]]. Cette note se concentre sur **B-059 uniquement**.

---

*Spec : `docs/MARKDOWN_SPEC.md` §8 · Sprint 6ter · Tache [[projet/taches/task-012-support-html-securise.md|task-012]]*
