// Edge function: backup save ke awan (M8 — sinkronisasi opsional, Doc 09 §4 & §7).
// POST { action: "push" | "pull", save?, lastTick? }
// Konflik ditangani klien (last-write-wins + diff warning); server hanya menyimpan
// versi dengan lastTick >= yang tersimpan.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorJson, json, preflight, requireAnonId } from "../_shared/http.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

Deno.serve(async (req: Request) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return errorJson("Metode harus POST", 405);

  const anonId = requireAnonId(req);
  if (!anonId) return errorJson("Header x-hagumi-anon tidak valid", 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorJson("Body JSON tidak valid");
  }

  await supabase.from("profiles").upsert({ anon_id: anonId, last_seen_at: new Date().toISOString() });

  if (body.action === "push") {
    const save = body.save;
    const lastTick = Number(body.lastTick ?? 0);
    if (typeof save !== "object" || save === null || !Number.isFinite(lastTick)) {
      return errorJson("save / lastTick tidak valid");
    }
    // LWW server-side: tolak push yang lebih tua dari yang tersimpan.
    const { data: existing } = await supabase
      .from("save_backups")
      .select("last_tick")
      .eq("anon_id", anonId)
      .limit(1);
    const existingTick = (existing?.[0] as { last_tick?: number } | undefined)?.last_tick ?? 0;
    if (lastTick < existingTick) {
      return json({ ok: false, reason: "STALE", serverLastTick: existingTick });
    }
    const { error } = await supabase.from("save_backups").upsert({
      anon_id: anonId,
      save,
      last_tick: lastTick,
      updated_at: new Date().toISOString(),
    });
    if (error) return errorJson(error.message, 500);
    return json({ ok: true });
  }

  if (body.action === "pull") {
    const { data, error } = await supabase
      .from("save_backups")
      .select("save, last_tick")
      .eq("anon_id", anonId)
      .limit(1);
    if (error) return errorJson(error.message, 500);
    const row = data?.[0] as { save: unknown; last_tick: number } | undefined;
    return json({ save: row?.save ?? null, lastTick: row?.last_tick ?? 0 });
  }

  return errorJson("Action tidak dikenal");
});
