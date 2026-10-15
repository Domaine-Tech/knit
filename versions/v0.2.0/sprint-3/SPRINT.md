# Sprint 3 — Iroh & Transport Réseau P2P

> Objectif : Intégrer la bibliothèque Iroh dans le backend Tauri, établir des canaux de communication chiffrés QUIC et synchroniser les documents Yjs entre pairs en LAN et WAN.

| Info | Détail |
|---|---|
| **Version** | v0.2.0 |
| **Durée** | 2026-11-17 → 2026-12-01 (2 semaines) |
| **Statut** | 📋 Planifié |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-013 | Intégrer Iroh dans le backend Rust de Tauri | 🔴 | 📋 | — |
| B-014 | Implémenter le transport Yjs sur les streams QUIC Iroh | 🔴 | 📋 | — |
| B-015 | Générer et gérer les keypairs Ed25519 (identité pair locale) | 🔴 | 📋 | — |
| B-016 | Implémenter la découverte LAN zéro-conf via mDNS (`mdns-sd`) | 🟠 | 📋 | — |
| B-017 | Implémenter le protocole d'invitation (code et URI `knit://join/...`) | 🟠 | 📋 | — |
| B-017a | Synchronisation P2P des médias (`assets/`) via Iroh Blobs | 🟠 | 📋 | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [ ] Chaque instance de Knit génère une clé Ed25519 unique persistée dans `.knit/identity`.
- [ ] Deux instances sur le même réseau local se découvrent mutuellement en moins de 3 secondes via mDNS.
- [ ] Une invitation `knit://join/<ticket>` permet à deux pairs distants d'établir une session P2P chiffrée via le relay Iroh.
- [ ] Taper un caractère dans l'éditeur sur PC A apparaît sur PC B en moins de 50ms sur le LAN.
- [ ] Les images et fichiers dans `assets/` sont synchronisés par chunks BLAKE3 via Iroh Blobs.
- [ ] Le transport résiste aux variations de MTU et aux micro-coupures de flux QUIC.

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
