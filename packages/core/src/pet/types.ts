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
}

export interface PetData {
  name: string;
  element: PetElement;
  birthAt: number;
  stage: PetStage;
  state: PetState;
  stats: PetStats;
  careScore: number;
  tails: number;
  path: PetEvolutionPath;
  sickSince: number | null;
  lastPoopAt: number | null;
  poopCount: number;
  lastCuredAt: number;
  memoryLog: MemoryLogEntry[];
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
