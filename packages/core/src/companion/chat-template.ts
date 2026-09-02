/**
 * Chat template Tier 1 (M6 — Doc 08 §5): input pemain di-tokenisasi, cocokkan
 * kata kunci multibahasa (id/en) → respons sesuai stat & kepribadian.
 * Anti-spam: +2 happiness MAKS 10×/hari (chat bukan sumber stat).
 */

export type ChatKeyword = "makan" | "sayang" | "maaf" | "siapa" | "fallback";

/** Pola kata kunci (id/en) — urutan = prioritas pencocokan. */
const KEYWORD_PATTERNS: Array<[Exclude<ChatKeyword, "fallback">, RegExp]> = [
  ["makan", /\b(makan|makanan|laper|lapar|food|hungry|eat|feed)\b/i],
  ["sayang", /\b(sayang|cinta|love|luv|affection)\b/i],
  ["maaf", /\b(maaf|sorry|sori|forgive|forgiveme)\b/i],
  ["siapa", /\b(siapa|nama\w*|kamu|siapakamu|who|your\s*name|whats\s*your\s*name)\b/i],
];

/** Cocokkan input pemain → kata kunci; tak ada yang cocok → "fallback". */
export function matchChatKeyword(input: string): ChatKeyword {
  const text = input.toLowerCase().trim();
  if (text.length === 0) return "fallback";
  for (const [key, re] of KEYWORD_PATTERNS) {
    if (re.test(text)) return key;
  }
  return "fallback";
}

/** Kuota kebahagiaan harian chat (Doc 08 §5): +2 per chat, maks 10/hari. */
export const HAPPINESS_PER_CHAT = 2;
export const CHAT_HAPPINESS_DAILY_MAX = 10;

export interface ChatQuota {
  /** Tanggal (YYYY-MM-DD) dari penghitung aktif. */
  day: string;
  /** Jumlah poin happiness dari chat hari ini. */
  happinessToday: number;
  /** Jumlah pesan pemain hari ini (untuk info kuota UI). */
  messagesToday: number;
}

export function emptyChatQuota(day: string): ChatQuota {
  return { day, happinessToday: 0, messagesToday: 0 };
}

/** Kuota baru untuk hari `day` bila tanggal berganti; kuota lama selainnya. */
export function rollChatQuotaDay(quota: ChatQuota, day: string): ChatQuota {
  return quota.day === day ? quota : emptyChatQuota(day);
}

/** Masih boleh kasih +2 happiness hari ini? */
export function canChatHappiness(quota: ChatQuota): boolean {
  return quota.happinessToday + HAPPINESS_PER_CHAT <= CHAT_HAPPINESS_DAILY_MAX;
}

/** Catat 1 pesan + efek happiness (bila kuota sisa) → kuota baru. */
export function applyChatQuota(quota: ChatQuota, happyGranted: boolean): ChatQuota {
  return {
    day: quota.day,
    happinessToday: quota.happinessToday + (happyGranted ? HAPPINESS_PER_CHAT : 0),
    messagesToday: quota.messagesToday + 1,
  };
}

/** Sisa kuota happiness hari ini (untuk UI "Kuota: x/10"). */
export function chatQuotaLeft(quota: ChatQuota): number {
  return Math.max(0, CHAT_HAPPINESS_DAILY_MAX - quota.happinessToday);
}
