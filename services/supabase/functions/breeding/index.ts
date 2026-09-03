// Edge function: breeding antar-pemain asinkron (M8 — Doc 07 §2B).
// POST { action: "send" | "inbox" | "accept" | "decline" | "claim", ... }
// Auth ringan: header x-hagumi-anon (UUID perangkat). Hasil telur dihitung
// dari SEED server saat kedua pihak sepakat — polling saat buka game.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeOnlineChildGenetics } from "../_shared/genetics.ts";
import { decodeBreedingCode } from "../_shared/breeding-code.ts";
import {
  errorJson,
  MAX_REQUESTS_PER_DAY,
  preflight,
  requireAnonId,
  utcDayStartIso,
} from "../_shared/http.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

interface RequestRow {
  id: string;
  from_id: string;
  to_id: string;
  from_gen: Record<string, unknown>;
  to_gen: Record<string, unknown> | null;
  seed: number | null;
  status: string;
  claimed_by_from: boolean;
  claimed_by_to: boolean;
  created_at: string;
}

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
  const action = String(body.action ?? "");

  // "inbox" & "send" menyertakan gen pet sendiri → upsert pets_gen (tabel M8)
  const myCode = typeof body.code === "string" ? body.code : "";
  const myGen = myCode ? decodeBreedingCode(myCode) : null;

  switch (action) {
    // ===== Daftar permintaan aktif + sinkron profil/gen pemain =====
    case "inbox": {
      if (!myGen) return errorJson("Kode breeding tidak valid");
      await supabase.from("profiles").upsert({ anon_id: anonId, last_seen_at: new Date().toISOString() });
      await supabase.from("pets_gen").upsert({
        anon_id: anonId,
        gen: myGen,
        updated_at: new Date().toISOString(),
      });
      const { data, error } = await supabase
        .from("breeding_requests")
        .select("*")
        .or(`from_id.eq.${anonId},to_id.eq.${anonId}`)
        .in("status", ["pending", "ready"])
        .gte("created_at", new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString())
        .order("created_at", { ascending: false });
      if (error) return errorJson(error.message, 500);
      const requests = (data as RequestRow[]).map((r) => ({
        id: r.id,
        status: r.status,
        direction: r.from_id === anonId ? "outgoing" : "incoming",
        // outgoing → partner = gen penerima (to_gen) bila sudah accept
        partner: r.from_id === anonId ? r.to_gen : r.from_gen,
        seed: r.seed,
        createdAt: Date.parse(r.created_at),
      }));
      const { count } = await supabase
        .from("breeding_requests")
        .select("id", { count: "exact", head: true })
        .eq("from_id", anonId)
        .gte("created_at", utcDayStartIso());
      return json({ requests, sentToday: count ?? 0, maxPerDay: MAX_REQUESTS_PER_DAY });
    }

    // ===== Kirim request ke pemilik kode teman =====
    case "send": {
      if (!myGen) return errorJson("Kode breedingmu tidak valid");
      const friend = decodeBreedingCode(String(body.friendCode ?? ""));
      if (!friend) return errorJson("Kode teman tidak valid / terpotong");
      if (friend.owner === anonId) return errorJson("Itu kodemu sendiri 🦊");
      // Rate limit (anti-abuse): maks 5 request/hari — declined tidak dihitung.
      const { count } = await supabase
        .from("breeding_requests")
        .select("id", { count: "exact", head: true })
        .eq("from_id", anonId)
        .neq("status", "declined")
        .gte("created_at", utcDayStartIso());
      if ((count ?? 0) >= MAX_REQUESTS_PER_DAY) {
        return errorJson("Batas harian tercapai — coba lagi besok", 429);
      }
      // Cegah duplikat aktif ke pasangan yang sama
      const { data: dupes } = await supabase
        .from("breeding_requests")
        .select("id")
        .eq("from_id", anonId)
        .eq("to_id", friend.owner)
        .in("status", ["pending", "ready"])
        .limit(1);
      if ((dupes?.length ?? 0) > 0) return errorJson("Sudah ada permintaan aktif ke pemain ini");
      await supabase.from("profiles").upsert({ anon_id: anonId, last_seen_at: new Date().toISOString() });
      await supabase.from("profiles").upsert({ anon_id: friend.owner });
      await supabase.from("pets_gen").upsert({ anon_id: anonId, gen: myGen, updated_at: new Date().toISOString() });
      const { data, error } = await supabase
        .from("breeding_requests")
        .insert({ from_id: anonId, to_id: friend.owner, from_gen: myGen, status: "pending" })
        .select("id")
        .single();
      if (error) return errorJson(error.message, 500);
      return json({ requestId: (data as { id: string }).id });
    }

    // ===== Penerima setuju → server mengunci seed & menyimpan gen penerima =====
    case "accept": {
      if (!myGen) return errorJson("Kode breedingmu tidak valid");
      const { data: rows, error } = await supabase
        .from("breeding_requests")
        .select("*")
        .eq("id", String(body.requestId ?? ""))
        .eq("to_id", anonId)
        .eq("status", "pending")
        .limit(1);
      if (error) return errorJson(error.message, 500);
      const row = (rows as RequestRow[])[0];
      if (!row) return errorJson("Permintaan tidak ditemukan / sudah diproses", 404);
      const seed = crypto.getRandomValues(new Uint32Array(1))[0]!;
      // Cocokkan gen server-side: kedua klien menghitung anak yang SAMA dari seed ini.
      const child = computeOnlineChildGenetics(
        row.from_gen as unknown as Parameters<typeof computeOnlineChildGenetics>[0],
        myGen,
        seed,
      );
      await supabase
        .from("breeding_requests")
        .update({ status: "ready", seed, to_gen: myGen, result: child, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      await supabase.from("pets_gen").upsert({ anon_id: anonId, gen: myGen, updated_at: new Date().toISOString() });
      return json({ ok: true, seed });
    }

    // ===== Penerima menolak =====
    case "decline": {
      const { error } = await supabase
        .from("breeding_requests")
        .update({ status: "declined", updated_at: new Date().toISOString() })
        .eq("id", String(body.requestId ?? ""))
        .eq("to_id", anonId)
        .eq("status", "pending");
      if (error) return errorJson(error.message, 500);
      return json({ ok: true });
    }

    // ===== Klaim telur oleh salah satu pihak (kedua klaim → done) =====
    case "claim": {
      const id = String(body.requestId ?? "");
      const { data: rows, error } = await supabase
        .from("breeding_requests")
        .select("*")
        .eq("id", id)
        .or(`from_id.eq.${anonId},to_id.eq.${anonId}`)
        .eq("status", "ready")
        .limit(1);
      if (error) return errorJson(error.message, 500);
      const row = (rows as RequestRow[])[0];
      if (!row) return errorJson("Hasil tidak ditemukan / sudah diklaim", 404);
      const isFrom = row.from_id === anonId;
      const patch = isFrom ? { claimed_by_from: true } : { claimed_by_to: true };
      const otherClaimed = isFrom ? row.claimed_by_to : row.claimed_by_from;
      await supabase
        .from("breeding_requests")
        .update({
          ...patch,
          status: otherClaimed ? "done" : "ready",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      return json({
        ok: true,
        seed: row.seed,
        partner: isFrom ? row.to_gen : row.from_gen,
        // Hasil versi server (fallback klien: hitung ulang dari seed — identik)
        result: (row as unknown as { result?: Record<string, unknown> }).result ?? null,
      });
    }

    default:
      return errorJson("Action tidak dikenal");
  }
});

