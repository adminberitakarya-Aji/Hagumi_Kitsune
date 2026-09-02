/** Test konfigurasi dialog 5 elemen (M6 — Doc 08 §3). */
import { describe, expect, it } from "vitest";

import { getAllDialogConfigs } from "../src/dialogue";
import { dialogueConfigSchema } from "../src/dialogue";

const ELEMENTS = ["fire", "water", "wind", "earth", "mystic"] as const;

describe("dialog_<element>.json (Doc 08 §3)", () => {
  const all = getAllDialogConfigs();

  it("5 elemen lengkap & valid skema", () => {
    expect(Object.keys(all).sort()).toEqual([...ELEMENTS].sort());
    for (const el of ELEMENTS) {
      expect(() => dialogueConfigSchema.parse(all[el])).not.toThrow();
      expect(all[el].element).toBe(el);
    }
  });

  it("semua pool baris non-kosong & unik di dalam pool", () => {
    for (const el of ELEMENTS) {
      const cfg = all[el];
      for (const [key, pool] of Object.entries(cfg.lines)) {
        expect(pool.length, `${el}.lines.${key}`).toBeGreaterThan(0);
        expect(new Set(pool).size, `${el}.lines.${key}`).toBe(pool.length);
      }
      for (const [key, pool] of Object.entries(cfg.chat)) {
        if (key === "makan") continue; // ditangani terpisah di bawah
        expect((pool as string[]).length, `${el}.chat.${key}`).toBeGreaterThan(0);
      }
      for (const [k2, p2] of Object.entries(cfg.chat.makan)) {
        expect(p2.length, `${el}.chat.makan.${k2}`).toBeGreaterThan(0);
      }
      expect(cfg.senior.idle.length).toBeGreaterThan(0);
      expect(cfg.senior.nostalgia.length).toBeGreaterThan(0);
      expect(cfg.dark.idle.length).toBeGreaterThan(0);
      expect(cfg.dark.neglect.length).toBeGreaterThan(0);
    }
  });

  it("senior & dark punya gaya berbeda dari idle utama (uji beda teks)", () => {
    for (const el of ELEMENTS) {
      const cfg = all[el];
      const main = new Set(cfg.lines.idle);
      // minimal satu baris senior TIDAK ada di pool idle utama (varian nostalgia)
      expect(cfg.senior.nostalgia.some((l) => !main.has(l))).toBe(true);
      expect(cfg.dark.idle.some((l) => !main.has(l))).toBe(true);
    }
  });

  it("template 'siapa' memakai placeholder {name}", () => {
    for (const el of ELEMENTS) {
      expect(all[el].chat.siapa.every((l) => l.includes("{name}"))).toBe(true);
    }
  });
});
