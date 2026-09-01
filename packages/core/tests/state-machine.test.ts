import { describe, expect, it } from "vitest";
import { PetStateMachine } from "../src/pet/state-machine";
import type { PetData } from "../src/pet/types";

function createMockPet(overrides?: Partial<PetData>): PetData {
  return {
    name: "Kogitsune",
    element: "fire",
    birthAt: 1_700_000_000_000,
    stage: "teen",
    state: "idle",
    stats: {
      hunger: 50,
      happiness: 50,
      energy: 50,
      hygiene: 50,
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

describe("PetStateMachine & Aksi Pemain (Doc 01 §2, §5)", () => {
  describe("Aksi Memberi Makan (Feed)", () => {
    it("berhasil memberi makan saat IDLE dan hunger normal", () => {
      const pet = createMockPet({
        stats: { hunger: 50, happiness: 50, energy: 50, hygiene: 50, health: 100 },
      });
      const result = PetStateMachine.feed(pet, {
        hungerRestore: 30,
        happinessBonus: 5,
        nowMs: 1_700_000_000_000,
        recentFeeds: [],
      });

      expect(result.success).toBe(true);
      expect(result.pet.state).toBe("eating");
      expect(result.pet.stats.hunger).toBe(80);
      expect(result.pet.stats.happiness).toBe(55);
      expect(result.overfeedWarning).toBe(false);
    });

    it("menolak makan jika hunger > 90 dan bukan camilan (Doc 01 §2)", () => {
      const pet = createMockPet({
        stats: { hunger: 95, happiness: 50, energy: 50, hygiene: 50, health: 100 },
      });
      const result = PetStateMachine.feed(pet, {
        hungerRestore: 10,
        nowMs: 1_700_000_000_000,
        recentFeeds: [],
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe("TOO_FULL");
      expect(result.pet.stats.hunger).toBe(95);
    });

    it("mengizinkan makan camilan meski hunger > 90 (Doc 01 §2)", () => {
      const pet = createMockPet({
        stats: { hunger: 95, happiness: 50, energy: 50, hygiene: 50, health: 100 },
      });
      const result = PetStateMachine.feed(pet, {
        hungerRestore: 5,
        happinessBonus: 15,
        isSnack: true,
        nowMs: 1_700_000_000_000,
        recentFeeds: [],
      });

      expect(result.success).toBe(true);
      expect(result.pet.stats.hunger).toBe(100);
      expect(result.pet.stats.happiness).toBe(65);
    });

    it("menerapkan penalti health -5 jika terjadi overfeed (>3 makan dalam 6 jam)", () => {
      const now = 1_700_000_000_000;
      const oneHour = 3_600_000;
      const pet = createMockPet({
        stats: { hunger: 40, happiness: 50, energy: 50, hygiene: 50, health: 100 },
      });

      const result = PetStateMachine.feed(pet, {
        hungerRestore: 20,
        nowMs: now,
        recentFeeds: [now - oneHour, now - 2 * oneHour, now - 3 * oneHour],
      });

      expect(result.success).toBe(true);
      expect(result.overfeedWarning).toBe(true);
      expect(result.pet.stats.health).toBe(95); // 100 - 5 penalti
    });
  });

  describe("Aksi Mandi (Bathe)", () => {
    it("mengembalikan hygiene ke 100 dan menambah happiness +5", () => {
      const pet = createMockPet({
        stats: { hunger: 50, happiness: 50, energy: 50, hygiene: 20, health: 100 },
      });
      const result = PetStateMachine.bathe(pet);

      expect(result.success).toBe(true);
      expect(result.pet.state).toBe("bathing");
      expect(result.pet.stats.hygiene).toBe(100);
      expect(result.pet.stats.happiness).toBe(55);
    });

    it("menolak mandi jika hygiene sudah 100", () => {
      const pet = createMockPet({
        stats: { hunger: 50, happiness: 50, energy: 50, hygiene: 100, health: 100 },
      });
      const result = PetStateMachine.bathe(pet);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("ALREADY_CLEAN");
    });
  });

  describe("Aksi Tidur & Bangun (Sleep & Wake)", () => {
    it("bisa tidur saat IDLE dan bisa bangun saat SLEEPING", () => {
      const pet = createMockPet({ state: "idle" });
      const sleepRes = PetStateMachine.sleep(pet);
      expect(sleepRes.success).toBe(true);
      expect(sleepRes.pet.state).toBe("sleeping");

      const wakeRes = PetStateMachine.wake(sleepRes.pet);
      expect(wakeRes.success).toBe(true);
      expect(wakeRes.pet.state).toBe("idle");
    });

    it("menolak aksi makan/mandi/main saat sedang tidur", () => {
      const sleepingPet = createMockPet({ state: "sleeping" });

      const feedRes = PetStateMachine.feed(sleepingPet, {
        hungerRestore: 10,
        nowMs: 0,
        recentFeeds: [],
      });
      expect(feedRes.success).toBe(false);
      expect(feedRes.reason).toBe("ALREADY_SLEEPING");

      const batheRes = PetStateMachine.bathe(sleepingPet);
      expect(batheRes.success).toBe(false);
      expect(batheRes.reason).toBe("ALREADY_SLEEPING");

      const playRes = PetStateMachine.play(sleepingPet);
      expect(playRes.success).toBe(false);
      expect(playRes.reason).toBe("ALREADY_SLEEPING");
    });
  });

  describe("Aksi Bermain (Play)", () => {
    it("mengurangi energi -15 dan menambah happiness +15", () => {
      const pet = createMockPet({
        stats: { hunger: 50, happiness: 50, energy: 40, hygiene: 50, health: 100 },
      });
      const result = PetStateMachine.play(pet);

      expect(result.success).toBe(true);
      expect(result.pet.state).toBe("playing");
      expect(result.pet.stats.energy).toBe(25);
      expect(result.pet.stats.happiness).toBe(65);
    });

    it("menolak bermain jika energi < 15 (Doc 01 §2)", () => {
      const pet = createMockPet({
        stats: { hunger: 50, happiness: 50, energy: 10, hygiene: 50, health: 100 },
      });
      const result = PetStateMachine.play(pet);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("TOO_TIRED");
    });

    it("menolak bermain jika tahap bayi (Doc 01 §3)", () => {
      const babyPet = createMockPet({
        stage: "baby",
        stats: { hunger: 50, happiness: 50, energy: 80, hygiene: 50, health: 100 },
      });
      const result = PetStateMachine.play(babyPet);

      expect(result.success).toBe(false);
      expect(result.reason).toBe("BABY_LOCKED");
    });
  });

  describe("Aksi Belai & Obati (Pet & Cure)", () => {
    it("aksi belai menambah happiness +2", () => {
      const pet = createMockPet({
        stats: { hunger: 50, happiness: 50, energy: 50, hygiene: 50, health: 100 },
      });
      const result = PetStateMachine.pet(pet);

      expect(result.success).toBe(true);
      expect(result.pet.state).toBe("petted");
      expect(result.pet.stats.happiness).toBe(52);
    });

    it("aksi obati memulihkan health +30 dan membersihkan state SICK", () => {
      const sickPet = createMockPet({
        state: "sick",
        sickSince: 1_700_000_000_000,
        stats: { hunger: 50, happiness: 50, energy: 50, hygiene: 50, health: 40 },
      });

      const result = PetStateMachine.cure(sickPet);
      expect(result.success).toBe(true);
      expect(result.pet.state).toBe("idle");
      expect(result.pet.sickSince).toBeNull();
      expect(result.pet.stats.health).toBe(70);
    });
  });

  describe("Transisi State Lainnya (FinishTransientState, Hatch, Die)", () => {
    it("finishTransientState mengembalikan aksi sementara ke idle", () => {
      const eating = createMockPet({ state: "eating" });
      expect(PetStateMachine.finishTransientState(eating).state).toBe("idle");

      const bathing = createMockPet({ state: "bathing" });
      expect(PetStateMachine.finishTransientState(bathing).state).toBe("idle");

      const sleeping = createMockPet({ state: "sleeping" });
      expect(PetStateMachine.finishTransientState(sleeping).state).toBe("sleeping");
    });

    it("hatch mengubah stage telur menjadi bayi", () => {
      const egg = createMockPet({ stage: "egg", state: "egg" });
      const baby = PetStateMachine.hatch(egg, 1_700_000_000_000);
      expect(baby.stage).toBe("baby");
      expect(baby.state).toBe("idle");
    });

    it("die mengunci pet ke state dan stage dead dengan health 0", () => {
      const pet = createMockPet();
      const dead = PetStateMachine.die(pet);
      expect(dead.state).toBe("dead");
      expect(dead.stage).toBe("dead");
      expect(dead.stats.health).toBe(0);
    });
  });
});
