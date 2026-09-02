/**
 * Skema & loader konfigurasi breeding (M7 — Doc 07, GDD §15).
 * Semua angka breeding (syarat, genetika, warisan, NPC) di sini — nol hard-code di kode game.
 */
import { z } from "zod";
import breedingJson from "../data/breeding.json";

export const breedingRequirementsSchema = z.object({
  minAgeDays: z.number().positive(),
  minHealth: z.number().min(0).max(100),
  minHappiness: z.number().min(0).max(100),
  cooldownDays: z.number().positive(),
  maxChildren: z.number().int().positive(),
  costCoins: z.number().int().nonnegative(),
});

export const breedingGeneticsSchema = z.object({
  /** Peluang elemen anak = salah satu induk (Doc 07 §3: 0.70). */
  parentChance: z.number().min(0).max(1),
  /** Batas atas "mix" — sisanya mutasi mystic (Doc 07 §3: 0.95 → 5% mystic). */
  mixChance: z.number().min(0).max(1),
  /** Bobot warna induk A vs B (Doc 07 §3: 60/40). */
  colorMixParentA: z.number().min(0).max(1),
  /** Jitter hue warna anak dalam derajat (Doc 07 §3: ±6°). */
  hueJitterDeg: z.number().nonnegative(),
  /** Peluang kepribadian waris dari induk pemberi elemen (Doc 07 §3: 60%). */
  personalityInheritChance: z.number().min(0).max(1),
  startBonusMinPct: z.number().min(0),
  startBonusMaxPct: z.number().min(0),
  startBonusElitePct: z.number().min(0),
  startBonusEliteCareScore: z.number().min(0).max(100),
  /** Tabel kombinasi elemen mix — kunci "a+b" alfabetis (Doc 07 §3). */
  mixTable: z.record(z.string(), z.string()),
});

export const breedingLegacySchema = z.object({
  memoryCoinBase: z.number().int().nonnegative(),
  memoryCoinPerDayOver30: z.number().int().nonnegative(),
  memoryCoinMax: z.number().int().nonnegative(),
  generationBonusPctPerGen: z.number().nonnegative(),
  generationBonusMaxPct: z.number().nonnegative(),
});

export const breedingNpcSchema = z.object({
  names: z.array(z.string().min(1)).min(3),
  elementPool: z.array(z.string()).min(3),
});

export const breedingConfigSchema = z.object({
  requirements: breedingRequirementsSchema,
  genetics: breedingGeneticsSchema,
  breedEffect: z.object({ happinessBonus: z.number().int().nonnegative() }),
  legacy: breedingLegacySchema,
  npc: breedingNpcSchema,
});

export type BreedingConfig = z.infer<typeof breedingConfigSchema>;

export const breedingConfig: BreedingConfig = breedingConfigSchema.parse(breedingJson);

/** Kunci normal "a+b" (alfabetis) untuk lookup tabel mix (Doc 07 §3). */
export function mixKey(a: string, b: string): string {
  return a < b ? `${a}+${b}` : `${b}+${a}`;
}

/** Elemen hasil kombinasi mix induk A × B (tabel breeding.json). null = tak terdefinisi. */
export function getMixElement(a: string, b: string): string | null {
  return breedingConfig.genetics.mixTable[mixKey(a, b)] ?? null;
}