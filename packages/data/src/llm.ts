/**
 * Skema & loader konfigurasi LLM (M9 — Doc 11 §5).
 * Endpoint/model dari sini; API key TIDAK PERNAH di data/klien — hanya secret
 * server-side edge function (services/supabase → OPENAI/GEMINI_API_KEY).
 */
import { z } from "zod";
import llmJson from "../data/llm.json";

export const LLM_PROVIDER_KEYS = ["openai", "gemini", "ollama", "offline"] as const;
export type LlmProviderKey = (typeof LLM_PROVIDER_KEYS)[number];

export const llmProviderSchema = z.object({
  endpoint: z.string().url().optional(),
  model: z.string().min(1).optional(),
  /** offline = bawaan core, tanpa endpoint. */
  builtin: z.boolean().optional(),
});

export const llmConfigSchema = z.object({
  /** Provider aktif default (klien boleh menimpa via Pengaturan). */
  activeProvider: z.enum(LLM_PROVIDER_KEYS),
  /** Batas token balasan — menjaga biaya (Doc 11 §5: 120). */
  maxTokens: z.number().int().positive().max(500),
  /** Kuota pesan LLM per pemain per hari (server-side, Doc 11 §5: 10). */
  dailyQuota: z.number().int().positive().max(200),
  /** Timeout permintaan ke provider (ms) — lalu fallback Tier 1. */
  timeoutMs: z.number().int().positive(),
  providers: z.object({
    openai: llmProviderSchema,
    gemini: llmProviderSchema,
    ollama: llmProviderSchema,
    offline: llmProviderSchema,
  }),
});

export type LlmConfig = z.infer<typeof llmConfigSchema>;

export const llmConfig: LlmConfig = llmConfigSchema.parse(llmJson);

export function getLlmProvider(id: LlmProviderKey): LlmConfig["providers"]["openai"] {
  return llmConfig.providers[id];
}
