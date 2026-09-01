import { describe, expect, it } from "vitest";
import {
  getDayPhase,
  getSeason,
  mapToDecayPhase,
  MS_PER_HOUR,
  processOfflineCatchUp,
  splitByDayPhase,
} from "../src/time/time-service";
import type { PetData } from "../src/pet/types";

function createMockPet(overrides?: Partial<PetData>): PetData {
  return {
    name: "Kogitsune",
    element: "fire",
    birthAt: 1_700_000_000_000,
    stage: "teen",
    state: "idle",
    stats: {
      hunger: 80,
      happiness: 80,
      energy: 80,
      hygiene: 80,
      health: 100,
    },
    careScore: 50,
    tails: 2,
    path: "zenko",
    sickSince: null,
    lastPoopAt: null,
    memoryLog: [],
    ...overrides,
  };
}

describe("TimeService (Doc 03 & Doc 09)", () => {
  describe("getDayPhase (Doc 03 §3)", () => {
    it("menghitung fase waktu lokal dengan tepat", () => {
      // Helper untuk buat Date dengan jam tertentu
      const makeDate = (hours: number, minutes: number = 0) => {
        const d = new Date(2026, 8, 1, hours, minutes);
        return d;
      };

      // Morning: 05:00 - 10:00
      expect(getDayPhase(makeDate(5, 0))).toBe("morning");
      expect(getDayPhase(makeDate(7, 30))).toBe("morning");
      expect(getDayPhase(makeDate(9, 59))).toBe("morning");

      // Day: 10:00 - 15:00
      expect(getDayPhase(makeDate(10, 0))).toBe("day");
      expect(getDayPhase(makeDate(12, 0))).toBe("day");
      expect(getDayPhase(makeDate(14, 59))).toBe("day");

      // Evening: 15:00 - 19:00
      expect(getDayPhase(makeDate(15, 0))).toBe("evening");
      expect(getDayPhase(makeDate(17, 30))).toBe("evening");
      expect(getDayPhase(makeDate(18, 59))).toBe("evening");

      // Night: 19:00 - 05:00
      expect(getDayPhase(makeDate(19, 0))).toBe("night");
      expect(getDayPhase(makeDate(23, 59))).toBe("night");
      expect(getDayPhase(makeDate(0, 0))).toBe("night");
      expect(getDayPhase(makeDate(4, 59))).toBe("night");
    });
  });

  describe("getSeason (Doc 03 §4)", () => {
    it("menghitung musim kalender nyata belahan utara", () => {
      // Spring: 20 Mar – 19 Jun (month 2 is Mar, month 5 is Jun)
      expect(getSeason(new Date(2026, 2, 20))).toBe("spring");
      expect(getSeason(new Date(2026, 4, 1))).toBe("spring");
      expect(getSeason(new Date(2026, 5, 19))).toBe("spring");

      // Summer: 20 Jun – 19 Sep (month 5 is Jun, month 8 is Sep)
      expect(getSeason(new Date(2026, 5, 20))).toBe("summer");
      expect(getSeason(new Date(2026, 7, 15))).toBe("summer");
      expect(getSeason(new Date(2026, 8, 19))).toBe("summer");

      // Autumn: 20 Sep – 19 Dec (month 8 is Sep, month 11 is Dec)
      expect(getSeason(new Date(2026, 8, 20))).toBe("autumn");
      expect(getSeason(new Date(2026, 10, 10))).toBe("autumn");
      expect(getSeason(new Date(2026, 11, 19))).toBe("autumn");

      // Winter: 20 Dec – 19 Mar (month 11 is Dec, month 2 is Mar)
      expect(getSeason(new Date(2026, 11, 20))).toBe("winter");
      expect(getSeason(new Date(2026, 0, 15))).toBe("winter");
      expect(getSeason(new Date(2026, 2, 19))).toBe("winter");
    });
  });

  describe("splitByDayPhase (Doc 03 §2)", () => {
    it("membagi rentang 2 jam dalam fase yang sama", () => {
      // 06:00 sampai 08:00 (keduanya morning)
      const t1 = new Date(2026, 8, 1, 6, 0, 0).getTime();
      const t2 = new Date(2026, 8, 1, 8, 0, 0).getTime();

      const segments = splitByDayPhase(t1, t2);
      expect(segments).toHaveLength(1);
      expect(segments[0]!.phase).toBe("morning");
      expect(segments[0]!.hours).toBe(2);
    });

    it("membagi rentang yang melintasi beberapa fase waktu", () => {
      // 08:00 (morning) sampai 16:00 (evening)
      // Segmen 1: 08:00 - 10:00 (morning, 2 jam)
      // Segmen 2: 10:00 - 15:00 (day, 5 jam)
      // Segmen 3: 15:00 - 16:00 (evening, 1 jam)
      const t1 = new Date(2026, 8, 1, 8, 0, 0).getTime();
      const t2 = new Date(2026, 8, 1, 16, 0, 0).getTime();

      const segments = splitByDayPhase(t1, t2);
      expect(segments).toHaveLength(3);
      expect(segments[0]).toMatchObject({ phase: "morning", hours: 2 });
      expect(segments[1]).toMatchObject({ phase: "day", hours: 5 });
      expect(segments[2]).toMatchObject({ phase: "evening", hours: 1 });
    });
  });

  describe("mapToDecayPhase", () => {
    it("memetakan ke sleeping jika sedang tidur, dan ke day / nightAwake jika bangun", () => {
      expect(mapToDecayPhase("morning", true)).toBe("sleeping");
      expect(mapToDecayPhase("night", true)).toBe("sleeping");
      expect(mapToDecayPhase("morning", false)).toBe("day");
      expect(mapToDecayPhase("day", false)).toBe("day");
      expect(mapToDecayPhase("evening", false)).toBe("day");
      expect(mapToDecayPhase("night", false)).toBe("nightAwake");
    });
  });

  describe("processOfflineCatchUp (Doc 03 §2 & GDD §9)", () => {
    it("simulasi offline 1 jam siang menghitung pengurangan stat secara proporsional", () => {
      const lastTick = new Date(2026, 8, 1, 11, 0, 0).getTime();
      const now = new Date(2026, 8, 1, 12, 0, 0).getTime();
      const pet = createMockPet({
        element: "wind",
        stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 80, health: 100 },
      });

      const result = processOfflineCatchUp(pet, lastTick, now);
      expect(result.elapsedHours).toBe(1);
      expect(result.died).toBe(false);
      expect(result.pet.stats.hunger).toBeLessThan(80);
      expect(result.pet.stats.health).toBe(100);
    });

    it("newborn (<24 jam) dilindungi oleh floor 50 (GDD §9)", () => {
      const now = new Date(2026, 8, 1, 20, 0, 0).getTime();
      const lastTick = now - 18 * MS_PER_HOUR; // 18 jam offline
      const pet = createMockPet({
        birthAt: now - 20 * MS_PER_HOUR, // baru lahir 20 jam lalu (< 24 jam)
        stage: "baby",
        stats: { hunger: 60, happiness: 60, energy: 60, hygiene: 60, health: 100 },
      });

      const result = processOfflineCatchUp(pet, lastTick, now);
      expect(result.pet.stats.hunger).toBeGreaterThanOrEqual(50);
      expect(result.pet.stats.happiness).toBeGreaterThanOrEqual(50);
      expect(result.pet.stats.energy).toBeGreaterThanOrEqual(50);
      expect(result.pet.stats.hygiene).toBeGreaterThanOrEqual(50);
    });

    it("pet dewasa offline 72 jam menghasilkan poop maks 3 dan jatuh sakit / mati jika komposit habis", () => {
      const now = new Date(2026, 8, 5, 12, 0, 0).getTime();
      const lastTick = now - 72 * MS_PER_HOUR; // 72 jam offline
      const pet = createMockPet({
        birthAt: now - 30 * 24 * MS_PER_HOUR, // 30 hari
        stage: "adult",
        stats: { hunger: 20, happiness: 20, energy: 20, hygiene: 10, health: 50 },
      });

      const result = processOfflineCatchUp(pet, lastTick, now);
      expect(result.poopsSpawned).toBe(3);
      expect(result.died).toBe(true);
      expect(result.pet.state).toBe("dead");
    });
  });
});
