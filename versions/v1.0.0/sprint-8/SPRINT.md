# Sprint 8 — Distribution, Packaging & Polish Final

> Objectif : Finaliser les installateurs natifs, la barre d'état système, les tests bout-en-bout et livrer la version 1.0.0 prête pour la production.

| Info | Détail |
|---|---|
| **Version** | v1.0.0 |
| **Durée** | 2027-01-26 → 2027-02-09 (2 semaines) |
| **Statut** | 📋 Planifié |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-037 | Installateur Windows (`.msi` / `.exe` signés via Tauri) | 🔴 | 📋 | — |
| B-038 | Installateur Linux (`.AppImage` / `.deb` via Tauri) | 🔴 | 📋 | — |
| B-039 | Notifications système (connexion nouveau pair, fin de sync initiale) | 🟡 | 📋 | — |
| B-040 | Tray icon avec menu contextuel et indicateur d'état | 🟡 | 📋 | — |
| B-041 | Tests end-to-end automatisés (Tauri + 2 pairs virtuels en simultané) | 🟠 | 📋 | — |
| B-041a | Virtualisation de l'arborescence (Windowing Sidebar pour 50 000+ notes sans lag) | 🟠 | 📋 | — |
| B-050 | Cache LRU des Documents CRDT & Libération Mémoire (LRU Doc Cache max 20 Y.Docs) | 🟠 | 📋 | — |
| B-042 | README final + guide utilisateur + captures d'écran de référence | 🟠 | 📋 | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [ ] L'installateur Windows installe l'application proprement avec raccourcis et désinstallateur.
- [ ] L'AppImage Linux s'exécute sur Ubuntu/Debian/Fedora sans dépendances manquantes.
- [ ] L'icône de la barre des tâches indique si le nœud est connecté en LAN, WAN ou hors-ligne.
- [ ] Les tests E2E passent à 100% dans la CI.
- [ ] La documentation utilisateur est complète, claire et accompagnée d'exemples concrets.
- [ ] **Cache LRU & Performance Mémoire (B-050)** : Le gestionnaire CRDT borne à 20 le nombre de `Y.Doc` instanciés simultanément ; les documents inactifs sont compactés sur disque et déchargés de la RAM pour garantir une consommation < 60 Mo.

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
