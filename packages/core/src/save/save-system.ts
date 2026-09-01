/**
 * HAGUMI core — SaveSystem (Doc 09 §3 & §4).
 * Mengatur persistensi save data, validasi skema Zod, migrasi versi, dan backup ekspor/impor base64.
 */

import type { IClock, ILogger, IStorage } from "../ports";
import { SAVE_STORAGE_KEY, saveDataSchemaV1, type SaveData } from "./schema";

export type LoadSaveResult =
  | { success: true; data: SaveData; migrated: boolean }
  | {
      success: false;
      error: "NOT_FOUND" | "CORRUPTED" | "STORAGE_UNAVAILABLE";
      message: string;
      raw?: string;
    };

export class SaveSystem {
  constructor(
    private readonly storage: IStorage,
    private readonly clock: IClock,
    private readonly logger?: ILogger,
  ) {}

  /**
   * Membaca save data dari storage, memvalidasi skema, dan melakukan migrasi versi jika diperlukan.
   */
  load(): LoadSaveResult {
    if (!this.storage.isAvailable()) {
      this.logger?.error("Storage tidak tersedia");
      return {
        success: false,
        error: "STORAGE_UNAVAILABLE",
        message: "Media penyimpanan tidak dapat diakses.",
      };
    }

    const raw = this.storage.get(SAVE_STORAGE_KEY);
    if (!raw) {
      return {
        success: false,
        error: "NOT_FOUND",
        message: "Tidak ada data simpanan tersimpan.",
      };
    }

    try {
      const parsedJson: unknown = JSON.parse(raw);
      const migrated = this.migrate(parsedJson);
      const validation = saveDataSchemaV1.safeParse(migrated.data);

      if (!validation.success) {
        this.logger?.error("Save data korup / tidak valid", validation.error.format());
        return {
          success: false,
          error: "CORRUPTED",
          message: "Data simpanan rusak atau tidak sesuai skema.",
          raw,
        };
      }

      return {
        success: true,
        data: validation.data,
        migrated: migrated.wasMigrated,
      };
    } catch (e) {
      this.logger?.error("Gagal mem-parse save JSON", e);
      return {
        success: false,
        error: "CORRUPTED",
        message: "Format file simpanan tidak dapat dibaca.",
        raw,
      };
    }
  }

  /**
   * Menyimpan data dengan validasi skema terlebih dahulu (Doc 09 §4).
   */
  save(data: SaveData): { success: boolean; error?: string } {
    if (!this.storage.isAvailable()) {
      return { success: false, error: "STORAGE_UNAVAILABLE" };
    }

    // Perbarui timestamp lastTick
    const toSave: SaveData = {
      ...data,
      lastTick: this.clock.now(),
    };

    const validation = saveDataSchemaV1.safeParse(toSave);
    if (!validation.success) {
      this.logger?.error("Gagal menyimpan: data tidak memenuhi skema", validation.error);
      return { success: false, error: "VALIDATION_FAILED" };
    }

    try {
      const serialized = JSON.stringify(validation.data);
      this.storage.set(SAVE_STORAGE_KEY, serialized);
      return { success: true };
    } catch (e) {
      this.logger?.error("Gagal menulis ke storage", e);
      return { success: false, error: "WRITE_FAILED" };
    }
  }

  /**
   * Menghapus save data dari storage.
   */
  deleteSave(): void {
    this.storage.remove(SAVE_STORAGE_KEY);
  }

  /**
   * Migrasi save data dari versi lama ke versi sekarang (Doc 09 §4).
   */
  migrate(raw: unknown): { data: unknown; wasMigrated: boolean } {
    if (typeof raw !== "object" || raw === null) {
      return { data: raw, wasMigrated: false };
    }

    const obj = raw as Record<string, unknown>;
    let currentVersion = typeof obj.version === "number" ? obj.version : 0;
    let data = { ...obj };
    let wasMigrated = false;

    // Contoh pipeline migrasi: v0 (draft tanpa versi) -> v1
    if (currentVersion === 0) {
      data = {
        ...data,
        version: 1,
        inventory: data.inventory ?? { food: {}, medicine: {}, owned: [], placedDecor: [] },
        breeding: data.breeding ?? { childrenCount: 0, cooldownUntil: 0, lineage: {} },
        settings: data.settings ?? { sound: true, notify: true },
      };
      currentVersion = 1;
      wasMigrated = true;
    }

    return { data, wasMigrated };
  }

  /**
   * Ekspor SaveData menjadi string Base64 (Doc 09 §4).
   */
  static exportBase64(data: SaveData): string {
    const jsonStr = JSON.stringify(data);
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    const bytes = new TextEncoder().encode(jsonStr);
    let output = "";
    for (let i = 0; i < bytes.length; i += 3) {
      const b1 = bytes[i]!;
      const b2 = i + 1 < bytes.length ? bytes[i + 1]! : NaN;
      const b3 = i + 2 < bytes.length ? bytes[i + 2]! : NaN;

      const enc1 = b1 >> 2;
      const enc2 = ((b1 & 3) << 4) | (Number.isNaN(b2) ? 0 : b2 >> 4);
      const enc3 = Number.isNaN(b2) ? 64 : ((b2 & 15) << 2) | (Number.isNaN(b3) ? 0 : b3 >> 6);
      const enc4 = Number.isNaN(b3) ? 64 : b3 & 63;

      output += chars.charAt(enc1) + chars.charAt(enc2) + chars.charAt(enc3) + chars.charAt(enc4);
    }
    return output;
  }

  /**
   * Impor string Base64 menjadi SaveData yang tervalidasi (Doc 09 §4).
   */
  static importBase64(
    b64: string,
  ): { success: true; data: SaveData } | { success: false; error: string } {
    try {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
      const cleanB64 = b64.replace(/[^A-Za-z0-9+/=]/g, "");
      if (cleanB64.length === 0 || cleanB64.length % 4 !== 0) {
        return { success: false, error: "Kode backup rusak atau bukan format Base64 yang benar." };
      }

      const bytes: number[] = [];
      for (let i = 0; i < cleanB64.length; i += 4) {
        const enc1 = chars.indexOf(cleanB64.charAt(i));
        const enc2 = chars.indexOf(cleanB64.charAt(i + 1));
        const enc3 = chars.indexOf(cleanB64.charAt(i + 2));
        const enc4 = chars.indexOf(cleanB64.charAt(i + 3));

        if (enc1 === -1 || enc2 === -1) {
          return { success: false, error: "Kode backup mengandung karakter invalid." };
        }

        const b1 = (enc1 << 2) | (enc2 >> 4);
        bytes.push(b1);

        if (enc3 !== 64 && enc3 !== -1) {
          const b2 = ((enc2 & 15) << 4) | (enc3 >> 2);
          bytes.push(b2);
        }
        if (enc4 !== 64 && enc4 !== -1) {
          const b3 = ((enc3 & 3) << 6) | enc4;
          bytes.push(b3);
        }
      }

      const jsonStr = new TextDecoder().decode(new Uint8Array(bytes));
      const parsed: unknown = JSON.parse(jsonStr);
      const validation = saveDataSchemaV1.safeParse(parsed);

      if (!validation.success) {
        return { success: false, error: "Data backup tidak valid sesuai skema Hagumi v1." };
      }

      return { success: true, data: validation.data };
    } catch {
      return { success: false, error: "Kode backup rusak atau tidak dapat dibaca." };
    }
  }
}
