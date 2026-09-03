/**
 * Adapter Supabase web (M8 — Doc 09 §1: ports & adapters).
 * Satu-satunya tempat web memanggil edge function breeding/save-sync.
 * Tanpa konfigurasi VITE_SUPABASE_* → fitur online nonaktif mulus, game lokal utuh.
 */

export interface OnlineConfig {
  url: string;
  anonKey: string;
}

export type OnlineResult<T> = { ok: true; data: T } | { ok: false; error: string };

/** null = Supabase belum dikonfigurasi (fitur online nonaktif — DoD M8). */
export function getOnlineConfig(): OnlineConfig | null {
  const env = import.meta.env as Record<string, string | undefined>;
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url: url.replace(/\/+$/, ""), anonKey };
}

const ANON_ID_KEY = "hagumi_anon_id";

/** UUID perangkat — identitas ringan (anon → akun opsional belakangan). */
export function getOrCreateAnonId(): string {
  let id = localStorage.getItem(ANON_ID_KEY);
  if (!id || !/^[0-9a-f-]{8,64}$/i.test(id)) {
    id = crypto.randomUUID();
    localStorage.setItem(ANON_ID_KEY, id);
  }
  return id;
}

const SENT_KEY = "hagumi_online_sent";

/** Penghitung harian sisi klien untuk tampilan kuota (server menegakkan batas). */
export function readSentToday(dayKey: string): number {
  try {
    const raw = JSON.parse(localStorage.getItem(SENT_KEY) ?? "") as { day?: string; count?: number };
    return raw.day === dayKey ? (raw.count ?? 0) : 0;
  } catch {
    return 0;
  }
}

export function bumpSentToday(dayKey: string): number {
  const count = readSentToday(dayKey) + 1;
  localStorage.setItem(SENT_KEY, JSON.stringify({ day: dayKey, count }));
  return count;
}

async function callFunction<T>(
  config: OnlineConfig,
  fn: "breeding" | "save-sync",
  body: Record<string, unknown>,
): Promise<OnlineResult<T>> {
  try {
    const res = await fetch(`${config.url}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.anonKey}`,
        apikey: config.anonKey,
        "x-hagumi-anon": getOrCreateAnonId(),
      },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        typeof data === "object" && data !== null && "error" in data
          ? String((data as { error: unknown }).error)
          : `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    return { ok: true, data: data as T };
  } catch {
    // Tanpa jaringan / CORS → degradasi mulus (DoD M8)
    return { ok: false, error: "Tidak ada koneksi ke server" };
  }
}

export interface InboxResponse {
  requests: Array<{
    id: string;
    status: string;
    direction: "incoming" | "outgoing";
    partner: Record<string, unknown> | null;
    seed: number | null;
    createdAt: number;
  }>;
  sentToday: number;
  maxPerDay: number;
}

export const onlineApi = {
  inbox: (config: OnlineConfig, code: string): Promise<OnlineResult<InboxResponse>> =>
    callFunction<InboxResponse>(config, "breeding", { action: "inbox", code }),
  send: (config: OnlineConfig, code: string, friendCode: string): Promise<OnlineResult<{ requestId: string }>> =>
    callFunction(config, "breeding", { action: "send", code, friendCode }),
  accept: (config: OnlineConfig, code: string, requestId: string): Promise<OnlineResult<{ ok: boolean }>> =>
    callFunction(config, "breeding", { action: "accept", code, requestId }),
  decline: (config: OnlineConfig, requestId: string): Promise<OnlineResult<{ ok: boolean }>> =>
    callFunction(config, "breeding", { action: "decline", requestId }),
  claim: (
    config: OnlineConfig,
    requestId: string,
  ): Promise<OnlineResult<{ ok: boolean; seed: number | null; partner: Record<string, unknown> | null }>> =>
    callFunction(config, "breeding", { action: "claim", requestId }),
  push: (config: OnlineConfig, save: unknown, lastTick: number): Promise<OnlineResult<{ ok: boolean }>> =>
    callFunction(config, "save-sync", { action: "push", save, lastTick }),
  pull: (config: OnlineConfig): Promise<OnlineResult<{ save: unknown; lastTick: number }>> =>
    callFunction(config, "save-sync", { action: "pull" }),
};
