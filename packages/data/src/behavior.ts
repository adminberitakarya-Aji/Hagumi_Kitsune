/**
 * Skema & loader konfigurasi perilaku pet (M13 — Doc 13 §4).
 * Fail-fast saat load seperti items.ts/minigames.ts: angka rusak → error saat boot.
 * Ekstensi di luar contoh Doc 13 §4: `microWeights` (bobot mikro sit/sniff/stretch)
 * dan `nap` (ambang tidur di tempat) — prinsip data-driven Doc 13 §1.4.
 */
import { z } from "zod";
import behaviorJson from "../data/behavior.json";

const elementWeightsSchema = z.object({
  zoomies: z.number().positive(),
  wander: z.number().positive(),
  chaseTail: z.number().nonnegative(),
  lookAround: z.number().positive(),
});

const seasonFlavorRuleSchema = z.object({
  walkSpeedMul: z.number().positive().optional(),
  lingerLantern: z.boolean().optional(),
  fireflyPlay: z.boolean().optional(),
});

export const behaviorConfigSchema = z.object({
  version: z.literal(1),
  tick: z.object({
    minMs: z.number().int().positive(),
    maxMs: z.number().int().positive(),
  }),
  speed: z.object({
    walk: z.number().positive(),
    run: z.number().positive(),
    accelMs: z.number().nonnegative(),
  }),
  needs: z.object({
    hungerGoTo: z.number().min(0).max(100),
    energyGoTo: z.number().min(0).max(100),
    hygieneRoll: z.number().min(0).max(100),
  }),
  zoomies: z.object({
    happiness: z.number().min(0).max(100),
    energy: z.number().min(0).max(100),
    cooldownMin: z.number().positive(),
    sprints: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  }),
  micro: z.object({
    chanceAfterArrive: z.number().min(0).max(1),
    minMs: z.number().positive(),
    maxMs: z.number().positive(),
  }),
  weights: z.object({
    fire: elementWeightsSchema,
    water: elementWeightsSchema,
    wind: elementWeightsSchema,
    earth: elementWeightsSchema,
    mystic: elementWeightsSchema,
  }),
  microWeights: z.object({
    sit: z.number().positive(),
    sniff: z.number().positive(),
    stretch: z.number().positive(),
    stretchMorningMul: z.number().positive(),
  }),
  nap: z.object({
    maxEnergy: z.number().min(0).max(100),
    chance: z.number().min(0).max(1),
  }),
  seasonFlavor: z.record(z.string(), seasonFlavorRuleSchema),
});

export type ElementWeights = z.infer<typeof elementWeightsSchema>;
export type SeasonFlavorRule = z.infer<typeof seasonFlavorRuleSchema>;
export type BehaviorConfig = z.infer<typeof behaviorConfigSchema>;

export const behaviorConfig: BehaviorConfig = behaviorConfigSchema.parse(behaviorJson);

/** Aturan flavor musim (Doc 13 §4) — undefined bila musim tanpa aturan. */
export function getSeasonFlavor(season: string): SeasonFlavorRule | undefined {
  return behaviorConfig.seasonFlavor[season];
}
