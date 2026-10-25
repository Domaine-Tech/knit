# Changelog — v1.1.0

> Mise à jour fluide : vérification non bloquante, téléchargement silencieux et politiques utilisateur (Sprint 9).

## Nouveautés
- **Updater fluide** : contrôle différé (~8 s) et périodique (6 h), sans modale bloquante au démarrage.
- **Politiques** (`auto` / `notify` / `manual`) en préférence machine (`localStorage`).
- **Téléchargement silencieux** (mode auto) avec toast « Knit x.y.z est prêt » et action Redémarrer.
- **Bandeau Header** discret + barre de progression réelle + « Ignorer cette version ».
- **Tray** : « Vérifier les mises à jour » et « Redémarrer pour appliquer ».

## Corrections
- Les erreurs réseau / signature ne sont plus affichées comme « à jour ».
- Progression d'installation cumulée correctement (chunks `Progress` + `contentLength`).

## Technique
- `updateStore` + `updaterLogic` (tests unitaires) ; types dans `src/types/updater.ts`.
- Tray « Redémarrer pour appliquer » activé uniquement si `ready` (`set_tray_relaunch_enabled`) ; soft-dismiss session « Plus tard ».
- Canal Minisign / `latest.json` / `installMode: passive` inchangé (Sprint 8).
- Doc UX : `docs/UPDATER_SIGNING.md`.

## Breaking Changes
- Aucun (rétrocompatible avec v1.0.0).
