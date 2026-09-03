/**
 * HAGUMI core — Sinkronisasi save ke awan (M8 — Doc 09 §4 & §7: backup opsional).
 * Konflik = last-write-wins (lastTick terbaru menang) + diff warning untuk UI.
 * Fungsi murni — keputusan akhir selalu di tangan pemain via UI.
 */
import type { SaveData } from "../save/schema";

export interface SaveSyncDiff {
  /** true = tidak ada perbedaan pada field yang dibandingkan. */
  identical: boolean;
  /** Daftar field yang berbeda ("coins", "pet.name", …). */
  fields: string[];
  localLastTick: number;
  remoteLastTick: number;
  localNewer: boolean;
  /** Ringkasan perbedaan human-readable untuk warning UI. */
  summary: string;
}

interface DiffRow {
  field: string;
  local: string;
  remote: string;
}

function pick<T>(value: T | undefined, fallback: T): T {
  return value ?? fallback;
}

/** Bandingkan dua save pada field kunci gameplay (bukan timestamp/noise). */
export function diffSaves(local: SaveData, remote: SaveData): SaveSyncDiff {
  const rows: DiffRow[] = [];
  const row = (field: string, a: string | number, b: string | number): void => {
    if (a !== b) rows.push({ field, local: String(a), remote: String(b) });
  };

  row("coins", local.player.coins, remote.player.coins);
  row("pet.name", local.pet.name, remote.pet.name);
  row("pet.element", local.pet.element, remote.pet.element);
  row("pet.stage", local.pet.stage, remote.pet.stage);
  row("pet.careScore", Math.round(local.pet.careScore), Math.round(remote.pet.careScore));
  row("keturunan", local.breeding.childrenCount, remote.breeding.childrenCount);
  row("item.dimiliki", pick(local.inventory?.owned, []).length, pick(remote.inventory?.owned, []).length);
  row("rekor.minigame", Object.keys(pick(local.minigames?.bestScores, {})).length, Object.keys(pick(remote.minigames?.bestScores, {})).length);

  const localLastTick = local.lastTick;
  const remoteLastTick = remote.lastTick;
  const summary = rows
    .map((r) => `${r.field}: ${r.local} ↔ ${r.remote}`)
    .join(" · ");
  return {
    identical: rows.length === 0,
    fields: rows.map((r) => r.field),
    localLastTick,
    remoteLastTick,
    localNewer: localLastTick >= remoteLastTick,
    summary,
  };
}

export interface LwwResult {
  /** "local" | "remote" — sisi yang menang berdasarkan lastTick. */
  chosen: "local" | "remote";
  data: SaveData;
  diff: SaveSyncDiff;
}

/** Last-write-wins: save dengan lastTick terbaru menang (Doc M8 — konflik LWW). */
export function resolveLastWriteWins(local: SaveData, remote: SaveData): LwwResult {
  const diff = diffSaves(local, remote);
  const useRemote = remote.lastTick > local.lastTick;
  return { chosen: useRemote ? "remote" : "local", data: useRemote ? remote : local, diff };
}
