import { describe, expect, it } from "vitest";
import { FakeClock, MemoryStorage } from "../src/adapters";
import { SaveSystem } from "../src/save/save-system";
import { createDefaultSave, SAVE_STORAGE_KEY, type SaveData } from "../src/save/schema";

describe("SaveSystem (Doc 09 §3 & §4)", () => {
  it("bisa menyimpan dan membaca SaveData v2 yang valid", () => {
    const storage = new MemoryStorage();
    const clock = new FakeClock(1_735_000_000_000);
    const saveSys = new SaveSystem(storage, clock);

    const initialSave = createDefaultSave({
      petName: "Kogitsune",
      element: "fire",
      nowMs: clock.now(),
    });

    const saveRes = saveSys.save(initialSave);
    expect(saveRes.success).toBe(true);

    const loadRes = saveSys.load();
    expect(loadRes.success).toBe(true);
    if (loadRes.success) {
      expect(loadRes.data.pet.name).toBe("Kogitsune");
      expect(loadRes.data.pet.element).toBe("fire");
      expect(loadRes.data.version).toBe(2);
      expect(loadRes.data.pet.careHistory).toEqual([]);
      expect(loadRes.data.pet.recoverSince).toBeNull();
      expect(loadRes.data.lastTick).toBe(1_735_000_000_000);
    }
  });

  it("menangani storage kosong dengan NOT_FOUND", () => {
    const storage = new MemoryStorage();
    const clock = new FakeClock();
    const saveSys = new SaveSystem(storage, clock);

    const res = saveSys.load();
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe("NOT_FOUND");
    }
  });

  it("menolak save data korup dan tidak menimpa otomatis (Doc 09 §4)", () => {
    const storage = new MemoryStorage();
    const clock = new FakeClock();
    const saveSys = new SaveSystem(storage, clock);

    // Simpan data invalid
    storage.set(SAVE_STORAGE_KEY, '{"version": 1, "invalidField": true}');

    const res = saveSys.load();
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error).toBe("CORRUPTED");
    }
    // Data di storage tetap utuh (tidak tertimpa)
    expect(storage.get(SAVE_STORAGE_KEY)).toBe('{"version": 1, "invalidField": true}');
  });

  it("migrasi skema lama v0 ke v2 berhasil (via v1)", () => {
    const storage = new MemoryStorage();
    const clock = new FakeClock();
    const saveSys = new SaveSystem(storage, clock);

    // Save versi lama tanpa field version dan inventory/breeding default
    const legacyRaw = {
      lastTick: 1_735_000_000_000,
      player: { coins: 50, loginStreak: { count: 1, lastDay: "2026-08-01" } },
      pet: {
        name: "Yuki",
        element: "water",
        birthAt: 1_734_000_000_000,
        stage: "baby",
        state: "idle",
        stats: { hunger: 50, happiness: 50, energy: 50, hygiene: 50, health: 100 },
        careScore: 50,
        tails: 1,
        path: "biasa",
        sickSince: null,
        lastPoopAt: null,
        memoryLog: [],
      },
    };

    storage.set(SAVE_STORAGE_KEY, JSON.stringify(legacyRaw));

    const loadRes = saveSys.load();
    expect(loadRes.success).toBe(true);
    if (loadRes.success) {
      expect(loadRes.migrated).toBe(true);
      expect(loadRes.data.version).toBe(2);
      expect(loadRes.data.pet.name).toBe("Yuki");
      expect(loadRes.data.pet.careHistory).toEqual([]);
      expect(loadRes.data.pet.recoverSince).toBeNull();
      expect(loadRes.data.inventory).toBeDefined();
      expect(loadRes.data.settings.sound).toBe(true);
    }
  });

  it("ekspor dan impor Base64 berfungsi dengan aman (Doc 09 §4)", () => {
    const originalSave: SaveData = createDefaultSave({
      petName: "Inari",
      element: "mystic",
      nowMs: 1_735_000_000_000,
    });

    const b64 = SaveSystem.exportBase64(originalSave);
    expect(typeof b64).toBe("string");
    expect(b64.length).toBeGreaterThan(20);

    const importRes = SaveSystem.importBase64(b64);
    expect(importRes.success).toBe(true);
    if (importRes.success) {
      expect(importRes.data.pet.name).toBe("Inari");
      expect(importRes.data.pet.element).toBe("mystic");
      expect(importRes.data.version).toBe(2);
    }

    // Uji dengan string rusak
    const badRes = SaveSystem.importBase64("bukan-base64-valid@@@");
    expect(badRes.success).toBe(false);
  });
});
