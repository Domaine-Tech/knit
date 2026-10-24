# Signature des mises à jour Tauri (Minisign)

Knit utilise `tauri-plugin-updater` avec des artefacts signés Minisign.

## Secrets GitHub Actions (jamais dans le dépôt)

| Secret | Contenu |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | Contenu littéral de la clé privée (ou chemin sur le runner) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Mot de passe de la clé (chaîne vide si aucune) |

La clé publique correspondante est scellée dans `knit-app/src-tauri/tauri.conf.json` (`plugins.updater.pubkey`).

## Générer une nouvelle paire de clés

```bash
cd knit-app
npx tauri signer generate -w ./knit-updater.key
```

1. Copier le contenu de `knit-updater.key.pub` dans `tauri.conf.json` → `plugins.updater.pubkey`.
2. Stocker le contenu de `knit-updater.key` dans le secret `TAURI_SIGNING_PRIVATE_KEY`.
3. Ne jamais committer `knit-updater.key` (déjà dans `.gitignore`).

Une paire locale peut exister dans `knit-app/knit-updater.key` (gitignored) pour les builds release Windows ; la clé publique correspondante est celle scellée dans `tauri.conf.json`.

## Endpoint

Les releases publient `latest.json` via `tauri-apps/tauri-action` :

`https://github.com/Domaine-Tech/knit/releases/latest/download/latest.json`
