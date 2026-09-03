/**
 * Helper edge function (M8): CORS + auth anon-id + rate limit (anti-abuse).
 * Klien HANYA memegang anon key; akses data via service role di dalam function.
 */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-hagumi-anon",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function preflight(req: Request): Response | null {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  return null;
}

/**
 * Identitas ringan: header `x-hagumi-anon` berisi UUID yang dibuat klien
 * sekali per perangkat (auth opsional — akun datang belakangan).
 */
export function requireAnonId(req: Request): string | null {
  const id = req.headers.get("x-hagumi-anon") ?? "";
  if (!/^[0-9a-fA-F-]{8,64}$/.test(id)) return null;
  return id;
}

/** Batas request breeding per pemain per hari UTC (M8 anti-abuse). */
export const MAX_REQUESTS_PER_DAY = 5;

export function utcDayStartIso(now = new Date()): string {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return start.toISOString();
}
