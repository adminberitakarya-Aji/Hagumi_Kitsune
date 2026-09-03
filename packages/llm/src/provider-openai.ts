/**
 * Adapter OpenAI & API compatible (M9 — Doc 11 §2).
 * API key HANYA dipakai server-side (edge function); unit test menyuntikkan
 * fetchImpl palsu agar kontrak sama teruji tanpa jaringan.
 */
import {
  buildChatPayload,
  type ChatReply,
  type ChatRequest,
  type ILlmProvider,
} from "@hagumi/core";
import { pickPath, postJson } from "./http";
import { toChatReply } from "./base";

export interface OpenAiLlmConfig {
  endpoint: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class OpenAiLlmProvider implements ILlmProvider {
  constructor(private readonly cfg: OpenAiLlmConfig) {}

  async chat(req: ChatRequest): Promise<ChatReply> {
    const payload = buildChatPayload(req, { provider: "openai", maxTokens: this.cfg.maxTokens, nowMs: Date.now() });
    const messages = [
      { role: "system", content: payload.systemPrompt },
      ...payload.history.map((h) => ({
        role: h.from === "player" ? "user" : "assistant",
        content: h.text,
      })),
      { role: "user", content: payload.text },
    ];
    const json = await postJson(
      this.cfg.endpoint,
      { Authorization: `Bearer ${this.cfg.apiKey}` },
      { model: this.cfg.model, messages, max_tokens: payload.maxTokens, temperature: 0.8 },
      this.cfg.timeoutMs ?? 8000,
      this.cfg.fetchImpl,
    );
    const text = pickPath(json, "choices.0.message.content");
    return toChatReply(typeof text === "string" ? text : "", req);
  }
}