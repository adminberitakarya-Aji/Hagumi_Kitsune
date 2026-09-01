/** Adapter localStorage browser — satu-satunya tempat web menyentuh storage (Doc 09 §1: ports & adapters). */
import type { IStorage } from "@hagumi/core";

export class WebStorage implements IStorage {
  private readonly storage: Storage | null;

  constructor(storage: Storage | null = typeof localStorage === "undefined" ? null : localStorage) {
    this.storage = storage;
  }

  get(key: string): string | null {
    return this.storage?.getItem(key) ?? null;
  }

  set(key: string, value: string): void {
    this.storage?.setItem(key, value);
  }

  remove(key: string): void {
    this.storage?.removeItem(key);
  }

  isAvailable(): boolean {
    if (!this.storage) return false;
    try {
      const probe = "__hagumi_probe__";
      this.storage.setItem(probe, "1");
      this.storage.removeItem(probe);
      return true;
    } catch {
      return false; // mode privat / kuota penuh → fallback ke MemoryStorage di runtime
    }
  }
}
