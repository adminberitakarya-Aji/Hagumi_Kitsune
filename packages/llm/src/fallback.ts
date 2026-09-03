/**
 * Fallback otomatis Tier 2 → Tier 1 (M9 — Doc 11 §2 & §4):
 * gagal/timeout/kuota habis di provider utama → beralih mulus ke provider
 * offline tanpa crash + callback status untuk ikon ☁️/📡 (Doc 11 §2).
 */
import type { ChatReply, ChatRequest, ILlmProvider } from "@hagumi/core";

export class FallbackLlmProvider implements ILlmProvider {
  constructor(
    private readonly primary: ILlmProvider,
    private readonly fallback: ILlmProvider,
    private readonly onFallback?: (error: unknown) => void,
  ) {}

  async chat(req: ChatRequest): Promise<ChatReply> {
    try {
      return await this.primary.chat(req);
    } catch (error) {
      this.onFallback?.(error);
      return await this.fallback.chat(req);
    }
  }
}