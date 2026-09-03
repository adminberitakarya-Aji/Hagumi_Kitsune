/**
 * Helper jaringan adapter LLM (M9 — Doc 11 §2): POST JSON dengan timeout.
 * Timeout / HTTP error melempar Error → FallbackLlmProvider beralih ke Tier 1.
 */

/** POST JSON dengan AbortController — lempar Error bila HTTP non-2xx / timeout. */
export async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
  fetchImpl?: typeof fetch,
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await (fetchImpl ?? fetch)(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ""}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Ambil properti bertingkat dengan aman (payload provider beragam bentuk). */
export function pickPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split(".")) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}
