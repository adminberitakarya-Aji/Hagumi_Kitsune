/**
 * HAGUMI core — TimeService (Doc 03 & Doc 09 §1).
 * Perhitungan fase waktu lokal, musim kalender, pemisahan segmen fase, dan algoritma offline catch-up.
 */

import type { DecayPhase } from "@hagumi/data";
import { applyDecay } from "../pet/stats";
import type { PetData, PetState } from "../pet/types";
import type {
  DayPhase,
  OfflineCatchUpOptions,
  OfflineCatchUpResult,
  PhaseSegment,
  Season,
} from "./types";

export const MS_PER_HOUR = 3_600_000;
export const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Mengembalikan fase waktu berdasarkan jam lokal pemain (Doc 03 §3).
 * - morning: 05:00–10:00 (05:00 <= h < 10:00)
 * - day:     10:00–15:00 (10:00 <= h < 15:00)
 * - evening: 15:00–19:00 (15:00 <= h < 19:00)
 * - night:   19:00–05:00 (h >= 19:00 atau h < 05:00)
 */
export function getDayPhase(dateOrMs: Date | number): DayPhase {
  const d = typeof dateOrMs === "number" ? new Date(dateOrMs) : dateOrMs;
  const hours = d.getHours();

  if (hours >= 5 && hours < 10) return "morning";
  if (hours >= 10 && hours < 15) return "day";
  if (hours >= 15 && hours < 19) return "evening";
  return "night";
}

/**
 * Mengembalikan musim kalender nyata belahan bumi utara (Doc 03 §4).
 * - Spring: 20 Mar – 19 Jun
 * - Summer: 20 Jun – 19 Sep
 * - Autumn: 20 Sep – 19 Dec
 * - Winter: 20 Dec – 19 Mar
 */
export function getSeason(dateOrMs: Date | number): Season {
  const d = typeof dateOrMs === "number" ? new Date(dateOrMs) : dateOrMs;
  const month = d.getMonth(); // 0 = Jan, 11 = Dec
  const day = d.getDate();

  // Mar 20 – Jun 19
  if ((month === 2 && day >= 20) || month === 3 || month === 4 || (month === 5 && day <= 19)) {
    return "spring";
  }
  // Jun 20 – Sep 19
  if ((month === 5 && day >= 20) || month === 6 || month === 7 || (month === 8 && day <= 19)) {
    return "summer";
  }
  // Sep 20 – Dec 19
  if ((month === 8 && day >= 20) || month === 9 || month === 10 || (month === 11 && day <= 19)) {
    return "autumn";
  }
  // Winter: 20 Dec – 19 Mar
  return "winter";
}

/** Jam-jam batas pergantian fase waktu (05:00, 10:00, 15:00, 19:00). */
const PHASE_TRANSITION_HOURS = [5, 10, 15, 19];

/**
 * Membagi selang waktu [fromMs, toMs] menjadi segmen-segmen fase waktu (Doc 03 §2).
 */
export function splitByDayPhase(fromMs: number, toMs: number): PhaseSegment[] {
  if (toMs <= fromMs) return [];

  const segments: PhaseSegment[] = [];
  let currentStart = fromMs;

  while (currentStart < toMs) {
    const startDate = new Date(currentStart);
    const phase = getDayPhase(startDate);

    // Cari waktu transisi berikutnya
    const currentHour = startDate.getHours();
    const nextTransitionHour = PHASE_TRANSITION_HOURS.find((h) => h > currentHour);

    const nextTransitionDate = new Date(startDate);
    if (nextTransitionHour !== undefined) {
      nextTransitionDate.setHours(nextTransitionHour, 0, 0, 0);
    } else {
      // Lewat 19:00 -> transisi berikutnya adalah 05:00 esok hari
      nextTransitionDate.setDate(nextTransitionDate.getDate() + 1);
      nextTransitionDate.setHours(5, 0, 0, 0);
    }

    const nextBoundaryMs = nextTransitionDate.getTime();
    const segmentEnd = Math.min(toMs, nextBoundaryMs);
    const durationHours = (segmentEnd - currentStart) / MS_PER_HOUR;

    if (durationHours > 0) {
      segments.push({
        phase,
        hours: durationHours,
        startMs: currentStart,
        endMs: segmentEnd,
      });
    }

    currentStart = segmentEnd;
  }

  return segments;
}

/**
 * Memetakan DayPhase ke DecayPhase (@hagumi/data):
 * - night + tidur -> 'sleeping'
 * - night + bangun -> 'nightAwake'
 * - morning/day/evening + tidur -> 'sleeping'
 * - morning/day/evening + bangun -> 'day'
 */
export function mapToDecayPhase(dayPhase: DayPhase, isSleeping: boolean): DecayPhase {
  if (isSleeping) return "sleeping";
  if (dayPhase === "night") return "nightAwake";
  return "day";
}

/**
 * Algoritma Offline Catch-Up (Doc 03 §2 & GDD §9).
 * Dijalankan saat game dibuka kembali untuk menerapkan decay akumulasi waktu offline.
 */
export function processOfflineCatchUp(
  pet: PetData,
  lastTickMs: number,
  nowMs: number,
  options?: OfflineCatchUpOptions,
): OfflineCatchUpResult {
  const dtMs = Math.max(0, nowMs - lastTickMs);
  const elapsedHours = dtMs / MS_PER_HOUR;

  if (dtMs <= 0 || pet.state === "dead" || pet.stage === "dead") {
    return {
      pet: { ...pet },
      elapsedHours: 0,
      segments: [],
      poopsSpawned: 0,
      becameSick: false,
      died: pet.state === "dead" || pet.stage === "dead",
      summaryText: "Selamat datang kembali!",
    };
  }

  // Grace period anti-frustrasi (GDD §9 & Doc 03 §2):
  // Jika usia < 24 jam (newborn) -> floor 50; selain itu floor 5
  const isNewborn = pet.birthAt > 0 && nowMs - pet.birthAt < MS_PER_DAY;
  const defaultFloor = isNewborn ? 50 : 5;
  const floor = options?.floor ?? defaultFloor;

  const segments = splitByDayPhase(lastTickMs, nowMs);
  let currentStats = { ...pet.stats };
  let currentState: PetState = pet.state;
  let sickSince = pet.sickSince;
  let isUntreatedSickPast12h = false;

  // Telur tidak mengalami decay stat biasa
  if (pet.stage !== "egg") {
    for (const seg of segments) {
      if (sickSince !== null && seg.startMs - sickSince >= 12 * MS_PER_HOUR) {
        isUntreatedSickPast12h = true;
      }

      const isSleeping = currentState === "sleeping";
      const decayPhase = mapToDecayPhase(seg.phase, isSleeping);

      currentStats = applyDecay(currentStats, seg.hours, decayPhase, {
        element: pet.element,
        stage: pet.stage,
        isUntreatedSickPast12h,
        isSick: currentState === "sick",
        floor,
      });

      // Kematian offline jika health habis
      if (currentStats.health <= 0) {
        currentState = "dead";
        break;
      }
    }
  }

  // Simulasi poop saat offline (maks 3 poop, Doc 03 §2)
  let poopsSpawned = 0;
  const maxPoop = options?.maxPoopOffline ?? 3;
  if (pet.stage !== "egg" && elapsedHours >= 3) {
    // 1 poop setiap ~4 jam offline
    poopsSpawned = Math.min(maxPoop, Math.floor(elapsedHours / 4));
  }

  // Evaluasi penyakit jika hygiene sangat rendah atau poop menumpuk
  let becameSick = false;
  if (
    pet.stage !== "egg" &&
    currentState !== "dead" &&
    currentState !== "sick" &&
    (currentStats.hygiene <= 10 || poopsSpawned >= 3)
  ) {
    becameSick = true;
    currentState = "sick";
    sickSince = sickSince ?? nowMs;
  }

  const died = currentState === "dead";
  const updatedStage = died ? "dead" : pet.stage;

  // Bangun ringkasan teks offline (Doc 03 §2 item 5)
  const hoursFormatted = Math.floor(elapsedHours);
  const minutesFormatted = Math.floor((elapsedHours - hoursFormatted) * 60);
  let timeStr = "";
  if (hoursFormatted > 0) {
    timeStr += `${hoursFormatted} jam `;
  }
  timeStr += `${minutesFormatted} menit`;

  let summaryText = `Kamu pergi selama ${timeStr}.`;
  if (died) {
    summaryText += ` ${pet.name} telah berpulang ke kuil memorial.`;
  } else if (becameSick) {
    summaryText += ` ${pet.name} jatuh sakit karena kandang kotor!`;
  } else if (poopsSpawned > 0) {
    summaryText += ` ${pet.name} meninggalkan ${poopsSpawned} kotoran di tatami.`;
  } else {
    summaryText += ` ${pet.name} menunggumu dengan setia.`;
  }

  const updatedPet: PetData = {
    ...pet,
    state: currentState,
    stage: updatedStage,
    stats: currentStats,
    sickSince,
  };

  return {
    pet: updatedPet,
    elapsedHours,
    segments,
    poopsSpawned,
    becameSick,
    died,
    summaryText,
  };
}
