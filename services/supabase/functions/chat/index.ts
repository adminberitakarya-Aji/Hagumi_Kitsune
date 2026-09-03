// Edge function: proxy LLM untuk chat companion (M9 — Doc 11 §2 & §4).
// POST { payload: LlmChatPayload } → { text, provider }
// - API key provider HANYA di secrets server-side (OPENAI_API_KEY / GEMINI_API_KEY).
// - Kuota harian server-side: tabel chat_quota (tanpa menyimpan konten chat —
//   privasi Doc 11 §4; retensi >24 jam trivially terpenuhi).
// - Provider dipilih dari secrets yang tersedia; LLM_PROVIDER env bisa memaksa.
// - Payload "jiwa" dibangun klien oleh core buildChatPayload — edge hanya proxy.
// - Endpoint/model salinan data/llm.json (wajib identik — Doc 11 §5).
import { errorJson, json, preflight, requireUserId } from "../_shared/http.ts";

const DAILY_QUOTA = 10;
const MAX_TOKENS_CAP = 200;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL_DEFAULT = "gpt-4o-mini";
const GEMINI_MODEL_DEFAULT = "gemini-1.5-flash";
const OLLAMA_ENDPOINT_DEFAULT = "http://localhost:11434";
const OLLAMA_MODEL_DEFAULT = "llama3.2";

interface HistoryMsg {
  from: "player" | "pet";
  text: string;
}

interface ChatPayload {
  systemPrompt: string;
  personality: { element: string; traits: string; style: string };
  memorySummary: string;
  context: { petName: string; element: string; path: string; phase: string; season: string; ageDays: number };
  guardrails: string[];
  history: HistoryMsg[];
  text: string;
  provider: string;
  maxTokens: number;
}

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return errorJson("Metode harus POST", 405);

  const userId = requireUserId(req);
  if (!userId) return errorJson("Sesi tidak valid — muat ulang halaman", 401);

  let body: { payload?: ChatPayload };
  try {
    body = await req.json();
  } catch {
    return errorJson("Body JSON tidak valid");
  }
  const payload = body.payload;
  if (
    !payload ||
    typeof payload.systemPrompt !== "string" ||
    typeof payload.text !== "string" ||
    payload.text.length === 0
  ) {
    return errorJson("payload chat tidak valid");
  }

  // ===== Kuota harian server-side ATOMIC via RPC (Doc 11 §5 + fix race) =====
  // consume_chat_quota melakukan increment atomik di Postgres dan mengembalikan
  // false bila kuota harian habis — tidak ada jeda read-then-write.
  const rpcRes = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/rest/v1/rpc/consume_chat_quota`,
    {
      method: "POST",
      headers: restHeaders(),
      body: JSON.stringify({ p_owner: userId, p_max: DAILY_QUOTA }),
    },
  );
  if (!rpcRes.ok) {
    return errorJson("Kuota tidak bisa dicek (tabel chat_quota belum dibuat?)", 500);
  }
  const allowed = (await rpcRes.json()) === true;
  if (!allowed) {
    return json({ error: "Kuota LLM harian habis — beralih Tier 1", quotaLeft: 0 }, 429);
  }

  // ===== Proxy ke provider (urutan fallback dari secrets yang tersedia) =====
  const requested = payload.provider;
  const order: string[] =
    requested === "ollama" ? ["ollama", "openai", "gemini"]
    : requested === "gemini" ? ["gemini", "openai"]
    : ["openai", "gemini"];
  const maxTokens = Math.min(payload.maxTokens || 120, MAX_TOKENS_CAP);
  let text: string | null = null;
  let usedProvider = "";
  let lastError = "";

  for (const id of order) {
    try {
      if (id === "openai") {
        const key = Deno.env.get("OPENAI_API_KEY");
        if (!key) { lastError = "OPENAI_API_KEY tidak diset"; continue; }
        text = await callOpenAi(key, payload, maxTokens);
        usedProvider = "openai";
      } else if (id === "gemini") {
        const key = Deno.env.get("GEMINI_API_KEY");
        if (!key) { lastError = "GEMINI_API_KEY tidak diset"; continue; }
        text = await callGemini(key, payload, maxTokens);
        usedProvider = "gemini";
      } else {
        const base = Deno.env.get("OLLAMA_ENDPOINT") ?? OLLAMA_ENDPOINT_DEFAULT;
        text = await callOllama(base, payload, maxTokens);
        usedProvider = "ollama";
      }
      break;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  if (text === null || usedProvider === "") {
    return errorJson(`Provider LLM gagal: ${lastError || "tidak ada yang tersedia"}`, 502);
  }
  return json({ text, provider: usedProvider });
});

function restHeaders(): Record<string, string> {
  return {
    apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""}`,
    "Content-Type": "application/json",
  };
}

function historyMessages(payload: ChatPayload): Array<{ role: string; content: string }> {
  return [
    ...payload.history.map((h) => ({
      role: h.from === "player" ? "user" : "assistant",
      content: h.text,
    })),
    { role: "user", content: payload.text },
  ];
}

async function callOpenAi(key: string, payload: ChatPayload, maxTokens: number): Promise<string> {
  const res = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MODEL") ?? OPENAI_MODEL_DEFAULT,
      messages: [{ role: "system", content: payload.systemPrompt }, ...historyMessages(payload)],
      max_tokens: maxTokens,
      temperature: 0.8,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data = await res.json();
  return String(data.choices?.[0]?.message?.content ?? "");
}

async function callGemini(key: string, payload: ChatPayload, maxTokens: number): Promise<string> {
  const model = Deno.env.get("GEMINI_MODEL") ?? GEMINI_MODEL_DEFAULT;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: payload.systemPrompt }] },
      contents: payload.history
        .map((h) => ({
          role: h.from === "player" ? "user" : "model",
          parts: [{ text: h.text }],
        }))
        .concat([{ role: "user", parts: [{ text: payload.text }] }]),
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  return String(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
}

async function callOllama(base: string, payload: ChatPayload, maxTokens: number): Promise<string> {
  const res = await fetch(`${base.replace(/\/+$/, "")}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("OLLAMA_MODEL") ?? OLLAMA_MODEL_DEFAULT,
      messages: [{ role: "system", content: payload.systemPrompt }, ...historyMessages(payload)],
      stream: false,
      options: { num_predict: maxTokens, temperature: 0.8 },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  return String(data.message?.content ?? "");
}