import { describe, expect, it } from "vitest";
import {
  applyDecay,
  calculateHealthDrainPerHour,
  clampStat,
  clampStats,
  getEffectiveDecayRate,
  isOverfed,
} from "../src/pet/stats";
import type { PetStats } from "../src/pet/types";

describe("PetStats — Pure Functions & Decay (Doc 01 §2, §3, §4)", () => {
  it("clampStat dan clampStats selalu membatasi nilai ke [0, 100]", () => {
    expect(clampStat(-10)).toBe(0);
    expect(clampStat(150)).toBe(100);
    expect(clampStat(NaN)).toBe(0);
    expect(clampStat(Infinity)).toBe(0);
    expect(clampStat(50)).toBe(50);

    const raw: PetStats = {
      hunger: -5,
      happiness: 120,
      energy: -99,
      hygiene: 100,
      health: 85,
    };
    const clamped = clampStats(raw);
    expect(clamped).toEqual({
      hunger: 0,
      happiness: 100,
      energy: 0,
      hygiene: 100,
      health: 85,
    });
  });

  describe("Decay Rates & Element Passives (Doc 01 §2 & §4)", () => {
    it("menghitung decay siang standar", () => {
      // Day: hunger -5, happiness -3, energy -5, hygiene -3 (rebalance 03/09)
      expect(getEffectiveDecayRate("hunger", "day")).toBe(-5);
      expect(getEffectiveDecayRate("happiness", "day")).toBe(-3);
      expect(getEffectiveDecayRate("energy", "day")).toBe(-5);
      expect(getEffectiveDecayRate("hygiene", "day")).toBe(-3);
    });

    it("menghitung decay malam sadar & tidur standar", () => {
      // Night Awake: hunger -4, happiness -2, energy -8, hygiene -2
      expect(getEffectiveDecayRate("energy", "nightAwake")).toBe(-8);
      // Sleeping: hunger -2, happiness -1, energy +30, hygiene -1
      expect(getEffectiveDecayRate("energy", "sleeping")).toBe(30);
    });

    it("menerapkan bonus pasif elemen (Doc 01 §4)", () => {
      // Fire: energy regen +10% (30 * 1.1 = 33)
      expect(getEffectiveDecayRate("energy", "sleeping", "fire")).toBeCloseTo(33);
      // Water: hygiene decay -25% (-3 * 0.75 = -2.25)
      expect(getEffectiveDecayRate("hygiene", "day", "water")).toBeCloseTo(-2.25);
      // Wind: energy decay -15% (-5 * 0.85 = -4.25)
      expect(getEffectiveDecayRate("energy", "day", "wind")).toBe(-4.25);
      // Earth: hunger decay -15% (-5 * 0.85 = -4.25)
      expect(getEffectiveDecayRate("hunger", "day", "earth")).toBeCloseTo(-4.25);
      // Mystic: all decay -10% (-5 * 0.9 = -4.5)
      expect(getEffectiveDecayRate("hunger", "day", "mystic")).toBeCloseTo(-4.5);
    });

    it("tahap bayi mengalami decay hunger ×1.5 & happiness ×0.5 (Doc 01 §3)", () => {
      expect(getEffectiveDecayRate("hunger", "day", undefined, "baby")).toBe(-7.5);
      expect(getEffectiveDecayRate("happiness", "day", undefined, "baby")).toBe(-1.5); // mudah senang
    });
  });

  describe("Aturan Komposit Health (Doc 01 §2)", () => {
    it("tidak ada penurunan health jika semua stat prima (>= 25) dan tidak sakit", () => {
      const breakdown = calculateHealthDrainPerHour({
        hunger: 80,
        happiness: 80,
        energy: 80,
        hygiene: 80,
      });
      expect(breakdown.totalDrainPerHour).toBe(0);
    });

    it("health pulih alami +2/jam saat rata-rata stat >= threshold dan tidak sakit (keseimbangan M3+M5)", () => {
      const stats = { hunger: 80, happiness: 80, energy: 80, hygiene: 80, health: 40 };
      const result = applyDecay(stats, 1, "day");
      expect(result.health).toBe(43); // 40 + 3 — rata-rata stat akhir masih >= threshold
    });

    it("tidak ada regen health jika rata-rata stat di bawah threshold 55 (zona stabil)", () => {
      const stats = { hunger: 50, happiness: 50, energy: 50, hygiene: 50, health: 40 };
      const result = applyDecay(stats, 5, "day");
      expect(result.health).toBe(40); // netral — tidak drain, tidak regen
    });

    it("regen tetap jalan saat SATU stat lemah — threshold rata-rata, bukan AND (tuning M5)", () => {
      // hygiene 30 → 27 setelah 1 jam; rata-rata (80+80+80+27)/4 ≈ 66,75 >= 55,
      // tidak ada stat < 25 -> +3/jam
      const stats = { hunger: 80, happiness: 80, energy: 80, hygiene: 30, health: 40 };
      const result = applyDecay(stats, 1, "day");
      expect(result.health).toBe(43);
    });

    it("tidak ada regen health saat sakit meski stat prima", () => {
      const stats = { hunger: 80, happiness: 80, energy: 80, hygiene: 80, health: 40 };
      const result = applyDecay(stats, 5, "day", { isSick: true });
      expect(result.health).toBe(40);
    });

    it("setiap stat di bawah 25 -> health -1/jam per stat (tuning M5)", () => {
      const breakdown = calculateHealthDrainPerHour({
        hunger: 20,
        happiness: 24,
        energy: 50,
        hygiene: 80,
      });
      expect(breakdown.lowStatsDrainPerHour).toBe(2); // 2 stat rendah × -1
      expect(breakdown.totalDrainPerHour).toBe(2);
    });

    it("sakit tidak diobati >= 12 jam -> health -10/jam tambahan", () => {
      const breakdown = calculateHealthDrainPerHour(
        {
          hunger: 80,
          happiness: 80,
          energy: 80,
          hygiene: 80,
        },
        true, // isUntreatedSickPast12h
      );
      expect(breakdown.untreatedSickDrainPerHour).toBe(10);
      expect(breakdown.totalDrainPerHour).toBe(10);
    });

    it("setiap stat bernilai 0 menggerus health -3/jam (maks -12/jam)", () => {
      // 1 stat = 0 -> -3
      const b1 = calculateHealthDrainPerHour({
        hunger: 0,
        happiness: 80,
        energy: 80,
        hygiene: 80,
      });
      expect(b1.zeroStatsDrainPerHour).toBe(3);

      // 2 stat = 0 -> lowStats (2 × -1) + zeroStats (6) = 8
      const b2 = calculateHealthDrainPerHour({
        hunger: 0,
        happiness: 0,
        energy: 80,
        hygiene: 80,
      });
      expect(b2.lowStatsDrainPerHour).toBe(2);
      expect(b2.zeroStatsDrainPerHour).toBe(6);
      expect(b2.totalDrainPerHour).toBe(8);

      // 4 stat = 0 -> lowStats (4 × -1) + zeroStats capped (12) = 16
      const b4 = calculateHealthDrainPerHour({
        hunger: 0,
        happiness: 0,
        energy: 0,
        hygiene: 0,
      });
      expect(b4.lowStatsDrainPerHour).toBe(4);
      expect(b4.zeroStatsDrainPerHour).toBe(12);
      expect(b4.totalDrainPerHour).toBe(16);
    });
  });

  describe("applyDecay murni", () => {
    it("menerapkan decay 2 jam siang tanpa health drain", () => {
      const initial: PetStats = {
        hunger: 100,
        happiness: 100,
        energy: 100,
        hygiene: 100,
        health: 100,
      };

      const result = applyDecay(initial, 2, "day");
      expect(result.hunger).toBe(90); // 100 - 5*2
      expect(result.happiness).toBe(94); // 100 - 3*2
      expect(result.energy).toBe(90); // 100 - 5*2
      expect(result.hygiene).toBe(94); // 100 - 3*2
      expect(result.health).toBe(100);
    });

    it("menjaga floor anti-frustrasi saat decay", () => {
      const initial: PetStats = {
        hunger: 10,
        happiness: 10,
        energy: 10,
        hygiene: 10,
        health: 100,
      };

      const result = applyDecay(initial, 5, "day", { floor: 5 });
      expect(result.hunger).toBe(5);
      expect(result.happiness).toBe(5);
      expect(result.energy).toBe(5);
      expect(result.hygiene).toBe(5);
      // Health tetap berkurang karena 4 stat < 25 (−1/jam/stat × 4 × 5 jam = −20)
      expect(result.health).toBe(80);
    });

    it("healthFloor pra-evolusi: health berhenti di ambang, tidak menyembuhkan di atasnya (tuning M5)", () => {
      const stats: PetStats = {
        hunger: 10,
        happiness: 10,
        energy: 10,
        hygiene: 10,
        health: 100,
      };
      // Drain 4/jam × 5 jam = −20 → tanpa floor health = 80; dengan floor 20 tetap 80.
      // Verifikasi floor benar-benar bekerja: cukup jam agar health menembus ambang.
      const result = applyDecay(stats, 85, "day", { floor: 5, healthFloor: 20 });
      expect(result.health).toBe(20); // terhenti di floor (tanpa floor: 100 − 340 → 0)

      const low: PetStats = { hunger: 10, happiness: 10, energy: 10, hygiene: 10, health: 10 };
      const result2 = applyDecay(low, 5, "day", { floor: 5, healthFloor: 20 });
      expect(result2.health).toBe(20); // sudah di bawah floor — diangkat ke floor (garansi)
    });
  });

  describe("Overfeed Validation (Doc 01 §2)", () => {
    it("mendeteksi >3 kali makan dalam jendela 6 jam", () => {
      const now = 10_000_000;
      const oneHour = 3_600_000;

      // 2 kali makan -> belum overfeed
      expect(isOverfed([now - oneHour, now - 2 * oneHour], now)).toBe(false);

      // 3 kali makan -> overfeed!
      expect(isOverfed([now - oneHour, now - 2 * oneHour, now - 3 * oneHour], now)).toBe(true);

      // 3 kali makan tapi 1 di luar 6 jam -> bukan overfeed
      expect(isOverfed([now - oneHour, now - 2 * oneHour, now - 7 * oneHour], now)).toBe(false);
    });
  });
});
