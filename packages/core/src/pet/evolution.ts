/**
 * HAGUMI core — Evolusi & tahap hidup (GDD §4, Doc 01 §3–4, ROADMAP M3).
 * Murni & data-agnostic: semua angka (hari pemicu, ambang jalur, ekor) via parameter.
 */
import { MS_PER_DAY } from "../time/time-service";
import type { CareScoreParams } from "./care-score";
import { computeCareScore, pruneCareHistory, sampleCareStats } from "./care-score";
import type { PetData, PetEvolutionPath, CareSample } from "./types";

export interface PathRuleShape {
  min: number;
  max: number;
  tails: [number, number];
  tier?: string;
  aura?: string;
}

export interface EvolutionParams {
  firstEvolutionDay: number;
  finalEvolutionDay: number;
  elderDay: number;
  recoveryDays: number;
  /** Interval sampling Care Score (jam sim). */
  sampleIntervalHours: number;
  /** Bonus poin per interaksi sejak sampling terakhir. */
  interactionBonus: { stroke: number; play: number };
  /** Penalti kelalaian (stat nol; sakit tak diobati, poin/hari). */
  neglectPenalty: { statZero: number; sickUntreatedPerDay: number };
  /** Ambang jalur: path → {min, max, tails:[min,max], tier}. */
  paths: Record<string, PathRuleShape>;
  care: CareScoreParams;
}

export type EvolutionKind = "first" | "final" | "elder";

export interface EvolutionResult {
  pet: PetData;
  /** null = tidak ada evolusi hari ini. */
  kind: EvolutionKind | null;
  /** Jalur baru (hanya saat "final"). */
  path?: PetEvolutionPath;
  /** Tier label dari data (mis. "Zenko Ilahi"). */
  tier?: string;
}

/** Jalur folklor berdasar Care Score (GDD §4): tenko 90–100, zenko 70–89, dst. */
export function lockPathForScore(score: number, params: EvolutionParams): PetEvolutionPath {
  const entries = Object.entries(params.paths) as Array<
    [PetEvolutionPath, { min: number; max: number; tails: [number, number] }]
  >;
  const found = entries.find(([, rule]) => score >= rule.min && score <= rule.max);
  return (found?.[0] ?? "biasa") as PetEvolutionPath;
}

/** Ekor deterministik dari rentang jalur: pembulatan ke atas tengah rentang. */
export function tailsForPath(path: PetEvolutionPath, params: EvolutionParams): number {
  const [min, max] = params.paths[path]?.tails ?? [1, 1];
  return Math.min(9, Math.ceil((min + max) / 2));
}

function withEvolving(pet: PetData, patch: Partial<PetData>): PetData {
  return { ...pet, state: "evolving", ...patch };
}

/** Perbarui careScore pet dari history terkini. */
export function refreshCareScore(pet: PetData): PetData {
  return { ...pet, careScore: computeCareScore(pet.careHistory) };
}

/**
 * Pemicu evolusi tahap (GDD §4): hari-10 ekor+1 (baby→teen),
 * hari-20 jalur dikunci sesuai Care Score (teen→adult), hari-60 senior (ekor maks jalur).
 */
export function evolveIfNeeded(
  pet: PetData,
  nowMs: number,
  params: EvolutionParams,
): EvolutionResult {
  if (pet.stage === "dead" || pet.stage === "egg") return { pet, kind: null };
  const day = (nowMs - pet.birthAt) / MS_PER_DAY;

  if (pet.stage === "baby" && day >= params.firstEvolutionDay) {
    return {
      pet: withEvolving(pet, { stage: "teen", tails: pet.tails + 1 }),
      kind: "first",
      tier: "Remaja",
    };
  }

  if (pet.stage === "teen" && day >= params.finalEvolutionDay) {
    const score = computeCareScore(pet.careHistory);
    const path = lockPathForScore(score, params);
    return {
      pet: withEvolving(pet, {
        stage: "adult",
        path,
        tails: tailsForPath(path, params),
        careScore: score,
        recoverSince: null,
      }),
      kind: "final",
      path,
      tier: params.paths[path]?.tier,
    };
  }

  if (pet.stage === "adult" && day >= params.elderDay) {
    const [min, max] = params.paths[pet.path]?.tails ?? [pet.tails, pet.tails];
    return {
      pet: withEvolving(pet, { stage: "elder", tails: Math.max(pet.tails, max) || min }),
      kind: "elder",
      tier: "Senior",
    };
  }

  return { pet, kind: null };
}

/** Jalur berikutnya yang lebih baik (nogitsune→yako→biasa→zenko→tenko). */
const PATH_ORDER: PetEvolutionPath[] = ["nogitsune", "yako", "biasa", "zenko", "tenko"];

export interface RecoveryResult {
  pet: PetData;
  /** Jalur baru bila pemulihan terjadi. */
  promotedTo?: PetEvolutionPath;
}

/**
 * Pemulihan jalur (GDD §4): Nogitsune/Yako yang dirawat baik naik satu tier
 * setelah Care Score bertahan di ambang jalur lebih tinggi selama `recoveryDays`.
 */
export function checkPathRecovery(
  pet: PetData,
  nowMs: number,
  params: EvolutionParams,
): RecoveryResult {
  if (pet.stage !== "adult" && pet.stage !== "elder") {
    return { pet: { ...pet, recoverSince: null } };
  }
  const idx = PATH_ORDER.indexOf(pet.path);
  if (idx < 0 || idx >= PATH_ORDER.length - 1) return { pet };

  const nextPath = PATH_ORDER[idx + 1]!;
  const nextRule = params.paths[nextPath];
  if (!nextRule || pet.careScore < nextRule.min) {
    // Belum layak — reset penghitung kegigihan
    return { pet: pet.recoverSince === null ? pet : { ...pet, recoverSince: null } };
  }

  if (pet.recoverSince === null) {
    return { pet: { ...pet, recoverSince: nowMs } };
  }

  const sustainedDays = (nowMs - pet.recoverSince) / MS_PER_DAY;
  if (sustainedDays < params.recoveryDays) return { pet };

  return {
    pet: {
      ...pet,
      path: nextPath,
      tails: Math.max(pet.tails, tailsForPath(nextPath, params)),
      recoverSince: nowMs,
    },
    promotedTo: nextPath,
  };
}

/** Helper sampling berkala untuk runtime (prune + recompute + bonus interaksi sejak sample terakhir). */
export function samplePetCare(
  pet: PetData,
  nowMs: number,
  params: EvolutionParams,
  interactions: { b: number; p: number } = { b: 0, p: 0 },
): PetData {
  // Stat sample & interaksi harus ENTRI TERPISAH — computeCareScore menghitung
  // rata-rata hanya dari entri murni stat (b===0 && p===0), bonus/penalti dijumlahkan terpisah.
  const entries: CareSample[] = [{ t: nowMs, v: sampleCareStats(pet.stats), b: 0, p: 0 }];
  if (interactions.b > 0) entries.push({ t: nowMs, v: 0, b: interactions.b, p: 0 });
  if (interactions.p > 0) entries.push({ t: nowMs, v: 0, b: 0, p: interactions.p });
  const pruned = pruneCareHistory([...pet.careHistory, ...entries], nowMs, params.care);
  return { ...pet, careHistory: pruned, careScore: computeCareScore(pruned) };
}
