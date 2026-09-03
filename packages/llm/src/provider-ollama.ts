/**
 * Adapter Ollama lokal/gratis (M9 — Doc 11 §2) — untuk dev & mode anti-cloud.
 * Endpoint default http://localhost:11434 (lihat data/llm.json).
 */
import {
  buildChatPayload,
  type ChatReply,
  type ChatRequest,
  type ILlmProvider,
} from "@hagumi/core";
import { pickPath, postJson } from "./http";
import { toChatReply } from "./base";

export interface OllamaLlmConfig {
  endpoint: string;
  model: string;
  maxTokens: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class OllamaLlmProvider implements ILlmProvider {
  constructor(private readonly cfg: OllamaLlmConfig) {}

  async chat(req: ChatRequest): Promise<ChatReply> {
    const payload = buildChatPayload(req, { provider: "ollama", maxTokens: this.cfg.maxTokens, nowMs: Date.now() });
    const messages = [
      { role: "system", content: payload.systemPrompt },
      ...payload.history.map((h) => ({
        role: h.from === "player" ? "user" : "assistant",
        content: h.text,
      })),
      { role: "user", content: payload.text },
    ];
    const json = await postJson(
      `${this.cfg.endpoint.replace(/\/+$/, "")}/api/chat`,
      {},
      {
        model: this.cfg.model,
        messages,
        stream: false,
        options: { num_predict: payload.maxTokens, temperature: 0.8 },
      },
      this.cfg.timeoutMs ?? 8000,
      this.cfg.fetchImpl,
    );
    const text = pickPath(json, "message.content");
    return toChatReply(typeof text === "string" ? text : "", req);
  }
}