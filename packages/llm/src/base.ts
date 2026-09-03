/**
 * Perekat kontrak LLM (M9 — Doc 11 §2): teks mentah provider → ChatReply
 * kontrak dengan efek Tier 1 yang konsisten (Doc 08 §5 — keyword, +2 happiness
 * terkuota, pemaafan lalai). Semua adapter LLM memakai fungsi ini.
 */
import {
  sanitizeLlmReply,
  type ChatReply,
  type ChatRequest,
} from "@hagumi/core";
import { computeChatEffects, quotaAfterEffects } from "@hagumi/core";

/** Susun ChatReply final: teks disanitasi (≤2 kalimat, tanpa PII) + efek Tier 1. */
export function toChatReply(rawText: string, req: ChatRequest): ChatReply {
  const { keyword, happiness, forgave } = computeChatEffects(req);
  return {
    text: sanitizeLlmReply(rawText),
    keyword,
    happiness,
    forgave,
    chatQuota: quotaAfterEffects(req, happiness),
  };
}