// Edge function: breeding antar-pemain asinkron (M8 - Doc 07 SS2B).
// POST { action: "send" | "inbox" | "accept" | "decline" | "claim", ... }
// Auth ringan: header x-hagumi-anon (UUID perangkat). Hasil telur dihitung
// dari SEED server saat kedua pihak sepakat - polling saat buka game.
//
// CATATAN BUNDLER: logika genetika & decode breeding code DI-INLINE di berkas
// ini. Jangan pindahkan ke _shared/ lalu diimpor dari sini - function yang
// menggabungkan esm.sh supabase-js + _shared/genetics.ts (langsung ataupun
// transitif) gagal boot di platform (BOOT_ERROR; diagnosa ping1-6, 03/09).
// Salinan tetap WAJIB identik dengan packages/core/src/online + src/breeding
// (Doc 07 SS3) - perbarui di tempat sama bila breeding.json berubah.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  errorJson,
  json,
  MAX_REQUESTS_PER_DAY,
  preflight,
  requireAnonId,
  utcDayStartIso,
} from "../_shared/http.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

// ===== Salinan packages/data/data/breeding.json - genetics =====
const PARENT_CHANCE = 0.7; // Doc 07 SS3: 70%
const MIX_CHANCE = 0.95; // 70-95% -> 25% mix, sisanya 5% mystic
const COLOR_MIX_PARENT_A = 0.6; // warna 60/40
const HUE_JITTER_DEG = 6; // +-6 deg
const PERSONALITY_INHERIT_CHANCE = 0.6; // 60% waris / 40% variasi
const START_BONUS_MIN_PCT = 1;
const START_BONUS_MAX_PCT = 4;
const START_BONUS_ELITE_PCT = 5;
const START_BONUS_ELITE_CARE_SCORE = 80;
/** Tabel kombinasi elemen mix - kunci "a+b" alfabetis (breeding.json). */
const MIX_TABLE: Record<string, string> = {
  "earth+fire": "wind",
  "earth+water": "wind",
  "earth+wind": "water",
  "fire+water": "earth",
  "fire+wind": "water",
  "water+wind": "fire",
};

const PET_ELEMENTS = ["fire", "water", "wind", "earth", "mystic"] as const;
type PetElement = (typeof PET_ELEMENTS)[number];

const ELEMENT_COAT: Record<PetElement, string> = {
  fire: "#E8874A",
  water: "#8FB6D9",
  wind: "#EFE3C0",
  earth: "#A98F5C",
  mystic: "#A98BC4",
};

function mixKey(a: string, b: string): string {
  return a < b ? a + "+" + b : b + "+" + a;
}

function getMixElement(a: string, b: string): string | null {
  return MIX_TABLE[mixKey(a, b)] ?? null;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(n: number): number {
  return Math.min(100, Math.max(0, n));
}

interface Hsv {
  h: number;
  s: number;
  v: number;
}

function hexToHsv(hex: string): Hsv {
  const m = /^#?([0-9A-Fa-f]{6})$/.exec(hex.trim());
  const int = m ? Number.parseInt(m[1]!, 16) : 0x888888;
  const r = ((int >> 16) & 0xff) / 255;
  const g = ((int >> 8) & 0xff) / 255;
  const b = (int & 0xff) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

function hsvToHex({ h, s, v }: Hsv): string {
  const hh = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = v - c;
  const rgb: [number, number, number] =
    hh < 60 ? [c, x, 0] :
    hh < 120 ? [x, c, 0] :
    hh < 180 ? [0, c, x] :
    hh < 240 ? [0, x, c] :
    hh < 300 ? [x, 0, c] : [c, 0, x];
  const to255 = (n: number) =>
    Math.round(clamp01((n + m) * 100) * 2.55)
      .toString(16)
      .padStart(2, "0");
  return "#" + to255(rgb[0]!) + to255(rgb[1]!) + to255(rgb[2]!);
}

function mixHsv(a: Hsv, b: Hsv, weightA: number): Hsv {
  const radA = (a.h * Math.PI) / 180;
  const radB = (b.h * Math.PI) / 180;
  const x = Math.cos(radA) * weightA + Math.cos(radB) * (1 - weightA);
  const y = Math.sin(radA) * weightA + Math.sin(radB) * (1 - weightA);
  let h = (Math.atan2(y, x) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { h, s: a.s * weightA + b.s * (1 - weightA), v: a.v * weightA + b.v * (1 - weightA) };
}

function mixCoatColors(colorA: string, colorB: string, next: () => number | null): string {
  const mixed = mixHsv(hexToHsv(colorA), hexToHsv(colorB), COLOR_MIX_PARENT_A);
  if (next && HUE_JITTER_DEG > 0) mixed.h += (next() * 2 - 1) * HUE_JITTER_DEG;
  return hsvToHex(mixed);
}

interface RolledGenetics {
  element: PetElement;
  personalityElement: PetElement;
  coatColor: string;
  startBonusPct: number;
  source: "parent" | "partner" | "mix" | "mutation";
}

/** Algoritma genetika inti (Doc 07 SS3) - identik dengan core rollChildGenetics. */
function rollChildGenetics(opts: {
  next: () => number;
  parentElement: PetElement;
  partnerElement: PetElement;
  parentCoat: string;
  partnerCoat: string;
  parentCareScore: number;
}): RolledGenetics {
  const r = opts.next();
  let element: PetElement;
  let source: RolledGenetics["source"];
  let elementGiver: PetElement | null = null;

  if (r < PARENT_CHANCE) {
    const fromParent = opts.next() < 0.5;
    element = fromParent ? opts.parentElement : opts.partnerElement;
    source = fromParent ? "parent" : "partner";
    elementGiver = element;
  } else if (r < MIX_CHANCE) {
    element = (getMixElement(opts.parentElement, opts.partnerElement) ?? opts.parentElement) as PetElement;
    source = "mix";
  } else {
    element = "mystic";
    source = "mutation";
  }

  let personalityElement: PetElement;
  if (elementGiver !== null && opts.next() < PERSONALITY_INHERIT_CHANCE) {
    personalityElement = elementGiver;
  } else {
    personalityElement = PET_ELEMENTS[Math.floor(opts.next() * PET_ELEMENTS.length)]!;
  }

  const coatColor = mixCoatColors(opts.parentCoat, opts.partnerCoat, opts.next);

  const startBonusPct =
    opts.parentCareScore >= START_BONUS_ELITE_CARE_SCORE
      ? START_BONUS_ELITE_PCT
      : START_BONUS_MIN_PCT + Math.floor(opts.next() * (START_BONUS_MAX_PCT + 1 - START_BONUS_MIN_PCT));

  return { element, personalityElement, coatColor, startBonusPct, source };
}

interface BreedingCodePayload {
  v: 1;
  owner: string;
  name: string;
  element: string;
  coatColor: string;
  personality: string;
  path: string;
  gen: number;
  careScore: number;
}

/** Genetika anak dari dua payload + seed - deterministik & simetris (Doc 07 SS3). */
function computeOnlineChildGenetics(
  a: BreedingCodePayload,
  b: BreedingCodePayload,
  seed: number,
): RolledGenetics {
  // Kanonisasi urutan induk: owner terkecil = induk A (bobot warna 60%).
  const first = a.owner <= b.owner ? a : b;
  const second = a.owner <= b.owner ? b : a;
  const next = mulberry32(seed >>> 0);
  return rollChildGenetics({
    next,
    parentElement: first.element as PetElement,
    partnerElement: second.element as PetElement,
    parentCoat: first.coatColor,
    partnerCoat: second.coatColor,
    parentCareScore: first.careScore,
  });
}

// ===== decode breeding code (salinan core online/breeding-code.ts) =====

const BREEDING_CODE_PREFIX = "HG1";
const B64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function b64UrlToBytes(s: string): Uint8Array | null {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of s) {
    const idx = B64URL.indexOf(ch);
    if (idx === -1) return null;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

function checksum4(s: string): string {
  return hashString(s).toString(16).padStart(8, "0").slice(0, 4);
}

function validPayload(p: unknown): p is BreedingCodePayload {
  if (typeof p !== "object" || p === null) return false;
  const o = p as Record<string, unknown>;
  return (
    o.v === 1 &&
    typeof o.owner === "string" && o.owner.length >= 8 && o.owner.length <= 64 &&
    typeof o.name === "string" && o.name.length >= 1 && o.name.length <= 12 &&
    typeof o.element === "string" &&
    typeof o.coatColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(o.coatColor) &&
    typeof o.personality === "string" &&
    typeof o.path === "string" && o.path.length >= 1 && o.path.length <= 24 &&
    typeof o.gen === "number" && Number.isInteger(o.gen) && o.gen >= 1 && o.gen <= 99 &&
    typeof o.careScore === "number" && o.careScore >= 0 && o.careScore <= 100
  );
}

function decodeBreedingCode(code: string): BreedingCodePayload | null {
  const parts = code.trim().replace(/\s+/g, "").split(".");
  if (parts.length !== 3 || parts[0]!.toUpperCase() !== BREEDING_CODE_PREFIX) return null;
  const b64 = parts[1]!;
  const check = parts[2]!;
  if (!b64 || !check || checksum4(b64) !== check.toLowerCase()) return null;
  const bytes = b64UrlToBytes(b64);
  if (!bytes) return null;
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return validPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

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

  // "inbox" & "send" menyertakan gen pet sendiri -> upsert pets_gen (tabel M8)
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
        .or("from_id.eq." + anonId + ",to_id.eq." + anonId)
        .in("status", ["pending", "ready"])
        .gte("created_at", new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString())
        .order("created_at", { ascending: false });
      if (error) return errorJson(error.message, 500);
      const requests = (data as RequestRow[]).map((r) => ({
        id: r.id,
        status: r.status,
        direction: r.from_id === anonId ? "outgoing" : "incoming",
        // outgoing -> partner = gen penerima (to_gen) bila sudah accept
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
      if (friend.owner === anonId) return errorJson("Itu kodemu sendiri");
      // Rate limit (anti-abuse): maks 5 request/hari - declined tidak dihitung.
      const { count } = await supabase
        .from("breeding_requests")
        .select("id", { count: "exact", head: true })
        .eq("from_id", anonId)
        .neq("status", "declined")
        .gte("created_at", utcDayStartIso());
      if ((count ?? 0) >= MAX_REQUESTS_PER_DAY) {
        return errorJson("Batas harian tercapai - coba lagi besok", 429);
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
      const inserted = await supabase
        .from("breeding_requests")
        .insert({ from_id: anonId, to_id: friend.owner, from_gen: myGen, status: "pending" })
        .select("id")
        .single();
      if (inserted.error) return errorJson(inserted.error.message, 500);
      return json({ requestId: (inserted.data as { id: string }).id });
    }

    // ===== Penerima setuju -> server mengunci seed & menyimpan gen penerima =====
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
        row.from_gen as unknown as BreedingCodePayload,
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

    // ===== Klaim telur oleh salah satu pihak (kedua klaim -> done) =====
    case "claim": {
      const id = String(body.requestId ?? "");
      const { data: rows, error } = await supabase
        .from("breeding_requests")
        .select("*")
        .eq("id", id)
        .or("from_id.eq." + anonId + ",to_id.eq." + anonId)
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
        // Hasil versi server (fallback klien: hitung ulang dari seed - identik)
        result: (row as unknown as { result?: Record<string, unknown> }).result ?? null,
      });
    }

    default:
      return errorJson("Action tidak dikenal");
  }
});
