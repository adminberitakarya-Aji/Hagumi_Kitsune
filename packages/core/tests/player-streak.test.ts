/** Test streak login (Doc 06 §4). */
import { describe, expect, it } from "vitest";
import { daysBetween, updateLoginStreak } from "../src/index";

const base = { count: 1, lastDay: "2026-01-01" };

describe("login streak", () => {
  it("buka ulang hari sama → tanpa hadiah", () => {
    const r = updateLoginStreak(base, "2026-01-01");
    expect(r.isNewDay).toBe(false);
    expect(r.streak.count).toBe(1);
  });

  it("besoknya → streak naik", () => {
    const r = updateLoginStreak(base, "2026-01-02");
    expect(r.isNewDay).toBe(true);
    expect(r.streak.count).toBe(2);
    expect(r.rewardDay).toBe(2);
  });

  it("absen 2 hari → putus ke 1", () => {
    const r = updateLoginStreak(base, "2026-01-03");
    expect(r.streak.count).toBe(1);
    expect(r.rewardDay).toBe(1);
  });

  it("siklus 7 hari: hari ke-8 kembali ke hadiah hari 1, count terus naik", () => {
    let s = base;
    let r = updateLoginStreak(s, "2026-01-02");
    s = r.streak;
    for (let d = 3; d <= 8; d++) {
      r = updateLoginStreak(s, `2026-01-0${d}`);
      s = r.streak;
    }
    // hari ke-8: count 8, hadiah kembali ke posisi 1
    expect(r.streak.count).toBe(8);
    expect(r.rewardDay).toBe(1);
    // hari ke-9: hadiah posisi 2
    const r9 = updateLoginStreak(s, "2026-01-09");
    expect(r9.streak.count).toBe(9);
    expect(r9.rewardDay).toBe(2);
  });

  it("lintas bulan tetap dihitung benar", () => {
    expect(daysBetween("2026-03-01", "2026-02-28")).toBe(1);
  });
});
