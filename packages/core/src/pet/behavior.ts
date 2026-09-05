/**
 * HAGUMI core — Otak Perilaku Pet (M13 — Doc 13 §3–4, Doc 09 §1).
 * Fungsi MURNI & testable: `decideBehavior(input, rng) → intent`.
 * Renderer (FoxAgent) HANYA eksekutor — tidak pernah memutuskan (Doc 13 §1.2).
 * Gating (Doc 13 §1.3): state PetStateMachine EATING/BATHING/SLEEPING/SICK/dst
 * tidak boleh diinterupsi → intent "wait" (renderer menunda timer, bukan
 * membatalkan kebutuhan).
 */
import { behaviorConfig, type ElementWeights } from "@hagumi/data";
import type { IRng } from "../ports";
import type { DayPhase, Season } from "../time/types";
import type { PetElement, PetState, PetStats } from "./types";

export const BEHAVIOR_INTENTS = [
  "wait",
  "wander",
  "zoomies",
  "go_to",
  "roll_discomf",
  "sit",
  "sniff",
  "stretch",
  "look_around",
  "chase_tail",
  "nap_spot",
] as const;
export type BehaviorIntent = (typeof BEHAVIOR_INTENTS)[number];

/** Target go_to — renderer memetakan ke titik scene (dapur/futon/POOP_SPOTS). */
export type GoToTarget = "kitchen" | "futon" | "poop";

/** Input otak (Doc 13 §2): stat, waktu, kepribadian, sinyal renderer. */
export interface BehaviorInput {
  stats: PetStats;
  dayPhase: DayPhase;
  season: Season;
  /** Elemen pet (visual). */
  element: PetElement;
  /** Kepribadian dialog (Doc 07 §3) — penentu bobot; default = elemen. */
  personality: PetElement;
  /** State PetStateMachine saat ini — untuk gating (Doc 13 §1.3 & §6). */
  petState: PetState;
  /** true bila renderer melaporkan poop menunggu (poopCount > visual terlayani). */
  needsPoop: boolean;
  /** Ms sejak zoomies terakhir (cooldown dihitung renderer). */
  sinceZoomiesMs: number;
  /** true bila pet BARU SAJA tiba di tujuan → peluang mikro-perilaku (Doc 13 §3). */
  arrived: boolean;
}

/** Output otak (Doc 13 §2): intent + target + durasi. */
export interface BehaviorDecision {
  intent: BehaviorIntent;
  target?: GoToTarget;
  /** Durasi mikro (ms) — renderer memutar klip selama ini. */
  durationMs?: number;
  /** Jumlah sprint zoomies (2–4). */
  sprints?: number;
}

/** State yang MENGUNCI semua intent (Doc 01 §5 — tak terinterupsi). */
const GATED_STATES: readonly PetState[] = [
  "egg",
  "eating",
  "bathing",
  "sleeping",
  "playing",
  "petted",
  "sick",
  "evolving",
  "dead",
];

/** Gating murni: true bila PetStateMachine sedang sibuk (intent harus ditunda). */
export function isBehaviorGated(petState: PetState): boolean {
  return GATED_STATES.includes(petState);
}

function randMs(minMs: number, maxMs: number, rng: IRng): number {
  return rng.int(minMs, maxMs + 1);
}

/** Pilih kandidat berbobot (rolet). Array harus non-kosong. */
function weightedPick<T>(rng: IRng, entries: ReadonlyArray<readonly [T, number]>): T {
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0);
  let roll = rng.next() * total;
  for (const [value, w] of entries) {
    roll -= Math.max(0, w);
    if (roll < 0) return value;
  }
  return entries[entries.length - 1]![0];
}

/**
 * Otak perilaku (Doc 13 §3): urutan prioritas —
 * 1. Gating (state sibuk → wait)
 * 2. Need-driven: poop → dapur (lapar) → futon (ngantuk) → berguling (kotor)
 * 3. nap_spot (malam, energy sedang)
 * 4. zoomies (senang + bertenaga, cooldown, bobot per elemen)
 * 5. mikro-perilaku diam (berbobot, sering saat pagi)
 * 6. wander (default)
 */
export function decideBehavior(input: BehaviorInput, rng: IRng): BehaviorDecision {
  if (isBehaviorGated(input.petState)) {
    return { intent: "wait" };
  }
  const cfg = behaviorConfig;

  // 2. Need-driven (Doc 13 §3 — sinyal alami ke pemain, bukan toast)
  if (input.needsPoop) {
    return { intent: "go_to", target: "poop" };
  }
  if (input.stats.hunger < cfg.needs.hungerGoTo) {
    return { intent: "go_to", target: "kitchen" };
  }
  if (input.stats.energy < cfg.needs.energyGoTo) {
    return { intent: "go_to", target: "futon" };
  }
  if (input.stats.hygiene < cfg.needs.hygieneRoll) {
    return {
      intent: "roll_discomf",
      durationMs: randMs(cfg.micro.minMs, cfg.micro.maxMs, rng),
    };
  }

  // 3. Tidur di tempat (malam + energy sedang — Doc 13 §3 nap_spot)
  if (
    input.dayPhase === "night" &&
    input.stats.energy < cfg.nap.maxEnergy &&
    rng.next() < cfg.nap.chance
  ) {
    return {
      intent: "nap_spot",
      durationMs: randMs(cfg.micro.minMs * 2, cfg.micro.maxMs * 2, rng),
    };
  }

  const w: ElementWeights = cfg.weights[input.personality] ?? cfg.weights.fire!;

  // 4. Zoomies (Doc 13 §3): ambang stat + cooldown + bobot per elemen
  const zoomiesReady =
    input.stats.happiness >= cfg.zoomies.happiness &&
    input.stats.energy >= cfg.zoomies.energy &&
    input.sinceZoomiesMs >= cfg.zoomies.cooldownMin * 60_000;
  if (zoomiesReady && rng.next() < w.zoomies / (w.zoomies + w.wander)) {
    return {
      intent: "zoomies",
      sprints: rng.int(cfg.zoomies.sprints[0], cfg.zoomies.sprints[1] + 1),
    };
  }

  // 5. Mikro-perilaku diam setelah sampai tujuan (berbobot — Doc 13 §3)
  if (input.arrived && rng.next() < cfg.micro.chanceAfterArrive) {
    return pickMicro(input, rng);
  }

  // 6. Default: jelajah
  return { intent: "wander" };
}

/** Mikro-perilaku diam (sit/sniff/stretch/look_around/chase_tail) — berbobot per elemen. */
function pickMicro(input: BehaviorInput, rng: IRng): BehaviorDecision {
  const cfg = behaviorConfig;
  const w: ElementWeights = cfg.weights[input.personality] ?? cfg.weights.fire!;
  const mw = cfg.microWeights;
  const stretchWeight =
    input.dayPhase === "morning" ? mw.stretch * mw.stretchMorningMul : mw.stretch;
  const intent = weightedPick<BehaviorIntent>(rng, [
    ["sit", mw.sit],
    ["sniff", mw.sniff],
    ["stretch", stretchWeight],
    ["look_around", w.lookAround],
    ["chase_tail", w.chaseTail],
  ]);
  return { intent, durationMs: randMs(cfg.micro.minMs, cfg.micro.maxMs, rng) };
}
