/**
 * Test breeding, genetika & warisan (M7 — Doc 07, GDD §15).
 * Deterministik: SeededRng untuk genetika; mitra NPC deterministik per dayKey.
 */
import { describe, expect, it } from "vitest";
import {
  MS_PER_DAY,
  PetStateMachine,
  SeededRng,
  applyStartBonus,
  averageParentStats,
  breedingMixKey,
  buildChildLineage,
  checkBreedingRequirements,
  childDefaultName,
  coatColorOf,
  computeChildGenetics,
  computeLegacyCoins,
  cooldownRemainingMs,
  createBreedingEgg,
  hexToHsv,
  hsvToHex,
  lineageGenerations,
  mixCoatColors,
  petToLineageParent,
  previewChildCoat,
  rollDailyPartners,
  type PetData,
} from "@hagumi/core";

const NOW = 1_735_000_000_000;

function makePet(overrides: Partial<PetData> = {}): PetData {
  return {
    name: "Kogitsune",
    element: "fire",
    birthAt: NOW - 30 * MS_PER_DAY,
    stage: "adult",
    state: "idle",
    stats: { hunger: 80, happiness: 85, energy: 80, hygiene: 75, health: 90 },
    careScore: 60,
    careHistory: [],
    recoverSince: null,
    tails: 2,
    path: "biasa",
    sickSince: null,
    lastPoopAt: null,
    poopCount: 0,
    lastCuredAt: 0,
    memoryLog: [],
    ...overrides,
  };
}

describe("checkBreedingRequirements (Doc 07 §1)", () => {
  const breeding = { childrenCount: 0, cooldownUntil: 0 };

  it("mengizinkan pet dewasa sehat bahagia", () => {
    const gate = checkBreedingRequirements(makePet(), breeding, NOW);
    expect(gate).toEqual({ allowed: true });
  });

  it("menolak pet yang masih muda", () => {
    const pet = makePet({ birthAt: NOW - 10 * MS_PER_DAY });
    const gate = checkBreedingRequirements(pet, breeding, NOW);
    expect(gate).toEqual({ allowed: false, reasons: ["TOO_YOUNG"] });
  });

  it("menolak health/happiness rendah dan mengumpulkan semua alasan", () => {
    const pet = makePet({
      birthAt: NOW - 5 * MS_PER_DAY,
      stats: { hunger: 80, happiness: 50, energy: 80, hygiene: 75, health: 60 },
    });
    const gate = checkBreedingRequirements(pet, breeding, NOW);
    expect(gate.allowed).toBe(false);
    if (!gate.allowed) {
      expect(gate.reasons).toContain("TOO_YOUNG");
      expect(gate.reasons).toContain("LOW_HEALTH");
      expect(gate.reasons).toContain("LOW_HAPPINESS");
    }
  });

  it("menolak saat cooldown & kuota penuh", () => {
    const cd = checkBreedingRequirements(makePet(), { ...breeding, cooldownUntil: NOW + 1000 }, NOW);
    expect(cd).toEqual({ allowed: false, reasons: ["ON_COOLDOWN"] });
    const quota = checkBreedingRequirements(makePet(), { childrenCount: 4, cooldownUntil: 0 }, NOW);
    expect(quota).toEqual({ allowed: false, reasons: ["QUOTA_FULL"] });
  });

  it("menolak pet mati/telur", () => {
    expect(checkBreedingRequirements(makePet({ state: "dead", stage: "dead" }), breeding, NOW)).toEqual({
      allowed: false,
      reasons: ["IS_DEAD"],
    });
    expect(checkBreedingRequirements(makePet({ stage: "egg", state: "egg" }), breeding, NOW)).toEqual({
      allowed: false,
      reasons: ["IS_EGG"],
    });
  });

  it("cooldownRemainingMs sesuai", () => {
    expect(cooldownRemainingMs({ childrenCount: 0, cooldownUntil: NOW + 5000 }, NOW)).toBe(5000);
    expect(cooldownRemainingMs({ childrenCount: 0, cooldownUntil: NOW - 5000 }, NOW)).toBe(0);
  });
});

describe("rollDailyPartners (Doc 12 §9.2)", () => {
  it("3 mitra dengan elemen unik & deterministik per hari", () => {
    const a = rollDailyPartners("2036-09-03");
    const b = rollDailyPartners("2036-09-03");
    const c = rollDailyPartners("2036-09-04");
    expect(a).toHaveLength(3);
    expect(a).toEqual(b);
    expect(new Set(a.map((p) => p.element)).size).toBe(3);
    expect(a.map((p) => p.element).sort()).not.toEqual(c.map((p) => p.element).sort());
  });
});

describe("genetika warna (Doc 07 §3)", () => {
  it("hex ↔ HSV roundtrip", () => {
    const hex = "#E8874A";
    expect(hsvToHex(hexToHsv(hex)).toUpperCase()).toBe(hex.toUpperCase());
  });

  it("mix 60/40 mendekati campuran + tetap hex valid", () => {
    const mixed = mixCoatColors("#FF0000", "#0000FF", null, 0);
    expect(mixed).toMatch(/^#[0-9A-Fa-f]{6}$/);
    const hsv = hexToHsv(mixed);
    expect(hsv.h).toBeGreaterThan(200); // merah+biru → hue melingkar via ungu (bukan hijau)
    expect(hsv.h).toBeLessThan(320);
  });

  it("preview deterministik tanpa RNG", () => {
    const partner = rollDailyPartners("2036-09-03")[0]!;
    expect(previewChildCoat(makePet(), partner)).toBe(previewChildCoat(makePet(), partner));
    expect(coatColorOf("fire")).toMatch(/^#/);
  });
});

describe("computeChildGenetics (Doc 07 §3 — distribusi 70/25/5)", () => {
  it("mengikuti tabel peluang pada 2000 sampel", () => {
    const parent = makePet();
    const partner = { id: "w", name: "Suzu", element: "water" as const };
    const tally = { parentLike: 0, mix: 0, mystic: 0 };
    for (let i = 0; i < 2000; i++) {
      const g = computeChildGenetics({ parent, partner, rng: new SeededRng(i * 7 + 1) });
      if (g.source === "parent" || g.source === "partner") tally.parentLike++;
      else if (g.source === "mix") tally.mix++;
      else tally.mystic++;
      expect(g.element).toMatch(/^(fire|water|wind|earth|mystic)$/);
      expect(g.coatColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(g.startBonusPct).toBeGreaterThanOrEqual(1);
      expect(g.startBonusPct).toBeLessThanOrEqual(5);
    }
    expect(tally.parentLike / 2000).toBeGreaterThan(0.64); // target 70%
    expect(tally.parentLike / 2000).toBeLessThan(0.76);
    expect(tally.mix / 2000).toBeGreaterThan(0.19); // target 25%
    expect(tally.mix / 2000).toBeLessThan(0.31);
    expect(tally.mystic / 2000).toBeGreaterThan(0.02); // target 5%
    expect(tally.mystic / 2000).toBeLessThan(0.09);
  });

  it("mix mengikuti tabel kombinasi (earth×fire → wind)", () => {
    const parent = makePet({ element: "earth" });
    const partner = { id: "f", name: "Kon", element: "fire" as const };
    for (let i = 0; i < 400; i++) {
      const g = computeChildGenetics({ parent, partner, rng: new SeededRng(i) });
      if (g.source === "mix") {
        expect(g.element).toBe("wind");
        return;
      }
    }
    throw new Error("tidak ada sampel mix dalam 400 iterasi");
  });

  it("induk elite (careScore ≥ 80) selalu dapat bonus 5%", () => {
    const parent = makePet({ careScore: 85 });
    const partner = { id: "w", name: "Suzu", element: "water" as const };
    for (let i = 0; i < 50; i++) {
      const g = computeChildGenetics({ parent, partner, rng: new SeededRng(i) });
      expect(g.startBonusPct).toBe(5);
    }
  });
});

describe("bonus stat awal (Doc 07 §3)", () => {
  it("rata-rata stat induk & penerapan bonus", () => {
    const parent = makePet();
    expect(averageParentStats(parent.stats)).toBe(80);
    const boosted = applyStartBonus(
      { hunger: 80, happiness: 80, energy: 80, hygiene: 80, health: 100 },
      parent,
      5,
    );
    expect(boosted.hunger).toBe(84);
    expect(boosted.health).toBe(100);
  });
});

describe("lineage (Doc 07 §4)", () => {
  it("maks 3 generasi & node anak = gen induk + 1", () => {
    const pet = makePet();
    const g1Entry = petToLineageParent(pet, 40);
    const g2Node = buildChildLineage(null, [g1Entry], 2);
    const g2Entry = { ...g1Entry, name: "Kogitsune II" };
    const g3Node = buildChildLineage(g2Node, [g2Entry], 3);
    const g4Node = buildChildLineage(g3Node, [{ ...g2Entry, name: "III" }], 4);
    const rows = lineageGenerations(g4Node);
    expect(rows).toHaveLength(3); // dipangkas ke 3 generasi
    expect(rows[0]![0]!.name).toBe("III");
    expect(rows[2]![0]!.name).toBe("Kogitsune");
  });
});

describe("warisan (Doc 07 §5)", () => {
  it("koin kenangan: 100 + 10×(hari−30), maks 600", () => {
    expect(computeLegacyCoins(30, 1)).toBe(100);
    expect(computeLegacyCoins(50, 1)).toBe(300);
    expect(computeLegacyCoins(90, 1)).toBe(600);
    expect(computeLegacyCoins(200, 1)).toBe(600);
  });

  it("bonus generasi +10%/gen, maks +50%", () => {
    expect(computeLegacyCoins(30, 2)).toBe(110);
    expect(computeLegacyCoins(30, 6)).toBe(150);
    expect(computeLegacyCoins(30, 9)).toBe(150);
    expect(computeLegacyCoins(50, 3)).toBe(360); // 300 × 1.2
  });
});

describe("telur & nama anak", () => {
  it("createBreedingEgg menyimpan genetika & bonusPoints", () => {
    const parent = makePet();
    const genetics = computeChildGenetics({
      parent,
      partner: { id: "w", name: "Suzu", element: "water" as const },
      rng: new SeededRng(42),
    });
    const egg = createBreedingEgg(genetics, [petToLineageParent(parent, 30)], 2, NOW, 4);
    expect(egg.element).toBe(genetics.element);
    expect(egg.coatColor).toBe(genetics.coatColor);
    expect(egg.personalityElement).toBe(genetics.personalityElement);
    expect(egg.bonusPoints).toBe(4);
    expect(egg.gen).toBe(2);
  });

  it("nama anak = induk + romawi generasi (maks 12 huruf)", () => {
    expect(childDefaultName("Kogitsune", 2)).toBe("Kogitsune II");
    expect(childDefaultName("Namapanjangx", 3)).toHaveLength(12);
  });

  it("telur menetas sebagai bayi sehat via PetStateMachine.hatch", () => {
    const egg = createBreedingEgg(
      computeChildGenetics({
        parent: makePet(),
        partner: { id: "w", name: "Suzu", element: "water" as const },
        rng: new SeededRng(7),
      }),
      [petToLineageParent(makePet(), 30)],
      2,
      NOW,
      2,
    );
    const eggPet = makePet({ stage: "egg", state: "egg", element: egg.element });
    const hatched = PetStateMachine.hatch(eggPet, NOW);
    expect(hatched.stage).toBe("baby");
    expect(hatched.state).toBe("idle");
    expect(hatched.birthAt).toBe(NOW);
  });
});

describe("kunci mix (Doc 07 §3)", () => {
  it("alfabetis dan konsisten dua arah", () => {
    expect(breedingMixKey("fire", "earth")).toBe("earth+fire");
    expect(breedingMixKey("earth", "fire")).toBe("earth+fire");
  });
});


