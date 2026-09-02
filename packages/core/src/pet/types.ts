/**
 * Tipe & Model data Pet (Kitsune) — Doc 01 & Doc 09 §3.
 */

export const PET_ELEMENTS = ["fire", "water", "wind", "earth", "mystic"] as const;
export type PetElement = (typeof PET_ELEMENTS)[number];

export const PET_STAGES = ["egg", "baby", "teen", "adult", "elder", "dead"] as const;
export type PetStage = (typeof PET_STAGES)[number];

export const PET_STATES = [
  "egg",
  "idle",
  "eating",
  "bathing",
  "sleeping",
  "playing",
  "petted",
  "sick",
  "evolving",
  "dead",
] as const;
export type PetState = (typeof PET_STATES)[number];

export const PET_EVOLUTION_PATHS = ["tenko", "zenko", "biasa", "yako", "nogitsune"] as const;
export type PetEvolutionPath = (typeof PET_EVOLUTION_PATHS)[number];

export interface PetStats {
  hunger: number;
  happiness: number;
  energy: number;
  hygiene: number;
  health: number;
}

export interface MemoryLogEntry {
  t: number;
  key: string;
  detail: string;
  /** M6 (Doc 08 §5): true = lalai ini sudah dimaafkan lewat chat. */
  forgiven?: boolean;
}

/** Satu sampel Care Score (GDD §4) — disimpan rolling 24 jam di save. */
export interface CareSample {
  t: number;
  /** Rata-rata 5 stat pada waktu sample (0–100). 0 utk entri bonus/penalti murni. */
  v: number;
  /** Poin bonus interaksi (membelai, main). */
  b: number;
  /** Poin penalti kelalaian (stat 0, sakit tak diobati). */
  p: number;
}

export interface PetData {
  name: string;
  element: PetElement;
  birthAt: number;
  stage: PetStage;
  state: PetState;
  stats: PetStats;
  careScore: number;
  /** Riwayat sample Care Score (rolling 24 jam) — GDD §4. */
  careHistory: CareSample[];
  /** Waktu mulai bertahannya Care Score di ambang jalur lebih tinggi (untuk pemulihan). */
  recoverSince: number | null;
  tails: number;
  path: PetEvolutionPath;
  sickSince: number | null;
  lastPoopAt: number | null;
  poopCount: number;
  lastCuredAt: number;
  memoryLog: MemoryLogEntry[];
  /** M7 (Doc 07 §3): warna bulu hasil genetika — generasi-1 memakai warna elemen. */
  coatColor?: string;
}

export type ActionRejectReason =
  | "TOO_FULL"
  | "TOO_TIRED"
  | "ALREADY_SLEEPING"
  | "NOT_SLEEPING"
  | "IS_DEAD"
  | "IS_SICK"
  | "IS_BUSY"
  | "IS_EGG"
  | "BABY_LOCKED"
  | "NOT_SICK"
  | "ALREADY_CLEAN"
  | "ON_COOLDOWN"
  | "INVALID_STATE";

export interface ActionResult<T = PetData> {
  success: boolean;
  pet: T;
  reason?: ActionRejectReason;
  message?: string;
  overfeedWarning?: boolean;
}
