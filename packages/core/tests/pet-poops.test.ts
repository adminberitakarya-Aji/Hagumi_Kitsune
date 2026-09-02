/** Test sistem poop (ROADMAP M2) — interval dipangkas makan, maks 3, sapu. */
import { describe, expect, it } from "vitest";
import {
  MS_PER_HOUR,
  poopIntervalMs,
  scoopPoop,
  shouldSpawnPoop,
  spawnPoop,
} from "../src/index";
import { createDefaultSave } from "../src/save/schema";

const OPTS = { baseMs: 4 * MS_PER_HOUR, minMs: 1.5 * MS_PER_HOUR, maxPoops: 3, feedsSincePoop: 0 };

function makePet(nowMs: number) {
  const save = createDefaultSave({ petName: "Poop", element: "fire", nowMs });
  return save.pet;
}

describe("poop system", () => {
  const T0 = 1_735_000_000_000;

  it("tidak spawn sebelum interval dasar", () => {
    const pet = makePet(T0);
    expect(shouldSpawnPoop(pet, T0 + MS_PER_HOUR, OPTS)).toBe(false);
    expect(shouldSpawnPoop(pet, T0 + 4 * MS_PER_HOUR, OPTS)).toBe(true);
  });

  it("makan mempercepat spawn (40 mnt/makan, floor 90 mnt)", () => {
    expect(poopIntervalMs(4 * MS_PER_HOUR, 1.5 * MS_PER_HOUR, 0)).toBe(4 * MS_PER_HOUR);
    expect(poopIntervalMs(4 * MS_PER_HOUR, 1.5 * MS_PER_HOUR, 3)).toBe(2 * MS_PER_HOUR);
    expect(poopIntervalMs(4 * MS_PER_HOUR, 1.5 * MS_PER_HOUR, 10)).toBe(1.5 * MS_PER_HOUR);
    const pet = { ...makePet(T0), lastPoopAt: T0 };
    const afterMeals = { ...OPTS, feedsSincePoop: 3 };
    expect(shouldSpawnPoop(pet, T0 + 2 * MS_PER_HOUR, afterMeals)).toBe(true);
  });

  it("berhenti di maksimum 3 poop", () => {
    let pet = makePet(T0);
    pet = spawnPoop(spawnPoop(spawnPoop(pet, T0), T0), T0);
    expect(pet.poopCount).toBe(3);
    expect(shouldSpawnPoop(pet, T0 + 10 * MS_PER_HOUR, OPTS)).toBe(false);
  });

  it("sapu mengurangi, tidak di bawah 0", () => {
    let pet = makePet(T0);
    pet = spawnPoop(pet, T0);
    pet = scoopPoop(scoopPoop(pet));
    expect(pet.poopCount).toBe(0);
  });

  it("telur tidak buang kotoran", () => {
    const pet = { ...makePet(T0), stage: "egg" as const, state: "egg" as const, birthAt: T0 };
    expect(shouldSpawnPoop(pet, T0 + 10 * MS_PER_HOUR, OPTS)).toBe(false);
  });
});
