import { describe, expect, it } from "vitest";
import { STAT_KEYS, decayConfig, decayPhaseSchema, getDecayRate } from "../src/decay";

describe("decay.json v1 (Doc 01 §2 — angka balance, rebalance 90-day companion)", () => {
  it("angka cocok dengan tabel Doc 01 §2", () => {
    expect(decayConfig.day.hunger).toBe(-5);
    expect(decayConfig.day.happiness).toBe(-3);
    expect(decayConfig.day.energy).toBe(-5);
    expect(decayConfig.day.hygiene).toBe(-3);

    expect(decayConfig.nightAwake.energy).toBe(-8); // mengantuk, decay lebih cepat
    expect(decayConfig.sleeping.energy).toBe(30); // pulih +30/jam
    expect(decayConfig.sleeping.hunger).toBe(-2);
  });

  it("target balance: pemilik normal (3 feed + 2 play + 1 bathe / hari) mampu bertahan", () => {
    // Anggaran harian: 16 jam bangun + 8 jam tidur
    const budget = (stat: Exclude<(typeof STAT_KEYS)[number], "health">): number =>
      decayConfig.day[stat] * 16 + decayConfig.sleeping[stat] * 8;
    // Hunger: 3 makan × +35 = 105 harus > total decay harian
    expect(Math.abs(budget("hunger"))).toBeLessThanOrEqual(105);
    // Happiness: 2 main × +15 + belai ~+6 + bonus makan/mandi ~+20 = ~56
    expect(Math.abs(budget("happiness"))).toBeLessThanOrEqual(60);
    // Hygiene: 1 mandi/hari (atau tiap 1,5 hari = 67 poin)
    expect(Math.abs(budget("hygiene"))).toBeLessThanOrEqual(67);
    // Energy: pulih penuh setelah tidur (240 >> 80 yang terpakai bangun)
    expect(decayConfig.sleeping.energy * 8).toBeGreaterThanOrEqual(100);
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
