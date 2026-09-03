/**
 * Adapter Google Gemini (M9 — Doc 11 §2). generateContent REST; fetchImpl
 * di-inject di unit test.
 */
import {
  buildChatPayload,
  type ChatReply,
  type ChatRequest,
  type ILlmProvider,
} from "@hagumi/core";
import { pickPath, postJson } from "./http";
import { toChatReply } from "./base";

export interface GeminiLlmConfig {
  endpoint: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class GeminiLlmProvider implements ILlmProvider {
  constructor(private readonly cfg: GeminiLlmConfig) {}

  async chat(req: ChatRequest): Promise<ChatReply> {
    const payload = buildChatPayload(req, { provider: "gemini", maxTokens: this.cfg.maxTokens, nowMs: Date.now() });
    const messages = [
      ...payload.history.map((h) => ({
        role: h.from === "player" ? "user" : "model",
        parts: [{ text: h.text }],
      })),
      { role: "user", parts: [{ text: payload.text }] },
    ];
    const json = await postJson(
      `${this.cfg.endpoint}?key=${this.cfg.apiKey}`,
      {},
      {
        systemInstruction: { parts: [{ text: payload.systemPrompt }] },
        contents: messages,
        generationConfig: { maxOutputTokens: payload.maxTokens, temperature: 0.8 },
      },
      this.cfg.timeoutMs ?? 8000,
      this.cfg.fetchImpl,
    );
    const text = pickPath(json, "candidates.0.content.parts.0.text");
    return toChatReply(typeof text === "string" ? text : "", req);
  }
}