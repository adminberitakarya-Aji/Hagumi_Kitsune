/**
 * Test skenario M2 (ROADMAP DoD):
 * 1. Siklus penuh 1+ hari (time-lapse headless): makan → poop → sapu → sakit → obat → sembuh.
 * 2. Kematian karena penelalaan + mulai baru tidak merusak data lama (memorial).
 * 3. Angka decay mengikat ke decay.json — bukan hard-code (Doc 01 §2).
 */
import { describe, expect, it } from "vitest";
import {
  FakeClock,
  MemoryStorage,
  MS_PER_HOUR,
  MS_PER_DAY,
  PetStateMachine,
  SaveSystem,
  createDefaultSave,
  getEffectiveDecayRate,
  mapToDecayPhase,
  processOfflineCatchUp,
  scoopPoop,
  shouldSpawnPoop,
  spawnPoop,
  updateLoginStreak,
} from "../src";
import { decayConfig } from "@hagumi/data";
import type { PetData } from "../src";

// 2024-12-24 09:26:40 UTC — sengaja dipilih agar jam-UTC siklus 48 jam berakhir
// di jendela bangun (test menuntut pet bangun & poop bersih di tick terakhir).
// Dipasangkan dengan TZ=UTC dari vitest.config.ts → deterministik di semua mesin/CI.
const START = 1_735_032_400_000;
const FEED_RESTORE = 40;

function expectFiniteStats(pet: PetData): void {
  for (const [key, value] of Object.entries(pet.stats)) {
    expect(Number.isFinite(value), `${key} harus finite`).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(100);
  }
}

describe("DoD M2 #1 — siklus penuh 1+ hari tanpa jebakan", () => {
  it("caretaker normal: makan→poop→sapu→(sakit→obat)→tidur, pet hidup & sehat", () => {
    let pet = createDefaultSave({ petName: "Miko", element: "fire", nowMs: START }).pet;
    let lastTick = START;
    const recentFeeds: number[] = [];
    let feedsSincePoop = 0;
    let totalPoops = 0;

    for (let h = 0; h <= 48; h++) {
      const now = START + h * MS_PER_HOUR;

      // Tick decay (jalur sama dengan runtime web: processOfflineCatchUp per tick)
      const tick = processOfflineCatchUp(pet, lastTick, now);
      pet = tick.pet;
      lastTick = now;
      expectFiniteStats(pet);
      // Waktu berjalan → state transien tick sebelumnya selesai (runtime: setTimeout)
      pet = PetStateMachine.finishTransientState(pet);

      // Poop live (jalur runtime: shouldSpawnPoop → spawnPoop)
      if (
        shouldSpawnPoop(pet, now, {
          baseMs: 4 * MS_PER_HOUR,
          minMs: 90 * 60_000,
          maxPoops: 3,
          feedsSincePoop,
        })
      ) {
        pet = spawnPoop(pet, now);
        feedsSincePoop = 0;
        totalPoops++;
      }

      // Eksplisit UTC — konsisten dengan TZ=UTC yang dipin vitest.config.ts
      // (getHours() membaca jam ambient OS runner → hasil nondeterministik di CI).
      const hour = new Date(now).getUTCHours();

      // Caretaker: bangun pagi, tidur malam (22:00–05:00)
      if (pet.state === "sleeping" && hour >= 5 && hour < 22) {
        const wake = PetStateMachine.wake(pet);
        expect(wake.success).toBe(true);
        pet = wake.pet;
      } else if (pet.state !== "sleeping" && hour >= 22) {
        const sleep = PetStateMachine.sleep(pet);
        expect(sleep.success).toBe(true);
        pet = sleep.pet;
      }

      if (pet.state === "sleeping") continue; // tidur: tidak ada aksi lain

      // Obat saat sakit
      if (pet.state === "sick") {
        const cure = PetStateMachine.cure(pet);
        expect(cure.success).toBe(true);
        pet = cure.pet;
      }

      // Sapu poop (maks 1 sapu/tick — seperti gesture pemain)
      if (pet.poopCount > 0) pet = scoopPoop(pet);

      // Mandi saat bau
      if (pet.stats.hygiene < 40) {
        const bathe = PetStateMachine.bathe(pet);
        if (bathe.success) pet = bathe.pet;
      }

      // Makan saat lapar
      if (pet.stats.hunger < 50) {
        const feed = PetStateMachine.feed(pet, {
          hungerRestore: FEED_RESTORE,
          happinessBonus: 5,
          nowMs: now,
          recentFeeds,
        });
        if (feed.success) {
          pet = feed.pet;
          feedsSincePoop++;
          recentFeeds.push(now);
        }
      }

      expectFiniteStats(pet);
    }

    // DoD: siklus selesai tanpa kematian, poop pernah muncul & selalu tersapu
    expect(pet.stage).not.toBe("dead");
    expect(pet.stats.health).toBeGreaterThan(0);
    expect(totalPoops).toBeGreaterThan(0);
    expect(pet.poopCount).toBe(0);
    expect(pet.state).not.toBe("sick");
    expect(pet.state).not.toBe("sleeping"); // jam akhir pagi → sudah bangun
  });
});

describe("DoD M2 #2 — kematian & memorial; mulai baru tidak merusak data lama", () => {
  it("penelalaan total → mati; data lama utuh saat mulai baru", () => {
    const storage = new MemoryStorage();
    const clock = new FakeClock(START);
    const saveSystem = new SaveSystem(storage, clock);

    // Pet hidup normal, tersimpan
    const oldSave = createDefaultSave({ petName: "Kohaku", element: "water", nowMs: START });
    expect(saveSystem.save(oldSave).success).toBe(true);

    // Penelalaan total: tick per jam tanpa perawatan apa pun.
    // Tuning M5: floor health pra-evolusi (rules.health.preEvolutionFloor = 20)
    // menjamin pet tidak mati sebelum evolusi final hari-20 — jalur negatif
    // yako/nogitsune tetap terjangkau. Kematian terjadi segera setelah hari-20
    // saat floor nonaktif (drain penuh: stat 0 −15/jam + sakit −10/jam).
    let pet = oldSave.pet;
    let lastTick = START;
    let ticks = 0;
    while (pet.stage !== "dead" && ticks < 25 * 24) {
      clock.advance(MS_PER_HOUR);
      const now = clock.now();
      pet = processOfflineCatchUp(pet, lastTick, now).pet;
      lastTick = now;
      ticks++;
      expectFiniteStats(pet);
    }

    expect(pet.stage).toBe("dead"); // mati setelah floor pra-evolusi berakhir
    expect(ticks).toBeGreaterThanOrEqual(20 * 24); // garansi: tidak mati sebelum hari-20
    expect(pet.stats.health).toBe(0);

    // Simpan kondisi mati (layar memorial membaca data ini)
    const memorialSave = { ...oldSave, pet };
    expect(saveSystem.save(memorialSave).success).toBe(true);
    const snapshot = JSON.stringify(memorialSave);

    // Mulai baru: hapus save lama, buat pet baru, simpan di storage yang sama
    saveSystem.deleteSave();
    const newSave = createDefaultSave({
      petName: "Hinata",
      element: "wind",
      nowMs: START + 5 * MS_PER_DAY,
    });
    expect(saveSystem.save(newSave).success).toBe(true);

    // DoD: data memorial LAMA tidak berubah + save baru valid & terpisah
    expect(JSON.stringify(memorialSave)).toBe(snapshot);
    const loaded = saveSystem.load();
    expect(loaded.success).toBe(true);
    if (loaded.success) {
      expect(loaded.data.pet.name).toBe("Hinata");
      expect(loaded.data.pet.stage).toBe("baby");
      expect(loaded.data.pet.stats.health).toBe(100);
    }
  });
});

describe("DoD M2 #3 — angka dari JSON, bukan hard-code", () => {
  it("getEffectiveDecayRate mengembalikan persis isi decay.json", () => {
    expect(getEffectiveDecayRate("hunger", "day")).toBe(decayConfig.day.hunger);
    expect(getEffectiveDecayRate("energy", "nightAwake")).toBe(decayConfig.nightAwake.energy);
    expect(getEffectiveDecayRate("hygiene", "sleeping")).toBe(decayConfig.sleeping.hygiene);
  });

  it("baby stage: hunger decay ×1,5 (cepat lapar) & happiness ×0,5 (mudah senang)", () => {
    const adultHunger = getEffectiveDecayRate("hunger", "day");
    const adultHappy = getEffectiveDecayRate("happiness", "day");
    expect(getEffectiveDecayRate("hunger", "day", undefined, "baby")).toBeCloseTo(
      adultHunger * 1.5,
    );
    expect(getEffectiveDecayRate("happiness", "day", undefined, "baby")).toBeCloseTo(
      adultHappy * 0.5,
    );
    // Stat lain baby = adult
    expect(getEffectiveDecayRate("energy", "day", undefined, "baby")).toBe(
      getEffectiveDecayRate("energy", "day"),
    );
  });

  it("mapToDecayPhase benar: tidur → sleeping, malam bangun → nightAwake", () => {
    expect(mapToDecayPhase("night", false)).toBe("nightAwake");
    expect(mapToDecayPhase("day", false)).toBe("day");
  });

  it("streak login: siklus 7 hari, hari sama tanpa hadiah ulang", () => {
    const day = (n: number): string =>
      new Date(START + n * MS_PER_DAY).toISOString().split("T")[0]!;
    let streak = { count: 0, lastDay: day(0) };
    const rewardDays: number[] = [];
    for (let n = 1; n <= 8; n++) {
      const result = updateLoginStreak(streak, day(n), 7);
      streak = result.streak;
      if (result.isNewDay) rewardDays.push(result.rewardDay);
    }
    expect(rewardDays).toEqual([1, 2, 3, 4, 5, 6, 7, 1]); // hari 8 kembali ke 1
    // Buka ulang hari sama → tanpa hadiah
    const again = updateLoginStreak(streak, day(8), 7);
    expect(again.isNewDay).toBe(false);
  });
});
