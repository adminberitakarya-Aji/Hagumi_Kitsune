/**
 * Implementasi referensi port (Doc 09 §1) yang aman dipakai di mana saja:
 * MemoryStorage (tes headless & fallback), SystemClock, MathRng (deterministik
 * via seed — penting untuk uji genetika Doc 07), NoopAudio/NoopNotifier/ConsoleLogger.
 */
import type { IAudio, IClock, ILogger, INotifier, IRng, IStorage } from "./ports";

/** Penyimpanan di memori — untuk unit test headless dan fallback saat storage platform gagal. */
export class MemoryStorage implements IStorage {
  private map = new Map<string, string>();

  get(key: string): string | null {
    return this.map.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.map.set(key, value);
  }

  remove(key: string): void {
    this.map.delete(key);
  }

  isAvailable(): boolean {
    return true;
  }
}

/** Jam nyata sistem (UTC epoch ms). Satu-satunya sumber waktu di produksi (Doc 03 §1). */
export class SystemClock implements IClock {
  now(): number {
    return Date.now();
  }
}

/** Jam palsu yang bisa digeser manual — dipakai TimeService test (Doc 03 §6). */
export class FakeClock implements IClock {
  constructor(private current: number = 1_735_000_000_000) {}

  now(): number {
    return this.current;
  }

  /** Maju waktu sejumlah ms (untuk simulasi offline catch-up). */
  advance(ms: number): void {
    this.current += ms;
  }
}

/** Rng acak standar berbasis Math.random. */
export class MathRng implements IRng {
  next(): number {
    return Math.random();
  }

  int(minInclusive: number, maxExclusive: number): number {
    return Math.floor(Math.random() * (maxExclusive - minInclusive)) + minInclusive;
  }

  pick<T>(items: readonly T[]): T | undefined {
    if (items.length === 0) return undefined;
    return items[Math.floor(Math.random() * items.length)];
  }
}

/** Rng deterministik (mulberry32) — wajib untuk uji distribusi genetika (Doc 07). */
export class SeededRng implements IRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(minInclusive: number, maxExclusive: number): number {
    return Math.floor(this.next() * (maxExclusive - minInclusive)) + minInclusive;
  }

  pick<T>(items: readonly T[]): T | undefined {
    if (items.length === 0) return undefined;
    return items[Math.floor(this.next() * items.length)];
  }
}

export class NoopAudio implements IAudio {
  playMusic(_trackId: string): void {}
  stopMusic(): void {}
  playSfx(_sfxId: string): void {}
  setMusicEnabled(_enabled: boolean): void {}
  setSfxEnabled(_enabled: boolean): void {}
}

export class NoopNotifier implements INotifier {
  notify(_title: string, _body: string): void {}
}

/**
 * Logger murni tanpa I/O (menyimpan ke buffer) — core TIDAK boleh memanggil
 * console/network langsung (Doc 09 §1). Adapter platform yang meneruskan
 * buffer ini ke console/file.
 */
export class BufferedLogger implements ILogger {
  private entries: string[] = [];
  private static readonly MAX_ENTRIES = 200;

  private push(level: string, message: string, meta: unknown[]): void {
    const metaPart = meta.length > 0 ? ` ${JSON.stringify(meta)}` : "";
    this.entries.push(`[${level}] ${message}${metaPart}`);
    if (this.entries.length > BufferedLogger.MAX_ENTRIES) {
      this.entries.shift();
    }
  }

  debug(message: string, ...meta: unknown[]): void {
    this.push("debug", message, meta);
  }
  warn(message: string, ...meta: unknown[]): void {
    this.push("warn", message, meta);
  }
  error(message: string, ...meta: unknown[]): void {
    this.push("error", message, meta);
  }

  /** Ambil & bersihkan buffer (dipanggil adapter platform untuk diteruskan ke console). */
  drain(): readonly string[] {
    const out = [...this.entries];
    this.entries = [];
    return out;
  }
}
