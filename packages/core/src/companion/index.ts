/**
 * Companion (M6 — Doc 08, Doc 11 §1–2): dialog kontekstual, memori, chat Tier 1.
 */
export type {
  DialogueContext,
  DialoguePick,
  DialogueTriggerKey,
} from "./types";
export { NEGLECT_MEMORY_KEYS, isNeglectMemoryKey } from "./types";
export type { DialoguePools, DialogueEngineOptions } from "./dialogue-engine";
export { DialogueEngine } from "./dialogue-engine";
export type { PendingMemory } from "./memory";
export {
  MEMORY_MAX,
  addMemory,
  findPendingMemory,
  forgiveNeglectMemories,
  hasUnforgivenNeglect,
  markMemorySpoken,
} from "./memory";
export type { ChatKeyword, ChatQuota } from "./chat-template";
export {
  CHAT_HAPPINESS_DAILY_MAX,
  HAPPINESS_PER_CHAT,
  applyChatQuota,
  canChatHappiness,
  chatQuotaLeft,
  emptyChatQuota,
  matchChatKeyword,
  rollChatQuotaDay,
} from "./chat-template";
export type {
  ChatContext,
  ChatPools,
  ChatReply,
  ChatRequest,
  ILlmProvider,
} from "./llm-provider";
export { OfflineLlmProvider } from "./llm-provider";
export type { ReactionAction } from "./reactions";
export { reactionFor } from "./reactions";
// M9 (Doc 11 §3–5): PersonalityCard, memori bergulir, guardrail, payload chat
export type { LlmChatPayload, LlmProviderId, PersonalityCard } from "./personality-card";
export {
  GUARDRAILS,
  MEMORY_SUMMARY_MAX_CHARS,
  PERSONALITY_CARDS,
  buildChatPayload,
  buildMemorySummary,
  buildSystemPrompt,
  computeChatEffects,
  personalityCardOf,
  quotaAfterEffects,
  redactPii,
  sanitizeLlmReply,
  sanitizePlayerInput,
} from "./personality-card";
