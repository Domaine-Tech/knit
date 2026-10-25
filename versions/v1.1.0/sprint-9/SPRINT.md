# Sprint 9 — Mise à Jour Fluide & Vérification Non Bloquante

> Objectif : Transformer l'auto-updater Tauri (Sprint 8) en expérience moderne : vérification différée, téléchargement silencieux, politiques utilisateur, bandeau discret et tray — sans reconstruire le canal Minisign / `latest.json`.

| Info | Détail |
|---|---|
| **Version** | v1.1.0 |
| **Durée** | 2026-10-25 → 2026-10-25 (clôturé) |
| **Statut** | ✅ Terminé |
| **Runtime** | 1.1.0 |

---

## Tâches du sprint

| # | Tâche | Priorité | Statut | Assigné |
|---|---|---|---|---|
| **B-117** | Vérification non bloquante (démarrage différé ~8 s, intervalle 6 h, manuel) et états d'erreur distincts | 🔴 Critique | ✅ Terminé | — |
| **B-118** | Téléchargement arrière-plan, politique `auto \| notify \| manual`, ignorer une version | 🔴 Critique | ✅ Terminé | — |
| **B-119** | UI : bandeau Header, barre de progression, toast de redémarrage, modale de notes | 🟠 Haute | ✅ Terminé | — |
| **B-120** | Entrées tray « Vérifier les mises à jour » / « Redémarrer pour appliquer » | 🟠 Haute | ✅ Terminé | — |
| **B-121** | Tests de la logique pure (progression cumulée, skip, no-op web) | 🟡 Moyenne | ✅ Terminé | — |

---

## Critères d'acceptation (DoD)

### 1. Vérification non bloquante (B-117)
- [x] Contrôle différé ~8 s après le lancement (Tauri uniquement), sans modale bloquante au boot.
- [x] Intervalle périodique 6 h tant que l'app est ouverte (politiques `auto` / `notify`).
- [x] États exposés : `idle | checking | upToDate | available | downloading | ready | failed`.
- [x] Erreur réseau / signature ≠ « à jour ».

### 2. Politique & arrière-plan (B-118)
- [x] Préférence machine `localStorage` (`knit-update-policy`), défaut `auto`.
- [x] `auto` : téléchargement silencieux + toast « prêt » + bandeau.
- [x] `notify` : toast + modale de notes, install au clic.
- [x] `manual` : aucun contrôle automatique.
- [x] « Ignorer cette version » mémorisée ; version ultérieure réveille la notification.

### 3. UI (B-119)
- [x] Bandeau fin Header (icône `download`), zéro emoji, tokens Knit.
- [x] Barre de progression réelle (octets cumulés / `contentLength`).
- [x] Modale notes : Plus tard / Ignorer / Installer / Redémarrer.
- [x] Paramètres : `KnitSelect` politique + bouton recherche + dernier contrôle / erreur.
- [x] Hors Tauri : bouton désactivé, tooltip « Disponible dans l'application installée ».

### 4. Tray (B-120)
- [x] Menu tray : « Vérifier les mises à jour ».
- [x] Si prêt : « Redémarrer pour appliquer » (événement frontend).

### 5. Tests & doc (B-121)
- [x] Tests unitaires logique pure (progression, skip).
- [x] `docs/UPDATER_SIGNING.md` documente le flux UX.
- [x] Signature Minisign, endpoint et `installMode: passive` inchangés.

### Hors périmètre
- B-114 (réplication join).
- Canal beta / canary.

---

## Ajouts en cours de sprint

> Tâches ajoutées au backlog pendant ce sprint.

| Date | Tâche ajoutée | Raison | Intégré au sprint ? |
|---|---|---|---|
| — | — | — | — |

---

## Architecture

```
knit-app/src/
├── types/updater.ts          # UpdatePolicy, UpdateStatus, KnitUpdateInfo…
├── stores/updateStore.ts     # État + politique + skip + orchestration
├── utils/updater.ts          # Wrapper plugin Tauri + progression cumulée
├── utils/updaterLogic.ts     # Logique pure testable
└── components/Updater/
    ├── UpdateModal.tsx       # Notes + barre + actions
    └── UpdateBanner.tsx      # Bandeau Header discret
```

---

## Rétrospective

### Ce qui a bien marché
- Réutilisation du canal Sprint 8 (Minisign / `latest.json`) sans rebuild packaging.
- Découpage logique pure / store / UI facilitant les tests unitaires.
- Clôture Prompt 10 : tray « Redémarrer » activé seulement en `ready` + soft-dismiss session « Plus tard ».

### Ce qu'on peut améliorer
- Feedback tray plus riche (badge / tooltip quand une update est prête).
- Canal beta / canary (hors périmètre volontaire).
