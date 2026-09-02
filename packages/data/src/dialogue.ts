/**
 * Skema & loader konfigurasi dialog companion (M6 — Doc 08).
 * 5 file `dialog_<element>.json`, satu per kepribadian elemen + varian
 * senior (elder) & gelap (yako/nogitsune). Fail-fast saat boot seperti loader lain.
 */
import { z } from "zod";

import dialogFireJson from "../data/dialog_fire.json";
import dialogWaterJson from "../data/dialog_water.json";
import dialogWindJson from "../data/dialog_wind.json";
import dialogEarthJson from "../data/dialog_earth.json";
import dialogMysticJson from "../data/dialog_mystic.json";

const ELEMENT_KEYS = ["fire", "water", "wind", "earth", "mystic"] as const;
export type DialogElementKey = (typeof ELEMENT_KEYS)[number];

const SEASON_KEYS = ["spring", "summer", "autumn", "winter"] as const;

/** Pool baris: minimal 1 baris agar trigger tak pernah kosong. */
const poolSchema = z.array(z.string().min(1)).min(1);

export const dialogueLinesSchema = z.object({
  health: poolSchema,
  hunger: poolSchema,
  hygiene: poolSchema,
  energy: poolSchema,
  night: poolSchema,
  happiness: poolSchema,
  memory_neglect: poolSchema,
  memory_event: poolSchema,
  forgive: poolSchema,
  phase_morning: poolSchema,
  phase_day: poolSchema,
  phase_evening: poolSchema,
  season_spring: poolSchema,
  season_summer: poolSchema,
  season_autumn: poolSchema,
  season_winter: poolSchema,
  idle: poolSchema,
});

export const chatSchema = z.object({
  makan: z.object({
    hungerLow: poolSchema,
    hungerMid: poolSchema,
    hungerFull: poolSchema,
  }),
  sayang: poolSchema,
  maaf: poolSchema,
  siapa: poolSchema,
  fallback: poolSchema,
});

export const dialogueConfigSchema = z.object({
  element: z.enum(ELEMENT_KEYS),
  lines: dialogueLinesSchema,
  chat: chatSchema,
  /** Varian tahap elder — gaya nostalgia (Doc 08 §3). */
  senior: z.object({ idle: poolSchema, nostalgia: poolSchema }),
  /** Subset baris pendek murung untuk yako/nogitsune (Doc 08 §3). */
  dark: z.object({ idle: poolSchema, neglect: poolSchema }),
});

export type DialogueLines = z.infer<typeof dialogueLinesSchema>;
export type ChatLines = z.infer<typeof chatSchema>;
export type DialogueConfig = z.infer<typeof dialogueConfigSchema>;

function parseDialog(json: unknown, file: string): DialogueConfig {
  return dialogueConfigSchema.parse(json, { path: [file] });
}

const allDialogs: Record<DialogElementKey, DialogueConfig> = {
  fire: parseDialog(dialogFireJson, "dialog_fire.json"),
  water: parseDialog(dialogWaterJson, "dialog_water.json"),
  wind: parseDialog(dialogWindJson, "dialog_wind.json"),
  earth: parseDialog(dialogEarthJson, "dialog_earth.json"),
  mystic: parseDialog(dialogMysticJson, "dialog_mystic.json"),
};

/** Konfigurasi dialog lengkap untuk satu elemen (fail-fast: elemen tak dikenal → error). */
export function getDialogConfig(element: string): DialogueConfig {
  const cfg = allDialogs[element as DialogElementKey];
  if (!cfg) throw new Error(`dialog: elemen tidak dikenal "${element}"`);
  return cfg;
}

/** Semua konfigurasi dialog (untuk test & audit kepribadian). */
export function getAllDialogConfigs(): Record<DialogElementKey, DialogueConfig> {
  return allDialogs;
}

/** Kunci musim valid untuk trigger `season_<season>` (Doc 08 §2 prio 8). */
export const DIALOG_SEASON_KEYS = SEASON_KEYS;
