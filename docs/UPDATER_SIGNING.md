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

## Expérience utilisateur (Sprint 9)

Le canal Minisign / `latest.json` est inchangé. L’UI orchestre un flux non bloquant :

| Politique (`localStorage` `knit-update-policy`) | Comportement |
|---|---|
| `auto` (défaut) | Contrôle ~8 s après le lancement, puis toutes les 6 h. Si l’utilisateur est **inactif** (~45 s sans clavier/souris) : téléchargement silencieux. S’il **travaille** : toast + modale de confirmation (pas d’install auto). Toast « prêt » + bandeau + Redémarrer. |
| `notify` | Même rythme de contrôle. Toast + modale de notes ; installation uniquement au clic. |
| `manual` | Aucun contrôle automatique. Bouton Paramètres / entrée tray uniquement. |

États exposés : `idle` → `checking` → `upToDate` | `available` | `failed` → `downloading` → `ready`.

- **Ignorer cette version** : clé `knit-update-skip-version` ; une version ultérieure réveille la notification.
- **Plus tard** (soft-dismiss session) : ferme la modale sans ignorer la version ; les contrôles silencieux (6 h) ne rouvrent ni toast ni modale jusqu’au prochain lancement. Le bandeau peut rester visible.
- **Hors Tauri (Vite)** : no-op ; bouton Paramètres désactivé.
- **Tray** : « Vérifier les mises à jour » (`knit-check-updates`) toujours actif ; « Redémarrer pour appliquer » (`knit-relaunch-for-update`) activé uniquement si l’état est `ready` (`set_tray_relaunch_enabled`). Un clic hors `ready` affiche un toast d’information (pas de relance).
- Préférence **machine** : jamais synchronisée via `.knitshare` ni écrite dans le Markdown du coffre.

Windows : `plugins.updater.windows.installMode = passive` (installeur silencieux / non bloquant).
