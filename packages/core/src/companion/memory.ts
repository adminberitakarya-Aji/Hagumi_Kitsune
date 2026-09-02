/**
 * Memori pet (M6 — Doc 08 §4): memoryLog maks 20 entri terbaru, persist di save.
 * Memori lalai bisa "dimaafkan" lewat chat (Doc 08 §5) — flag `forgiven`.
 */
import type { MemoryLogEntry } from "../pet/types";
import { isNeglectMemoryKey } from "./types";

export const MEMORY_MAX = 20;

/** Tambah entri memori → entri terbaru DI DEPAN, potong maks 20. */
export function addMemory(log: MemoryLogEntry[], entry: MemoryLogEntry): MemoryLogEntry[] {
  return [entry, ...log].slice(0, MEMORY_MAX);
}

/** Memori terbaru yang belum diucapkan → pendingMemory untuk DialogueEngine. */
export interface PendingMemory {
  entry: MemoryLogEntry;
  index: number;
}

/**
 * Cari memori terbaru yang layak diucapkan: belum `spoken` & belum `forgiven`.
 * (System menandai `spoken` setelah barisnya tampil — kolom runtime, tak dipersist.)
 */
export function findPendingMemory(log: MemoryLogEntry[]): PendingMemory | null {
  let index = 0;
  for (const e of log) {
    if (!e.forgiven) {
      const meta = e as MemoryLogEntry & { spoken?: boolean };
      if (!meta.spoken) return { entry: e, index };
    }
    index += 1;
  }
  return null;
}

/** Tandai memori pada index sudah diucapkan (runtime-only, tak tersimpan). */
export function markMemorySpoken(log: MemoryLogEntry[], index: number): MemoryLogEntry[] {
  return log.map((e, i) => (i === index ? ({ ...e, spoken: true } as MemoryLogEntry) : e));
}

/** Tandai semua memori lalai yang belum terucap sebagai "dimaafkan" (Doc 08 §5). */
export function forgiveNeglectMemories(log: MemoryLogEntry[]): { log: MemoryLogEntry[]; count: number } {
  let count = 0;
  const next = log.map((e) => {
    if (!e.forgiven && isNeglectMemoryKey(e.key)) {
      count += 1;
      return { ...e, forgiven: true };
    }
    return e;
  });
  return { log: next, count };
}

/** Ada memori lalai yang belum dimaafkan? (dipakai template chat "maaf".) */
export function hasUnforgivenNeglect(log: MemoryLogEntry[]): boolean {
  return log.some((e) => !e.forgiven && isNeglectMemoryKey(e.key));
}
