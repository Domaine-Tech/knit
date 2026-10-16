# Sprint 4 — Résilience, Snapshots & Identité Utilisateur Enrichie

> Objectif : Gérer le mode hors-ligne prolongé, implémenter la compaction périodique de l'historique Yjs, valider la résilience du réseau face aux coupures, et doter Knit d'un système complet de profil utilisateur décentralisé (Nom, Prénom, Email, Avatar P2P Iroh Blobs, Signatures Ed25519 et Privacy Toggle).

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
| B-020a | Profil utilisateur enrichi (Nom, Prénom, Email, Rôle & Statut) dans `.knit/identity/profile.json` & UI | 🟠 | 📋 | — |
| B-020b | Synchronisation P2P d'avatars personnalisés via Iroh Blobs & fallback automatique initiales/teintes | 🟠 | 📋 | — |
| B-020c | Signatures cryptographiques Ed25519 des snapshots, Privacy Toggle & interfaçage Git auto | 🟡 | 📋 | — |
| B-021 | Test d'intégration multi-machines : synchro temps réel sur LAN | 🔴 | 📋 | — |
| B-022 | Test de partition réseau : un nœud déconnecté 1h converge parfaitement | 🟠 | 📋 | — |

---

## Critères d'acceptation (DoD - Definition of Done)

- [ ] L'espace disque utilisé par l'historique CRDT est borné grâce aux snapshots réguliers.
- [ ] Le profil utilisateur (`Nom`, `Prénom`, `Email optionnel`, `Rôle`, `Statut`) est persisté dans `.knit/identity/profile.json` et éditable directement depuis l'UI Knit.
- [ ] L'avatar photo personnalisé (PNG/JPEG) est stocké localement, haché en BLAKE3 et propagé en P2P direct aux pairs connectés via Iroh Blobs.
- [ ] Un mode « Confidentialité / Zéro-Fuite » (Privacy Toggle) permet d'empêcher la diffusion de l'adresse email sur le réseau P2P tout en la conservant pour la traçabilité locale et Git.
- [ ] Chaque snapshot dans `.knit/snapshots/` consigne l'identité cryptographique de l'auteur et est signé par la clé Ed25519 locale (non-répudiation).
- [ ] Le profil utilisateur permet l'auto-configuration des commits Git (`git config user.name / user.email`) sans saisie terminal manuelle.
- [ ] Un utilisateur déconnecté peut continuer d'éditer ses fichiers en toute autonomie.
- [ ] À la reconnexion, l'échange d'état s'effectue automatiquement sans notification d'erreur agressive.
- [ ] En cas d'éditions concurrentes sur la même section, les règles déterministes de Yjs fusionnent le texte sans perte d'information.
- [ ] Les fichiers `.md` sur disque reflètent fidèlement l'état résolu après convergence.

---

## Spécifications techniques du Profil & Traçabilité (B-020a / b / c)

### 1. Format du fichier `.knit/identity/profile.json`

```json
{
  "first_name": "Thomas",
  "last_name": "H.",
  "display_name": "Thomas H.",
  "email": "thomas@example.com",
  "role": "Architecte Produit",
  "status_message": "✍️ En rédaction",
  "share_email_p2p": false,
  "avatar": {
    "type": "custom",
    "blake3_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "mime_type": "image/png"
  },
  "created_at_sec": 1731840000,
  "updated_at_sec": 1731840000
}
```

### 2. Format des métadonnées d'auteur dans les snapshots (`.knit/snapshots/`)

```json
{
  "snapshot_id": "snap-20261201-143000",
  "doc_id": "wiki/architecture.md",
  "state_vector_base64": "...",
  "yjs_snapshot_base64": "...",
  "created_at_sec": 1731840000,
  "author": {
    "peer_id": "12D3KooW...",
    "display_name": "Thomas H.",
    "email": "thomas@example.com",
    "role": "Architecte Produit",
    "ed25519_signature": "..."
  }
}
```

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
