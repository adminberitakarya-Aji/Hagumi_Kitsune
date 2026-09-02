/**
 * HAGUMI core — Tipe Breeding & Genetika (M7 — Doc 07, GDD §15).
 */
import type { PetElement, PetStats } from "../pet/types";

/** Alasan penolakan breeding (Doc 07 §1 — tombol nonaktif + alasan UI). */
export type BreedingGateReason =
  | "IS_DEAD"
  | "IS_EGG"
  | "TOO_YOUNG"
  | "LOW_HEALTH"
  | "LOW_HAPPINESS"
  | "ON_COOLDOWN"
  | "QUOTA_FULL";

export type BreedingGateResult =
  | { allowed: true }
  | { allowed: false; reasons: BreedingGateReason[] };

/** Mitra NPC harian di Breeding House (Doc 12 §9.2 — elemen berbeda). */
export interface NpcPartner {
  id: string;
  name: string;
  element: PetElement;
}

/** Asal elemen anak (Doc 07 §3): induk / mix / mutasi mystic. */
export type ChildElementSource = "parent" | "partner" | "mix" | "mutation";

export interface ChildGenetics {
  element: PetElement;
  /** Kepribadian = elemen dialog (Doc 08 §3) — 60% waris pemberi elemen / 40% variasi. */
  personalityElement: PetElement;
  /** Warna bulu anak hasil mix HSV induk (hex #RRGGBB). */
  coatColor: string;
  /** Bonus stat awal +1..5% rata-rata stat induk (Doc 07 §3). */
  startBonusPct: number;
  source: ChildElementSource;
}

/** Satu induk di pohon silsilah (Doc 07 §4). */
export interface LineageParent {
  name: string;
  element: PetElement;
  path: string;
  coatColor?: string;
  livedDays?: number;
  careScore?: number;
}

/** Node pohon silsilah rekursif — tampil maks 3 generasi (Doc 07 §4). */
export interface LineageNode {
  gen: number;
  parents: LineageParent[];
  ancestors: LineageNode[];
}

/** Telur keturunan di altar (v1: 1 pet aktif — menetas saat induk mati, Doc 12 §9.1). */
export interface BreedingEgg {
  createdAt: number;
  element: PetElement;
  coatColor: string;
  personalityElement: PetElement;
  startBonusPct: number;
  /** Poin bonus stat dibekukan saat breeding (pct% × rata-rata stat induk sehat). */
  bonusPoints: number;
  gen: number;
  parents: LineageParent[];
}

/** Warisan saat pet mati (Doc 07 §5). */
export interface LegacyInfo {
  name: string;
  element: PetElement;
  path: string;
  livedDays: number;
  careScore: number;
  gen: number;
  memoryCoins: number;
  inheritedItemId: string | null;
}

export interface ChildStartStats {
  /** Stat awal anak = dasar newborn + pct% × rata-rata stat induk (Doc 07 §3). */
  stats: PetStats;
  startBonusPct: number;
}