import { invoke } from '@tauri-apps/api/core';
import { isTauriEnvironment } from '../utils/env';
import { parseTrashMode, type TrashMode, type VaultLocalConfig } from '../types';

type Listener = () => void;

const DEFAULT_CONFIG: VaultLocalConfig = {
  theme: 'auto',
  hue: 35,
  trash_mode: 'os',
  lan_only: false,
};

class VaultConfigStore {
  public config: VaultLocalConfig = { ...DEFAULT_CONFIG };
  public vaultPath: string | null = null;
  private listeners: Set<Listener> = new Set();

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  /** Remise à zéro lors de la fermeture / bascule de coffre. */
  public reset(): void {
    this.vaultPath = null;
    this.config = { ...DEFAULT_CONFIG };
    this.notify();
  }

  public async load(vaultPath: string): Promise<VaultLocalConfig> {
    this.vaultPath = vaultPath;
    if (!isTauriEnvironment()) {
      this.config = { ...DEFAULT_CONFIG };
      this.notify();
      return this.config;
    }
    try {
      const cfg = await invoke<VaultLocalConfig>('get_vault_config', { vaultPath });
      this.config = {
        theme: cfg.theme || 'auto',
        hue: cfg.hue ?? 35,
        trash_mode: parseTrashMode(cfg.trash_mode),
        lan_only: Boolean(cfg.lan_only),
      };
    } catch {
      this.config = { ...DEFAULT_CONFIG };
    }
    this.notify();
    return this.config;
  }

  public async save(partial: Partial<VaultLocalConfig>): Promise<void> {
    this.config = { ...this.config, ...partial };
    this.notify();
    if (!this.vaultPath || !isTauriEnvironment()) return;
    try {
      await invoke<void>('save_vault_config', {
        vaultPath: this.vaultPath,
        config: this.config,
      });
    } catch (err) {
      console.warn('Erreur sauvegarde config locale:', err);
    }
  }

  public async setTrashMode(mode: TrashMode): Promise<void> {
    await this.save({ trash_mode: mode });
  }

  public async setLanOnly(lanOnly: boolean): Promise<void> {
    await this.save({ lan_only: lanOnly });
  }
}

export const vaultConfigStore = new VaultConfigStore();
