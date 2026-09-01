/**
 * HAGUMI core — Ports (kontrak platform).
 *
 * Aturan perbatasan (Doc 09 §1): `packages/core` TIDAK BOLEH mengimpor DOM API,
 * Phaser, atau paket apa pun di luar core. Semua kemampuan platform diakses
 * HANYA lewat interface di file ini, dan diimplementasikan sebagai adapter
 * di `apps/web` (localStorage, Phaser Audio, dst.) atau `packages/llm`.
 */

/** Penyimpanan key-value persisten (web: localStorage · native: SecureStorage). */
export interface IStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  /** true bila backend penyimpanan tersedia & sehat (untuk peringatan save korup). */
  isAvailable(): boolean;
}

/** Sumber waktu. Semua waktu game memakai timestamp UTC epoch ms (Doc 03 §1). */
export interface IClock {
  /** Waktu sekarang dalam UTC epoch milliseconds. */
  now(): number;
}

/** Generator acak. Logika game (breeding, poop, mutasi) WAJIB lewat port ini —
 *  bukan `Math.random()` langsung — agar bisa diuji deterministik. */
export interface IRng {
  /** Float [0, 1). */
  next(): number;
  /** Integer [minInclusive, maxExclusive). */
  int(minInclusive: number, maxExclusive: number): number;
  /** Satu elemen acak dari array (undefined bila kosong). */
  pick<T>(items: readonly T[]): T | undefined;
}

/** Audio musik & SFX (Doc 10 §5). Implementasi per platform. */
export interface IAudio {
  playMusic(trackId: string): void;
  stopMusic(): void;
  playSfx(sfxId: string): void;
  setMusicEnabled(enabled: boolean): void;
  setSfxEnabled(enabled: boolean): void;
}

/** Notifikasi lokal ("Kitsune-mu lapar!" — Doc 11/GDD §11). */
export interface INotifier {
  notify(title: string, body: string): void;
}

/** Logger — jangan console.log langsung dari core (biar bisa disenyapkan/diarahkan). */
export interface ILogger {
  debug(message: string, ...meta: unknown[]): void;
  warn(message: string, ...meta: unknown[]): void;
  error(message: string, ...meta: unknown[]): void;
}
