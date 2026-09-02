/**
 * Skema Save Data v1 (Doc 09 §3) dengan validasi Zod.
 */

import { z } from "zod";
import { PET_ELEMENTS, PET_EVOLUTION_PATHS, PET_STAGES, PET_STATES } from "../pet/types";
import type { LineageNode } from "../breeding/types";

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
  /** M6 (Doc 08 §4–5): memori lalai yang sudah dimaafkan lewat chat. */
  forgiven: z.boolean().optional(),
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
  /** M7 (Doc 07 §3): warna bulu hasil genetika — opsional (generasi-1 = warna elemen). */
  coatColor: z.string().optional(),
  /** M7 (Doc 07 §3): kepribadian (elemen dialog) yang diwariskan — default = elemen. */
  personality: z.enum(PET_ELEMENTS).optional(),
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

/** M7 (Doc 07 §4): satu induk di pohon silsilah. */
export const lineageParentSchema = z.object({
  name: z.string(),
  element: z.enum(PET_ELEMENTS),
  path: z.string(),
  coatColor: z.string().optional(),
  livedDays: z.number().optional(),
  careScore: z.number().optional(),
});

/** M7 (Doc 07 §4): node pohon silsilah rekursif (maks 3 generasi di UI). */
export const lineageNodeSchema: z.ZodType<LineageNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    gen: z.number().int().min(1),
    parents: z.array(lineageParentSchema),
    ancestors: z.array(lineageNodeSchema).default([]),
  }),
);

/** M7 (Doc 07 §2A): telur keturunan yang diinkubasi di Breeding House. */
export const breedingEggSchema = z.object({
  createdAt: z.number(),
  element: z.enum(PET_ELEMENTS),
  coatColor: z.string(),
  personalityElement: z.enum(PET_ELEMENTS),
  startBonusPct: z.number().min(0).max(100),
  /** Poin bonus stat yang dibekukan saat breeding (pct% × rata-rata stat induk). */
  bonusPoints: z.number().min(0).default(0),
  gen: z.number().int().min(1),
  parents: z.array(lineageParentSchema),
});

/** M7 (Doc 07 §5): warisan yang menunggu pemain melanjutkan garis keturunan. */
export const pendingLegacySchema = z.object({
  name: z.string(),
  element: z.enum(PET_ELEMENTS),
  path: z.string(),
  livedDays: z.number(),
  careScore: z.number(),
  gen: z.number().int().min(1),
  memoryCoins: z.number().int().min(0),
  inheritedItemId: z.string().nullable(),
});

export const breedingDataSchema = z.object({
  childrenCount: z.number().default(0),
  cooldownUntil: z.number().default(0),
  /** M7: silsilah pet aktif (null = generasi-1 tanpa leluhur tercatat). */
  lineage: lineageNodeSchema.nullable().default(null),
  /** M7: telur keturunan aktif (v1: maks 1 — menetas saat induk mati). */
  egg: breedingEggSchema.nullable().default(null),
  /** M7: warisan pet yang mati — ditampilkan di memorial sampai lanjut. */
  pendingLegacy: pendingLegacySchema.nullable().default(null),
});

export const settingsDataSchema = z.object({
  sound: z.boolean().default(true), // kompat v1 — digantikan music/sfx (M5)
  notify: z.boolean().default(true),
  /** M5 (Doc 10 §5, Doc 12 §3.2): musik & SFX on/off terpisah — tersimpan di save. */
  music: z.boolean().default(true),
  sfx: z.boolean().default(true),
  /** M5: toggle companion offline-LLM (Doc 11 §2 — provider-offline default). */
  offlineLlm: z.boolean().default(true),
});

/** Rekor & cooldown mini-game (M4 — Doc 05 §7). */
export const minigamesDataSchema = z.object({
  bestScores: z.record(z.string(), z.number()).default({}),
  lastPlayAt: z.number().default(0),
});
export type MinigamesData = z.infer<typeof minigamesDataSchema>;

/** Companion chat Tier 1 (M6 — Doc 08 §5): kuota anti-spam harian. */
export const companionDataSchema = z.object({
  chatQuota: z
    .object({
      day: z.string().default(""),
      happinessToday: z.number().min(0).default(0),
      messagesToday: z.number().min(0).default(0),
    })
    .default({}),
});
export type CompanionData = z.infer<typeof companionDataSchema>;


/** Event musiman & interaksi taman (M4 — Doc 03 §5, Doc 12 §5). */
export const seasonEventsSchema = z.object({
  /** Tanggal (YYYY-MM-DD) klaim terakhir Hanami/Tsukimi (1× per event). */
  hanamiDoneDay: z.string().default(""),
  tsukimiDoneDay: z.string().default(""),
  /** Tanggal omikuji terakhir (1× per hari selama 1–7 Jan). */
  omikujiLastDay: z.string().default(""),
  /** Timestamp terakhir memberi makan koi (cooldown 1 jam — Doc 12 §5). */
  koiFeedAt: z.number().default(0),
});
export type SeasonEventsData = z.infer<typeof seasonEventsSchema>;


export const saveDataSchemaV1 = z.object({
  version: z.literal(1),
  lastTick: z.number(),
  player: playerDataSchema,
  pet: petDataSchema,
  inventory: inventoryDataSchema,
  breeding: breedingDataSchema,
  settings: settingsDataSchema,
  minigames: minigamesDataSchema.default({ bestScores: {}, lastPlayAt: 0 }),
  seasonEvents: seasonEventsSchema.default({}),
});

export type SaveDataV1 = z.infer<typeof saveDataSchemaV1>;

/** v2 (M3): + pet.careHistory, pet.recoverSince. v2+: + minigames, seasonEvents, companion (field ber-default). */
export const saveDataSchemaV2 = z.object({
  version: z.literal(2),
  lastTick: z.number(),
  player: playerDataSchema,
  pet: petDataSchema,
  inventory: inventoryDataSchema,
  breeding: breedingDataSchema,
  settings: settingsDataSchema,
  minigames: minigamesDataSchema.default({ bestScores: {}, lastPlayAt: 0 }),
  seasonEvents: seasonEventsSchema.default({}),
  companion: companionDataSchema.default({}),
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
      lineage: null,
      egg: null,
      pendingLegacy: null,
    },
    settings: {
      sound: true,
      notify: true,
      music: true,
      sfx: true,
      offlineLlm: true,
    },
    minigames: {
      bestScores: {},
      lastPlayAt: 0,
    },
    seasonEvents: {
      hanamiDoneDay: "",
      tsukimiDoneDay: "",
      omikujiLastDay: "",
      koiFeedAt: 0,
    },
    companion: {
      chatQuota: { day: "", happinessToday: 0, messagesToday: 0 },
    },
  };
}
