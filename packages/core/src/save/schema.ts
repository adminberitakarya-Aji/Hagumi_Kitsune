/**
 * Skema Save Data v1 (Doc 09 §3) dengan validasi Zod.
 */

import { z } from "zod";
import { PET_ELEMENTS, PET_EVOLUTION_PATHS, PET_STAGES, PET_STATES } from "../pet/types";

export const CURRENT_SAVE_VERSION = 2;
export const SAVE_STORAGE_KEY = "hagumi_save_v1";

export const petStatsSchema = z.object({
  hunger: z.number().min(0).max(100),
  happiness: z.number().min(0).max(100),
  energy: z.number().min(0).max(100),
  hygiene: z.number().min(0).max(100),
  health: z.number().min(0).max(100),
});

export const memoryLogEntrySchema = z.object({
  t: z.number(),
  key: z.string(),
  detail: z.string(),
});

export const petCareSampleSchema = z.object({
  t: z.number(),
  v: z.number().min(0).max(100),
  b: z.number().min(0),
  p: z.number().min(0),
});

export const petDataSchema = z.object({
  name: z.string().min(1).max(12),
  element: z.enum(PET_ELEMENTS),
  birthAt: z.number(),
  stage: z.enum(PET_STAGES),
  state: z.enum(PET_STATES),
  stats: petStatsSchema,
  careScore: z.number().min(0).max(100),
  /** Riwayat sample Care Score rolling 24 jam (M3, GDD §4). */
  careHistory: z.array(petCareSampleSchema).default([]),
  /** Penghitung kegigihan pemulihan jalur (M3: Nogitsune→Yako→…). */
  recoverSince: z.number().nullable().default(null),
  tails: z.number().min(0).max(9),
  path: z.enum(PET_EVOLUTION_PATHS),
  sickSince: z.number().nullable(),
  lastPoopAt: z.number().nullable(),
  poopCount: z.number().min(0).max(3).default(0),
  lastCuredAt: z.number().default(0),
  memoryLog: z.array(memoryLogEntrySchema).default([]),
});

export const loginStreakSchema = z.object({
  count: z.number().min(0),
  lastDay: z.string(), // format "YYYY-MM-DD"
});

export const playerDataSchema = z.object({
  coins: z.number().min(0),
  loginStreak: loginStreakSchema,
});

export const inventoryDataSchema = z.object({
  food: z.record(z.string(), z.number()).default({}),
  medicine: z.record(z.string(), z.number()).default({}),
  owned: z.array(z.string()).default([]),
  placedDecor: z.array(z.string()).default([]),
});

export const breedingDataSchema = z.object({
  childrenCount: z.number().default(0),
  cooldownUntil: z.number().default(0),
  lineage: z.record(z.string(), z.unknown()).default({}),
});

export const settingsDataSchema = z.object({
  sound: z.boolean().default(true),
  notify: z.boolean().default(true),
});

export const saveDataSchemaV1 = z.object({
  version: z.literal(1),
  lastTick: z.number(),
  player: playerDataSchema,
  pet: petDataSchema,
  inventory: inventoryDataSchema,
  breeding: breedingDataSchema,
  settings: settingsDataSchema,
});

export type SaveDataV1 = z.infer<typeof saveDataSchemaV1>;

/** v2 (M3): + pet.careHistory, pet.recoverSince. */
export const saveDataSchemaV2 = z.object({
  version: z.literal(2),
  lastTick: z.number(),
  player: playerDataSchema,
  pet: petDataSchema,
  inventory: inventoryDataSchema,
  breeding: breedingDataSchema,
  settings: settingsDataSchema,
});

export type SaveDataV2 = z.infer<typeof saveDataSchemaV2>;

export type SaveData = SaveDataV2;

/** Fungsi pembuat save data awal default (Starter kit onboarding — Doc 04 & Doc 09). */
export function createDefaultSave(params: {
  petName: string;
  element: (typeof PET_ELEMENTS)[number];
  nowMs: number;
}): SaveData {
  return {
    version: 2,
    lastTick: params.nowMs,
    player: {
      coins: 100,
      loginStreak: {
        count: 1,
        lastDay: new Date(params.nowMs).toISOString().split("T")[0] ?? "1970-01-01",
      },
    },
    pet: {
      name: params.petName,
      element: params.element,
      birthAt: params.nowMs,
      stage: "baby",
      state: "idle",
      stats: {
        hunger: 80,
        happiness: 80,
        energy: 80,
        hygiene: 80,
        health: 100,
      },
      careScore: 50,
      careHistory: [],
      recoverSince: null,
      tails: 1,
      path: "biasa",
      sickSince: null,
      lastPoopAt: null,
      poopCount: 0,
      lastCuredAt: 0,
      memoryLog: [],
    },
    inventory: {
      food: { rice_ball: 3, bread: 1, grilled_fish: 1 },
      medicine: { syrup: 1 },
      owned: [],
      placedDecor: [],
    },
    breeding: {
      childrenCount: 0,
      cooldownUntil: 0,
      lineage: {},
    },
    settings: {
      sound: true,
      notify: true,
    },
  };
}
