/**
 * Skema & loader aturan gameplay M2 (poop, scoop, sakit, obat, inventory, hadiah login).
 * Sumber: ROADMAP M2 & Doc 06 §4. Semua angka di sini, nol hard-code di kode game.
 */
import { z } from "zod";
import rulesJson from "../data/rules.json";

export const rulesConfigSchema = z.object({
  poop: z.object({
    baseIntervalHours: z.number().positive(),
    minIntervalHours: z.number().positive(),
    cutMinutesPerFeed: z.number().nonnegative(),
    maxPoops: z.number().int().positive(),
    hygieneDrainPerPoopPerHour: z.number().nonnegative(),
  }),
  scoop: z.object({
    holdMs: z.number().positive(),
    coinChance: z.number().min(0).max(1),
    coinMin: z.number().int().nonnegative(),
    coinMax: z.number().int().nonnegative(),
  }),
  sick: z.object({
    triggerHygiene: z.number(),
    triggerPoops: z.number().int().positive(),
  }),
  cure: z.object({ cooldownHours: z.number().positive() }),
  inventory: z.object({ foodCapacity: z.number().int().positive() }),
  loginRewards: z.array(z.number().int().positive()).min(1),
});

export type RulesConfig = z.infer<typeof rulesConfigSchema>;

export const rulesConfig: RulesConfig = rulesConfigSchema.parse(rulesJson);
