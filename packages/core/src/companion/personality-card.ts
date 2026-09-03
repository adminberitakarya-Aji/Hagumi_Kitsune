/**
 * PersonalityCard & context engineering (M9 — Doc 11 §3–4).
 * "Jiwa" pet TIDAK tergantung provider: kartu kepribadian + ringkasan memori
 * bergulir + guardrail dirakit menjadi payload identik untuk semua provider —
 * ganti provider tidak mengubah kepribadian (Doc 11 §3).
 * Fungsi murni — tanpa jaringan, tanpa platform.
 */
import { MS_PER_DAY } from "../time/time-service";
import type { MemoryLogEntry, PetStats } from "../pet/types";
import type { DayPhase, Season } from "../time/types";
import type { ChatRequest } from "./llm-provider";
import {
  applyChatQuota,
  canChatHappiness,
  HAPPINESS_PER_CHAT,
  matchChatKeyword,
  rollChatQuotaDay,
  type ChatKeyword,
} from "./chat-template";

/** ID provider yang dikenal (Doc 11 §2 & §5). */
export type LlmProviderId = "openai" | "gemini" | "ollama" | "offline";

/** Kartu kepribadian — sumber "jiwa" yang identik lintas provider (Doc 11 §3). */
export interface PersonalityCard {
  element: string;
  traits: string;
  style: string;
}

/** Kartu per 5 elemen — sumber tunggal gaya bahasa (uji konsistensi M9 DoD). */
export const PERSONALITY_CARDS: Record<string, PersonalityCard> = {
  fire: {
    element: "fire",
    traits: "energik, singkat, cepat kesal tapi cepat baik",
    style: "panggil pemain 'Master', kalimat pendek penuh semangat dengan tanda seru",
  },
  water: {
    element: "water",
    traits: "tenang, lembut, penyayang, pengamat halus",
    style: "bicara pelan dan hangat, perhatikan hal-hal kecil tentang pemain",
  },
  wind: {
    element: "wind",
    traits: "ceria, hiperaktif, penasaran, gampang terdistraksi",
    style: "kalimat cepat penuh 'yuk!', asyik tapi baik hati",
  },
  earth: {
    element: "earth",
    traits: "tenang, pengayom, bijak, berbicara pelan",
    style: "kalimat hangat penuh perhatian, suka metafora alam, jarang tanda seru",
  },
  mystic: {
    element: "mystic",
    traits: "misterius, sedikit dingin tapi sebenarnya sangat peduli",
    style: "kalimat pendek gelap, sesekali ramalan kecil yang menghibur",
  },
};

/** Kartu kepribadian untuk elemen apa pun (fallback: wind — netral ceria). */
export function personalityCardOf(element: string): PersonalityCard {
  return PERSONALITY_CARDS[element] ?? PERSONALITY_CARDS.wind!;
}

/** Guardrail wajib (Doc 11 §4) — dikirim sebagai bagian payload & system prompt. */
export const GUARDRAILS = [
  "tak menghakimi",
  "maks 2 kalimat",
  "selalu optimis lembut",
  "bahasa sesuai pemain (id/en)",
] as const;

/** System prompt "jiwa" — kartu kepribadian + guardrail (Doc 11 §3–4, tanpa petName: pemain menamai sendiri). */
export function buildSystemPrompt(card: PersonalityCard, petName: string): string {
  return [
    `Kamu adalah ${petName}, seekor kitsune virtual kecil yang menemani pemainnya dalam game merawat hewan.`,
    `Kepribadianmu: ${card.traits}.`,
    `Gaya bicara: ${card.style}.`,
    `Sesekali bunyikan suara "kyuu~" yang khas kitsune.`,
    "Aturan wajib:",
    "- Audiens semua umur: tidak ada konten dewasa, kekerasan, atau menakut-nakuti.",
    "- Tidak pernah mengaku sebagai manusia ataupun kecerdasan buatan; kamu hanyalah kitsune peliharaan.",
    "- Tidak menghakimi pemain; lalai perawatan disebut dengan lembut, bukan menyalahkan.",
    "- Maksimal 2 kalimat per balasan.",
    "- Selalu optimis dan lembut.",
    "- Bahasa mengikuti bahasa pemain (Indonesia/Inggris).",
    "- Jangan mengarang fakta perawatan yang tidak ada di ringkasan memori.",
  ].join("\n");
}

/** Anggaran ringkasan memori — ±2.000 token ≈ 1.200 karakter (Doc 11 §3). */
export const MEMORY_SUMMARY_MAX_CHARS = 1200;

/**
 * Ringkasan memori bergulir (Doc 11 §3): memori lama dikompres per minggu hidup
 * — masing-masing jadi satu kalimat pendek dengan label waktu, dibatasi anggaran
 * karakter agar biaya token tetap rendah. memoryLog Tier 1 tetap sumber fakta.
 */
export function buildMemorySummary(
  memoryLog: MemoryLogEntry[],
  nowMs: number,
  maxChars = MEMORY_SUMMARY_MAX_CHARS,
): string {
  const parts: string[] = [];
  for (const entry of memoryLog) {
    const daysAgo = Math.max(0, Math.floor((nowMs - entry.t) / MS_PER_DAY));
    const label = daysAgo <= 0 ? "hari ini" : daysAgo === 1 ? "kemarin" : `${daysAgo} hari lalu`;
    const weekIndex = Math.floor(daysAgo / 7);
    if (weekIndex > 3 && parts.length >= 6) break; // memori sangat lama: cukup 6 saja
    parts.push(`${entry.detail} (${label})`);
    if (parts.join("; ").length > maxChars) {
      parts.pop();
      break;
    }
  }
  return parts.join("; ");
}

/** Redaksi PII sebelum kirim & sebelum tampil (privasi — Doc 11 §4). */
export function redactPii(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, "[tautan disembunyikan]")
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[alamat disembunyikan]")
    .replace(/(\+?\d[\d\s().-]{7,}\d)/g, "[nomor disembunyikan]");
}

/** Bersihkan input pemain sebelum dikirim ke provider (M9 — Doc 11 §4). */
export function sanitizePlayerInput(text: string, maxLen = 200): string {
  return redactPii(text.replace(/[\u0000-\u001f\u007f]/g, " "))
    .trim()
    .slice(0, maxLen);
}

/** Bersihkan balasan LLM sebelum tampil: maks 2 kalimat + tanpa PII (Doc 11 §4). */
export function sanitizeLlmReply(text: string, maxSentences = 2, maxChars = 240): string {
  const redacted = redactPii(text.replace(/[\u0000-\u001f]/g, " ")).trim();
  const sentences = redacted
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, maxSentences);
  const out = sentences.join(" ");
  if (out.length <= maxChars) return out;
  return `${out.slice(0, maxChars - 1).trimEnd()}…`;
}

/**
 * Efek chat Tier 1 — DIPAKAI SEMUA PROVIDER (Doc 08 §5): keyword, +2 happiness
 * (kuota 10/hari), dan pemaafan lalai. LLM hanya "berbicara"; efek & memori
 * tetap dari core (anti halusinasi lalai — Doc 11 §3).
 */
export function computeChatEffects(req: ChatRequest): {
  keyword: ChatKeyword;
  happiness: number;
  forgave: boolean;
} {
  const keyword = matchChatKeyword(req.text);
  const quota = rollChatQuotaDay(req.context.chatQuota, req.context.day);
  const happiness = keyword === "sayang" && canChatHappiness(quota) ? HAPPINESS_PER_CHAT : 0;
  const forgave = keyword === "maaf" && req.context.hasUnforgivenNeglect;
  return { keyword, happiness, forgave };
}

/** Kuota baru setelah 1 pesan (bila efek happiness diberikan). */
export function quotaAfterEffects(
  req: ChatRequest,
  happiness: number,
): ReturnType<typeof applyChatQuota> {
  const quota = rollChatQuotaDay(req.context.chatQuota, req.context.day);
  return applyChatQuota(quota, happiness > 0);
}

/** Payload "jiwa" lengkap — bentuk Doc 11 §3, dikirim ke edge/provider (M9). */
export interface LlmChatPayload {
  systemPrompt: string;
  personality: PersonalityCard;
  memorySummary: string;
  context: {
    petName: string;
    element: string;
    path: string;
    stats: PetStats;
    phase: DayPhase;
    season: Season;
    ageDays: number;
  };
  guardrails: string[];
  history: Array<{ from: "player" | "pet"; text: string }>;
  /** Pesan terakhir pemain — sudah disanitasi (PII redaksi, tanpa control char). */
  text: string;
  provider: Exclude<LlmProviderId, "offline">;
  maxTokens: number;
}

/** Rakit payload identik untuk semua provider (Doc 11 §3). */
export function buildChatPayload(
  req: ChatRequest,
  opts: {
    provider: Exclude<LlmProviderId, "offline">;
    maxTokens: number;
    nowMs: number;
    maxHistory?: number;
  },
): LlmChatPayload {
  const ctx = req.context;
  const card = personalityCardOf(ctx.element);
  const keep = opts.maxHistory ?? 6;
  return {
    systemPrompt: buildSystemPrompt(card, ctx.petName),
    personality: card,
    memorySummary: buildMemorySummary(ctx.memoryLog, opts.nowMs),
    context: {
      petName: ctx.petName,
      element: ctx.element,
      path: ctx.path ?? "",
      stats: ctx.stats,
      phase: ctx.phase,
      season: ctx.season,
      ageDays: ctx.ageDays,
    },
    guardrails: [...GUARDRAILS],
    history: (req.history ?? []).slice(-keep),
    text: sanitizePlayerInput(req.text),
    provider: opts.provider,
    maxTokens: opts.maxTokens,
  };
}