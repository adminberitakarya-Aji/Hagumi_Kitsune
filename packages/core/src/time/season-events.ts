/**
 * HAGUMI core — Event musiman (Doc 03 §5): pemicu otomatis berbasis kalender nyata.
 * Murni & mudah diuji; klaim 1×/sekali per periode disimpan di save (seasonEvents).
 */

import { MS_PER_DAY } from "./time-service";
import { getSeason } from "./time-service";
import type { Season } from "./types";

export const SEASON_EVENTS = ["hanami", "matsuri", "tsukimi", "omikuji"] as const;
export type SeasonEventId = (typeof SEASON_EVENTS)[number];

/** Nama & deskripsi event untuk UI (Doc 03 §5). */
export const SEASON_EVENT_INFO: Record<SeasonEventId, { name: string; icon: string; cta: string }> = {
  hanami: { name: "Hanami", icon: "🌸", cta: "Piknik sakura! 😊+20" },
  matsuri: { name: "Matsuri", icon: "🎆", cta: "Koin mini-game ×1.5!" },
  tsukimi: { name: "Tsukimi", icon: "🌕", cta: "Dango gratis!" },
  omikuji: { name: "Tahun Baru", icon: "🎍", cta: "Tarik omikuji!" },
};

/** Mulai musim (bulan 0-based, tanggal — Doc 03 §4). */
const SEASON_START: Record<Season, { month: number; day: number }> = {
  spring: { month: 2, day: 20 }, // 20 Mar
  summer: { month: 5, day: 20 }, // 20 Jun
  autumn: { month: 8, day: 20 }, // 20 Sep
  winter: { month: 11, day: 20 }, // 20 Dec
};

/** Hari ke-n musim saat ini (1 = hari pertama musim, Doc 03 §5 "hari ke-3 musim"). */
export function getSeasonDay(dateOrMs: Date | number): number {
  const d = typeof dateOrMs === "number" ? new Date(dateOrMs) : dateOrMs;
  const season = getSeason(d);
  const start = SEASON_START[season];
  let startDate = new Date(d.getFullYear(), start.month, start.day);
  if (startDate.getTime() > d.getTime()) {
    // Winter Jan–Mar: musim mulai 20 Des tahun sebelumnya
    startDate = new Date(d.getFullYear() - 1, start.month, start.day);
  }
  return Math.floor((d.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;
}

/**
 * Event musiman aktif (Doc 03 §5):
 * - Hanami: hari ke-3 musim semi (sekali — klaim tersimpan).
 * - Matsuri: sepanjang musim panas (koin mini-game ×1.5, tanpa klaim).
 * - Tsukimi: hari ke-3 musim gugur (sekali — dango gratis).
 * - Omikuji/Tahun Baru: 1–7 Januari (1× per hari).
 */
export function getSeasonEvent(dateOrMs: Date | number): SeasonEventId | null {
  const d = typeof dateOrMs === "number" ? new Date(dateOrMs) : dateOrMs;
  const season = getSeason(d);
  const day = getSeasonDay(d);
  if (season === "spring" && day === 3) return "hanami";
  if (season === "summer") return "matsuri";
  if (season === "autumn" && day === 3) return "tsukimi";
  if (season === "winter" && d.getMonth() === 0 && d.getDate() <= 7) return "omikuji";
  return null;
}
