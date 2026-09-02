/** Test chat template Tier 1 (M6 — Doc 08 §5): keyword id/en + anti-spam. */
import { describe, expect, it } from "vitest";

import {
  CHAT_HAPPINESS_DAILY_MAX,
  HAPPINESS_PER_CHAT,
  applyChatQuota,
  canChatHappiness,
  chatQuotaLeft,
  emptyChatQuota,
  matchChatKeyword,
  rollChatQuotaDay,
} from "../src/companion/chat-template";

describe("matchChatKeyword (Doc 08 §5)", () => {
  it("keyword makan: id & en", () => {
    expect(matchChatKeyword("kamu udah makan?")).toBe("makan");
    expect(matchChatKeyword("LAPER banget nih")).toBe("makan");
    expect(matchChatKeyword("any food for you?")).toBe("makan");
    expect(matchChatKeyword("are you hungry")).toBe("makan");
  });

  it("keyword sayang & maaf", () => {
    expect(matchChatKeyword("aku sayang kamu")).toBe("sayang");
    expect(matchChatKeyword("I love you")).toBe("sayang");
    expect(matchChatKeyword("maaf ya kemarin")).toBe("maaf");
    expect(matchChatKeyword("sorry for yesterday")).toBe("maaf");
  });

  it("keyword siapa/nama", () => {
    expect(matchChatKeyword("siapa kamu?")).toBe("siapa");
    expect(matchChatKeyword("namamu apa")).toBe("siapa");
    expect(matchChatKeyword("what is your name")).toBe("siapa");
  });

  it("input kosong / tak dikenal → fallback", () => {
    expect(matchChatKeyword("")).toBe("fallback");
    expect(matchChatKeyword("cuaca hari ini bagus")).toBe("fallback");
  });
});

describe("anti-spam kuota happiness (Doc 08 §5: +2, maks 10/hari)", () => {
  it("5 chat pertama boleh (+2), ke-6 tidak lagi", () => {
    let quota = emptyChatQuota("2026-09-02");
    for (let i = 0; i < CHAT_HAPPINESS_DAILY_MAX / HAPPINESS_PER_CHAT; i++) {
      expect(canChatHappiness(quota)).toBe(true);
      quota = applyChatQuota(quota, true);
    }
    expect(quota.happinessToday).toBe(CHAT_HAPPINESS_DAILY_MAX);
    expect(canChatHappiness(quota)).toBe(false);
    // pesan tetap terhitung walau tanpa efek
    const next = applyChatQuota(quota, false);
    expect(next.happinessToday).toBe(CHAT_HAPPINESS_DAILY_MAX);
    expect(next.messagesToday).toBe(6);
  });

  it("rollover tanggal → kuota reset", () => {
    let quota = emptyChatQuota("2026-09-02");
    quota = applyChatQuota(quota, true);
    quota = applyChatQuota(quota, true);
    quota = rollChatQuotaDay(quota, "2026-09-03");
    expect(quota.happinessToday).toBe(0);
    expect(chatQuotaLeft(quota)).toBe(CHAT_HAPPINESS_DAILY_MAX);
  });

  it("sama hari → kuota tidak reset", () => {
    let quota = emptyChatQuota("2026-09-02");
    quota = applyChatQuota(quota, true);
    quota = rollChatQuotaDay(quota, "2026-09-02");
    expect(quota.happinessToday).toBe(HAPPINESS_PER_CHAT);
  });
});
