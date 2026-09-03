/**
 * Test kontrak M9 (Doc 11 §2): SATU test untuk SEMUA adapter
 * (offline, openai, gemini, ollama, edge) — balasan kontrak, efek Tier 1
 * konsisten, fallback jaringan, dan konsistensi "jiwa" 5 elemen lintas
 * provider (DoD M9). Jaringan disimulasikan via fetchImpl.
 */
import { describe, expect, it, vi } from "vitest";
import {
  CHAT_HAPPINESS_DAILY_MAX,
  PERSONALITY_CARDS,
  emptyChatQuota,
  type ChatContext,
  type ILlmProvider,
  type IRng,
} from "@hagumi/core";
import {
  EdgeLlmProvider,
  FallbackLlmProvider,
  GeminiLlmProvider,
  OfflineLlmProvider,
  OllamaLlmProvider,
  OpenAiLlmProvider,
} from "../src";

const DAY = "2026-09-03";
const OFFLINE_RNG: IRng = {
  next: () => 0.5,
  int: (a, _b) => a,
  pick: <T,>(items: readonly T[]) => items[0],
};

const POOLS = {
  makan: { hungerLow: ["Kyuu... laper..."], hungerMid: ["Kyuu~ cukup kok"], hungerFull: ["Kenyang! Master!"] },
  sayang: ["Kyuu~ sayang juga!"],
  maaf: ["Kyuu... sudah dimaafkan"],
  siapa: ["Aku {name}, kitsune-mu!"],
  fallback: ["Kyuu~!"],
};

function contextOf(overrides: Partial<ChatContext> = {}): ChatContext {
  return {
    petName: "Kogitsune",
    element: "fire",
    path: "zenko",
    stats: { hunger: 40, happiness: 70, energy: 60, hygiene: 55, health: 90 },
    phase: "evening",
    season: "autumn",
    ageDays: 23,
    memoryLog: [{ t: Date.now() - 3600_000, key: "starved", detail: "pemain lupa makan 6 jam" }],
    hasUnforgivenNeglect: true,
    chatQuota: emptyChatQuota(DAY),
    day: DAY,
    ...overrides,
  };
}

/** Fetch palsu: bentuk respons JSON sesuai tiap provider. */
function okFetch(shape: () => unknown): typeof fetch {
  return vi.fn(async () => new Response(JSON.stringify(shape()), { status: 200 })) as unknown as typeof fetch;
}

/** Fetch yang selalu gagal (simulasi internet mati). */
const failFetch = vi.fn(async () => {
  throw new Error("jaringan putus");
}) as unknown as typeof fetch;

function captureFetch(bodies: unknown[], shape: () => unknown): typeof fetch {
  return vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
    if (init?.body) bodies.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify(shape()), { status: 200 });
  }) as unknown as typeof fetch;
}

function makeProviders(): Array<[string, ILlmProvider]> {
  const openaiFetch = okFetch(() => ({ choices: [{ message: { content: "OpenAI jawab singkat. Coba juga!" } }] }));
  const geminiFetch = okFetch(() => ({ candidates: [{ content: { parts: [{ text: "Gemini jawab singkat. Dua!" }] } }] }));
  const ollamaFetch = okFetch(() => ({ message: { content: "Ollama jawab singkat!" } }));
  const edgeFetch = okFetch(() => ({ text: "Edge jawab singkat!", provider: "openai" }));
  return [
    ["offline", new OfflineLlmProvider(POOLS, OFFLINE_RNG)],
    ["openai", new OpenAiLlmProvider({ endpoint: "https://api.test/v1/chat", model: "gpt-test", apiKey: "sk-test", maxTokens: 120, timeoutMs: 1000, fetchImpl: openaiFetch })],
    ["gemini", new GeminiLlmProvider({ endpoint: "https://api.test/gemini", model: "gemini-test", apiKey: "gk", maxTokens: 120, timeoutMs: 1000, fetchImpl: geminiFetch })],
    ["ollama", new OllamaLlmProvider({ endpoint: "http://localhost:11434", model: "llama", maxTokens: 120, timeoutMs: 1000, fetchImpl: ollamaFetch })],
    ["edge", new EdgeLlmProvider({ url: "https://supabase.test", anonKey: "ak", anonId: "11111111-1111-1111-1111-111111111111", timeoutMs: 1000, fetchImpl: edgeFetch })],
  ];
}

describe("M9 — Kontrak ILlmProvider sama untuk semua adapter (Doc 11 §2)", () => {
  const providers = makeProviders();

  it.each(providers)("%s — balasan memenuhi kontrak (text/keyword/quota)", async (_n, provider) => {
    const reply = await provider.chat({ text: "halo kyu~", context: contextOf() });
    expect(typeof reply.text).toBe("string");
    expect(reply.text.length).toBeGreaterThan(0);
    expect(reply.text.length).toBeLessThanOrEqual(240);
    expect(["makan", "sayang", "maaf", "siapa", "fallback"]).toContain(reply.keyword);
    expect(reply.chatQuota.messagesToday).toBe(1);
    expect(reply.chatQuota.day).toBe(DAY);
  });

  it.each(providers)("%s — efek Tier 1 konsisten: sayang → +2 terkuota", async (_n, provider) => {
    const reply = await provider.chat({ text: "sayang", context: contextOf() });
    expect(reply.happiness).toBe(2);
    expect(reply.chatQuota.happinessToday).toBe(2);
    // kuota habis → tetap jawab, happiness 0 (chat bukan sumber stat — Doc 08 §5)
    const exhausted = contextOf({
      chatQuota: { day: DAY, happinessToday: CHAT_HAPPINESS_DAILY_MAX, messagesToday: 20 },
    });
    const reply2 = await provider.chat({ text: "sayang", context: exhausted });
    expect(reply2.happiness).toBe(0);
  });

  it.each(providers)("%s — maaf → memaafkan lalai tercatat", async (_n, provider) => {
    const reply = await provider.chat({ text: "maaf", context: contextOf() });
    expect(reply.forgave).toBe(true);
  });
});

describe("M9 — Fallback otomatis Tier 2 → Tier 1 (Doc 11 §2)", () => {
  it("provider utama gagal → balasan Tier 1 tanpa crash + callback dipanggil", async () => {
    const onFallback = vi.fn();
    const failing = new OpenAiLlmProvider({
      endpoint: "https://api.test", model: "m", apiKey: "k", maxTokens: 120, timeoutMs: 1000, fetchImpl: failFetch,
    });
    const chain = new FallbackLlmProvider(failing, new OfflineLlmProvider(POOLS, OFFLINE_RNG), onFallback);
    const reply = await chain.chat({ text: "halo", context: contextOf() });
    expect(reply.text.length).toBeGreaterThan(0);
    expect(onFallback).toHaveBeenCalledTimes(1);
  });
});

describe("M9 — Konsistensi 'jiwa' 5 elemen × 3 provider (DoD)", () => {
  const captured: { openai: unknown[]; gemini: unknown[]; ollama: unknown[] } = {
    openai: [],
    gemini: [],
    ollama: [],
  };
  const LLM: Array<[string, ILlmProvider]> = [
    ["openai", new OpenAiLlmProvider({ endpoint: "https://api.test", model: "m", apiKey: "k", maxTokens: 120, timeoutMs: 1000, fetchImpl: captureFetch(captured.openai, () => ({ choices: [{ message: { content: "ok" } }] })) })],
    ["gemini", new GeminiLlmProvider({ endpoint: "https://api.test", model: "m", apiKey: "k", maxTokens: 120, timeoutMs: 1000, fetchImpl: captureFetch(captured.gemini, () => ({ candidates: [{ content: { parts: [{ text: "ok" }] } }] })) })],
    ["ollama", new OllamaLlmProvider({ endpoint: "http://localhost", model: "m", maxTokens: 120, timeoutMs: 1000, fetchImpl: captureFetch(captured.ollama, () => ({ message: { content: "ok" } })) })],
  ];

  it.each(Object.keys(PERSONALITY_CARDS).map((k) => [k]))(
    "elemen %s — system prompt identik di openai/gemini/ollama",
    async (element) => {
      // kosongkan isi array tanpa mengganti referensi (mock memegang referensi lama)
      for (const arr of Object.values(captured)) arr.length = 0;
      for (const [, provider] of LLM) {
        const reply = await provider.chat({ text: "halo", context: contextOf({ element }) });
        expect(reply.text).toBe("ok");
      }
      const card = PERSONALITY_CARDS[element]!;
      // system prompt identik lintas provider (dibangun oleh core builder)
      const sys = (body: unknown): string => {
        const b = body as Record<string, unknown>;
        if ("messages" in b) {
          return String((b.messages as Array<{ content: string }>)[0]?.content ?? "");
        }
        const si = (b as { systemInstruction?: { parts: Array<{ text: string }> } }).systemInstruction;
        return String(si?.parts[0]?.text ?? "");
      };
      const prompts = [
        ...captured.openai!.map((b) => sys(b)),
        ...captured.gemini!.map((b) => sys(b)),
        ...captured.ollama!.map((b) => sys(b)),
      ];
      expect(prompts.length).toBe(3);
      expect(new Set(prompts).size).toBe(1);
      expect(prompts[0]).toContain(card.traits);
      expect(prompts[0]).toContain("Maksimal 2 kalimat");
    },
  );
});