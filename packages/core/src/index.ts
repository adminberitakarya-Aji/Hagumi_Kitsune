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
  calculateHealthRegenPerHour,
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
export type { SaveData, SaveDataV1, SaveDataV2 } from "./save/schema";
export {
  CURRENT_SAVE_VERSION,
  SAVE_STORAGE_KEY,
  createDefaultSave,
  saveDataSchemaV2,
} from "./save/schema";

// Care Score & Evolution (M3 — GDD §4)
export type { CareSample, CareScoreParams } from "./pet/care-score";
export {
  addCareBonus,
  addCarePenalty,
  computeCareScore,
  pruneCareHistory,
  pushCareSample,
  sampleCareStats,
} from "./pet/care-score";
export type { EvolutionKind, EvolutionParams, EvolutionResult, PathRuleShape, RecoveryResult } from "./pet/evolution";
export {
  checkPathRecovery,
  evolveIfNeeded,
  lockPathForScore,
  refreshCareScore,
  samplePetCare,
  tailsForPath,
} from "./pet/evolution";
