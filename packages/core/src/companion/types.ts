/**
 * Tipe companion M6 (Doc 08, Doc 11 §1–2).
 * Core murni — data baris dialog datang dari `@hagumi/data`, adapter provider
 * (offline/openai/…) mengimplementasikan `ILlmProvider` (Doc 11 §2).
 */
import type { DayPhase, Season } from "../time/types";
import type { MemoryLogEntry, PetState, PetStats } from "../pet/types";

/** Kunci trigger dialog — kumpulan baris yang diambil dari dialog_<element>.json. */
export type DialogueTriggerKey =
  | "health" // prio 1: health <25 / state SICK
  | "hunger" // prio 2
  | "hygiene" // prio 3
  | "energy" // prio 4
  | "night" // prio 4b: malam & terjaga
  | "happiness" // prio 5
  | "memory_neglect" // prio 6: memori lalai (Doc 08 §4)
  | "memory_event" // prio 6: memori event
  | "forgive" // jawaban pemaaflian (via chat "maaf")
  | "phase_morning" // prio 7
  | "phase_day" // prio 7
  | "phase_evening" // prio 7
  | "season_spring" // prio 8
  | "season_summer"
  | "season_autumn"
  | "season_winter"
  | "idle"; // prio 9: random 1×/2 menit

/** Kondisi dunia+pet yang dievaluasi mesin dialog menurut prioritas Doc 08 §2. */
export interface DialogueContext {
  stats: PetStats;
  state: PetState;
  phase: DayPhase;
  season: Season;
  /** Memori yang belum diucapkan (paling baru) — null bila tak ada. */
  pendingMemory: MemoryLogEntry | null;
}

/** Baris terpilih + trigger asalnya (dipakai system untuk memutuskan efek). */
export interface DialoguePick {
  trigger: DialogueTriggerKey;
  text: string;
}

/** Memori negatif yang bisa dimaafkan (lalai makan, ditinggal, dst). */
export const NEGLECT_MEMORY_KEYS = [
  "starved",
  "left_alone",
  "hygiene_zero",
  "energy_zero",
  "happiness_zero",
  "poop_full",
] as const;

/** Trigger memori negatif? (Doc 08 §4 — dipakai untuk pilih pool dialog memori.) */
export function isNeglectMemoryKey(key: string): boolean {
  return NEGLECT_MEMORY_KEYS.some((k) => key === k || key.startsWith(`${k}_`));
}
