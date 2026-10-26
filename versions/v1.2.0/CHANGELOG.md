# Changelog — v1.2.0

> Livré. Sprint 10. Les 6 sources de version sont `1.2.0`.

## Nouveautés
- La personne (profil + clé Ed25519) vit dans le répertoire de données de l'application. Une seconde fenêtre prend un second profil.
- `.knitshare` porte un `id` UUID et un `nom` (`version: 2`). Le nom affiché vient de ce fichier, pas du dossier.
- Rejoindre un coffre copie les fichiers manquants après contrôle d'`id`. Un autre coffre déjà présent n'est pas écrasé.
- Les updates Yjs d'un fichier fermé sont conservées dans `.knit/crdt-state/` et rejouées à l'ouverture.

## Corrections
- Le nom diffusé n'est plus figé sur le défaut du démarrage réseau.
- Un pair déconnecté disparaît de la liste.

## Breaking Changes
- Protocole de handshake `1.2.0` : toute autre version, dont `0.2.0`, est refusée avant l'échange des notes. Deux coffres d'`id` différents ne fusionnent plus leurs notes.
- Un ancien `.knitshare` sans `id` reste lisible. L'`id` est ajouté au prochain open si le dossier contient déjà des notes.
