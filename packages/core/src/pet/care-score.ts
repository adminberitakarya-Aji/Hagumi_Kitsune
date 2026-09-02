/**
 * HAGUMI core — Care Score (GDD §4): rolling rata-rata statistik 24 jam
 * + bonus interaksi − penalti kelalaian. Murni & data-agnostic (angka via parameter).
 */
import type { CareSample, PetStats } from "./types";

export type { CareSample };

export interface CareScoreParams {
  windowHours: number;
  msPerHour: number;
}

/** Rata-rata 5 stat (0–100). */
export function sampleCareStats(stats: PetStats): number {
  const sum = stats.hunger + stats.happiness + stats.energy + stats.hygiene + stats.health;
  return sum / 5;
}

/** Buang sample di luar jendela rolling (default 24 jam). */
export function pruneCareHistory(history: CareSample[], nowMs: number, params: CareScoreParams): CareSample[] {
  const cutoff = nowMs - params.windowHours * params.msPerHour;
  return history.filter((s) => s.t >= cutoff);
}

/** Tambah sample baru (mis. tiap jam sim) — memangkas yang kadaluarsa. */
export function pushCareSample(
  history: CareSample[],
  nowMs: number,
  v: number,
  params: CareScoreParams,
): CareSample[] {
  return [...pruneCareHistory(history, nowMs, params), { t: nowMs, v, b: 0, p: 0 }];
}

/** Tambah entri bonus interaksi (membelai/main) — tidak menggeser rata-rata stat. */
export function addCareBonus(
  history: CareSample[],
  nowMs: number,
  points: number,
  params: CareScoreParams,
): CareSample[] {
  return [...pruneCareHistory(history, nowMs, params), { t: nowMs, v: 0, b: points, p: 0 }];
}

/** Tambah entri penalti kelalaian (stat menyentuh 0, sakit tidak diobati). */
export function addCarePenalty(
  history: CareSample[],
  nowMs: number,
  points: number,
  params: CareScoreParams,
): CareSample[] {
  return [...pruneCareHistory(history, nowMs, params), { t: nowMs, v: 0, b: 0, p: points }];
}

/** Care Score = rata-rata stat window + Σbonus − Σpenalti, clamp 0–100 (GDD §4). */
export function computeCareScore(history: CareSample[]): number {
  const statOnly = history.filter((s) => s.b === 0 && s.p === 0);
  const avg = statOnly.length > 0 ? statOnly.reduce((acc, s) => acc + s.v, 0) / statOnly.length : 0;
  const bonus = history.reduce((acc, s) => acc + s.b, 0);
  const penalty = history.reduce((acc, s) => acc + s.p, 0);
  return Math.max(0, Math.min(100, avg + bonus - penalty));
}
