/**
 * Skema & loader konfigurasi evolusi M3 (GDD §4, Doc 01 §3–4).
 * Semua angka evolusi (hari pemicu, ambang Care Score, ekor, tier, warna aura) di sini.
 */
import { z } from "zod";
import evolutionJson from "../data/evolution.json";

const pathRuleSchema = z.object({
  min: z.number().min(0).max(100),
  max: z.number().min(0).max(100),
  tails: z.tuple([z.number().int().min(1).max(9), z.number().int().min(1).max(9)]),
  tier: z.string().min(1),
  aura: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

export const evolutionConfigSchema = z.object({
  firstEvolutionDay: z.number().positive(),
  finalEvolutionDay: z.number().positive(),
  elderDay: z.number().positive(),
  recoveryDays: z.number().positive(),
  sampleIntervalHours: z.number().positive(),
  historyWindowHours: z.number().positive(),
  interactionBonus: z.object({ stroke: z.number().nonnegative(), play: z.number().nonnegative() }),
  neglectPenalty: z.object({
    statZero: z.number().nonnegative(),
    sickUntreatedPerDay: z.number().nonnegative(),
  }),
  paths: z.record(z.string(), pathRuleSchema),
});

export type EvolutionConfig = z.infer<typeof evolutionConfigSchema>;
export type PathRule = z.infer<typeof pathRuleSchema>;

export const evolutionConfig: EvolutionConfig = evolutionConfigSchema.parse(evolutionJson);

/** Jalur folklor sesuai Care Score (GDD §4 tabel). Return undefined bila tak tercakup. */
export function getPathRule(score: number): PathRule | undefined {
  return Object.values(evolutionConfig.paths).find((p) => score >= p.min && score <= p.max);
}
