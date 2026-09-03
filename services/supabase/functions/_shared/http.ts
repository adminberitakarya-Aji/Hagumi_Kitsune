/**
 * Helper edge function (M8/M9): CORS + identitas terverifikasi + rate limit.
 * Klien memegang anon key + JWT Anonymous Auth (M9 keamanan): identitas berasal
 * dari `sub` JWT yang tanda tangannya SUDAH diverifikasi gateway Supabase
 * (verify_jwt = true) — tidak bisa dipalsukan seperti header self-asserted.
 */

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

/** Base64url decode payload JWT → objek (aman: tanda tangan sudah dicek gateway). */
function jwtPayload(token: string): Record<string, unknown> | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
    const json = atob(padded);
    const parsed: unknown = JSON.parse(json);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * Identitas terverifikasi: `Authorization: Bearer <JWT Supabase>` dari
 * Anonymous Auth (M9 keamanan). Gateway (verify_jwt = true) sudah memverifikasi
 * tanda tangan JWT sebelum function dipanggil — di sini cukup ambil `sub`.
 * Menggantikan header `x-hagumi-anon` self-asserted yang bisa dipalsukan.
 */
export function requireUserId(req: Request): string | null {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token.length < 20) return null;
  const payload = jwtPayload(token);
  const sub = payload?.sub;
  if (typeof sub !== "string" || sub.length < 8 || sub.length > 64) return null;
  return sub;
}

/** Batas request breeding per pemain per hari UTC (M8 anti-abuse). */
export const MAX_REQUESTS_PER_DAY = 5;

export function utcDayStartIso(now = new Date()): string {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return start.toISOString();
}