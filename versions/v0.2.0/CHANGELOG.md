# Changelog — v0.2.0

> Version 0.2.0 — Réseau Peer-to-Peer & Synchronisation Multi-Pairs.
> Statut : 📋 Planifié

---

## ✨ Nouveautés

- **Moteur P2P Iroh** : Intégration d'Iroh en Rust pour la communication chiffrée de bout en bout directe via QUIC.
- **Synchronisation Yjs via Iroh Streams** : Canaux de synchronisation multiplexés pour propager les deltas CRDT en temps réel.
- **Identité cryptographique décentralisée** : Génération et gestion sécurisée de paires de clés Ed25519 locales pour chaque pair.
- **Découverte automatique locale (LAN)** : Détection des pairs sur le même réseau via mDNS (`mdns-sd`) sans configuration requise.
- **Protocole d'invitation WAN** : Génération et décodage de liens d'invitation sécurisés `knit://join/...` exploitant les relays Iroh aveugles.
- **Synchronisation des médias via Iroh Blobs** : Transfert P2P par morceaux vérifiés (BLAKE3) pour les images et pièces jointes du dossier `assets/`.
- **Gestion hors-ligne & résilience** :
  - Reconnexion automatique avec réconciliation sans conflit (catch-up Yjs).
  - Système de snapshots et compactage périodique (toutes les 200 ops) dans `.knit/snapshots/`.

---

## 🐛 Corrections

- *(Prévues durant les tests réseau du Sprint 4)*

---

## 🔧 Technique

- Sécurité hybride : aucun intermédiaire en LAN, relay purement aveugle et éphémère en WAN.
- Absence totale de base de données centrale : chaque nœud est souverain et héberge l'intégralité du vault.

---

## 💥 Breaking Changes

- Ajout de la structure `.knit/` pour les snapshots et l'identité de nœud.
