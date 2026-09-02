/**
 * @hagumi/core — logika murni HAGUMI (zero dependency platform).
 * Lihat docs/09-architecture-save.md untuk aturan perbatasan.
 */

// Ports & Adapters
export type { IAudio, IClock, ILogger, INotifier, IRng, IStorage } from "./ports";
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

// Pet Domain
export type {
  ActionResult,
  ActionRejectReason,
  MemoryLogEntry,
  PetData,
  PetElement,
  PetEvolutionPath,
  PetStage,
  PetState,
  PetStats,
} from "./pet/types";
export { PET_ELEMENTS, PET_EVOLUTION_PATHS, PET_STAGES, PET_STATES } from "./pet/types";
export {
  STAT_MAX,
  STAT_MIN,
  SIX_HOURS_MS,
  applyDecay,
  calculateHealthDrainPerHour,
  clampStat,
  clampStats,
  getEffectiveDecayRate,
  isOverfed,
  type HealthDrainBreakdown,
} from "./pet/stats";
export { PetStateMachine, type FeedPayload, type PlayPayload } from "./pet/state-machine";
export {
  poopHygieneDrainPerHour,
  poopIntervalMs,
  scoopPoop,
  shouldSpawnPoop,
  spawnPoop,
} from "./pet/poops";

// Player Domain
export type { LoginStreak, StreakUpdateResult } from "./player/streak";
export { daysBetween, updateLoginStreak } from "./player/streak";

// Time System
export type {
  DayPhase,
  OfflineCatchUpOptions,
  OfflineCatchUpResult,
  PhaseSegment,
  Season,
} from "./time/types";
export { DAY_PHASES, SEASONS } from "./time/types";
export {
  MS_PER_DAY,
  MS_PER_HOUR,
  getDayPhase,
  getSeason,
  mapToDecayPhase,
  processOfflineCatchUp,
  splitByDayPhase,
} from "./time/time-service";

// Save System
export type { LoadSaveResult } from "./save/save-system";
export { SaveSystem } from "./save/save-system";
export type { SaveData, SaveDataV1 } from "./save/schema";
export {
  CURRENT_SAVE_VERSION,
  SAVE_STORAGE_KEY,
  createDefaultSave,
  saveDataSchemaV1,
} from "./save/schema";
