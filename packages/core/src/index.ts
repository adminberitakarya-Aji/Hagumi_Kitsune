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

// Season Events (M4 — Doc 03 §5)
export type { SeasonEventId } from "./time/season-events";
export { SEASON_EVENTS, SEASON_EVENT_INFO, getSeasonDay, getSeasonEvent } from "./time/season-events";

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

// Mini-game reward & gating (M4 — Doc 05)
export type { MinigameGateResult, MinigameReward, MinigameRewardParams } from "./player/minigame";
export { calculateMinigameReward, canPlayMinigame } from "./player/minigame";

// Companion: dialog, memori, chat Tier 1 (M6 — Doc 08, Doc 11 §1–2)
export {
  OfflineLlmProvider,
  DialogueEngine,
  MEMORY_MAX,
  NEGLECT_MEMORY_KEYS,
  addMemory,
  applyChatQuota,
  canChatHappiness,
  chatQuotaLeft,
  emptyChatQuota,
  findPendingMemory,
  forgiveNeglectMemories,
  hasUnforgivenNeglect,
  isNeglectMemoryKey,
  markMemorySpoken,
  matchChatKeyword,
  reactionFor,
  rollChatQuotaDay,
} from "./companion";
export type {
  ChatContext,
  ChatKeyword,
  ChatPools,
  ChatQuota,
  ChatReply,
  ChatRequest,
  DialogueContext,
  DialogueEngineOptions,
  DialoguePick,
  DialoguePools,
  DialogueTriggerKey,
  ILlmProvider,
  PendingMemory,
  ReactionAction,
} from "./companion";

