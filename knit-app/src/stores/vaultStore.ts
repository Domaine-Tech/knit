import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { UnlistenFn } from '@tauri-apps/api/event';
import { toast } from './toastStore';
import { historyStore } from './historyStore';
import { crdtManager } from '../crdt/crdtManager';
import { tabStore, detectDocType } from './tabStore';
import { networkStore } from './networkStore';
import { createDefaultKanbanMarkdown } from '../utils/kanbanParser';

export interface HeadingItem {
  file_rel: string;
  level: number;
  text: string;
  slug: string;
}

export interface SuggestDocItem {
  rel_path: string;
  title: string;
  doc_type: string;
}

export interface SuggestTagItem {
  tag: string;
  count: number;
}

export interface SuggestIndexData {
  docs: SuggestDocItem[];
  headings: HeadingItem[];
  tags: SuggestTagItem[];
}


export interface FileNode {
  id: string;
  name: string;
  path: string;
  is_dir: boolean;
  extension?: string;
  children: FileNode[];
}

export interface FrontmatterDoc {
  has_frontmatter: boolean;
  raw_frontmatter?: string;
  fields: Record<string, string>;
  ordered_keys: string[];
  body: string;
}

export interface LinkRefactorReport {
  files_scanned: number;
  files_modified: number;
  links_updated: number;
  modified_files: string[];
}

export interface TrashRecord {
  trash_id: string;
  original_rel_path: string;
  item_name: string;
  is_dir: boolean;
  deleted_at: number;
}

export interface SearchSnippet {
  line_number: number;
  line_content: string;
  match_start: number;
  match_end: number;
}

export interface FileSearchResult {
  rel_path: string;
  file_name: string;
  total_matches: number;
  snippets: SearchSnippet[];
}

export interface TaskCard {
  rel_path: string;
  id: string;
  titre: string;
  statut: string;
  priorite?: string;
  assigne?: string;
  sprint?: string;
  echeance?: string;
  tags: string[];
  snippet: string;
}

export interface TagInfo {
  tag: string;
  count: number;
  files: string[];
}

export interface KanbanFileInfo {
  path: string;
  name: string;
  title: string;
}

type VaultListener = () => void;

// Détection de l'environnement Tauri natif vs navigateur Web standard (dev)
export const isTauriEnvironment = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

// Vault de démonstration par défaut si exécuté en navigateur
const DEMO_FILES: FileNode[] = [
  {
    id: 'accueil.md',
    name: 'accueil.md',
    path: 'accueil.md',
    is_dir: false,
    extension: 'md',
    children: [],
  },
  {
    id: 'KNIT.md',
    name: 'KNIT.md',
    path: 'KNIT.md',
    is_dir: false,
    extension: 'md',
    children: [],
  },
  {
    id: 'wiki',
    name: 'wiki',
    path: 'wiki',
    is_dir: true,
    children: [
      {
        id: 'wiki/architecture.md',
        name: 'architecture.md',
        path: 'wiki/architecture.md',
        is_dir: false,
        extension: 'md',
        children: [],
      },
      {
        id: 'wiki/piliers.md',
        name: 'piliers.md',
        path: 'wiki/piliers.md',
        is_dir: false,
        extension: 'md',
        children: [],
      },
    ],
  },
  {
    id: 'projet',
    name: 'projet',
    path: 'projet',
    is_dir: true,
    children: [
      {
        id: 'projet/kanban-projet.md',
        name: 'kanban-projet.md',
        path: 'projet/kanban-projet.md',
        is_dir: false,
        extension: 'md',
        children: [],
      },
      {
        id: 'projet/taches',
        name: 'taches',
        path: 'projet/taches',
        is_dir: true,
        children: [
          {
            id: 'projet/taches/task-001.md',
            name: 'task-001.md',
            path: 'projet/taches/task-001.md',
            is_dir: false,
            extension: 'md',
            children: [],
          },
          {
            id: 'projet/taches/task-002.md',
            name: 'task-002.md',
            path: 'projet/taches/task-002.md',
            is_dir: false,
            extension: 'md',
            children: [],
          },
          {
            id: 'projet/taches/task-003.md',
            name: 'task-003.md',
            path: 'projet/taches/task-003.md',
            is_dir: false,
            extension: 'md',
            children: [],
          },
          {
            id: 'projet/taches/task-004.md',
            name: 'task-004.md',
            path: 'projet/taches/task-004.md',
            is_dir: false,
            extension: 'md',
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'perso',
    name: 'perso',
    path: 'perso',
    is_dir: true,
    children: [
      {
        id: 'perso/kanban-perso.md',
        name: 'kanban-perso.md',
        path: 'perso/kanban-perso.md',
        is_dir: false,
        extension: 'md',
        children: [],
      },
    ],
  },
  {
    id: 'equipe',
    name: 'equipe',
    path: 'equipe',
    is_dir: true,
    children: [
      {
        id: 'equipe/kanban-equipe.md',
        name: 'kanban-equipe.md',
        path: 'equipe/kanban-equipe.md',
        is_dir: false,
        extension: 'md',
        children: [],
      },
    ],
  },
  {
    id: 'tests',
    name: 'tests',
    path: 'tests',
    is_dir: true,
    children: [
      {
        id: 'tests/test-live-preview.md',
        name: 'test-live-preview.md',
        path: 'tests/test-live-preview.md',
        is_dir: false,
        extension: 'md',
        children: [],
      },
      {
        id: 'tests/test-kanban.md',
        name: 'test-kanban.md',
        path: 'tests/test-kanban.md',
        is_dir: false,
        extension: 'md',
        children: [],
      },
      {
        id: 'tests/test-liens-navigation.md',
        name: 'test-liens-navigation.md',
        path: 'tests/test-liens-navigation.md',
        is_dir: false,
        extension: 'md',
        children: [],
      },
      {
        id: 'tests/test-table.md',
        name: 'test-table.md',
        path: 'tests/test-table.md',
        is_dir: false,
        extension: 'md',
        children: [],
      },
      {
        id: 'tests/test-long-document.md',
        name: 'test-long-document.md',
        path: 'tests/test-long-document.md',
        is_dir: false,
        extension: 'md',
        children: [],
      },
    ],
  },
];

const DEMO_CONTENTS: Record<string, string> = {
  'accueil.md': `# Bienvenue dans Knit

Knit est votre outil de documentation et de gestion de projet collaborative **Local-First**, **P2P** et en **Markdown pur**.

---

## Fonctionnalités du Sprint 2
- **Moteur CRDT Yjs** connecté à CodeMirror 6 avec synchronisation bidirectionnelle.
- **File Watcher Rust** avec **Triple Garde WriteGuard** (is_writing + hash XXH3 + debounce 100ms) pour une coexistence sans boucle avec les agents IA (Cursor, Claude Code, scripts).
- **Refactoring automatique des liens** : mise à jour instantanée de tous les liens relatifs et WikiLinks du coffre lors du déplacement ou renommage d'un document.
- **Gestion du presse-papier & Drag & Drop** d'images directement dans le dossier \`assets/\`.
- **Intégrité absolue des métadonnées Frontmatter YAML** préservant indentations et commentaires.

---

*Sélectionnez un fichier dans la barre latérale pour commencer l'édition.*
`,
  '.knitshare': `# Configuration partagée du coffre-fort Knit
vault_name: "Knit Workspace"
version: "0.1.0"
statuses:
  - a-faire
  - en-cours
  - termine
`,
  'KNIT.md': `# Directives IA pour ce coffre-fort

- Conserver le Markdown pur sans format propriétaire.
- Préserver les frontmatters YAML.
- Travailler directement dans les fichiers locaux.
`,
  'wiki/architecture.md': `# Architecture Technique

L'architecture repose sur :
1. **Tauri v2** pour une empreinte mémoire minimale (< 30 Mo) et des performances natives.
2. **CodeMirror 6** pour l'édition Markdown pure octet pour octet.
3. **Yjs & CRDT** pour la fusion temps réel sans conflit.
4. **Triple Garde WriteGuard** pour éliminer toute boucle infinie entre File Watcher et CRDT.
`,
  'wiki/piliers.md': `# Les 9 Piliers de Knit

1. Local-First
2. P2P Sans Serveur Central
3. Markdown Pur
4. Agent-Friendly
5. Zéro Conflit, Zéro Latence
6. UI/UX Premium & Simple
7. Multiplateforme
8. Modulaire & Extensible
9. Mermaid Natif
`,
  'projet/taches/task-001.md': `---
id: task-001
type: tache
titre: Fondations de l'Éditeur & Design System
statut: en-cours
priorite: critique
assigne: Thomas
sprint: sprint-1
---

# Fondations de l'Éditeur & Design System

## Objectifs du Sprint 1
- [x] Scaffolding Tauri v2 + React TypeScript
- [x] CodeMirror 6 Markdown & recherche Ctrl+F
- [x] Système Multi-onglets avec clic molette
- [x] Design tokens CSS HSL & Thème clair/sombre
- [x] Système de Toasts centralisé
`,
  'projet/taches/task-002.md': `---
id: task-002
type: tache
titre: Moteur Réseau P2P Iroh & Transport QUIC
statut: termine
priorite: haute
assigne: Thomas
sprint: sprint-3
tags: [backend, p2p, rust]
---

# Moteur Réseau P2P Iroh & Transport QUIC

## Objectifs du Sprint 3
- [x] Connexion QUIC pair-à-pair directe
- [x] Découverte LAN via mDNS
- [x] Streaming d'updates Yjs
`,
  'projet/taches/task-003.md': `---
id: task-003
type: tache
titre: Vues Kanban & Tableau Filtrable
statut: en-cours
priorite: critique
assigne: Alice
sprint: sprint-5
tags: [ui, kanban, react]
---

# Vues Kanban & Tableau Filtrable

## Objectifs du Sprint 5
- [x] Colonnes basées sur le champ statut
- [x] Drag & Drop dynamique mettant à jour le YAML frontmatter
- [x] Tableau filtrable, triable et exportable
`,
  'projet/taches/task-004.md': `---
id: task-004
type: tache
titre: Rendu Mermaid & Palette Dynamique
statut: a-faire
priorite: moyenne
assigne: Bob
sprint: sprint-6
tags: [editor, mermaid, css]
---

# Rendu Mermaid & Palette Dynamique

## Objectifs du Sprint 6
- [ ] Rendu direct des blocs de code Mermaid
- [ ] Thème synchronisé avec la teinte d'accent
`,
  'projet/kanban-projet.md': `---
type: kanban
title: "Kanban Projet Knit"
---

# Kanban Projet Knit

Suivi des fonctionnalités majeures du projet Knit.

## Backlog
- [ ] Rendu interactif Mermaid inline [[Mermaid]]
- [ ] Palette de commandes Notion-style
- [ ] Export PDF / HTML propre

## À faire
- [ ] Split View éditeur (Ctrl+\\)
- [ ] Live preview sans balises Markdown #ui

## En cours
- [ ] Multi-kanbans par fichier Markdown #sprint-5
- [ ] Colonnes personnalisées illimitées #sprint-5

## Revue & Tests
- [ ] Validation du drag and drop #qa

## Terminé
- [x] Quick Switcher (Ctrl+O)
- [x] Recherche globale dans tout le coffre (Ctrl+Shift+F)
- [x] Autocomplétion WikiLinks et Tags
`,
  'perso/kanban-perso.md': `---
type: kanban
title: "Mon Kanban Personnel"
---

# Mon Kanban Personnel

Mes tâches quotidiennes, apprentissages et idées perso.

## Idées
- [ ] Lire la doc Iroh Gossipsub
- [ ] Tester les nouvelles polices Google Fonts

## Cette semaine
- [ ] Ranger le dossier de cours Green IT
- [ ] Préparer la présentation d'architecture

## En cours
- [ ] Finaliser le Sprint 5 de Knit #dev

## Fait
- [x] Mettre à jour Rust 1.84
- [x] Configurer la clé SSH
`,
  'equipe/kanban-equipe.md': `---
type: kanban
title: "Kanban Équipe & Coordination"
---

# Kanban Équipe & Coordination

Tableau collaboratif partagé avec les membres du projet en P2P.

## À cadrer
- [ ] Spécifications du protocole mobile
- [ ] Chiffrement de bout en bout

## Sprint actif
- [ ] Revue des pull requests de sécurité
- [ ] Benchmarks de latence réseau QUIC

## En validation
- [ ] Synchronisation des avatars P2P via Iroh Blobs

## Déployé en prod
- [x] Release Knit v0.2.0 P2P
`,
  'tests/test-live-preview.md': `---
type: note
titre: Démonstration Complète Live Preview
statut: en-cours
priorite: haute
assigne: Thomas
tags: [test, live-preview, sprint-6, markdown]
id: TEST-001
echeance: 2026-10-30
---

# Démonstration Complète Live Preview Knit

Ce document rassemble l'ensemble des fonctionnalités Markdown et des normes visuelles supportées par Knit v0.3.0. Il sert de banc d'essai pour valider le rendu dynamique Live Preview, la synchronisation du curseur et la cohérence de la marge.

Consultez également les spécifications d'architecture dans [[wiki/architecture|Architecture Technique]] et les principes fondamentaux dans [[wiki/piliers|Les 9 Piliers de Knit]].

---

## 1. Niveaux de Titres et Progression Automatique

### Sous-titre Niveau 3
#### Sous-titre Niveau 4
##### Sous-titre Niveau 5
###### Sous-titre Niveau 6 (Majuscules feutrées)

La barre de progression sous le titre principal calcule dynamiquement le pourcentage des tâches de ce document.

---

## 2. Les 7 Statuts de Tâches Standardisés (B-054)

Chaque case ci-dessous est interactive. Un simple clic change son état selon le cycle standardisé :

- [ ] Tâche standard à réaliser (À faire)
- [/] Tâche en cours d'exécution (En cours avec jauge)
- [x] Tâche validée et terminée (Fait avec texte barré)
- [-] Tâche annulée ou abandonnée (Annulé)
- [?] Tâche en attente d'arbitrage ou question (Question)
- [>] Tâche reportée à un sprint ultérieur (Reporté avec flèche)
- [!] Tâche urgente nécessitant une intervention immédiate (Urgent)

---

## 3. Priorités Inline, Mentions et Échéances

- [ ] Corriger le conflit de synchronisation CRDT Yjs !p1 @Thomas @2026-10-20 14:00-15:30
- [ ] Optimiser la palette de couleurs d'accentuation !p2 @vault @2026-10-21
- [ ] Nettoyer les classes CSS obsolètes !p3 due: 2026-10-25
- [ ] Déploiement de la version P2P sur le réseau Iroh !p1 @Thomas H.

---

## 4. Formatage Markdown Inline Enrichi

- **Texte en gras** pour souligner les éléments essentiels.
- *Texte en italique* pour les nuances et précisions.
- ~~Texte barré~~ pour indiquer les éléments dépréciés.
- \`cargo run --release -p knit-app\` pour le code en ligne.
- Lien Markdown externe : [Dépôt GitHub de Knit](https://github.com/Domaine-Tech/knit).
- WikiLink simple : [[accueil.md]].
- WikiLink avec alias : [[wiki/architecture|Consulter l'architecture]].
- WikiLink d'ancre : [[wiki/architecture#Moteur CRDT|Aller au Moteur CRDT]].
- Tags hiérarchiques : #dev/rust/p2p #ui/codemirror #sprint-6

---

## 5. Tableaux Markdown GFM (Alignement Parfait 1:1 et Liens Interactifs)

Survolez les liens dans les cellules pour afficher l'aperçu dynamique flottant (US B-053). Utilisez **Ctrl + Clic** pour ouvrir la cible correspondante.

| Type de Cible | Intitulé | Destinataire / Statut | Lien Interactif | Action Attendue |
| :--- | :--- | :---: | :--- | :--- |
| **Note Existante** | Document long | \`Validé\` | [[tests/test-long-document.md]] | Ouvre la note avec aperçu snippet |
| **Alias WikiLink** | Vue Synthétique | \`Actif\` | [[tests/test-table.md|Inventaire Composants]] | Ouvre la vue Tableau |
| **Tableau Kanban** | Tâches P2P | \`En cours\` | [[tests/test-kanban.md]] | Ouvre le tableau Kanban |
| **Ancre Interne** | Statuts de tâches | \`Local\` | [[#2. Les 7 Statuts de Tâches Standardisés (B-054)]] | Défile vers la section 2 |
| **Lien Web Externe** | GitHub Repo | \`HTTPS\` | [Dépôt GitHub Knit](https://github.com/Domaine-Tech/knit) | Ouvre le navigateur système |
| **URL Brute** | Documentation | \`Web\` | https://github.com/Domaine-Tech/knit | Ouvre le navigateur |
| **Dossier Local** | Configuration | \`Dossier\` | [Dossier .knit](./.knit/) | Ouvre l'explorateur de fichiers |
| **Fichier Externe** | Cahier des charges | \`Document\` | [Spécification Office](./spec-technique.docx) | Ouvre avec l'application par défaut |

Second tableau technique pour valider la synchronisation et l'absence totale de décalage :

| Port | Protocole | Service | Rôle et Lien |
| :--- | :--- | :--- | :--- |
| 11200 | QUIC / UDP | Iroh P2P | Transport pair-à-pair [[tests/test-long-document.md|Protocole]] |
| 5173 | HTTP / TCP | Vite Dev Server | Interface [Vite Localhost](http://localhost:5173) |
| 1420 | IPC / Rust | Tauri v2 | Pont natif multiplateforme |

---

## 6. Scripts et Blocs de Code avec Bouton Copier

### Script PowerShell de maintenance

\`\`\`powershell
.\\.scripts\\audit-fiches-md.ps1
# Corriger automatiquement les blocs de code non typés :
.\\.scripts\\audit-fiches-md.ps1 -FixCodeBlocks
Get-Process | Where-Object { $_.ProcessName -like "*knit*" }
\`\`\`

### Script Shell Unix / Bash

\`\`\`bash
#!/usr/bin/env bash
# Vérifier la conformité du dépôt Knit
echo "Lancement des vérifications..."
cargo test --workspace
npm run lint --prefix knit-app
echo "Vérifications terminées avec succès."
\`\`\`

### Module TypeScript

\`\`\`typescript
// Interface de configuration d'un nœud pair P2P
export interface PeerConfig {
  nodeId: string;
  listenPort: number;
  enableRelay: boolean;
  heartbeatIntervalMs: number;
}

export function createPeerNode(config: PeerConfig): Promise<void> {
  console.log("Initialisation du nœud P2P :", config.nodeId);
  return Promise.resolve();
}
\`\`\`

---

## 7. Diagrammes Mermaid Inline

\`\`\`mermaid
graph TD
    A[Éditeur Markdown Pure] --> B(Moteur CodeMirror 6)
    B --> C{Vue Doc-Driven}
    C -->|type: kanban| D[Tableau Kanban Visuel]
    C -->|type: table| E[Vue Tableau Filtrable]
    C -->|type: note| F[Live Preview Obsidian]
    F --> G[Synchronisation Yjs P2P]
\`\`\`

---

## 8. Callouts GFM (Alertes Feutrées)

> [!NOTE]
> Information contextuelle sobre : le formatage CommonMark est appliqué à la volée sans transformer le document en format propriétaire.

> [!TIP]
> Raccourci clavier : utilisez Ctrl+E pour basculer instantanément entre la vue visuelle et le code source brut.

> [!WARNING]
> Attention lors de la modification des en-têtes YAML : veillez à conserver les tirets triples de délimitation.

> [!IMPORTANT]
> L'interopérabilité avec Obsidian et VS Code est garantie par l'absence totale de base de données centrale.

---

## 9. Citations et Listes Imbriquées

> La simplicité est la condition préalable à la fiabilité.
> — Edsger W. Dijkstra

1. Premier point structuré
   - Sous-élément détaillé A
   - Sous-élément détaillé B
2. Deuxième point structuré
   - Validation croisée
   - Synchronisation sans conflit

---

## 10. Images et Médias Intégrés

Image d'architecture réseau avec légende :

![Architecture Réseau P2P Iroh & Synchronisation Décentralisée](https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&q=80)

Espace de travail feutré et minimaliste :

![Espace de travail minimaliste Knit](https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80)

Test de fallback gracieux sur image introuvable :

![Schéma local non présent dans le coffre](./assets/schema-inexistant.png)
`,
  'tests/test-kanban.md': `---
type: kanban
titre: Tableau Kanban de Test
statut: en-cours
priorite: haute
assigne: Équipe
tags: [kanban, sprint-6, demo, test]
id: KANBAN-001
echeance: 2026-11-15
---

# Tableau Kanban de Test - Sprint 6

Ce document est une vue Kanban pilotée par le document (\`type: kanban\`).
Chaque titre de niveau 2 représente une colonne, et chaque élément de liste est une carte manipulable par Drag & Drop.

Vous pouvez à tout moment basculer en mode source (\`</>\`) avec \`Ctrl+E\` pour constater que le texte Markdown reste 100% pur.

## À cadrer

- [ ] Rédiger les spécifications du protocole mobile P2P !p2 @Alex @2026-11-01
- [ ] Étudier l'intégration d'un explorateur de graphe de notes !p3 #recherche
- [ ] Définir les profils de chiffrement de bout en bout pour Iroh Blobs !p1 @Thomas

## En cours

- [/] Synchronisation Live Preview dans CodeMirror 6 !p1 @Sublix #ui/editor
- [/] Rendu dynamique des blocs de code avec bouton Copier !p2 #editor
- [ ] Optimisation de la mémoire sur les très longs fichiers Markdown !p2

## En revue

- [?] Validation des calculs de hauteur sur documents de plus de 2000 lignes !p1
- [ ] Test croisé de compatibilité avec Obsidian et VS Code !p3 @vault
- [ ] Relecture de la documentation de spécification Markdown !p2

## Terminé

- [x] Résolution du décalage de gouttière causé par les tableaux !p1 #bugfix
- [x] Neutralisation des marges asymétriques sur les titres !p1
- [x] Support des 7 statuts de tâches standardisés B-054 !p2
- [x] Mise en place de la triple garde WriteGuard anti-boucle !p1 @Thomas
`,
  'tests/test-table.md': `---
type: table
titre: Vue Tableau Synthétique
statut: en-cours
priorite: moyenne
tags: [table, inventaire, modules]
id: TABLE-001
---

# Inventaire des Modules et Composants Knit

Ce document utilise la vue Tableau pilotée par le document (\`type: table\`).
Les cartes de chaque catégorie sont affichées dans une table interactive avec recherche en direct, tri dynamique par colonne et cases à cocher interactives.

## Composants Moteur Core

- [x] Moteur CRDT Yjs avec synchronisation bidirectionnelle !p1 @Thomas #core
- [x] Triple Garde WriteGuard Rust avec debounce 100ms !p1 @Thomas #backend
- [ ] Protocole P2P Iroh Gossipsub pour mise à jour instantanée !p1 @Thomas #p2p
- [ ] Chiffrement ChaCha20-Poly1305 pour synchronisation privée !p2 #securite

## Composants Éditeur UI

- [x] Mode Live Preview Obsidian avec masquage discret !p1 @Sublix #ui/editor
- [x] Blocs de code multi-langages avec bouton Copier !p2 #ui
- [x] Rendu Mermaid intégré avec coloration dynamique !p2 #diagramme
- [ ] Panneau latéral des rétroliens et mentions non liées !p2 #backlinks
- [ ] Hover Preview tooltip au survol des WikiLinks !p3 #ux

## Composants Moteur Core

- [x] Moteur CRDT Yjs avec synchronisation bidirectionnelle [[tests/test-long-document]] !p1 @Thomas #core
- [x] Triple Garde WriteGuard Rust avec debounce 100ms !p1 @Thomas #backend
- [ ] Protocole P2P Iroh Gossipsub pour mise a jour instantanee [[tests/test-kanban]] !p1 @Thomas #p2p
- [ ] Chiffrement ChaCha20-Poly1305 pour synchronisation privee !p2 #securite

## Composants Editeur UI

- [x] Mode Live Preview Obsidian avec masquage discret [[tests/test-live-preview]] !p1 @Sublix #ui/editor
- [x] Blocs de code multi-langages avec bouton Copier !p2 #ui
- [x] Rendu Mermaid integre avec coloration dynamique !p2 #diagramme
- [ ] Panneau lateral des retroliens et mentions non liees [[tests/test-liens-navigation]] !p2 #backlinks
- [ ] Hover Preview tooltip au survol des WikiLinks [[tests/test-live-preview]] !p3 #ux

## Documentation et Normes

- [x] Specification Markdown pure dans [[tests/test-long-document]] !p2 #doc
- [x] Regles agents IA sans emoji dans .cursorrules et CLAUDE.md !p1 #ia
- [ ] Guide d'utilisation utilisateur final v0.3.0 !p3 #doc
`,
  'tests/test-liens-navigation.md': `---
type: note
titre: Test Exhaustif des Liens et Survol
statut: valider
priorite: haute
assigne: Thomas
tags: [test, liens, navigation, hover-preview, live-preview]
id: TEST-LIENS-001
---

# Banc d'Essai : Navigation et Survol des Liens dans Knit

Ce document valide le comportement complet des liens (WikiLinks, liens Markdown, URLs web, ancres et fichiers externes) au **survol (Hover Preview flottant)** et au **Ctrl + Clic**.

---

## 1. Liens dans les Tableaux Markdown GFM

Les tableaux sont rendus par le widget immersif \`TableCardWidget\`. Survolez chaque lien pour vérifier l'apparition du tooltip avec l'icône et l'extrait contextuel. Maintenez **Ctrl** et cliquez pour naviguer.

| Type de Cible | Cible & Syntaxe | Statut / Rôle | Action au Ctrl + Clic |
| :--- | :--- | :---: | :--- |
| **WikiLink Simple** | [[tests/test-long-document.md]] | \`Existant\` | Ouvre le document long dans un onglet Knit |
| **WikiLink avec Alias** | [[tests/test-table.md|Vue Tableau Démo]] | \`Vue Table\` | Ouvre la vue Tableau filtrable |
| **Vue Kanban** | [[tests/test-kanban.md|Tableau de bord Sprint]] | \`Vue Kanban\` | Bascule vers la vue Kanban interactive |
| **Code avec Barres** | \`git log --oneline \\| head -n 5\` | \`Terminal\` | Barre verticale dans bloc de code inline |
| **Barre Échappée** | Syntaxe avec \\| barre \\| protégée | \`Formatage\` | Barres échappées au standard Markdown |
| **Lien avec Barre** | [Domaine-Tech \\| GitHub](https://github.com/Domaine-Tech/knit) | \`Internet\` | Pipe dans l'intitulé d'un lien Markdown standard |
| **Ancre Interne** | [[#3. Ancres et Défilement Intégré]] | \`Navigation\` | Fait défiler la page jusqu'à la section 3 |
| **Lien Web Externe** | [GitHub Domaine-Tech/knit](https://github.com/Domaine-Tech/knit) | \`Internet\` | Lance le navigateur web par défaut |
| **URL Brute** | https://tauri.app | \`Documentation\` | Ouvre Tauri v2 dans le navigateur |
| **Dossier Local** | [Dossier .knit](./.knit/) | \`Système\` | Ouvre l'explorateur de fichiers de l'OS |
| **Fichier Externe** | [Cahier des charges](./spec.docx) | \`Bureautique\` | Ouvre Microsoft Word ou le logiciel associé |
| **Nouvelle Note** | [[wiki/nouvelle-idee-projet]] | \`Création\` | Propose et crée la nouvelle note dans le coffre |

---

## 2. Liens dans le Texte Libre et Listes de Tâches

- [ ] Consulter l'architecture générale dans [[tests/test-long-document.md]] !p1 @Thomas
- [x] Vérifier les métadonnées de la vue [[tests/test-table.md|Inventaire Composants]] !p2
- [ ] Tester le glisser-déposer dans le Kanban [[tests/test-kanban.md]] !p2
- [ ] Consulter la documentation officielle sur [le site de Tauri](https://tauri.app)
- [ ] Ouvrir le dossier de configuration locale : [Configuration](./.knit/)

Lien inline au milieu d'un paragraphe : vous pouvez vérifier que [[tests/test-long-document.md]] affiche l'aperçu du texte sans les marqueurs frontmatter YAML.

---

## 3. Ancres et Défilement Intégré

Cliquez sur l'ancre ci-dessous pour tester le défilement automatique :
- Aller au tableau des liens : [[#1. Liens dans les Tableaux Markdown GFM]]
- Aller aux callouts de test : [[#4. Liens dans les Callouts et Alertes GFM]]

---

## 4. Liens dans les Callouts et Alertes GFM

> [!NOTE]
> Information contextuelle : vous pouvez également survoler et cliquer sur des liens situés à l'intérieur d'alertes, comme [[tests/test-long-document.md]] ou [le site GitHub](https://github.com/Domaine-Tech/knit).

> [!TIP]
> Astuce de navigation : la combinaison **Ctrl + Clic** fonctionne de façon uniforme dans l'ensemble de Knit :
> - En mode Live Preview (Obsidian-style)
> - En mode Source brute (CodeMirror)
> - Dans les cellules de tableaux GFM
> - Dans les vues Doc-Driven (Tableau et Kanban)
`,
  'tests/test-long-document.md': `---
type: note
titre: Test de Robustesse et Long Document (500+ lignes)
statut: en-cours
priorite: haute
tags: [stress-test, performance, scroll, alignment]
id: STRESS-001
---

# Test de Robustesse et Long Document - 500 Lignes

Ce document sert de banc d'essai exhaustif pour valider :
1. L'alignement parfait 1:1 entre les numéros de ligne dans la gouttière et le texte à l'écran.
2. La précision du curseur lors d'un clic de souris à la ligne 50, 100, 200, 300, 400 ou 500.
3. L'absence totale de décalage cumulatif dû à des tableaux, des blocs de code ou des en-têtes.

---

## Section 01 : Fondations et Architecture

Paragraphe d'introduction sur l'architecture distribuée de Knit.
L'objectif est d'assurer une expérience fluide même sur des fiches techniques très denses.
Chaque ligne ci-dessous permet de vérifier que la hauteur calculée par CodeMirror correspond exactement à l'affichage réel.

- Ligne de liste 01 : Vérification du calcul de hauteur
- Ligne de liste 02 : Absence de marges parasites sur les paragraphes
- Ligne de liste 03 : Fluidité du défilement vertical
- Ligne de liste 04 : Maintien du focus lors de la frappe
- Ligne de liste 05 : Cohérence de l'indexation Yjs

---

## Section 02 : Premier Tableau de Données

| Index | Nom du Service | Port Écoute | Protocole | État |
| :--- | :--- | :---: | :---: | ---: |
| 001 | Daemon Iroh P2P | 11200 | QUIC / UDP | \`Actif\` |
| 002 | Vite React Server | 5173 | HTTP / TCP | \`Actif\` |
| 003 | Pont IPC Tauri | 1420 | Local IPC | \`Prêt\` |
| 004 | File Watcher Rust | N/A | inotify / kqueue | \`Écoute\` |
| 005 | Indexeur Tantivy | N/A | Mémoire | \`Veille\` |

Paragraphe immédiatement sous le tableau pour tester le clic direct après la dernière ligne de tableau.
Si vous cliquez sur cette phrase, le curseur doit atterrir très exactement ici sans aucun décalage vers le haut ou vers le bas.

---

## Section 03 : Blocs de Scripts et Commandes Shell

\`\`\`powershell
# Script de vérification d'intégrité du coffre Knit
Write-Host "Vérification des métadonnées YAML..." -ForegroundColor Cyan
Get-ChildItem -Path . -Filter "*.md" -Recurse | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "^---\\r?\\n") {
        Write-Host "OK : $($_.Name)" -ForegroundColor Green
    } else {
        Write-Warning "Frontmatter manquant : $($_.Name)"
    }
}
\`\`\`

---

## Section 04 : Liste de Tâches et Suivi Opérationnel

- [x] Initialiser le projet Tauri v2 avec React 19 et Vite
- [x] Intégrer CodeMirror 6 avec support complet de Markdown
- [x] Configurer la police à chasse fixe pour les blocs de code
- [/] Valider l'alignement de la marge de gauche sur les longs documents
- [/] Optimiser le rendu dynamique des tableaux Markdown GFM
- [?] Envisager la prise en charge des diagrammes de Gantt Mermaid
- [!] Corriger immédiatement tout saut visuel lors de la frappe en bas de page
- [>] Reporter l'exportation PDF avancée à la version v0.4.0
- [-] Abandonner l'idée d'une base de données SQLite centrale pour rester 100% Markdown pur

---

## Section 05 : Second Tableau Technique

| Paramètre | Valeur par Défaut | Plage Autorisée | Unité | Description |
| :--- | :--- | :--- | :--- | :--- |
| \`heartbeat_ms\` | 5000 | 1000 - 60000 | ms | Fréquence de signalisation P2P |
| \`max_peers\` | 32 | 1 - 256 | unités | Nombre maximal de pairs connectés |
| \`debounce_ms\` | 100 | 20 - 500 | ms | Temporisation de la garde d'écriture |
| \`theme_hue\` | 215 | 0 - 360 | deg | Teinte d'accentuation HSL |
| \`reading_width\` | 760 | 600 - 1600 | px | Largeur de confort de lecture |

---

## Section 06 : Paragraphes de Remplissage et Test de Navigation

Paragraphe 01 : L'informatique distribuée repose sur des compromis clairs entre disponibilité et cohérence.
Paragraphe 02 : Dans Knit, l'approche Local-First accorde une priorité absolue à la continuité du travail local.
Paragraphe 03 : Tout fichier est stocké sur le disque dur de l'utilisateur sous forme de texte brut.
Paragraphe 04 : Aucune coupure de réseau ne peut interrompre la saisie de texte.
Paragraphe 05 : Lorsque deux utilisateurs modifient la même note en même temps, l'algorithme Yjs résout les conflits sans perte.
Paragraphe 06 : La synchronisation utilise des deltas minimaux transmis via le protocole QUIC.
Paragraphe 07 : L'absence de serveur central garantit une confidentialité totale.
Paragraphe 08 : Chaque coffre-fort numérique est autonome et portable.
Paragraphe 09 : Les métadonnées Frontmatter sont préservées intactes d'un outil à l'autre.
Paragraphe 10 : Cette neutralité technique assure la pérennité des écrits sur plusieurs décennies.

---

## Section 07 : Troisième Tableau de Synthèse

| Module | Fichier Source | Lignes de Code | Statut Test |
| :--- | :--- | :---: | :---: |
| livePreviewExtension | \`livePreviewExtension.ts\` | ~700 | \`Passé\` |
| mermaidExtension | \`mermaidExtension.ts\` | ~250 | \`Passé\` |
| smartUxExtension | \`smartUxExtension.ts\` | ~180 | \`Passé\` |
| vaultStore | \`vaultStore.ts\` | ~1400 | \`Passé\` |
| crdtManager | \`crdtManager.ts\` | ~450 | \`Passé\` |

---

## Section 08 : Conclusion du Document de Test

Paragraphe final situé au-delà de la ligne 200 du document.
Si vous faites défiler la page jusqu'ici et que vous cliquez sur n'importe quel mot de cette dernière phrase :
- Le curseur doit atterrir exactement là où pointe votre souris.
- Le numéro de ligne actif à gauche dans la marge doit correspondre très exactement à la ligne courante.
- Aucun écart ni scintillement ne doit survenir.
`,
};

class VaultStore {
  public currentVaultPath: string | null = null;
  public files: FileNode[] = [];
  public isLoading: boolean = false;
  public error: string | null = null;

  private listeners: Set<VaultListener> = new Set();
  private localContents: Record<string, string> = { ...DEMO_CONTENTS };
  private unlistenFns: UnlistenFn[] = [];

  constructor() {
    const savedPath = localStorage.getItem('knit-last-vault-path');
    if (savedPath && isTauriEnvironment()) {
      this.openVault(savedPath);
    } else {
      this.currentVaultPath = 'Knit Demo Vault';
      this.files = DEMO_FILES;
    }
  }

  public get vaultPath(): string | null {
    return this.currentVaultPath;
  }

  public get vaultName(): string | null {
    if (!this.currentVaultPath) return null;
    const parts = this.currentVaultPath.split(/[/\\]/).filter(Boolean);
    return parts.length > 0 ? parts[parts.length - 1] : null;
  }

  public subscribe(listener: VaultListener): () => void {
    this.listeners.add(listener);
    listener();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public async pickAndOpenVault(): Promise<boolean> {
    if (!isTauriEnvironment()) {
      this.currentVaultPath = 'Knit Workspace (Web Dev)';
      this.files = DEMO_FILES;
      this.notify();
      return true;
    }

    try {
      this.isLoading = true;
      this.notify();

      const selected = await invoke<string | null>('pick_vault_folder');
      if (selected) {
        await this.openVault(selected);
        return true;
      }
      return false;
    } catch (err: unknown) {
      this.error = String(err);
      return false;
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  public async openVault(path: string): Promise<void> {
    this.currentVaultPath = path;
    localStorage.setItem('knit-last-vault-path', path);

    // Initialisation ou redémarrage du watcher FS natif
    await this.setupWatcher(path);
    await this.reloadTree();

    // Démarrage du réseau P2P Iroh & mDNS
    networkStore.startNetwork(path).catch((err) => {
      console.warn('Erreur initialisation P2P sur coffre:', err);
    });

    // Récupération des éléments orphelins de corbeille (restauration OS vers .knit/trash)
    const recovered = await this.recoverTrash();
    if (recovered.length > 0) {
      toast.success(
        'Corbeille synchronisée',
        `${recovered.length} note(s) restaurée(s) : ${recovered.join(', ')}`
      );
    }
  }

  private async setupWatcher(path: string) {
    // Nettoyer les écouteurs précédents
    for (const unlisten of this.unlistenFns) {
      unlisten();
    }
    this.unlistenFns = [];

    if (!isTauriEnvironment()) return;

    try {
      // Arrêt préventif de tout watcher précédent
      await invoke('stop_vault_watcher').catch(() => {});
      await invoke('start_vault_watcher', { vaultPath: path });

      const u1 = await listen<{ path: string; content: string }>(
        'vault_file_changed',
        (event) => {
          const { path: relPath, content } = event.payload;
          this.localContents[relPath] = content;

          // Injection dans Yjs via crdtManager
          const updated = crdtManager.applyExternalContent(relPath, content);
          if (updated) {
            const fileName = relPath.split('/').pop() || relPath;
            toast.info(
              'Synchronisation externe',
              `Fichier "${fileName}" mis à jour par un agent externe`
            );

            // Mettre à jour l'onglet correspondant et le marquer comme propre
            const tab = tabStore.tabs.find((t) => t.path === relPath);
            if (tab) {
              tab.content = content;
              tab.isDirty = false;
            }
          }
          this.notify();
        }
      );

      const u2 = await listen<{ path: string }>('vault_file_deleted', (event) => {
        const { path: relPath } = event.payload;
        delete this.localContents[relPath];
        crdtManager.removeDoc(relPath);

        const fileName = relPath.split('/').pop() || relPath;
        const tab = tabStore.tabs.find((t) => t.path === relPath);
        if (tab) {
          toast.info('Fichier supprimé', `Le fichier "${fileName}" a été supprimé du disque`);
        }

        this.reloadTree();
      });

      const u3 = await listen('vault_tree_changed', () => {
        this.reloadTree();
      });

      this.unlistenFns.push(u1, u2, u3);
    } catch (err: unknown) {
      console.warn('Impossible de démarrer le Vault Watcher :', err);
    }
  }

  public async reloadTree(): Promise<void> {
    if (!this.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      this.files = [...DEMO_FILES];
      this.notify();
      return;
    }

    try {
      this.isLoading = true;
      this.notify();
      const nodes = await invoke<FileNode[]>('get_vault_tree', {
        vaultPath: this.currentVaultPath,
      });
      this.files = nodes;
      this.error = null;
    } catch (err: unknown) {
      this.error = String(err);
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  public async readFile(relPath: string): Promise<string> {
    if (!isTauriEnvironment()) {
      if (relPath in this.localContents) {
        return this.localContents[relPath];
      }
      return `# ${relPath}\nNouveau document`;
    }

    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    const content = await invoke<string>('read_vault_file', {
      vaultPath: this.currentVaultPath,
      relPath,
    });
    this.localContents[relPath] = content;
    return content;
  }

  public async writeFile(relPath: string, content: string): Promise<void> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    // Évite toute écriture FS redondante si le contenu est déjà identique
    if (this.localContents[relPath] === content) {
      tabStore.markClean(relPath);
      return;
    }

    this.localContents[relPath] = content;

    if (!isTauriEnvironment()) {
      tabStore.markClean(relPath);
      return;
    }

    await invoke('write_vault_file', {
      vaultPath: this.currentVaultPath,
      relPath,
      content,
    });

    tabStore.markClean(relPath);
  }

  public async createFile(relPath: string, initialContent: string = ''): Promise<void> {
    if (!this.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      this.localContents[relPath] = initialContent;
      await this.reloadTree();
      return;
    }

    await invoke('create_vault_file', {
      vaultPath: this.currentVaultPath,
      relPath,
      content: initialContent,
    });
    await this.reloadTree();
  }

  public async createDir(relPath: string): Promise<void> {
    if (!this.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      await this.reloadTree();
      return;
    }

    try {
      await invoke('create_vault_dir', {
        vaultPath: this.currentVaultPath,
        relPath,
      });
      await this.reloadTree();
    } catch (err: unknown) {
      toast.error('Erreur lors de la création du dossier', String(err));
    }
  }

  public async saveAsset(base64Data: string, filenameHint?: string): Promise<string> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      const timestamp = Date.now();
      const name = filenameHint || `img-${timestamp}.png`;
      const relPath = `assets/${name}`;
      this.localContents[relPath] = base64Data;
      return relPath;
    }

    return await invoke<string>('save_vault_asset', {
      vaultPath: this.currentVaultPath,
      filenameHint,
      base64Data,
    });
  }

  public async renameFile(oldRelPath: string, newRelPath: string): Promise<LinkRefactorReport> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      const content = this.localContents[oldRelPath] || '';
      delete this.localContents[oldRelPath];
      this.localContents[newRelPath] = content;
      await this.reloadTree();
      return {
        files_scanned: 1,
        files_modified: 0,
        links_updated: 0,
        modified_files: [],
      };
    }

    const report = await invoke<LinkRefactorReport>('rename_vault_file', {
      vaultPath: this.currentVaultPath,
      oldRelPath,
      newRelPath,
    });

    await this.reloadTree();
    return report;
  }

  public async trashPath(relPath: string): Promise<TrashRecord> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      const isDir = !relPath.includes('.');
      const itemName = relPath.split('/').pop() || relPath;
      const backupContent = this.localContents[relPath];
      delete this.localContents[relPath];
      crdtManager.removeDoc(relPath);
      await this.reloadTree();
      const mockRecord: TrashRecord = {
        trash_id: `mock-${Date.now()}`,
        original_rel_path: relPath,
        item_name: itemName,
        is_dir: isDir,
        deleted_at: Date.now(),
      };
      (this as any)._mockTrash = (this as any)._mockTrash || {};
      (this as any)._mockTrash[mockRecord.trash_id] = { relPath, backupContent };
      return mockRecord;
    }

    const record = await invoke<TrashRecord>('trash_vault_path', {
      vaultPath: this.currentVaultPath,
      relPath,
    });

    delete this.localContents[relPath];
    crdtManager.removeDoc(relPath);
    await this.reloadTree();
    return record;
  }

  public async restoreTrash(trashId: string): Promise<string> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      const mock = (this as any)._mockTrash?.[trashId];
      if (mock) {
        if (mock.backupContent !== undefined) {
          this.localContents[mock.relPath] = mock.backupContent;
        }
        delete (this as any)._mockTrash[trashId];
        await this.reloadTree();
        return mock.relPath;
      }
      return '';
    }

    const restoredPath = await invoke<string>('restore_vault_path', {
      vaultPath: this.currentVaultPath,
      trashId,
    });

    await this.reloadTree();
    return restoredPath;
  }

  public async commitTrash(trashId: string): Promise<void> {
    if (!this.currentVaultPath || !isTauriEnvironment()) return;
    try {
      await invoke('commit_vault_trash', {
        vaultPath: this.currentVaultPath,
        trashId,
      });
    } catch {
      // Ignore si déjà commis ou restauré
    }
  }

  public async recoverTrash(): Promise<string[]> {
    if (!this.currentVaultPath || !isTauriEnvironment()) return [];
    try {
      const recovered = await invoke<string[]>('recover_vault_trash', {
        vaultPath: this.currentVaultPath,
      });
      if (recovered && recovered.length > 0) {
        await this.reloadTree();
      }
      return recovered || [];
    } catch {
      return [];
    }
  }

  public async deletePath(relPath: string): Promise<void> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      delete this.localContents[relPath];
      crdtManager.removeDoc(relPath);
      await this.reloadTree();
      return;
    }

    await invoke('delete_vault_path', {
      vaultPath: this.currentVaultPath,
      relPath,
    });

    delete this.localContents[relPath];
    crdtManager.removeDoc(relPath);
    await this.reloadTree();
  }

  public async parseFrontmatter(content: string): Promise<FrontmatterDoc> {
    if (!isTauriEnvironment()) {
      const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!match) {
        return {
          has_frontmatter: false,
          fields: {},
          ordered_keys: [],
          body: content,
        };
      }
      const raw = match[1];
      const fields: Record<string, string> = {};
      const ordered_keys: string[] = [];
      for (const line of raw.split(/\r?\n/)) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          const k = parts[0].trim();
          const v = parts.slice(1).join(':').trim();
          fields[k] = v;
          ordered_keys.push(k);
        }
      }
      return {
        has_frontmatter: true,
        raw_frontmatter: raw,
        fields,
        ordered_keys,
        body: content.slice(match[0].length).trimStart(),
      };
    }

    return await invoke<FrontmatterDoc>('parse_frontmatter', { content });
  }

  public async updateFrontmatter(content: string, key: string, value: string): Promise<string> {
    if (!isTauriEnvironment()) {
      if (content.startsWith('---')) {
        const regex = new RegExp(`(${key}\\s*:\\s*)([^\\r\\n]+)`);
        if (regex.test(content)) {
          return content.replace(regex, `$1${value}`);
        }
        // Clé non existante dans le frontmatter : insérer avant le --- fermant
        const parts = content.split('\n');
        let secondDashIdx = -1;
        for (let i = 1; i < parts.length; i++) {
          if (parts[i].trim() === '---') {
            secondDashIdx = i;
            break;
          }
        }
        if (secondDashIdx !== -1) {
          parts.splice(secondDashIdx, 0, `${key}: ${value}`);
          return parts.join('\n');
        }
      }
      return `---\n${key}: ${value}\n---\n\n${content}`;
    }

    return await invoke<string>('update_frontmatter', { content, key, value });
  }

  public async getBacklinks(relPath: string): Promise<string[]> {
    if (!this.currentVaultPath) return [];

    if (!isTauriEnvironment()) {
      const targetStem = relPath.split('/').pop()?.replace(/\.md$/, '') || '';
      const backlinks: string[] = [];
      for (const [p, c] of Object.entries(this.localContents)) {
        if (p === relPath) continue;
        if (
          c.includes(`(${relPath})`) ||
          c.includes(`[[${targetStem}]]`) ||
          c.includes(`[[${relPath}]]`) ||
          c.includes(`[[${targetStem}|`)
        ) {
          backlinks.push(p);
        }
      }
      return backlinks;
    }

    try {
      return await invoke<string[]>('get_file_backlinks', {
        vaultPath: this.currentVaultPath,
        relPath,
      });
    } catch (err: unknown) {
      console.warn('Erreur récupération backlinks :', err);
      return [];
    }
  }

  public getAbsolutePath(relPath: string = ''): string {
    if (!this.currentVaultPath) return relPath;
    const cleanRel = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
    const cleanVault = this.currentVaultPath.replace(/\\/g, '/').replace(/\/+$/, '');
    return cleanRel ? `${cleanVault}/${cleanRel}` : cleanVault;
  }

  public async revealInExplorer(relPath: string = ''): Promise<void> {
    if (!this.currentVaultPath) return;

    const fullPath = this.getAbsolutePath(relPath);

    if (!isTauriEnvironment()) {
      await navigator.clipboard.writeText(fullPath);
      toast.info('Chemin copié (mode démo web)', fullPath);
      return;
    }

    try {
      await invoke('reveal_in_explorer', {
        vaultPath: this.currentVaultPath,
        relPath,
      });
    } catch (err: unknown) {
      toast.error('Impossible d’ouvrir l’explorateur', String(err));
    }
  }

  public async searchVault(query: string): Promise<FileSearchResult[]> {
    if (!this.currentVaultPath || !query.trim()) return [];

    if (!isTauriEnvironment()) {
      const q = query.toLowerCase();
      const results: FileSearchResult[] = [];
      for (const [relPath, content] of Object.entries(this.localContents)) {
        const lines = content.split('\n');
        const snippets: SearchSnippet[] = [];
        let total = 0;
        lines.forEach((line, idx) => {
          const lower = line.toLowerCase();
          const pos = lower.indexOf(q);
          if (pos !== -1) {
            total++;
            if (snippets.length < 5) {
              snippets.push({
                line_number: idx + 1,
                line_content: line,
                match_start: pos,
                match_end: pos + q.length,
              });
            }
          }
        });
        if (total > 0) {
          results.push({
            rel_path: relPath,
            file_name: relPath.split('/').pop() || relPath,
            total_matches: total,
            snippets,
          });
        }
      }
      return results.sort((a, b) => b.total_matches - a.total_matches);
    }

    try {
      return await invoke<FileSearchResult[]>('search_vault', {
        vaultPath: this.currentVaultPath,
        query,
      });
    } catch (err: unknown) {
      console.warn('Erreur recherche coffre-fort :', err);
      return [];
    }
  }

  public async getVaultTasks(): Promise<TaskCard[]> {
    if (!this.currentVaultPath) return [];

    if (!isTauriEnvironment()) {
      const tasks: TaskCard[] = [];
      for (const [relPath, content] of Object.entries(this.localContents)) {
        if (!relPath.endsWith('.md')) continue;
        const fm = await this.parseFrontmatter(content);
        if (fm.fields['statut'] || relPath.includes('taches/')) {
          const statut = (fm.fields['statut'] || 'a-faire').toLowerCase();
          const id = fm.fields['id'] || relPath.split('/').pop()?.replace('.md', '') || 'task';
          const titre = fm.fields['titre'] || fm.body.split('\n')[0].replace(/^#+\s*/, '') || id;
          const tags = fm.fields['tags']
            ? fm.fields['tags'].replace(/[[\]]/g, '').split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean)
            : [];
          tasks.push({
            rel_path: relPath,
            id,
            titre,
            statut,
            priorite: fm.fields['priorite'],
            assigne: fm.fields['assigne'],
            sprint: fm.fields['sprint'],
            echeance: fm.fields['echeance'],
            tags,
            snippet: fm.body.slice(0, 100),
          });
        }
      }
      return tasks.sort((a, b) => a.id.localeCompare(b.id));
    }

    try {
      return await invoke<TaskCard[]>('get_vault_tasks', {
        vaultPath: this.currentVaultPath,
      });
    } catch (err: unknown) {
      console.warn('Erreur récupération des tâches :', err);
      return [];
    }
  }

  public async updateTaskStatus(relPath: string, newStatus: string): Promise<void> {
    if (!this.currentVaultPath) return;

    if (!isTauriEnvironment()) {
      const content = this.localContents[relPath] || '';
      const updated = await this.updateFrontmatter(content, 'statut', newStatus);
      await this.writeFile(relPath, updated);
      this.notify();
      return;
    }

    await invoke('update_task_status', {
      vaultPath: this.currentVaultPath,
      relPath,
      newStatus,
    });

    const updatedContent = await this.readFile(relPath);
    const tab = tabStore.tabs.find((t) => t.path === relPath);
    if (tab) {
      tab.content = updatedContent;
      tab.isDirty = false;
    }
    this.notify();
  }

  public async getVaultTags(): Promise<TagInfo[]> {
    if (!this.currentVaultPath) return [];

    if (isTauriEnvironment()) {
      try {
        return await invoke<TagInfo[]>('get_vault_tags', {
          vaultPath: this.currentVaultPath,
        });
      } catch (err: unknown) {
        console.debug('Fallback local pour get_vault_tags :', err);
      }
    }

    const tagMap: Record<string, Set<string>> = {};
    for (const [relPath, content] of Object.entries(this.localContents)) {
      const fm = await this.parseFrontmatter(content);
      if (fm.fields['tags']) {
        const raw = fm.fields['tags'].replace(/[[\]]/g, '');
        raw.split(',').forEach((t) => {
          const clean = t.trim().replace(/^#/, '').toLowerCase();
          if (clean) {
            if (!tagMap[clean]) tagMap[clean] = new Set();
            tagMap[clean].add(relPath);
          }
        });
      }
      const inlineMatches = content.matchAll(/(?:^|[\s(])#([a-zA-Z0-9_\-/]+)/g);
      for (const m of inlineMatches) {
        const tag = m[1].toLowerCase();
        if (tag && isNaN(Number(tag))) {
          if (!tagMap[tag]) tagMap[tag] = new Set();
          tagMap[tag].add(relPath);
        }
      }
    }
    const list: TagInfo[] = Object.entries(tagMap).map(([tag, fileSet]) => ({
      tag,
      count: fileSet.size,
      files: Array.from(fileSet).sort(),
    }));
    return list.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  public async getKanbanFiles(): Promise<KanbanFileInfo[]> {
    const list: KanbanFileInfo[] = [];

    const traverse = (nodes: FileNode[]) => {
      for (const node of nodes) {
        if (node.is_dir) {
          traverse(node.children);
        } else if (node.path.endsWith('.md')) {
          const lower = node.name.toLowerCase();
          const cleanTitle = node.name.replace(/\.md$/, '').replace(/^kanban-?/, '').trim() || node.name;
          const formattedTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

          if (lower.includes('kanban') || lower.includes('tableau') || lower.includes('board')) {
            list.push({
              path: node.path,
              name: node.name,
              title: formattedTitle,
            });
          }
        }
      }
    };

    traverse(this.files);
    return list;
  }

  public async createKanbanFile(
    relPath: string,
    title?: string,
    columns?: string[]
  ): Promise<string> {
    const cleanPath = relPath.endsWith('.md') ? relPath : `${relPath}.md`;
    const defaultTitle = title || cleanPath.split('/').pop()?.replace(/\.md$/, '') || 'Kanban';
    const content = createDefaultKanbanMarkdown(defaultTitle, columns);
    await this.createFile(cleanPath, content);
    return cleanPath;
  }

  public getPinnedNotes(): string[] {
    try {
      const data = localStorage.getItem('knit-pinned-notes');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public togglePinNote(relPath: string): void {
    const pinned = this.getPinnedNotes();
    const index = pinned.indexOf(relPath);
    if (index >= 0) {
      pinned.splice(index, 1);
      toast.info('Note retirée des favoris', relPath);
    } else {
      pinned.push(relPath);
      toast.success('Note épinglée aux favoris', relPath);
    }
    localStorage.setItem('knit-pinned-notes', JSON.stringify(pinned));
    this.notify();
  }

  public isPinned(relPath: string): boolean {
    return this.getPinnedNotes().includes(relPath);
  }

  public async getSuggestIndex(): Promise<SuggestIndexData> {
    if (!this.currentVaultPath) return { docs: [], headings: [], tags: [] };

    if (isTauriEnvironment()) {
      try {
        return await invoke<SuggestIndexData>('get_suggest_index', {
          vaultPath: this.currentVaultPath,
        });
      } catch (err) {
        console.debug('Fallback local pour get_suggest_index :', err);
      }
    }

    const docs: SuggestDocItem[] = [];
    const headings: HeadingItem[] = [];
    const tagCounts: Record<string, number> = {};

    for (const [p, c] of Object.entries(this.localContents)) {
      if (!p.endsWith('.md')) continue;
      const title = p.split('/').pop()?.replace(/\.md$/, '') || p;
      const doc_type = detectDocType(c, p);
      docs.push({ rel_path: p, title, doc_type });

      for (const line of c.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('# ')) {
          headings.push({
            file_rel: p,
            level: 1,
            text: trimmed.slice(2).trim(),
            slug: trimmed.slice(2).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          });
        } else if (trimmed.startsWith('## ')) {
          headings.push({
            file_rel: p,
            level: 2,
            text: trimmed.slice(3).trim(),
            slug: trimmed.slice(3).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          });
        } else if (trimmed.startsWith('### ')) {
          headings.push({
            file_rel: p,
            level: 3,
            text: trimmed.slice(4).trim(),
            slug: trimmed.slice(4).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          });
        }
        const tagMatches = line.matchAll(/(?:^|\s)#([a-zA-Z0-9_\-\/]+)/g);
        for (const m of tagMatches) {
          tagCounts[m[1]] = (tagCounts[m[1]] || 0) + 1;
        }
      }
    }

    return {
      docs,
      headings,
      tags: Object.entries(tagCounts).map(([tag, count]) => ({ tag, count })),
    };
  }

  public async convertDocumentType(
    relPath: string,
    targetType: 'note' | 'kanban' | 'table'
  ): Promise<void> {
    const originalContent = await this.readFile(relPath);
    let newContent = originalContent;

    if (targetType === 'kanban') {
      newContent = await this.updateFrontmatter(newContent, 'type', 'kanban');
      const hasH2 = /^##\s+/m.test(newContent);
      if (!hasH2) {
        const fmMatch = newContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
        const fmPart = fmMatch ? fmMatch[0] : '';
        const bodyPart = fmMatch ? newContent.slice(fmMatch[0].length).trim() : newContent.trim();

        let h1Title = relPath.split('/').pop()?.replace(/\.md$/, '') || 'Kanban';
        let remainingBody = bodyPart;
        const h1Match = bodyPart.match(/^#\s+(.+)$/m);
        if (h1Match) {
          h1Title = h1Match[1].trim();
          remainingBody = bodyPart.replace(/^#\s+.+$/m, '').trim();
        }

        const lines = remainingBody.split('\n').filter((l) => l.trim().length > 0);
        let cardsText = '';
        if (lines.length > 0) {
          for (const line of lines) {
            const trimmed = line.trim();
            if (/^-\s*\[[ xX\/\-\?\>\!]\]/.test(trimmed)) {
              cardsText += `${trimmed}\n`;
            } else {
              cardsText += `- [ ] ${trimmed}\n`;
            }
          }
        } else {
          cardsText = '- [ ] Première tâche\n';
        }

        newContent = `${fmPart}\n# ${h1Title}\n\n## À faire\n${cardsText}\n## En cours\n\n## Terminé\n`;
      }
    } else if (targetType === 'table') {
      newContent = await this.updateFrontmatter(newContent, 'type', 'table');
    } else {
      newContent = await this.updateFrontmatter(newContent, 'type', 'note');
    }

    await this.writeFile(relPath, newContent);

    const tab = tabStore.tabs.find((t) => t.path === relPath);
    if (tab) {
      tab.content = newContent;
      tab.docType = targetType;
      tab.viewMode = 'visual';
      tabStore.notify();
    }

    historyStore.push({
      id: `convert-${Date.now()}`,
      description: `Conversion en ${targetType === 'kanban' ? 'Tableau Kanban' : targetType === 'table' ? 'Vue Tableau' : 'Note Markdown'}`,
      undo: async () => {
        await this.writeFile(relPath, originalContent);
        if (tab) {
          tab.content = originalContent;
          tab.docType = detectDocType(originalContent, relPath);
          tabStore.notify();
        }
      },
    });

    toast.undoable(
      'Type de document converti',
      `Fichier configuré en ${targetType === 'kanban' ? 'Tableau Kanban' : targetType === 'table' ? 'Vue Tableau' : 'Note Markdown'}`,
      async () => {
        await this.writeFile(relPath, originalContent);
        if (tab) {
          tab.content = originalContent;
          tab.docType = detectDocType(originalContent, relPath);
          tabStore.notify();
        }
      }
    );
  }

  public async openExternalPath(pathOrUrl: string): Promise<void> {
    const clean = pathOrUrl.trim();
    if (!clean) return;

    if (isTauriEnvironment()) {
      try {
        await invoke('open_external_path', { pathOrUrl: clean });
        return;
      } catch (err) {
        console.warn('Erreur open_external_path :', err);
      }
    }

    if (/^https?:\/\//i.test(clean) || /^mailto:/i.test(clean)) {
      window.open(clean, '_blank');
    }
  }
}

export const vaultStore = new VaultStore();

