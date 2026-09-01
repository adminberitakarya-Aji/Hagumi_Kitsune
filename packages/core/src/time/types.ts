/**
 * Tipe data sistem waktu (Doc 03 & Doc 09).
 */

import type { PetData } from "../pet/types";

export const DAY_PHASES = ["morning", "day", "evening", "night"] as const;
export type DayPhase = (typeof DAY_PHASES)[number];

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];

export interface PhaseSegment {
  phase: DayPhase;
  hours: number;
  startMs: number;
  endMs: number;
}

export interface OfflineCatchUpOptions {
  floor?: number;
  maxPoopOffline?: number;
}

export interface OfflineCatchUpResult {
  pet: PetData;
  elapsedHours: number;
  segments: PhaseSegment[];
  poopsSpawned: number;
  becameSick: boolean;
  died: boolean;
  summaryText: string;
}
