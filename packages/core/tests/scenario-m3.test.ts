/**
 * Test skenario M3 (ROADMAP DoD): Evolusi Zenko/Yako.
 * 1. Evolusi tahap: hari-10 (baby→teen), hari-20 (jalur dikunci Care Score), hari-60 (senior).
 * 2. Jalur folklor sesuai ambang evolution.json + ekor dari rentang jalur.
 * 3. Pemulihan jalur: yako dirawat baik → naik tier setelah recoveryDays bertahan.
 * 4. Care Score: sampling + bonus interaksi − penalti kelalaian, jendela rolling 24 jam.
 * 5. Simulasi headless 12 hari: evolusi pertama terjadi & Care Score terkumpul wajar.
 */
import { describe, expect, it } from "vitest";
import {
  FakeClock,
  MS_PER_DAY,
  MS_PER_HOUR,
  createDefaultSave,
  checkPathRecovery,
  computeCareScore,
  evolveIfNeeded,
  lockPathForScore,
  samplePetCare,
  type EvolutionParams,
  type PetData,
} from "../src";
import { evolutionConfig } from "@hagumi/data";

const START = 1_735_000_000_000; // FakeClock default
/** Replikasi persis EV_PARAMS runtime web (gameSystem) dari sumber JSON. */
const EV: EvolutionParams = {
  firstEvolutionDay: evolutionConfig.firstEvolutionDay,
  finalEvolutionDay: evolutionConfig.finalEvolutionDay,
  elderDay: evolutionConfig.elderDay,
  recoveryDays: evolutionConfig.recoveryDays,
  sampleIntervalHours: evolutionConfig.sampleIntervalHours,
  interactionBonus: evolutionConfig.interactionBonus,
  neglectPenalty: evolutionConfig.neglectPenalty,
  paths: evolutionConfig.paths,
  care: { windowHours: evolutionConfig.historyWindowHours, msPerHour: MS_PER_HOUR },
};

/** History stat-only sintetis (v = nilai rata-rata stat). */
function statHistory(avg: number, hours = 24): PetData["careHistory"] {
  return Array.from({ length: hours }, (_, i) => ({
    t: START - (hours - i) * MS_PER_HOUR,
    v: avg,
    b: 0,
    p: 0,
  }));
}

describe("DoD M3 #1 — evolusi tahap sesuai evolution.json", () => {
  it("sebelum hari-10 tidak berevolusi; hari-10 baby→teen & ekor +1", () => {
    const pet = createDefaultSave({ petName: "Miko", element: "fire", nowMs: START }).pet;

    const before = evolveIfNeeded(pet, START + 9 * MS_PER_DAY, EV);
    expect(before.kind).toBeNull();

    const evo = evolveIfNeeded(pet, START + 10 * MS_PER_DAY, EV);
    expect(evo.kind).toBe("first");
    expect(evo.pet.stage).toBe("teen");
    expect(evo.pet.tails).toBe(pet.tails + 1);
    expect(evo.pet.state).toBe("evolving"); // cutscene menunggu dikonfirmasi
  });

  it("hari-20 jalur dikunci dari Care Score; ekor dari rentang jalur", () => {
    const base = {
      ...createDefaultSave({ petName: "Miko", element: "fire", nowMs: START }).pet,
      stage: "teen" as const,
    };

    const tenko = evolveIfNeeded({ ...base, careHistory: statHistory(95) }, START + 20 * MS_PER_DAY, EV);
    expect(tenko.kind).toBe("final");
    expect(tenko.path).toBe("tenko");
    expect(tenko.tier).toBe(evolutionConfig.paths.tenko?.tier);
    expect(tenko.pet.tails).toBe(9);
    expect(tenko.pet.stage).toBe("adult");

    const zenko = evolveIfNeeded({ ...base, careHistory: statHistory(80) }, START + 20 * MS_PER_DAY, EV);
    expect(zenko.path).toBe("zenko");
    expect(zenko.pet.tails).toBe(6); // ceil((5+7)/2)

    const nogitsune = evolveIfNeeded({ ...base, careHistory: statHistory(5) }, START + 20 * MS_PER_DAY, EV);
    expect(nogitsune.path).toBe("nogitsune");
    expect(nogitsune.pet.tails).toBe(1);
  });

  it("hari-60 menjadi senior dengan ekor maksimum jalur", () => {
    const base = {
      ...createDefaultSave({ petName: "Miko", element: "fire", nowMs: START }).pet,
      stage: "adult" as const,
      path: "biasa" as const,
      tails: 3,
    };
    const evo = evolveIfNeeded(base, START + 60 * MS_PER_DAY, EV);
    expect(evo.kind).toBe("elder");
    expect(evo.pet.stage).toBe("elder");
    expect(evo.pet.tails).toBe(4); // maks rentang biasa [3,4]
  });
});

describe("DoD M3 #2 — ambang jalur & pemulihan", () => {
  it("lockPathForScore tepat di setiap batas ambang JSON", () => {
    expect(lockPathForScore(100, EV)).toBe("tenko");
    expect(lockPathForScore(90, EV)).toBe("tenko");
    expect(lockPathForScore(70, EV)).toBe("zenko");
    expect(lockPathForScore(40, EV)).toBe("biasa");
    expect(lockPathForScore(15, EV)).toBe("yako");
    expect(lockPathForScore(0, EV)).toBe("nogitsune");
  });

  it("yako dirawat baik naik ke biasa setelah recoveryDays; skor turun → reset", () => {
    const clock = new FakeClock(START);
    let pet: PetData = {
      ...createDefaultSave({ petName: "Kohaku", element: "water", nowMs: START }).pet,
      stage: "adult",
      path: "yako",
      careHistory: statHistory(50), // ≥ biasa.min (40)
    };
    pet = { ...pet, careScore: computeCareScore(pet.careHistory) };

    // Hari-0: mulai menghitung kegigihan, belum naik
    const started = checkPathRecovery(pet, clock.now(), EV);
    expect(started.promotedTo).toBeUndefined();
    expect(started.pet.recoverSince).toBe(clock.now());

    // Hari-6: belum cukup lama
    clock.advance(6 * MS_PER_DAY);
    const waiting = checkPathRecovery(started.pet, clock.now(), EV);
    expect(waiting.promotedTo).toBeUndefined();

    // Hari-7: naik ke biasa + ekor disesuaikan
    clock.advance(MS_PER_DAY);
    const promoted = checkPathRecovery(waiting.pet, clock.now(), EV);
    expect(promoted.promotedTo).toBe("biasa");
    expect(promoted.pet.path).toBe("biasa");
    expect(promoted.pet.tails).toBe(4);

    // Skor anjlok di bawah ambang berikutnya → penghitung reset
    const dropped = { ...promoted.pet, careHistory: statHistory(20), careScore: 20 };
    const reset = checkPathRecovery(dropped, clock.now() + MS_PER_DAY, EV);
    expect(reset.promotedTo).toBeUndefined();
    expect(reset.pet.recoverSince).toBeNull();
  });
});

describe("DoD M3 #3 — Care Score: sampling, bonus, penalti, jendela rolling", () => {
  it("bonus interaksi menaikkan skor; penalti menurunkan; sample kadaluarsa dipangkas", () => {
    const pet = createDefaultSave({ petName: "Miko", element: "fire", nowMs: START }).pet;
    const base = samplePetCare(pet, START, EV);
    const statSamples = base.careHistory.filter((s) => s.b === 0 && s.p === 0).length;
    expect(statSamples).toBe(1); // satu sample stat

    const withBonus = samplePetCare(pet, START, EV, { b: 4, p: 0 });
    expect(computeCareScore(withBonus.careHistory)).toBeGreaterThan(computeCareScore(base.careHistory));

    const withPenalty = samplePetCare(pet, START, EV, { b: 0, p: 6 });
    expect(computeCareScore(withPenalty.careHistory)).toBeLessThan(computeCareScore(base.careHistory));

    // Sample 25 jam lalu berada di luar jendela 24 jam → tidak dihitung
    const old = [...statHistory(90), { t: START - 25 * MS_PER_HOUR, v: 90, b: 0, p: 0 }];
    const pruned = samplePetCare({ ...pet, careHistory: old }, START, EV);
    expect(pruned.careHistory.every((s) => s.t >= START - 24 * MS_PER_HOUR)).toBe(true);
  });
});
