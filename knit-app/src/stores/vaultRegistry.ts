import type { RegisteredVault } from '../types';

const REGISTRY_KEY = 'knit-vault-registry';
const LAST_KEY = 'knit-last-vault-path';
const LEGACY_RECENT_KEY = 'knit-recent-vaults';

export const DEMO_VAULT_PATH = 'Knit Demo Vault';

/** Coffre démo mémoire (pas un chemin disque réel). */
export function isDemoVaultPath(path: string | null | undefined): boolean {
  return path === DEMO_VAULT_PATH || path === 'Knit Workspace (Web Dev)';
}

type RegistryListener = () => void;

/** Nom d'affichage dérivé du dernier segment de chemin (OS-agnostique). */
export function vaultNameFromPath(path: string): string {
  const parts = path.split(/[/\\]/).filter(Boolean);
  const last = parts[parts.length - 1];
  return last || path;
}

function loadRaw(): RegisteredVault[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (v): v is RegisteredVault =>
            typeof v === 'object' &&
            v !== null &&
            typeof (v as RegisteredVault).path === 'string' &&
            typeof (v as RegisteredVault).name === 'string'
        );
      }
    }
  } catch {
    /* ignore */
  }

  // Migration depuis l'ancienne clé Wizard
  try {
    const legacy = localStorage.getItem(LEGACY_RECENT_KEY);
    if (legacy) {
      const paths = JSON.parse(legacy) as unknown;
      if (Array.isArray(paths)) {
        const migrated: RegisteredVault[] = paths
          .filter((p): p is string => typeof p === 'string')
          .map((path, i) => ({
            path,
            name: vaultNameFromPath(path),
            lastOpenedAt: Date.now() - i,
          }));
        if (migrated.length > 0) {
          localStorage.setItem(REGISTRY_KEY, JSON.stringify(migrated));
          return migrated;
        }
      }
    }
  } catch {
    /* ignore */
  }

  return [];
}

class VaultRegistry {
  private entries: RegisteredVault[] = loadRaw();
  private listeners: Set<RegistryListener> = new Set();

  public subscribe(listener: RegistryListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private persist() {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(this.entries));
    // Compat Wizard : garder la liste des chemins
    localStorage.setItem(
      LEGACY_RECENT_KEY,
      JSON.stringify(this.entries.filter((e) => !e.isDemo).map((e) => e.path))
    );
    this.notify();
  }

  public list(): RegisteredVault[] {
    return [...this.entries].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  }

  public getLastPath(): string | null {
    return localStorage.getItem(LAST_KEY);
  }

  /** Enregistre ou met à jour un coffre et le marque comme dernier ouvert. */
  public touch(path: string, name?: string, opts?: { isDemo?: boolean }): void {
    const now = Date.now();
    const idx = this.entries.findIndex((e) => e.path === path);
    const entry: RegisteredVault = {
      path,
      name: name || vaultNameFromPath(path),
      lastOpenedAt: now,
      isDemo: opts?.isDemo,
    };
    if (idx >= 0) {
      this.entries[idx] = { ...this.entries[idx], ...entry };
    } else {
      this.entries = [entry, ...this.entries].slice(0, 24);
    }
    localStorage.setItem(LAST_KEY, path);
    this.persist();
  }

  public remove(path: string): void {
    this.entries = this.entries.filter((e) => e.path !== path);
    if (localStorage.getItem(LAST_KEY) === path) {
      localStorage.removeItem(LAST_KEY);
    }
    this.persist();
  }

  public clearLast(): void {
    localStorage.removeItem(LAST_KEY);
  }
}

export const vaultRegistry = new VaultRegistry();
