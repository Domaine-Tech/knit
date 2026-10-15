# Sprint 4 — Résilience, Snapshots & Mode Déconnecté

> Objectif : Gérer le mode hors-ligne prolongé, implémenter la compaction périodique de l'historique Yjs et valider la résilience du réseau face aux coupures.

| Info | Détail |
|---|---|
| **Version** | v0.2.0 |
| **Durée** | 2026-12-01 → 2026-12-15 (2 semaines) |
| **Statut** | 📋 Planifié |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-018 | Gestion déconnexion / reconnexion (rattrapage automatique des deltas Yjs) | 🔴 | 📋 | — |
| B-019 | Implémenter les snapshots et compaction Yjs (toutes les 200 opérations) | 🟠 | 📋 | — |
| B-020 | Stocker les snapshots compressés dans `.knit/snapshots/` | 🟡 | 📋 | — |
| B-021 | Test d'intégration multi-machines : synchro temps réel sur LAN | 🔴 | 📋 | — |
| B-022 | Test de partition réseau : un nœud déconnecté 1h converge parfaitement | 🟠 | 📋 | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [ ] L'espace disque utilisé par l'historique CRDT est borné grâce aux snapshots réguliers.
- [ ] Un utilisateur déconnecté peut continuer d'éditer ses fichiers en toute autonomie.
- [ ] À la reconnexion, l'échange d'état s'effectue automatiquement sans notification d'erreur agressive.
- [ ] En cas d'éditions concurrentes sur la même section, les règles déterministes de Yjs fusionnent le texte sans perte d'information.
- [ ] Les fichiers `.md` sur disque reflètent fidèlement l'état résolu après convergence.

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
