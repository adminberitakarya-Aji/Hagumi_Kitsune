/**
 * Skema & loader konfigurasi mini-game (Doc 05 — festival Matsuri).
 * Fail-fast saat load seperti items.ts: angka rusak → error saat boot.
 */
import { z } from "zod";
import minigamesJson from "../data/minigames.json";

const STAGE_KEYS = ["baby", "teen", "adult", "elder"] as const;
export type MinigameStageKey = (typeof STAGE_KEYS)[number];

const stageRuleSchema = z.object({
  locked: z.boolean().optional(),
  difficulty: z.number().positive().optional(),
  coinMultiplier: z.number().positive().optional(),
});

const commonSchema = z.object({
  energyCost: z.number().int().positive(),
  minEnergyToPlay: z.number().int().nonnegative(),
  cooldownMinutes: z.number().positive(),
  happinessMin: z.number().int().nonnegative(),
  happinessMax: z.number().int().positive(),
  minCoins: z.number().int().nonnegative(),
  coinPerPoint: z.number().positive(),
  dayPhaseCoinMultiplier: z.record(z.string(), z.number().positive()),
  streakDay7BonusCoins: z.number().int().nonnegative(),
  stage: z.record(z.enum(STAGE_KEYS), stageRuleSchema),
});

const gameSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  tagline: z.string(),
  durationSec: z.number().int().positive(),
  throws: z.number().int().positive().optional(),
  elementBonus: z.string(),
  bonusDesc: z.string(),
  scores: z.record(z.string(), z.number().int().nonnegative()),
});

export const minigamesConfigSchema = z.object({
  common: commonSchema,
  games: z.array(gameSchema).min(1),
  elementNotes: z.record(z.string(), z.string()),
});

export type MinigameStageRule = z.infer<typeof stageRuleSchema>;
export type MinigameCommon = z.infer<typeof commonSchema>;
export type MinigameDef = z.infer<typeof gameSchema>;
export type MinigamesConfig = z.infer<typeof minigamesConfigSchema>;

export const minigamesConfig: MinigamesConfig = minigamesConfigSchema.parse(minigamesJson);

/** Cegah id duplikat + id ganda dengan katalog item. */
function assertUniqueIds(): void {
  const ids = minigamesConfig.games.map((g) => g.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error("minigames.json: ada id game duplikat");
  }
}
assertUniqueIds();

export function getMinigameById(id: string): MinigameDef | undefined {
  return minigamesConfig.games.find((g) => g.id === id);
}

export function getStageRule(stage: MinigameStageKey): MinigameStageRule {
  const rule = minigamesConfig.common.stage[stage];
  return rule ?? {};
}
