/**
 * HAGUMI core — Genetika breeding antar-pemain (M8 — Doc 07 §2B & §3).
 * Server mengirim SEED acak saat kedua pihak sepakat; kedua klien menghitung
 * genetika anak secara LOKAL dari seed yang sama → hasil identik tanpa
 * real-time server. Urutan induk dikanonisasi via `owner` agar 60/40 warna
 * selalu konsisten di kedua sisi.
 */
import { mulberry32, rollChildGenetics } from "../breeding/breeding";
import type { ChildGenetics } from "../breeding/types";
import type { IRng } from "../ports";
import type { BreedingCodePayload } from "./types";

/** Bungkus generator mulberry32 mentah → port IRng (next/int/pick — Doc 09 §1). */
function asRng(next: () => number): IRng {
  return {
    next,
    int: (min, max) => min + Math.floor(next() * Math.max(0, max - min)),
    pick: (items) => (items.length === 0 ? undefined : items[Math.floor(next() * items.length)]),
  };
}

/**
 * Hitung genetika anak dari dua payload breeding code + seed server.
 * Deterministik: fungsi(a, b, seed) === fungsi(b, a, seed).
 */
export function computeOnlineChildGenetics(
  a: BreedingCodePayload,
  b: BreedingCodePayload,
  seed: number,
): ChildGenetics {
  // Kanonisasi urutan induk: owner terkecil = induk A (bobot warna 60%).
  const [first, second] = a.owner <= b.owner ? [a, b] : [b, a];
  const rng = asRng(mulberry32(seed >>> 0));
  return rollChildGenetics({
    rng,
    parentElement: first.element,
    partnerElement: second.element,
    parentCoat: first.coatColor,
    partnerCoat: second.coatColor,
    parentCareScore: first.careScore,
  });
}
