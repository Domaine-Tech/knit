# Sprint 6bis — Moteur Dataview & Blocs Dynamiques

> Objectif : Déployer le moteur de requêtes frontmatter en mémoire et les blocs de code dynamiques (`knit-toc`, `knit-files`, `knit-query`, `knit-tasks`) qui projettent des données en direct sans jamais polluer les fichiers Markdown sous-jacents.

| Info | Détail |
|---|---|
| **Version** | v0.4.0 |
| **Durée** | 2027-01-12 → 2027-01-26 (2 semaines) |
| **Statut** | 📋 Planifié |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| **B-031e** | Moteur de requêtes Frontmatter & Indexation locale en mémoire (`vaultStore.queryFiles()`) | 🔴 | 📋 | — |
| **B-031f** | Bloc dynamique `knit-files` : index automatique d'un dossier (fichiers, icônes, date de mise à jour) | 🟠 | 📋 | — |
| **B-031g** | Bloc dynamique `knit-query` : tableaux et listes filtrables style Dataview (`from`, `where`, `columns`) | 🔴 | 📋 | — |
| **B-031h** | Bloc dynamique `knit-toc` : sommaire automatique cliquable de la note courante basé sur les titres | 🟠 | 📋 | — |
| **B-031i** | Bloc dynamique `knit-tasks` : agrégateur transversal de cases à cocher `- [ ]` synchronisé via CRDT | 🟠 | 📋 | — |
| **B-031j** | Déclencheurs Slash command (`/sommaire`, `/fichiers`, `/requete`, `/taches-globales`) | 🟡 | 📋 | — |
| **B-047** | Assistant Visuel de Tableaux Markdown (Interactive Table Helper avec navigation `Tab`) | 🟠 | 📋 | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [ ] L'index en mémoire extrait les frontmatters de toutes les notes du coffre en arrière-plan sans bloquer l'UI.
- [ ] Le bloc ```` ```knit-toc ```` génère un sommaire dynamique cliquable se mettant à jour à la frappe sans toucher au fichier physique.
- [ ] Le bloc ```` ```knit-files ```` liste les fichiers d'un dossier spécifié avec tri, icône et date de dernière modification.
- [ ] Le bloc ```` ```knit-query ```` supporte la syntaxe déclarative `from:`, `where:`, `sort:`, `columns:` et affiche un tableau interactif.
- [ ] Le bloc ```` ```knit-tasks ```` rassemble toutes les cases `- [ ]` du coffre ou d'un sous-dossier ; cocher une case dans le bloc dynamique coche la case correspondante dans le fichier source via Yjs.
- [ ] En mode Source `</>`, le bloc redevient un simple bloc de code Markdown modifiable manuellement.
- [ ] Les commandes Slash (`/sommaire`, `/fichiers`, etc.) insèrent les gabarits de blocs en 1 clic.
- [ ] Assistant de tableaux Markdown (B-047) : mini toolbar au survol d'un tableau GFM (`+ Ligne`, `+ Colonne`, `Alignement`, `Supprimer`), navigation par `Tab`/`Shift+Tab` et réalignement automatique des colonnes sans altération du texte libre.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| — | — | — | — |

---

## Rétrospective

*(À compléter à la fin du sprint)*

### Ce qui a bien marché
- 

### Ce qu'on peut améliorer
- 
