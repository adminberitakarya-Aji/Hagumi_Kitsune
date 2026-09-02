/**
 * HAGUMI core — Sistem Poop (ROADMAP M2, Doc 12 §3.3 & GDD §5.1).
 * Fungsi murni: interval poop dipersingkat oleh makan; maks 3 menumpuk;
 * tiap poop mempercepat penurunan hygiene (dihitung runtime lewat poopHygieneDrain).
 */

import type { PetData } from "./types";

/** Interval dasar 4 jam; tiap makan sejak poop terakhir memotong 40 menit; minimum 90 menit. */
export function poopIntervalMs(baseMs: number, minMs: number, feedsSincePoop: number): number {
  const cut = feedsSincePoop * 40 * 60_000;
  return Math.max(minMs, baseMs - cut);
}

/** Cek murni: apakah poop baru muncul sekarang. */
export function shouldSpawnPoop(
  pet: PetData,
  nowMs: number,
  opts: { baseMs: number; minMs: number; maxPoops: number; feedsSincePoop: number },
): boolean {
  if (pet.stage === "egg" || pet.stage === "dead") return false;
  if (pet.poopCount >= opts.maxPoops) return false;
  const last = pet.lastPoopAt ?? pet.birthAt;
  return nowMs - last >= poopIntervalMs(opts.baseMs, opts.minMs, opts.feedsSincePoop);
}

/** Spawn satu poop (posisi visual ditentukan renderer, bukan core). */
export function spawnPoop(pet: PetData, nowMs: number): PetData {
  return {
    ...pet,
    poopCount: Math.min(3, pet.poopCount + 1),
    lastPoopAt: nowMs,
  };
}

/** Sapu satu poop (Doc 12 §3.3 — hold 400ms di scene). */
export function scoopPoop(pet: PetData): PetData {
  return {
    ...pet,
    poopCount: Math.max(0, pet.poopCount - 1),
  };
}

/** Ekstra drain hygiene per jam akibat poop menumpuk (dipanggil runtime per tick). */
export function poopHygieneDrainPerHour(poopCount: number, perPoopPerHour: number): number {
  return poopCount * perPoopPerHour;
}
