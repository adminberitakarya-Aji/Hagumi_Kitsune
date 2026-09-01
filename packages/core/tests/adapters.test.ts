import { describe, expect, it } from "vitest";
import {
  FakeClock,
  MathRng,
  MemoryStorage,
  NoopAudio,
  NoopNotifier,
  SeededRng,
  SystemClock,
} from "../src/adapters";
import type { IAudio, IClock, INotifier, IRng, IStorage } from "../src/ports";

describe("core adapters (M1 Fase A — bukti pipeline test jalan)", () => {
  it("SystemClock mengembalikan UTC epoch ms yang wajar", () => {
    const clock: IClock = new SystemClock();
    const now = clock.now();
    // Timestamp epoch masuk akal: antara 2024-01-01 dan 2035-01-01.
    expect(now).toBeGreaterThan(1_704_067_200_000);
    expect(now).toBeLessThan(2_051_222_400_000);
  });

  it("FakeClock bisa digeser untuk simulasi offline catch-up (Doc 03 §6)", () => {
    const clock = new FakeClock();
    const before = clock.now();
    clock.advance(8 * 60 * 60 * 1000); // +8 jam tidur pemain
    expect(clock.now() - before).toBe(8 * 60 * 60 * 1000);
  });

  it("MemoryStorage menyimpan & menghapus sesuai kontrak IStorage", () => {
    const storage: IStorage = new MemoryStorage();
    expect(storage.get("hagumi_save_v1")).toBeNull();
    storage.set("hagumi_save_v1", '{"version":1}');
    expect(storage.get("hagumi_save_v1")).toBe('{"version":1}');
    storage.remove("hagumi_save_v1");
    expect(storage.get("hagumi_save_v1")).toBeNull();
  });

  it("SeededRng deterministik — fondasi uji genetika (Doc 07)", () => {
    const a: IRng = new SeededRng(42);
    const b: IRng = new SeededRng(42);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
    // int() selalu dalam rentang [min, max)
    for (let i = 0; i < 100; i++) {
      const v = a.int(0, 100);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(100);
    }
  });

  it("MathRng.next() selalu di [0,1)", () => {
    const rng: IRng = new MathRng();
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("Noop adapter memenuhi kontrak tanpa efek samping", () => {
    const audio: IAudio = new NoopAudio();
    const notifier: INotifier = new NoopNotifier();
    expect(() => {
      audio.playMusic("season_spring");
      audio.playSfx("hanko_stamp");
      notifier.notify("Hagumi", "Kitsune-mu lapar!");
    }).not.toThrow();
  });
});
