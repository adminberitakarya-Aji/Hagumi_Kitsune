/** Test provider-offline (M6 — kontrak ILlmProvider, Doc 11 §2). */
import { describe, expect, it } from "vitest";

import { OfflineLlmProvider, type ChatContext, type ChatPools } from "../src/companion/llm-provider";
import { SeededRng } from "../src/adapters";
import { CHAT_HAPPINESS_DAILY_MAX, emptyChatQuota } from "../src/companion/chat-template";

const POOLS: ChatPools = {
  makan: {
    hungerLow: ["LL1"],
    hungerMid: ["LM1"],
    hungerFull: ["LF1"],
  },
  sayang: ["<3"],
  maaf: ["ok, dimaafkan"],
  siapa: ["Aku {name}, si rubah!"],
  fallback: ["hm?"],
};

function ctx(over: Partial<ChatContext> = {}): ChatContext {
  return {
    petName: "Hana",
    element: "fire",
    stats: { hunger: 80, happiness: 80, energy: 80, hygiene: 80, health: 100 },
    phase: "day",
    season: "spring",
    ageDays: 3,
    memoryLog: [],
    hasUnforgivenNeglect: false,
    chatQuota: emptyChatQuota("2026-09-02"),
    day: "2026-09-02",
    ...over,
  };
}

describe("OfflineLlmProvider (provider default — Doc 11 §2 ⭐)", () => {
  it("implementasi kontrak ILlmProvider: chat() async → ChatReply", async () => {
    const p = new OfflineLlmProvider(POOLS, new SeededRng(7));
    const reply = await p.chat({ text: "hello", context: ctx() });
    expect(reply.text).toBe("hm?");
    expect(reply.keyword).toBe("fallback");
    expect(reply.happiness).toBe(0);
    expect(reply.chatQuota.messagesToday).toBe(1);
  });

  it("keyword makan merespons sesuai level hunger", async () => {
    const p = new OfflineLlmProvider(POOLS, new SeededRng(7));
    const low = await p.chat({ text: "laper?", context: ctx({ stats: { hunger: 10, happiness: 80, energy: 80, hygiene: 80, health: 100 } }) });
    const full = await p.chat({ text: "makan yuk", context: ctx({ stats: { hunger: 90, happiness: 80, energy: 80, hygiene: 80, health: 100 } }) });
    expect(low.text).toBe("LL1");
    expect(full.text).toBe("LF1");
  });

  it("sayang → happiness +2; kuota habis → +0 tanpa error", async () => {
    const p = new OfflineLlmProvider(POOLS, new SeededRng(7));
    const r1 = await p.chat({ text: "sayang!", context: ctx() });
    expect(r1.happiness).toBe(2);
    const fullQuota = emptyChatQuota("2026-09-02");
    fullQuota.happinessToday = CHAT_HAPPINESS_DAILY_MAX;
    const r2 = await p.chat({ text: "love you", context: ctx({ chatQuota: fullQuota }) });
    expect(r2.happiness).toBe(0);
  });

  it("maaf + memori lalai belum dimaafkan → forgave true; tanpa lalai → false", async () => {
    const p = new OfflineLlmProvider(POOLS, new SeededRng(7));
    const yes = await p.chat({ text: "maaf ya", context: ctx({ hasUnforgivenNeglect: true }) });
    expect(yes.forgave).toBe(true);
    const no = await p.chat({ text: "sorry", context: ctx() });
    expect(no.forgave).toBe(false);
  });

  it("siapa → nama pet disisipkan ke {name}", async () => {
    const p = new OfflineLlmProvider(POOLS, new SeededRng(7));
    const r = await p.chat({ text: "siapa kamu?", context: ctx() });
    expect(r.text).toBe("Aku Hana, si rubah!");
  });
});
