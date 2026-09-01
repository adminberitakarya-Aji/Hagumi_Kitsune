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
      // Day: hunger -8, happiness -6, energy -5, hygiene -4
      expect(getEffectiveDecayRate("hunger", "day")).toBe(-8);
      expect(getEffectiveDecayRate("happiness", "day")).toBe(-6);
      expect(getEffectiveDecayRate("energy", "day")).toBe(-5);
      expect(getEffectiveDecayRate("hygiene", "day")).toBe(-4);
    });

    it("menghitung decay malam sadar & tidur standar", () => {
      // Night Awake: hunger -6, happiness -5, energy -8, hygiene -3
      expect(getEffectiveDecayRate("energy", "nightAwake")).toBe(-8);
      // Sleeping: hunger -3, happiness -2, energy +30, hygiene -2
      expect(getEffectiveDecayRate("energy", "sleeping")).toBe(30);
    });

    it("menerapkan bonus pasif elemen (Doc 01 §4)", () => {
      // Fire: energy regen +10% (30 * 1.1 = 33)
      expect(getEffectiveDecayRate("energy", "sleeping", "fire")).toBeCloseTo(33);
      // Water: hygiene decay -25% (-4 * 0.75 = -3)
      expect(getEffectiveDecayRate("hygiene", "day", "water")).toBe(-3);
      // Wind: energy decay -15% (-5 * 0.85 = -4.25)
      expect(getEffectiveDecayRate("energy", "day", "wind")).toBe(-4.25);
      // Earth: hunger decay -15% (-8 * 0.85 = -6.8)
      expect(getEffectiveDecayRate("hunger", "day", "earth")).toBeCloseTo(-6.8);
      // Mystic: all decay -10% (-8 * 0.9 = -7.2)
      expect(getEffectiveDecayRate("hunger", "day", "mystic")).toBeCloseTo(-7.2);
    });

    it("tahap bayi mengalami decay hunger ×1.5 (Doc 01 §3)", () => {
      expect(getEffectiveDecayRate("hunger", "day", undefined, "baby")).toBe(-12);
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

    it("jika >= 2 stat di bawah 25 -> health -10/jam", () => {
      const breakdown = calculateHealthDrainPerHour({
        hunger: 20,
        happiness: 24,
        energy: 50,
        hygiene: 80,
      });
      expect(breakdown.lowStatsDrainPerHour).toBe(10);
      expect(breakdown.totalDrainPerHour).toBe(10);
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

    it("setiap stat bernilai 0 menggerus health -5/jam (maks -15/jam)", () => {
      // 1 stat = 0 -> -5
      const b1 = calculateHealthDrainPerHour({
        hunger: 0,
        happiness: 80,
        energy: 80,
        hygiene: 80,
      });
      expect(b1.zeroStatsDrainPerHour).toBe(5);

      // 2 stat = 0 -> lowStats (10) + zeroStats (10) = 20
      const b2 = calculateHealthDrainPerHour({
        hunger: 0,
        happiness: 0,
        energy: 80,
        hygiene: 80,
      });
      expect(b2.lowStatsDrainPerHour).toBe(10);
      expect(b2.zeroStatsDrainPerHour).toBe(10);
      expect(b2.totalDrainPerHour).toBe(20);

      // 4 stat = 0 -> lowStats (10) + zeroStats capped (15) = 25
      const b4 = calculateHealthDrainPerHour({
        hunger: 0,
        happiness: 0,
        energy: 0,
        hygiene: 0,
      });
      expect(b4.lowStatsDrainPerHour).toBe(10);
      expect(b4.zeroStatsDrainPerHour).toBe(15);
      expect(b4.totalDrainPerHour).toBe(25);
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
      expect(result.hunger).toBe(84); // 100 - 8*2
      expect(result.happiness).toBe(88); // 100 - 6*2
      expect(result.energy).toBe(90); // 100 - 5*2
      expect(result.hygiene).toBe(92); // 100 - 4*2
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
      // Health tetap berkurang karena 4 stat < 25 (10/jam * 5 jam = -50)
      expect(result.health).toBe(50);
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
