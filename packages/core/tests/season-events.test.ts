import { describe, expect, it } from "vitest";
import { getSeasonDay, getSeasonEvent } from "../src/time/season-events";

/** Helper: Date lokal dari komponen (hindari offset UTC). */
const at = (y: number, m: number, d: number): number => new Date(y, m, d, 12, 0, 0).getTime();

describe("getSeasonDay (Doc 03 §5)", () => {
  it("hari pertama musim semi = 1 (20 Mar)", () => {
    expect(getSeasonDay(at(2026, 2, 20))).toBe(1);
  });

  it("hari ke-3 musim semi = 22 Mar", () => {
    expect(getSeasonDay(at(2026, 2, 22))).toBe(3);
  });

  it("musim panas mulai 20 Jun", () => {
    expect(getSeasonDay(at(2026, 5, 20))).toBe(1);
    expect(getSeasonDay(at(2026, 5, 25))).toBe(6);
  });

  it("winter Jan–Mar dihitung dari 20 Des tahun sebelumnya", () => {
    expect(getSeasonDay(at(2027, 0, 1))).toBe(13); // 20 Des → 1 Jan = hari 13
    expect(getSeasonDay(at(2026, 11, 20))).toBe(1);
  });
});

describe("getSeasonEvent (Doc 03 §5)", () => {
  it("Hanami: hari ke-3 musim semi", () => {
    expect(getSeasonEvent(at(2026, 2, 22))).toBe("hanami");
    expect(getSeasonEvent(at(2026, 2, 21))).toBeNull();
    expect(getSeasonEvent(at(2026, 2, 23))).toBeNull();
  });

  it("Matsuri: sepanjang musim panas (koin ×1.5)", () => {
    expect(getSeasonEvent(at(2026, 5, 20))).toBe("matsuri");
    expect(getSeasonEvent(at(2026, 6, 15))).toBe("matsuri");
    expect(getSeasonEvent(at(2026, 8, 19))).toBe("matsuri");
    expect(getSeasonEvent(at(2026, 8, 20))).toBeNull(); // mulai autumn
  });

  it("Tsukimi: hari ke-3 musim gugur", () => {
    expect(getSeasonEvent(at(2026, 8, 22))).toBe("tsukimi");
    expect(getSeasonEvent(at(2026, 8, 24))).toBeNull();
  });

  it("Omikuji: 1–7 Januari saja", () => {
    expect(getSeasonEvent(at(2027, 0, 1))).toBe("omikuji");
    expect(getSeasonEvent(at(2027, 0, 7))).toBe("omikuji");
    expect(getSeasonEvent(at(2027, 0, 8))).toBeNull();
    expect(getSeasonEvent(at(2026, 11, 25))).toBeNull(); // Desember = winter, bukan Jan
  });

  it("di luar jendela event → null", () => {
    expect(getSeasonEvent(at(2026, 4, 10))).toBeNull();
    expect(getSeasonEvent(at(2026, 10, 5))).toBeNull();
  });
});
