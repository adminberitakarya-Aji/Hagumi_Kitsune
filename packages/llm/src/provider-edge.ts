/**
 * Adapter Supabase edge `POST /chat` (M9 — Doc 11 §2): proxy ke provider.
 * API key provider TIDAK PERNAH ada di aplikasi — klien hanya mengirim
 * payload "jiwa" (Doc 11 §3) + anon key Supabase. Gagal/timeout/kuota habis
 * melempar Error → FallbackLlmProvider beralih ke Tier 1.
 */
import {
  buildChatPayload,
  type ChatReply,
  type ChatRequest,
  type ILlmProvider,
  type LlmChatPayload,
} from "@hagumi/core";
import { postJson } from "./http";
import { toChatReply } from "./base";

export interface EdgeLlmConfig {
  /** URL proyek Supabase (tanpa trailing slash). */
  url: string;
  /** Anon key Supabase (header apikey gateway). */
  anonKey: string;
  /** JWT Anonymous Auth — ditandatangani server, bukan UUID self-asserted. */
  getToken: () => Promise<string | null>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class EdgeLlmProvider implements ILlmProvider {
  constructor(private readonly cfg: EdgeLlmConfig) {}

  async chat(req: ChatRequest): Promise<ChatReply> {
    const token = await this.cfg.getToken();
    if (!token) throw new Error("Sesi Supabase tidak tersedia");
    const payload: LlmChatPayload = buildChatPayload(req, {
      provider: "openai",
      maxTokens: 120, // edge menegakkan batasnya sendiri; angka di sini hanya default
      nowMs: Date.now(),
    });
    const json = await postJson(
      `${this.cfg.url}/functions/v1/chat`,
      {
        Authorization: `Bearer ${token}`,
        apikey: this.cfg.anonKey,
      },
      { payload },
      this.cfg.timeoutMs ?? 8000,
      this.cfg.fetchImpl,
    );
    const text =
      typeof json === "object" && json !== null && "text" in json
        ? String((json as { text: unknown }).text)
        : "";
    return toChatReply(text, req);
  }
}