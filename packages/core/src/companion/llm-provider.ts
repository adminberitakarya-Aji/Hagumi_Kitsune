/**
 * Kontrak provider LLM (M6/M9 — Doc 11 §2): satu kontrak, banyak adapter.
 * `packages/llm/` (openai/gemini/ollama) mengimplementasikan interface yang sama;
 * `OfflineLlmProvider` = adapter DEFAULT (template Tier 1 dari Doc 08 §5).
 */
import type { ChatKeyword, ChatQuota } from "./chat-template";
import {
  applyChatQuota,
  canChatHappiness,
  HAPPINESS_PER_CHAT,
  matchChatKeyword,
  rollChatQuotaDay,
} from "./chat-template";
import type { IRng } from "../ports";
import type { MemoryLogEntry, PetStats } from "../pet/types";
import type { DayPhase, Season } from "../time/types";

/** Konteks "jiwa" pet yang dikirim ke provider (Doc 11 §3 — subset Tier 1). */
export interface ChatContext {
  petName: string;
  element: string;
  stats: PetStats;
  phase: DayPhase;
  season: Season;
  ageDays: number;
  memoryLog: MemoryLogEntry[];
  /** Ada memori lalai yang belum dimaafkan? (untuk respons "maaf".) */
  hasUnforgivenNeglect: boolean;
  /** Kuota anti-spam hari ini (Doc 08 §5) — provider menahan efek jika habis. */
  chatQuota: ChatQuota;
  /** Tanggal hari ini (YYYY-MM-DD) untuk rollover kuota. */
  day: string;
}

export interface ChatRequest {
  text: string;
  context: ChatContext;
}

export interface ChatReply {
  /** Balasan teks (sudah gaya kepribadian elemen). */
  text: string;
  /** Keyword yang dikenali (fallback bila generik). */
  keyword: ChatKeyword;
  /** Efek stat Tier 1 (hanya dari keyword, dibatasi kuota harian). */
  happiness: number;
  /** true bila memori lalai baru saja dimaafkan (system mem-forward ke save). */
  forgave: boolean;
  /** Kuota terbaru setelah pesan ini (dipersist system). */
  chatQuota: ChatQuota;
}

export interface ILlmProvider {
  chat(req: ChatRequest): Promise<ChatReply>;
}

/** Pool baris chat per kepribadian (dari dialog_<element>.json). */
export interface ChatPools {
  makan: { hungerLow: string[]; hungerMid: string[]; hungerFull: string[] };
  sayang: string[];
  maaf: string[];
  siapa: string[];
  fallback: string[];
}

const HUNGER_LOW = 25;
const HUNGER_HIGH = 75;

/**
 * Provider OFFLINE (default — Doc 11 §2 ⭐): jawaban template Tier 1 dari
 * dialog_<element>.json. Tanpa jaringan, tanpa biaya; kontrak sama dengan
 * provider LLM sungguhan sehingga M9 tinggal menambah adapter lain.
 */
export class OfflineLlmProvider implements ILlmProvider {
  private readonly pools: ChatPools;
  private readonly rng: IRng;

  constructor(pools: ChatPools, rng: IRng) {
    this.pools = pools;
    this.rng = rng;
  }

  async chat(req: ChatRequest): Promise<ChatReply> {
    const { text, context } = req;
    const keyword = matchChatKeyword(text);
    const quota = rollChatQuotaDay(context.chatQuota, context.day);
    let replyText: string;
    let happiness = 0;
    let forgave = false;

    switch (keyword) {
      case "makan": {
        const s = context.stats.hunger;
        const pool =
          s < HUNGER_LOW
            ? this.pools.makan.hungerLow
            : s > HUNGER_HIGH
              ? this.pools.makan.hungerFull
              : this.pools.makan.hungerMid;
        replyText = this.pick(pool);
        break;
      }
      case "sayang": {
        // hati + happiness +2 (anti-spam via kuota)
        if (canChatHappiness(quota)) happiness = HAPPINESS_PER_CHAT;
        replyText = this.pick(this.pools.sayang);
        break;
      }
      case "maaf": {
        // memori lalai → respons memaafkan + ditandai "dimaafkan" (Doc 08 §5)
        forgave = context.hasUnforgivenNeglect;
        replyText = this.pick(this.pools.maaf);
        break;
      }
      case "siapa": {
        replyText = this.pick(this.pools.siapa).replaceAll("{name}", context.petName);
        break;
      }
      default: {
        replyText = this.pick(this.pools.fallback);
      }
    }

    const nextQuota = applyChatQuota(quota, happiness > 0);
    return { text: replyText, keyword, happiness, forgave, chatQuota: nextQuota };
  }

  private pick(pool: string[]): string {
    return this.rng.pick(pool) ?? "Kyuu...";
  }
}

