# Changelog — v0.2.0

> Version 0.2.0 — Réseau Peer-to-Peer, Snapshots Cryptographiques & Profils Utilisateurs Décentralisés.
> Statut : ✅ Validé & Terminé (Sprint 3 ✅ & Sprint 4 ✅)

---

## ✨ Nouveautés (Sprint 4 — Résilience, Snapshots & Identité Utilisateur)

- **Gestion des déconnexions et rattrapage d'état automatique (B-018)** :
  - Protocole de réconciliation en deux temps (`SyncStep1` et `SyncStep2`) permettant à deux pairs qui se reconnectent de comparer leurs vecteurs d'état Yjs et de n'échanger que les deltas manquants.
  - Convergence déterministe immédiate sans conflit ni duplication après interruption réseau.
- **Compaction et snapshots périodiques Yjs (B-019)** :
  - Déclenchement automatique d'un snapshot compacté toutes les 200 opérations de frappe/édition par document.
  - Calcul et persistance du vecteur d'état (`state_vector_base64`) et du snapshot binaire compressé (`yjs_snapshot_base64`).
- **Bornage d'espace disque & Élagage dans `.knit/snapshots/` (B-020)** :
  - Stockage structuré dans `.knit/snapshots/{doc_id_slug}/` des fichiers snapshots JSON horodatés.
  - Élagage automatique conservant au maximum 50 snapshots par document pour empêcher l'inflation de l'historique CRDT.
  - Pré-chargement instantané du dernier snapshot compacté à l'ouverture de document pour accélérer l'initialisation CRDT.
- **Profil utilisateur enrichi & UI dédiée (B-020a)** :
  - Stockage décentralisé du profil dans `.knit/identity/profile.json` (`first_name`, `last_name`, `display_name`, `email`, `role`, `status_message`, `share_email_p2p`, `avatar`).
  - Composant `ProfileModal` accessible depuis le Header ou la modale Réseau, offrant une édition complète avec prévisualisation.
  - Badge d'avatar cliquable dans la barre d'en-tête (Header) avec infobulle et statut collaborateur.
- **Synchronisation P2P d'avatars personnalisés via Iroh Blobs (B-020b)** :
  - Support des photos de profil PNG/JPEG avec hachage cryptographique BLAKE3 et distribution P2P via l'ALPN `/knit/blobs/1`.
  - Fallback déterministe automatique sur les initiales et la palette collaborative de 10 teintes harmonieuses si aucun avatar personnalisé n'est configuré.
  - Commande native `load_avatar_base64` pour un affichage sécurisé et sans blocage de scope en environnement de bureau.
- **Signatures Ed25519 des snapshots, Privacy Toggle & Auto-config Git (B-020c)** :
  - Signature cryptographique Ed25519 systématique de chaque snapshot assurant l'authenticité et la non-répudiation des versions.
  - **Mode Confidentialité / Zéro-Fuite** : interrupteur de confidentialité empêchant la diffusion de l'e-mail sur le réseau P2P tout en préservant la signature locale. Badge visuel `🔒 Zéro-Fuite` affiché pour les pairs protecteurs.
  - **Auto-configuration Git locale** : synchronisation en un clic des paramètres `user.name` et `user.email` du dépôt Git local du vault (`.git/config`).
- **Tests d'intégration réseau & résilience aux coupures (B-021 & B-022)** :
  - Test d'intégration automatisé `test_peer_profile_exchange_and_privacy_handshake` validant l'échange de profil et le masquage d'email.
  - Test d'intégration automatisé `test_network_partition_and_offline_yjs_catchup` prouvant la convergence mathématique de deux nœuds isolés ayant édité indépendamment puis reconnectés.
  - Test d'intégration automatisé `test_custom_avatar_p2p_sync_via_blobs` validant la distribution d'avatar par flux QUIC blob et vérification BLAKE3.

---

## ✨ Nouveautés (Sprint 3 — Iroh & Transport P2P)

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

## 🐛 Corrections & Optimisations

- Rechargement fluide des avatars sous forme de flux Base64 sans nécessiter de permissions `asset:` spéciales.
- Isolation stricte des flux QUIC blobs avec `send.finish()` et `conn.closed().await` évitant les resets de flux intempestifs.
- Pruning automatique des snapshots limitant la consommation disque à moins de 50 versions par document.

---

## 🔧 Métriques Techniques & Qualité

- **Tests automatisés** : 33 tests unitaires et d'intégration validés en Rust (`cargo test --workspace` : 0 échec).
- **Linter & Compilateur Rust** : 0 warning avec `cargo clippy --workspace -- -D warnings`.
- **Linter & Compilateur TypeScript** : 0 warning et 0 erreur avec `oxlint` et `tsc -b`.
