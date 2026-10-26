# Sprint 10 — Personnes, coffres distincts, join sûr

> Une personne n'est plus un dossier. Un coffre a un `id` stable. Rejoindre copie les notes seulement après ce contrôle, et n'écrase pas un autre travail.

| Info | Détail |
|---|---|
| **Version cible** | v1.2.0 |
| **Runtime livré** | 1.2.0 (les 6 sources sont alignées) |
| **Durée** | 2026-10-26 → 2026-10-26 (clôturé) |
| **Statut** | ✅ Terminé |
| **Protocole handshake** | `1.2.0` (indépendant du numéro d'application) |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| **B-122** | Identité personne hors coffre, verrou de slot, second profil | 🔴 Critique | ✅ Terminé | — |
| **B-123** | `id` + `nom` dans `.knitshare`, refus handshake si les id diffèrent | 🔴 Critique | ✅ Terminé | — |
| **B-114** | Réplication au join par manifeste, sans écraser un autre coffre | 🔴 Critique | ✅ Terminé | — |
| **B-124** | Updates Yjs des fichiers fermés dans `.knit/crdt-state` | 🟠 Haute | ✅ Terminé | — |

---

## Critères d'acceptation (DoD)

### 1. Personne (B-122)
- [x] Profil et clé Ed25519 dans le répertoire de données de l'application (`profiles/primary`, puis `slot-2` … `slot-8`).
- [x] La première fenêtre verrouille son slot. Une seconde fenêtre prend un autre slot.
- [x] Migration unique depuis un `.knit/identity/` de coffre, puis cette copie n'est plus la source P2P.
- [x] Le nom diffusé vient du profil enregistré (handshake, awareness, mDNS), y compris après modification.
- [x] Le libellé local est « (Vous) » à côté du vrai nom. Le mot « Moi » n'est plus le nom de démarrage.

### 2. Coffre (B-123)
- [x] `.knitshare` porte `nom` et `id` (UUID), schéma `version: 2`, lecture tolérante de l'ancien fichier.
- [x] Un coffre déjà rempli sans `id` en reçoit un au prochain open, sans changer le `nom`.
- [x] Handshake : `vault_id` obligatoire dès qu'un côté en a un. Id différent : session fermée avant tout `YjsUpdate`.
- [x] En-tête et registre affichent le `nom` du `.knitshare`.

### 3. Join (B-114)
- [x] Dossier vide ou coquille : copie du manifeste (Markdown, `.knitshare`, `assets/`). Le `nom` local devient celui de l'hôte.
- [x] Même `id` : fichiers manquants ajoutés ; chemins communs déjà ouverts fusionnés par Yjs ; pas de suppression distante silencieuse.
- [x] Fichier déjà présent avec un hash différent : conservé, signalé.
- [x] Autre `id`, ou dossier déjà rempli sans id : arrêt. Le wizard demande un autre dossier.
- [x] Aperçu du coffre distant et de l'hôte avant la copie. Barre de progression.

### 4. Fichiers fermés (B-124)
- [x] Une update Yjs pour un document absent de la mémoire est écrite dans `.knit/crdt-state/` et rejouée à l'ouverture.
- [x] Le rejeu n'est pas rediffusé comme une frappe locale.

### Hors périmètre
- Tag Git, push et Release (les 6 sources sont passées à `1.2.0` à la clôture, sans commit).
- Réécriture d'Iroh ou de Yjs.

---

## Ajouts en cours de sprint

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| 2026-10-26 | B-122, B-123, B-124 | Identité personne, garde-fou de coffre, persistance CRDT | Oui |
| 2026-10-26 | B-114 | Réplication manifeste (était Sprint 8+) | Oui, clôturé |

---

## Décisions

- Deux fenêtres sur le même compte Windows sont deux personnes, parce que le verrou de fichier est par processus.
- Deux coffres créés chacun de leur côté reçoivent deux `id`. Ils ne se synchronisent pas. Pour partager, l'un rejoint un dossier vide et adopte l'`id` de l'hôte.
- La réplication tire le manifeste du premier pair connecté. Chaque côté ramène les fichiers qui lui manquent.
- Le handshake exige le protocole `1.2.0`. Une autre version est refusée avant tout `YjsUpdate`. L'application est livrée en `1.2.0`.

---

## Rétrospective

### Ce qui a bien marché
- Une personne est un slot verrouillé dans le répertoire applicatif. Deux fenêtres ne partagent pas la même clé.
- Deux coffres créés chacun de leur côté reçoivent deux `id` et ne fusionnent pas leurs notes.
- Le manifeste ajoute les fichiers manquants et n'efface rien. Un hash différent est conservé et signalé.

### Ce qu'on peut améliorer
- Le verrou de slot n'est prouvé qu'entre processus. Le test unitaire relâche le premier verrou avant le second appel.
- Tag Git et Release CI restent un Prompt 11 : cette clôture aligne les sources, elle ne pousse pas.
