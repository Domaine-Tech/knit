# Changelog — v0.2.0

> Version 0.2.0 — Réseau Peer-to-Peer & Synchronisation Multi-Pairs.
> Statut : 🚧 En cours (Sprint 3 validé ✅, Sprint 4 en attente)

---

## ✨ Nouveautés (Sprint 3)

- **Moteur P2P Iroh (B-013)** :
  - Intégration d'Iroh 1.3.0 en Rust dans `knit-core` pour la communication directe chiffrée de bout en bout via QUIC.
  - Canaux de communication multiplexés et ALPNs dédiés (`b"/knit/sync/1"` pour Yjs/Awareness, `b"/knit/blobs/1"` pour les fichiers médias).
- **Synchronisation Yjs via Iroh Streams (B-014)** :
  - Protocole de framing binaire 4-bytes Big-Endian robuste et transparent face aux variations de MTU et coupures QUIC.
  - Messages de protocole typés (`Handshake`, `HandshakeAck`, `YjsUpdate`, `YjsAwareness`, `Ping`, `Pong`).
  - Intégration CodeMirror 6 (`yCollab`) avec synchronisation temps réel des deltas Yjs et transmission bi-directionnelle avec exclusion de l'émetteur local.
- **Identité cryptographique décentralisée (B-015)** :
  - Génération de paires de clés Ed25519 persistées localement dans `.knit/identity/keypair.bin` (permissions restreintes `0600`).
  - Dérivation déterministe d'une palette de 10 teintes collaboratives (`hash(peer_id) % 10`) et initiales de collaborateurs.
  - Curseur collaboratif fin de 2px, sélection translucide (18% d'opacité) et badge d'identité collaborateur conforme à `UI_UX.md`.
- **Découverte automatique locale LAN (B-016)** :
  - Détection instantanée zéro-conf des pairs du même réseau local via mDNS (`mdns-sd`, service `_knit._udp.local.`).
  - Publication du nom du vault, du PeerId et de l'invitation dans les enregistrements TXT.
  - Notification automatique et connexion en un clic dans la modale Réseau P2P.
- **Protocole d'invitation WAN & LAN (B-017)** :
  - Génération de tickets d'invitation au format URI `knit://join/<base64url>` incluant le Node ID et les adresses réseau.
  - Modalité de connexion manuelle ou par simple clic, avec copie rapide dans le presse-papier.
- **Synchronisation P2P des médias via Iroh Blobs (B-017a)** :
  - Transfert P2P de pièces jointes du dossier `assets/` par flux QUIC dédiés.
  - Validation d'intégrité cryptographique par hachage BLAKE3 avant écriture disque protégée par `WriteGuard`.
- **Interface Utilisateur & Expérience Collaborative** :
  - Indicateur d'état P2P dans le Header avec badge de pairs connectés et modale de gestion réseau.
  - Badges d'avatars de collaborateurs en direct sur les fichiers ouverts dans l'arborescence de la sidebar, avec clic pour téléportation.
  - Pile d'avatars des collaborateurs actifs dans l'en-tête de l'éditeur Markdown.

---

## 🐛 Corrections

- Élimination des boucles de réémission en marquant l'origine des deltas Yjs (`origin: 'p2p'`).
- Robustesse face aux fermetures impromptues de flux QUIC avec reconnexion et heartbeat Ping/Pong.

---

## 🔧 Technique

- Sécurité hybride : aucun serveur central ni intermédiaire en LAN, relay purement aveugle et éphémère en WAN.
- Absence totale de base de données centrale : chaque nœud est souverain et héberge l'intégralité du vault.
- 0 warning `cargo clippy` et 0 warning `oxlint`, 27 tests unitaires et d'intégration validés.

---

## 💥 Breaking Changes

- Ajout de la structure `.knit/identity/` pour les clés Ed25519 de l'instance locale.
