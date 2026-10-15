import { invoke } from '@tauri-apps/api/core';

export interface FileNode {
  id: string;
  name: string;
  path: string;
  is_dir: boolean;
  extension?: string;
  children: FileNode[];
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
    id: '.knitshare',
    name: '.knitshare',
    path: '.knitshare',
    is_dir: false,
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
        ],
      },
    ],
  },
];

const DEMO_CONTENTS: Record<string, string> = {
  'accueil.md': `# 🧶 Bienvenue dans Knit

Knit est votre outil de documentation et de gestion de projet collaborative **Local-First**, **P2P** et en **Markdown pur**.

---

## 🚀 Fonctionnalités du Sprint 1

- **Éditeur CodeMirror 6** fidèle au texte brut, sans balises cachées.
- **Système multi-onglets complet** :
  - **Clic molette** sur un fichier pour l'ouvrir dans un nouvel onglet permanent.
  - **Clic molette** sur un onglet pour le fermer immédiatement (\`Ctrl+W\`).
  - Raccourcis universels : \`Ctrl+Tab\`, \`Ctrl+Shift+T\`, \`Ctrl+1..8\`.
- **Recherche & Remplacement** intégrés via \`Ctrl+F\` et \`Ctrl+H\`.
- **Design System sobre & soigné** :
  - Thème clair et sombre mat (style Obsidian).
  - Slider interactif pour calibrer l'accent principal \`--knit-hue\`.
- **Notifications Toast** centralisées en bas à droite avec regroupement anti-spam.

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
};

class VaultStore {
  public currentVaultPath: string | null = null;
  public files: FileNode[] = [];
  public isLoading: boolean = false;
  public error: string | null = null;

  private listeners: Set<VaultListener> = new Set();
  private localContents: Record<string, string> = { ...DEMO_CONTENTS };

  constructor() {
    // Si on a un chemin sauvegardé ou en mode démo
    const savedPath = localStorage.getItem('knit-last-vault-path');
    if (savedPath && isTauriEnvironment()) {
      this.openVault(savedPath);
    } else {
      // Démarre en mode démo par défaut
      this.currentVaultPath = 'Knit Demo Vault';
      this.files = DEMO_FILES;
    }
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
      // En navigateur pur, on simule l'ouverture
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
    await this.reloadTree();
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
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      if (relPath in this.localContents) {
        return this.localContents[relPath];
      }
      return `# ${relPath}\nNouveau document`;
    }

    return await invoke<string>('read_vault_file', {
      vaultPath: this.currentVaultPath,
      relPath,
    });
  }

  public async writeFile(relPath: string, content: string): Promise<void> {
    if (!this.currentVaultPath) {
      throw new Error('Aucun coffre-fort ouvert');
    }

    if (!isTauriEnvironment()) {
      this.localContents[relPath] = content;
      return;
    }

    await invoke('write_vault_file', {
      vaultPath: this.currentVaultPath,
      relPath,
      content,
    });
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
}

export const vaultStore = new VaultStore();
