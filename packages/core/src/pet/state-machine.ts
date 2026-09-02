/**
 * HAGUMI core — Pet State Machine & Aturan Aksi (Doc 01 §2, §5 & Doc 09 §1).
 * Mengatur transisi state pet dan validasi penolakan aksi.
 */

import { clampStats, isOverfed } from "./stats";
import type { ActionResult, PetData, PetStage, PetState } from "./types";

export interface FeedPayload {
  hungerRestore: number;
  happinessBonus?: number;
  isSnack?: boolean;
  nowMs: number;
  recentFeeds: readonly number[];
}

export interface PlayPayload {
  energyCost?: number;
  happinessGain?: number;
}

export class PetStateMachine {
  /** Memeriksa apakah aksi makan diizinkan (Doc 01 §2). */
  static canFeed(
    pet: PetData,
    payload?: Partial<FeedPayload>,
  ): { allowed: boolean; reason?: ActionResult["reason"] } {
    if (pet.state === "dead" || pet.stage === "dead") {
      return { allowed: false, reason: "IS_DEAD" };
    }
    if (pet.state === "egg") {
      return { allowed: false, reason: "IS_EGG" };
    }
    if (pet.state === "sleeping") {
      return { allowed: false, reason: "ALREADY_SLEEPING" };
    }
    if (pet.state === "eating" || pet.state === "bathing" || pet.state === "evolving") {
      return { allowed: false, reason: "IS_BUSY" };
    }
    // Tolak makan jika hunger > 90, kecuali item adalah snack / camilan
    if (pet.stats.hunger > 90 && !payload?.isSnack) {
      return { allowed: false, reason: "TOO_FULL" };
    }
    return { allowed: true };
  }

  /** Aksi Memberi Makan (Dapur) */
  static feed(pet: PetData, payload: FeedPayload): ActionResult {
    const check = this.canFeed(pet, payload);
    if (!check.allowed) {
      return { success: false, pet, reason: check.reason };
    }

    const overfeed = isOverfed(payload.recentFeeds, payload.nowMs);
    let healthPenalty = 0;
    if (overfeed) {
      // Overfeed: >3 makan dalam 6 jam -> health -5 (Doc 01 §2)
      healthPenalty = 5;
    }

    const newStats = clampStats({
      ...pet.stats,
      hunger: pet.stats.hunger + payload.hungerRestore,
      happiness: pet.stats.happiness + (payload.happinessBonus ?? 0),
      health: pet.stats.health - healthPenalty,
    });

    const updatedPet: PetData = {
      ...pet,
      state: "eating",
      stats: newStats,
    };

    return {
      success: true,
      pet: updatedPet,
      overfeedWarning: overfeed,
    };
  }

  /** Memeriksa apakah aksi mandi diizinkan. */
  static canBathe(pet: PetData): { allowed: boolean; reason?: ActionResult["reason"] } {
    if (pet.state === "dead" || pet.stage === "dead") {
      return { allowed: false, reason: "IS_DEAD" };
    }
    if (pet.state === "egg") {
      return { allowed: false, reason: "IS_EGG" };
    }
    if (pet.state === "sleeping") {
      return { allowed: false, reason: "ALREADY_SLEEPING" };
    }
    if (pet.state === "eating" || pet.state === "bathing" || pet.state === "evolving") {
      return { allowed: false, reason: "IS_BUSY" };
    }
    if (pet.stats.hygiene >= 100) {
      return { allowed: false, reason: "ALREADY_CLEAN" };
    }
    return { allowed: true };
  }

  /** Aksi Mandi (Onsen) */
  static bathe(pet: PetData): ActionResult {
    const check = this.canBathe(pet);
    if (!check.allowed) {
      return { success: false, pet, reason: check.reason };
    }

    const newStats = clampStats({
      ...pet.stats,
      hygiene: 100,
      happiness: pet.stats.happiness + 5,
    });

    return {
      success: true,
      pet: {
        ...pet,
        state: "bathing",
        stats: newStats,
      },
    };
  }

  /** Memeriksa apakah aksi tidur diizinkan. */
  static canSleep(pet: PetData): { allowed: boolean; reason?: ActionResult["reason"] } {
    if (pet.state === "dead" || pet.stage === "dead") {
      return { allowed: false, reason: "IS_DEAD" };
    }
    if (pet.state === "egg") {
      return { allowed: false, reason: "IS_EGG" };
    }
    if (pet.state === "sleeping") {
      return { allowed: false, reason: "ALREADY_SLEEPING" };
    }
    if (pet.state === "eating" || pet.state === "bathing" || pet.state === "evolving") {
      return { allowed: false, reason: "IS_BUSY" };
    }
    return { allowed: true };
  }

  /** Aksi Tidur (Futon) */
  static sleep(pet: PetData): ActionResult {
    const check = this.canSleep(pet);
    if (!check.allowed) {
      return { success: false, pet, reason: check.reason };
    }

    return {
      success: true,
      pet: {
        ...pet,
        state: "sleeping",
      },
    };
  }

  /** Aksi Bangun dari Tidur */
  static wake(pet: PetData): ActionResult {
    if (pet.state !== "sleeping") {
      return { success: false, pet, reason: "NOT_SLEEPING" };
    }

    return {
      success: true,
      pet: {
        ...pet,
        state: "idle",
      },
    };
  }

  /** Memeriksa apakah aksi bermain diizinkan (Doc 01 §2 & §3). */
  static canPlay(pet: PetData): { allowed: boolean; reason?: ActionResult["reason"] } {
    if (pet.state === "dead" || pet.stage === "dead") {
      return { allowed: false, reason: "IS_DEAD" };
    }
    if (pet.state === "egg") {
      return { allowed: false, reason: "IS_EGG" };
    }
    if (pet.stage === "baby") {
      // Bayi: tombol main terkunci (Doc 01 §3)
      return { allowed: false, reason: "BABY_LOCKED" };
    }
    if (pet.state === "sleeping") {
      return { allowed: false, reason: "ALREADY_SLEEPING" };
    }
    if (pet.state === "sick") {
      return { allowed: false, reason: "IS_SICK" };
    }
    if (pet.state === "eating" || pet.state === "bathing" || pet.state === "evolving") {
      return { allowed: false, reason: "IS_BUSY" };
    }
    // Main ditolak jika energy < 15 (Doc 01 §2)
    if (pet.stats.energy < 15) {
      return { allowed: false, reason: "TOO_TIRED" };
    }
    return { allowed: true };
  }

  /** Aksi Bermain */
  static play(pet: PetData, payload?: PlayPayload): ActionResult {
    const check = this.canPlay(pet);
    if (!check.allowed) {
      return { success: false, pet, reason: check.reason };
    }

    const energyCost = payload?.energyCost ?? 15;
    const happinessGain = payload?.happinessGain ?? 15;

    const newStats = clampStats({
      ...pet.stats,
      energy: pet.stats.energy - energyCost,
      happiness: pet.stats.happiness + happinessGain,
    });

    return {
      success: true,
      pet: {
        ...pet,
        state: "playing",
        stats: newStats,
      },
    };
  }

  /** Memeriksa aksi elus/belai (petted). */
  static canPet(pet: PetData): { allowed: boolean; reason?: ActionResult["reason"] } {
    if (pet.state === "dead" || pet.stage === "dead") {
      return { allowed: false, reason: "IS_DEAD" };
    }
    if (pet.state === "egg") {
      return { allowed: false, reason: "IS_EGG" };
    }
    if (pet.state === "sleeping") {
      return { allowed: false, reason: "ALREADY_SLEEPING" };
    }
    if (pet.state === "evolving") {
      return { allowed: false, reason: "IS_BUSY" };
    }
    return { allowed: true };
  }

  /** Aksi Belai Pet (Tatami) -> Happiness +2 */
  static pet(pet: PetData): ActionResult {
    const check = this.canPet(pet);
    if (!check.allowed) {
      return { success: false, pet, reason: check.reason };
    }

    const newStats = clampStats({
      ...pet.stats,
      happiness: pet.stats.happiness + 2,
    });

    return {
      success: true,
      pet: {
        ...pet,
        state: "petted",
        stats: newStats,
      },
    };
  }

  /** Aksi Obati (Dapur/Toko Obat) -> Health +30, pulih dari SICK. Cooldown via opts (Doc 06: 4 jam). */
  static cure(
    pet: PetData,
    opts?: { nowMs?: number; cooldownMs?: number },
  ): ActionResult {
    if (pet.state === "dead" || pet.stage === "dead") {
      return { success: false, pet, reason: "IS_DEAD" };
    }
    if (pet.state !== "sick" && pet.stats.health >= 100) {
      return { success: false, pet, reason: "NOT_SICK" };
    }
    if (
      opts?.nowMs !== undefined &&
      opts?.cooldownMs !== undefined &&
      pet.lastCuredAt > 0 &&
      opts.nowMs - pet.lastCuredAt < opts.cooldownMs
    ) {
      return { success: false, pet, reason: "ON_COOLDOWN" };
    }

    const newStats = clampStats({
      ...pet.stats,
      health: pet.stats.health + 30,
    });

    return {
      success: true,
      pet: {
        ...pet,
        state: "idle",
        sickSince: null,
        lastCuredAt: opts?.nowMs ?? pet.lastCuredAt,
        stats: newStats,
      },
    };
  }

  /** Transisi selesai animasi sementara (eating, bathing, playing, petted, evolving) -> kembali ke IDLE */
  static finishTransientState(pet: PetData): PetData {
    if (
      pet.state === "eating" ||
      pet.state === "bathing" ||
      pet.state === "playing" ||
      pet.state === "petted" ||
      pet.state === "evolving"
    ) {
      return {
        ...pet,
        state: "idle",
      };
    }
    return pet;
  }

  /** Transisi Menetas (Telur -> Bayi) */
  static hatch(pet: PetData, birthAt: number): PetData {
    return {
      ...pet,
      stage: "baby",
      state: "idle",
      birthAt,
    };
  }

  /** Menetapkan kondisi sakit */
  static setSick(pet: PetData, nowMs: number): PetData {
    if (pet.state === "dead" || pet.stage === "dead") return pet;
    return {
      ...pet,
      state: "sick",
      sickSince: pet.sickSince ?? nowMs,
    };
  }

  /** Menetapkan kematian */
  static die(pet: PetData): PetData {
    return {
      ...pet,
      stage: "dead" as PetStage,
      state: "dead" as PetState,
      stats: {
        ...pet.stats,
        health: 0,
      },
    };
  }
}
