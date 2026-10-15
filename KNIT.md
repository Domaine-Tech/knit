# Instructions pour les agents IA

> Ce fichier est lu automatiquement par les agents IA (Cursor, Claude Code, Antigravity) lorsqu'ils travaillent dans ce dépôt.

## À propos du projet

Knit est une application collaborative local-first & P2P en Markdown. Ce dépôt contient le code source et la documentation du projet.

## Structure du dépôt

```
knit/
├── docs/                    # Documentation technique
├── versions/                # Gestion de versions, sprints, changelogs
│   ├── BACKLOG.md           # Backlog global (modifiable à tout moment)
│   ├── VERSIONING.md        # Méthodologie de versioning
│   └── v{X.Y.Z}/           # Dossier par version
│       ├── CHANGELOG.md     # Changelog de la version
│       └── sprint-{N}/     # Dossier par sprint
│           └── SPRINT.md   # Objectifs et tâches du sprint
├── .cursor/rules/           # Règles modulaires Cursor / IDE IA (.mdc)
├── .cursorrules             # Règles universelles pour agents IA
├── CLAUDE.md                # Directives dédiées pour Claude Code
├── KNIT.md                  # Ce fichier (instructions centrales IA)
├── .knitshare.example       # Modèle de configuration partagée
└── README.md                # README principal
```

## Conventions

### Versioning
- Format : SemVer `vMAJOR.MINOR.PATCH`
- Chaque version contient 1 à 3 sprints de 1 à 2 semaines

### Backlog
- Le backlog global est dans `versions/BACKLOG.md`
- Il peut être modifié **à tout moment**, même en milieu de sprint
- Les ajouts en milieu de sprint sont tracés dans le `SPRINT.md` concerné sous la section "Ajouts en cours de sprint"

### Documentation
- Toute la doc est en Markdown dans `docs/`
- Les diagrammes utilisent Mermaid (blocs ```mermaid)

### Coffre-fort & Fichiers
- **`.knit/`** : Dossier local technique (clés privées, cache, snapshots CRDT). Ne JAMAIS le versionner ou le modifier sans précaution.
- **`.knitshare`** : Fichier partagé du coffre (conventions d'équipe, nom du coffre). Doit être versionné et synchronisé.
- **`assets/`** : Répertoire dédié aux images et pièces jointes binaires (synchronisées via Iroh Blobs).
- **Frontmatters YAML** : Préserver scrupuleusement la structure des métadonnées `---` en tête de fichier `.md` (champs `statut:`, `priorite:`, etc.).

## Règles pour les agents IA

1. **Ne jamais supprimer de documentation existante** sans instruction explicite
2. **Toujours mettre à jour le BACKLOG.md** si une nouvelle tâche est identifiée
3. **Respecter le format des sprints** défini dans `versions/VERSIONING.md`
4. **Ne jamais altérer le formatage Markdown pur** lors de l'édition (compatibilité CodeMirror 6)
5. **Utiliser des messages de commit clairs** en français
6. **Typage strict (sauf si contre-productif)** : Coder en TypeScript strict et Rust idiomatique sans `any` pour sécuriser les modifications des agents IA, sans tomber dans un sur-typage théorique si cela nuit à la productivité réelle.

