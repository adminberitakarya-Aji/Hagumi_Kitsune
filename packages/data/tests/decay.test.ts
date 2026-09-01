import { describe, expect, it } from "vitest";
import { STAT_KEYS, decayConfig, decayPhaseSchema, getDecayRate } from "../src/decay";

describe("decay.json v1 (Doc 01 §2 — angka balance)", () => {
  it("angka cocok dengan tabel Doc 01 §2", () => {
    expect(decayConfig.day.hunger).toBe(-8);
    expect(decayConfig.day.happiness).toBe(-6);
    expect(decayConfig.day.energy).toBe(-5);
    expect(decayConfig.day.hygiene).toBe(-4);

    expect(decayConfig.nightAwake.energy).toBe(-8); // mengantuk, decay lebih cepat
    expect(decayConfig.sleeping.energy).toBe(30); // pulih +30/jam
    expect(decayConfig.sleeping.hunger).toBe(-3);
  });

  it("getDecayRate mengembalikan nilai untuk semua kombinasi fase × stat", () => {
    const phases = decayPhaseSchema.options;
    for (const phase of phases) {
      for (const stat of STAT_KEYS) {
        expect(Number.isFinite(getDecayRate(phase, stat))).toBe(true);
      }
    }
  });

  it("setiap stat memiliki decay terbesar di siang hari dibanding tidur", () => {
    for (const stat of STAT_KEYS) {
      const day = decayConfig.day[stat];
      const sleep = decayConfig.sleeping[stat];
      if (stat === "energy") {
        expect(sleep).toBeGreaterThan(0); // energy pulih saat tidur
      } else {
        expect(day).toBeLessThanOrEqual(sleep); // negatif lebih dalam = decay lebih cepat
      }
    }
  });
});
