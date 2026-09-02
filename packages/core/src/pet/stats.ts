/**
 * HAGUMI core — PetStats (Doc 01 §2, §4 & Doc 09 §2).
 * Fungsi-fungsi murni untuk manipulasi stat: decay, komposit health, aksi pemain, clamping [0, 100].
 */

import { decayConfig, rulesConfig, type DecayPhase, type StatKey } from "@hagumi/data";
import type { PetElement, PetStage, PetStats } from "./types";

export const STAT_MIN = 0;
export const STAT_MAX = 100;

/** Clamp nilai tunggal ke [0, 100] dan pastikan angka valid (tidak NaN / Infinity). */
export function clampStat(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return STAT_MIN;
  }
  return Math.max(STAT_MIN, Math.min(STAT_MAX, value));
}

/** Clamp seluruh 5 stat ke [0, 100]. */
export function clampStats(stats: PetStats): PetStats {
  return {
    hunger: clampStat(stats.hunger),
    happiness: clampStat(stats.happiness),
    energy: clampStat(stats.energy),
    hygiene: clampStat(stats.hygiene),
    health: clampStat(stats.health),
  };
}

/** Menghitung laju decay/jam untuk stat tertentu dengan mempertimbangkan elemen dan tahap hidup (Doc 01 §3 & §4). */
export function getEffectiveDecayRate(
  stat: StatKey,
  phase: DecayPhase,
  element?: PetElement,
  stage?: PetStage,
): number {
  let rate = decayConfig[phase][stat];

  // Efek pasif elemen (Doc 01 §4)
  if (element === "fire" && stat === "energy" && rate > 0) {
    // Fire: energy regen +10%
    rate *= 1.1;
  } else if (element === "water" && stat === "hygiene" && rate < 0) {
    // Water: hygiene decay -25%
    rate *= 0.75;
  } else if (element === "wind" && stat === "energy" && rate < 0) {
    // Wind: energy decay -15%
    rate *= 0.85;
  } else if (element === "earth" && stat === "hunger" && rate < 0) {
    // Earth: hunger decay -15%
    rate *= 0.85;
  } else if (element === "mystic" && rate < 0) {
    // Mystic: decay semua stat -10%
    rate *= 0.9;
  }

  // Tahap Bayi (Doc 01 §3): decay hunger ×1.5, happiness ×0.5 (mudah senang —
  // kompensasi tombol main terkunci selama fase bayi)
  if (stage === "baby" && stat === "hunger" && rate < 0) {
    rate *= 1.5;
  }
  if (stage === "baby" && stat === "happiness" && rate < 0) {
    rate *= 0.5;
  }

  return rate;
}

export interface HealthDrainBreakdown {
  lowStatsDrainPerHour: number;
  untreatedSickDrainPerHour: number;
  zeroStatsDrainPerHour: number;
  totalDrainPerHour: number;
}

/**
 * Menghitung pengurangan health komposit per jam (Doc 01 §2).
 * Health tidak punya decay alami; murni bergantung pada kondisi:
 * 1. Jika >= 2 stat (hunger, happiness, energy, hygiene) < 25 -> -10/jam.
 * 2. Sakit tidak diobati >= 12 jam -> -10/jam tambahan.
 * 3. Stat lain = 0 -> menggerus health -5/jam per stat (maks -15/jam gabungan).
 */
export function calculateHealthDrainPerHour(
  stats: Pick<PetStats, "hunger" | "happiness" | "energy" | "hygiene">,
  isUntreatedSickPast12h: boolean = false,
): HealthDrainBreakdown {
  const primaryStats = [stats.hunger, stats.happiness, stats.energy, stats.hygiene];

  // 1. Aturan >= 2 stat di bawah 25
  const lowStatCount = primaryStats.filter((val) => val < 25).length;
  const lowStatsDrain = lowStatCount >= 2 ? 10 : 0;

  // 2. Aturan sakit tak terobati >= 12 jam
  const sickDrain = isUntreatedSickPast12h ? 10 : 0;

  // 3. Aturan stat = 0 (maks -15/jam gabungan)
  const zeroStatCount = primaryStats.filter((val) => val <= 0).length;
  const zeroStatsDrain = Math.min(15, zeroStatCount * 5);

  const totalDrain = lowStatsDrain + sickDrain + zeroStatsDrain;

  return {
    lowStatsDrainPerHour: lowStatsDrain,
    untreatedSickDrainPerHour: sickDrain,
    zeroStatsDrainPerHour: zeroStatsDrain,
    totalDrainPerHour: totalDrain,
  };
}

/**
 * Pemulihan health alami (keseimbangan hasil uji main M3 — pelengkap Doc 01 §2).
 * Health sebelumnya hanya punya drain tanpa pemulihan: health yang jatuh saat
 * fase bayi tidak pernah pulih meski perawatan kembali baik. Aturan:
 * Jika TIDAK sakit, tidak ada drain, dan SEMUA stat utama >= threshold
 * (rules.health.regenStatThreshold) -> +regenPerHour sampai 100.
 */
export function calculateHealthRegenPerHour(
  stats: Pick<PetStats, "hunger" | "happiness" | "energy" | "hygiene">,
  isSick: boolean = false,
): number {
  if (isSick) return 0;
  const { regenPerHour, regenStatThreshold } = rulesConfig.health;
  if (regenPerHour <= 0) return 0;
  const primaryStats = [stats.hunger, stats.happiness, stats.energy, stats.hygiene];
  const hasDrain = calculateHealthDrainPerHour(stats).totalDrainPerHour > 0;
  if (hasDrain) return 0;
  const allAboveThreshold = primaryStats.every((val) => val >= regenStatThreshold);
  return allAboveThreshold ? regenPerHour : 0;
}

/**
 * Terapkan decay waktu (fungsi murni) terhadap stat pet selama durasi `hours`.
 * Menghitung decay 4 stat utama + penurunan health komposit.
 */
export function applyDecay(
  stats: PetStats,
  hours: number,
  phase: DecayPhase,
  options?: {
    element?: PetElement;
    stage?: PetStage;
    isUntreatedSickPast12h?: boolean;
    isSick?: boolean;
    floor?: number;
  },
): PetStats {
  if (hours <= 0) return { ...stats };

  const floor = options?.floor ?? STAT_MIN;
  const element = options?.element;
  const stage = options?.stage;
  const isUntreatedSickPast12h = options?.isUntreatedSickPast12h ?? false;
  const isSick = options?.isSick ?? isUntreatedSickPast12h;

  const hungerRate = getEffectiveDecayRate("hunger", phase, element, stage);
  const happinessRate = getEffectiveDecayRate("happiness", phase, element, stage);
  const energyRate = getEffectiveDecayRate("energy", phase, element, stage);
  const hygieneRate = getEffectiveDecayRate("hygiene", phase, element, stage);

  const newHunger = Math.max(floor, clampStat(stats.hunger + hungerRate * hours));
  const newHappiness = Math.max(floor, clampStat(stats.happiness + happinessRate * hours));
  const newEnergy = Math.max(floor, clampStat(stats.energy + energyRate * hours));
  const newHygiene = Math.max(floor, clampStat(stats.hygiene + hygieneRate * hours));

  // Health = drain komposit − regen alami (hanya bila kondisi prima & tidak sakit)
  const healthDrain = calculateHealthDrainPerHour(
    {
      hunger: newHunger,
      happiness: newHappiness,
      energy: newEnergy,
      hygiene: newHygiene,
    },
    isUntreatedSickPast12h,
  );
  const healthRegen = calculateHealthRegenPerHour(
    {
      hunger: newHunger,
      happiness: newHappiness,
      energy: newEnergy,
      hygiene: newHygiene,
    },
    isSick,
  );

  const newHealth = clampStat(
    stats.health + (healthRegen - healthDrain.totalDrainPerHour) * hours,
  );

  return {
    hunger: newHunger,
    happiness: newHappiness,
    energy: newEnergy,
    hygiene: newHygiene,
    health: newHealth,
  };
}

/**
 * Validasi overfeed: >3 kali makan dalam 6 jam (21.600.000 ms) (Doc 01 §2).
 */
export const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export function isOverfed(recentFeedTimestamps: readonly number[], nowMs: number): boolean {
  const cutoff = nowMs - SIX_HOURS_MS;
  const feedsInWindow = recentFeedTimestamps.filter((t) => t >= cutoff);
  return feedsInWindow.length >= 3;
}
