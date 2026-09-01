/**
 * @hagumi/core — logika murni HAGUMI (zero dependency platform).
 * Lihat docs/09-architecture-save.md untuk aturan perbatasan.
 */
export type {
  IAudio,
  IClock,
  ILogger,
  INotifier,
  IRng,
  IStorage,
} from "./ports";
export {
  BufferedLogger,
  FakeClock,
  MathRng,
  MemoryStorage,
  NoopAudio,
  NoopNotifier,
  SeededRng,
  SystemClock,
} from "./adapters";
