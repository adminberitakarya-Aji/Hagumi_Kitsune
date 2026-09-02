import { describe, expect, it } from "vitest";
import { canPlayMinigame, calculateMinigameReward } from "../src/player/minigame";

const BASE = {
  coinPerPoint: 0.5,
  minCoins: 5,
  happinessMin: 8,
  happinessMax: 20,
  dayPhaseMultipliers: { day: 1.1 },
  stageCoinMultiplier: 1,
  mysticBonusPct: 0,
  streakBonusCoins: 0,
  dayPhase: "day",
};

describe("calculateMinigameReward (Doc 05 §5)", () => {
  it("contoh dokumen: poin 120 siang → 66 koin", () => {
    const r = calculateMinigameReward(120, BASE);
    expect(r.coins).toBe(66); // floor(120×0.5)=60 ×1.1 = 66
  });

  it("happiness linear 8→20 sesuai performa", () => {
    expect(calculateMinigameReward(0, BASE).happiness).toBe(8);
    expect(calculateMinigameReward(50, BASE).happiness).toBe(14);
    expect(calculateMinigameReward(200, BASE).happiness).toBe(20); // clamp 100
  });

  it("elder +10% koin, mystic +10%, keduanya berlaku berlipat", () => {
    const elder = calculateMinigameReward(120, { ...BASE, stageCoinMultiplier: 1.1 });
    expect(elder.coins).toBe(73); // 66 ×1.1 = 72.6 → 73
    const mystic = calculateMinigameReward(120, { ...BASE, mysticBonusPct: 0.1 });
    expect(mystic.coins).toBe(73); // 66 ×1.1 → 72.6 → 73
  });

  it("streak hari-7: bonus flat ditambahkan", () => {
    const r = calculateMinigameReward(120, { ...BASE, streakBonusCoins: 50 });
    expect(r.coins).toBe(116);
  });

  it("kegagalan bukan hukuman: minimal 5 koin", () => {
    expect(calculateMinigameReward(0, BASE).coins).toBe(5);
  });

  it("fase non-siang tanpa multiplier", () => {
    const night = calculateMinigameReward(120, { ...BASE, dayPhase: "night" });
    expect(night.coins).toBe(60);
  });

  it("matsuri musiman: koin ×1.5 (Doc 05 §5)", () => {
    const summer = calculateMinigameReward(120, { ...BASE, seasonMultiplier: 1.5 });
    expect(summer.coins).toBe(99); // 60 ×1.1 ×1.5 = 99
  });

  it("musim ×1.5 + elder ×1.1 berlipat", () => {
    const r = calculateMinigameReward(120, {
      ...BASE,
      seasonMultiplier: 1.5,
      stageCoinMultiplier: 1.1,
    });
    expect(r.coins).toBe(109); // 60 ×1.1 ×1.5 ×1.1 = 108.9 → 109
  });
});

describe("canPlayMinigame (Doc 05 §1 & §7)", () => {
  const gate = (over: Partial<Parameters<typeof canPlayMinigame>[0]>) =>
    canPlayMinigame({
      state: "idle",
      stage: "adult",
      energy: 50,
      lastPlayAt: 0,
      nowMs: 31 * 60_000,
      cooldownMs: 30 * 60_000,
      minEnergyToPlay: 15,
      stageLocked: false,
      ...over,
    });

  it("boleh main dalam kondisi normal", () => {
    expect(gate({})).toEqual({ allowed: true });
  });

  it("baby terkunci", () => {
    expect(gate({ stage: "baby", stageLocked: true })).toEqual({ allowed: false, reason: "BABY_LOCKED" });
  });

  it("energy di bawah ambang ditolak TOO_TIRED", () => {
    expect(gate({ energy: 14 })).toEqual({ allowed: false, reason: "TOO_TIRED" });
  });

  it("cooldown aktif ditolak", () => {
    expect(gate({ nowMs: 10 * 60_000 })).toEqual({ allowed: false, reason: "COOLDOWN" });
  });

  it("tidur & mati ditolak", () => {
    const sleeping = gate({ state: "sleeping" });
    expect(sleeping).toEqual({ allowed: false, reason: "ALREADY_SLEEPING" });
    expect(gate({ state: "dead", stage: "dead" })).toEqual({ allowed: false, reason: "IS_DEAD" });
  });
});
