# Changelog — v1.1.2

> Patch : licence open-source, UX Paramètres, updater respectueux de l’activité utilisateur.

## Nouveautés
- Licence duale **MIT OR Apache-2.0** (`LICENSE-MIT`, `LICENSE-APACHE`) ; badge README.
- Modale Paramètres : onglets (Apparence / Fichiers / Mises à jour / Réseau), thème séparé de la couleur d’accent, état d’onglet lisible.
- Updater politique `auto` : confirmation (toast + modale) si l’utilisateur est actif (~45 s) ; téléchargement silencieux seulement si inactif.
- Messages d’erreur updater humanisés en français (`formatUpdateError`).

## Corrections / Technique
- Header : pastille de teinte seule ; Paramètres avec icône `slider`.
- Icônes `palette` / `settings` ajoutées au registre (settings disponible, UI Paramètres sur `slider`).

## Breaking Changes
- Aucun.
