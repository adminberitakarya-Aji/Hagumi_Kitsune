/**
 * Skema & loader decay stat (Doc 01 §2 — "Semua angka balance dari JSON").
 * File data tervalidasi Zod saat load: data rusak → gagal cepat, bukan NaN di game.
 */
import { z } from "zod";
import decayJson from "../data/decay.json";

export const STAT_KEYS = ["hunger", "happiness", "energy", "hygiene"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

const decayRowSchema = z.object({
  hunger: z.number().finite(),
  happiness: z.number().finite(),
  energy: z.number().finite(),
  hygiene: z.number().finite(),
});

export const decayPhaseSchema = z.enum(["day", "nightAwake", "sleeping"]);
export type DecayPhase = z.infer<typeof decayPhaseSchema>;

export const decayConfigSchema = z.object({
  day: decayRowSchema,
  nightAwake: decayRowSchema,
  sleeping: decayRowSchema,
});

export type DecayConfig = z.infer<typeof decayConfigSchema>;

/** Config tervalidasi — dieksekusi saat modul diimpor (fail-fast). */
export const decayConfig: DecayConfig = decayConfigSchema.parse(decayJson);

/** Nilai decay/jam untuk satu stat pada satu fase (nilai = perubahan, bisa positif utk energy saat tidur). */
export function getDecayRate(phase: DecayPhase, stat: StatKey): number {
  return decayConfig[phase][stat];
}
