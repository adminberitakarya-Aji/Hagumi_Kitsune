/** Test otak perilaku pet (M13 — Doc 13 §3–4): distribusi, gating, determinisme. */
import { describe, expect, it } from "vitest";
import {
  BEHAVIOR_INTENTS,
  SeededRng,
  decideBehavior,
  isBehaviorGated,
  type BehaviorInput,
  type BehaviorIntent,
} from "../src/index";
import { PET_STATES } from "../src/pet/types";

function makeInput(overrides: Partial<BehaviorInput> = {}): BehaviorInput {
  return {
    stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 80, health: 90 },
    dayPhase: "day",
    season: "spring",
    element: "fire",
    personality: "fire",
    petState: "idle",
    needsPoop: false,
    sinceZoomiesMs: 0,
    arrived: false,
    ...overrides,
  };
}

const LOW_STATS = { hunger: 10, happiness: 80, energy: 10, hygiene: 10, health: 90 };

describe("decideBehavior (M13 — Doc 13)", () => {
  it("deterministik terhadap IRng: seed sama → urutan keputusan sama", () => {
    const run = (): BehaviorIntent[] => {
      const rng = new SeededRng(42);
      const out: BehaviorIntent[] = [];
      for (let i = 0; i < 50; i++) {
        out.push(decideBehavior(makeInput({ arrived: i % 2 === 0, sinceZoomiesMs: i * 1000 }), rng).intent);
      }
      return out;
    };
    expect(run()).toEqual(run());
  });

  it("seed beda → urutan 1000 tick tidak identik", () => {
    const collect = (seed: number): BehaviorIntent[] => {
      const rng = new SeededRng(seed);
      const out: BehaviorIntent[] = [];
      for (let i = 0; i < 1000; i++) {
        out.push(decideBehavior(makeInput({ arrived: rng.next() < 0.5 }), rng).intent);
      }
      return out;
    };
    expect(collect(1)).not.toEqual(collect(2));
  });

  it("gating PetStateMachine (Doc 13 §1.3): semua state sibuk → hanya wait", () => {
    const busyStates = PET_STATES.filter((s) => isBehaviorGated(s));
    // minimal: egg, eating, bathing, sleeping, sick, evolving, dead (Doc 01 §5)
    expect(busyStates).toEqual(
      expect.arrayContaining(["egg", "eating", "bathing", "sleeping", "sick", "evolving", "dead"]),
    );
    for (const state of busyStates) {
      const rng = new SeededRng(7);
      for (let i = 0; i < 100; i++) {
        // kebutuhan kritis pun harus DITUNDA — bukan dibatalkan (Doc 13 §6)
        const input = makeInput({
          petState: state,
          stats: { hunger: 0, happiness: 100, energy: 0, hygiene: 0, health: 100 },
          needsPoop: true,
        });
        expect(decideBehavior(input, rng)).toEqual({ intent: "wait" });
      }
    }
  });

  it("distribusi 1000 tick (idle sehat, arrived): mikro 5 macam + wander tercapai, tanpa wait", () => {
    const seen = new Set<BehaviorIntent>();
    const rng = new SeededRng(123);
    for (let i = 0; i < 1000; i++) {
      const d = decideBehavior(makeInput({ arrived: true }), rng);
      seen.add(d.intent);
      if (
        d.intent === "sit" ||
        d.intent === "sniff" ||
        d.intent === "stretch" ||
        d.intent === "look_around" ||
        d.intent === "chase_tail"
      ) {
        expect(d.durationMs).toBeGreaterThanOrEqual(2000);
        expect(d.durationMs).toBeLessThanOrEqual(5000);
      }
    }
    for (const intent of ["wander", "sit", "sniff", "stretch", "look_around", "chase_tail"] as const) {
      expect(seen.has(intent), `intent ${intent} tidak tercapai`).toBe(true);
    }
    expect(seen.has("wait")).toBe(false);
  });

  it("distribusi lintas skenario 1000 tick: SEMUA intent daftar (Doc 13 §3) tercapai", () => {
    const scenarios: Array<[string, BehaviorInput]> = [
      ["sehat", makeInput({ arrived: true })],
      ["lapar", makeInput({ stats: { ...LOW_STATS, happiness: 80, energy: 80, hunger: 10 } })],
      ["ngantuk", makeInput({ stats: { ...LOW_STATS, happiness: 80, hunger: 80, energy: 10 } })],
      ["kotor", makeInput({ stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 10, health: 90 } })],
      ["poop", makeInput({ needsPoop: true })],
      [
        "senang",
        makeInput({
          stats: { hunger: 80, happiness: 90, energy: 85, hygiene: 80, health: 90 },
          sinceZoomiesMs: 30 * 60_000,
        }),
      ],
      [
        "malam",
        makeInput({
          dayPhase: "night",
          stats: { hunger: 80, happiness: 80, energy: 40, hygiene: 80, health: 90 },
        }),
      ],
      ["sibuk", makeInput({ petState: "sleeping" })],
    ];
    const seen = new Set<BehaviorIntent>();
    for (const [, input] of scenarios) {
      const rng = new SeededRng(456);
      for (let i = 0; i < 1000; i++) {
        seen.add(decideBehavior(input, rng).intent);
      }
    }
    for (const intent of BEHAVIOR_INTENTS) {
      expect(seen.has(intent), `intent ${intent} tidak tercapai`).toBe(true);
    }
  });

  it("need-driven: poop > lapar→kitchen > ngantuk→futon > kotor→berguling", () => {
    const rng = new SeededRng(9);
    for (let i = 0; i < 100; i++) {
      expect(decideBehavior(makeInput({ needsPoop: true }), rng)).toMatchObject({
        intent: "go_to",
        target: "poop",
      });
      expect(
        decideBehavior(makeInput({ stats: { hunger: 10, happiness: 80, energy: 5, hygiene: 80, health: 90 } }), rng),
      ).toMatchObject({ intent: "go_to", target: "kitchen" });
      expect(
        decideBehavior(makeInput({ stats: { hunger: 80, happiness: 80, energy: 5, hygiene: 80, health: 90 } }), rng),
      ).toMatchObject({ intent: "go_to", target: "futon" });
      expect(
        decideBehavior(makeInput({ stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 10, health: 90 } }), rng).intent,
      ).toBe("roll_discomf");
    }
  });

  it("zoomies: muncul saat senang+bertenaga+cooldown lewat (sprints 2–4); terkunci saat cooldown", () => {
    const happy = makeInput({
      stats: { hunger: 80, happiness: 90, energy: 85, hygiene: 80, health: 90 },
      sinceZoomiesMs: 30 * 60_000,
    });
    const rng = new SeededRng(77);
    let zoomiesCount = 0;
    for (let i = 0; i < 1000; i++) {
      const d = decideBehavior(happy, rng);
      if (d.intent === "zoomies") {
        zoomiesCount++;
        expect(d.sprints).toBeGreaterThanOrEqual(2);
        expect(d.sprints).toBeLessThanOrEqual(4);
      }
    }
    expect(zoomiesCount).toBeGreaterThan(0);
    const cooling = { ...happy, sinceZoomiesMs: 5 * 60_000 };
    const rng2 = new SeededRng(77);
    for (let i = 0; i < 1000; i++) {
      expect(decideBehavior(cooling, rng2).intent).not.toBe("zoomies");
    }
  });

  it("bobot per elemen: Api lebih impulsif (zoomies lebih sering) daripada Air", () => {
    const countZoomies = (personality: BehaviorInput["personality"]): number => {
      const rng = new SeededRng(31);
      let count = 0;
      const input = makeInput({ personality, sinceZoomiesMs: 30 * 60_000 });
      for (let i = 0; i < 1000; i++) {
        if (decideBehavior(input, rng).intent === "zoomies") count++;
      }
      return count;
    };
    expect(countZoomies("fire")).toBeGreaterThan(countZoomies("water"));
  });

  it("stretch sering saat pagi (Doc 13 §3); nap_spot hanya malam & energy sedang", () => {
    const countStretch = (dayPhase: BehaviorInput["dayPhase"]): number => {
      const rng = new SeededRng(55);
      let count = 0;
      const input = makeInput({ dayPhase, arrived: true });
      for (let i = 0; i < 1000; i++) {
        if (decideBehavior(input, rng).intent === "stretch") count++;
      }
      return count;
    };
    expect(countStretch("morning")).toBeGreaterThan(countStretch("day"));

    const night = makeInput({
      dayPhase: "night",
      stats: { hunger: 80, happiness: 80, energy: 40, hygiene: 80, health: 90 },
    });
    const rng = new SeededRng(88);
    let napCount = 0;
    for (let i = 0; i < 1000; i++) {
      if (decideBehavior(night, rng).intent === "nap_spot") napCount++;
    }
    expect(napCount).toBeGreaterThan(0);

    const dayTired = { ...night, dayPhase: "day" as const };
    const rng2 = new SeededRng(88);
    for (let i = 0; i < 1000; i++) {
      expect(decideBehavior(dayTired, rng2).intent).not.toBe("nap_spot");
    }
  });
});
