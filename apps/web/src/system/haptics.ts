/**
 * Haptics adapter (M11 — Doc 10 §5, ROADMAP M11): pola getar semantik untuk momen penting.
 * Web: `navigator.vibrate`. Native: Capacitor Haptics ter-integrasi saat M15 —
 * antarmuka pola sudah final, M15 cukup menambah backend tanpa menyentuh pemanggil.
 */

export type HapticPattern =
  | "light" // sentuhan umum (tombol, tab)
  | "medium" // aksi selesai
  | "success" // cap hanko berhasil / klaim hadiah
  | "evolution" // momen evolusi — pola seremonial
  | "hatch" // telur menetas
  | "warn"; // peringatan (pet sakit)

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  success: [15, 40, 15],
  evolution: [30, 60, 30, 60, 140],
  hatch: [20, 40, 20, 40, 70],
  warn: [40, 60, 40],
};

function vibrateSupported(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

/** Picu getar pola semantik — aman dipanggil di mana pun (no-op bila tak didukung). */
export function haptic(pattern: HapticPattern): void {
  if (!vibrateSupported()) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    /* beberapa browser menolak tanpa gesture — abaikan */
  }
}