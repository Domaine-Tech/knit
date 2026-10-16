# Sprint 3 — Iroh & Transport Réseau P2P

> Objectif : Intégrer la bibliothèque Iroh dans le backend Tauri, établir des canaux de communication chiffrés QUIC et synchroniser les documents Yjs entre pairs en LAN et WAN.

| Info | Détail |
|---|---|
| **Version** | v0.2.0 |
| **Durée** | 2026-11-17 → 2026-12-01 (2 semaines) |
| **Statut** | ✅ Terminé |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| B-013 | Intégrer Iroh dans le backend Rust de Tauri | 🔴 | ✅ | Antigravity |
| B-014 | Implémenter le transport Yjs sur les streams QUIC Iroh | 🔴 | ✅ | Antigravity |
| B-015 | Générer et gérer les keypairs Ed25519 (identité pair locale) | 🔴 | ✅ | Antigravity |
| B-016 | Implémenter la découverte LAN zéro-conf via mDNS (`mdns-sd`) | 🟠 | ✅ | Antigravity |
| B-017 | Implémenter le protocole d'invitation (code et URI `knit://join/...`) | 🟠 | ✅ | Antigravity |
| B-017a | Synchronisation P2P des médias (`assets/`) via Iroh Blobs | 🟠 | ✅ | Antigravity |

---

## Critères d'acceptation (DoD - Definition of Done)

- [x] Chaque instance de Knit génère une clé Ed25519 unique persistée dans `.knit/identity`.
- [x] Deux instances sur le même réseau local se découvrent mutuellement en moins de 3 secondes via mDNS.
- [x] Une invitation `knit://join/<ticket>` permet à deux pairs distants d'établir une session P2P chiffrée via le relay Iroh.
- [x] Taper un caractère dans l'éditeur sur PC A apparaît sur PC B en moins de 50ms sur le LAN.
- [x] Les images et fichiers dans `assets/` sont synchronisés par chunks BLAKE3 via Iroh Blobs.
- [x] Le transport résiste aux variations de MTU et aux micro-coupures de flux QUIC.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| — | — | — | — |

---

## Rétrospective

### Ce qui a bien marché
- Intégration modulaire d'Iroh 1.3.0 avec ALPNs distincts (`/knit/sync/1` et `/knit/blobs/1`) assurant un multiplexage propre des flux QUIC.
- Protocole de framing binaire 4-bytes Big-Endian robuste et détection zéro-conf en réseau local ultra-rapide via `mdns-sd`.
- Couplage réactif Yjs / CodeMirror 6 (`yCollab`) avec gestion d'awareness fine, curseurs collaboratifs 2px, sélections à 18% d'opacité et badges de présence cliquables dans l'arborescence.
- Synchronisation des pièces jointes et médias `assets/` validée cryptographiquement via BLAKE3 et protégée par `WriteGuard`.
- Couverture de tests solide (27 tests passants, test d'intégration bi-directionnel de collaboration P2P, zéro warning clippy/oxlint).

### Ce qu'on peut améliorer
- Anticiper le Sprint 4 pour le compactage périodique (snapshots) et la résolution de divergences après de longues sessions hors-ligne.
- Enrichir l'UI avec des métriques de débit et de qualité de liaison (latence RTT affichée, statut direct vs relayé par Iroh N0 relay).
