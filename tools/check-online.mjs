/**
 * Cek kesiapan backend M8 (run: pnpm check:online):
 *  1) REST PostgREST + anon key → verifikasi tabel ada & RLS menyaring (200 [])
 *  2) POST /functions/v1/breeding  → 404 berarti function belum di-deploy
 *  3) POST /functions/v1/save-sync → idem
 * Anon key tidak pernah dicetak ke layar.
 */
import { readFileSync } from "node:fs";

const raw = readFileSync("apps/web/.env.local", "utf8");
const env = Object.fromEntries(
  raw
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const url = env.VITE_SUPABASE_URL?.replace(/\/+$/, "");
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.log("❌ apps/web/.env.local belum lengkap — isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY");
  process.exit(1);
}
console.log("Proyek:", url);

// 1) REST: tabel profiles + RLS (tanpa policy publik → baris tersaring, tetap 200)
const rest = await fetch(`${url}/rest/v1/profiles?select=anon_id`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
console.log(
  "1) REST  /rest/v1/profiles      :",
  rest.status,
  rest.ok ? "✅ tabel ada — anon key diterima (RLS menyaring baris)" : `❌ ${(await rest.text()).slice(0, 120)}`,
);

// 2) Edge function breeding (header anon invalid → harus 401 bila deployed)
const anon = "00000000-0000-4000-8000-000000000000";
const fn1 = await fetch(`${url}/functions/v1/breeding`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key, "x-hagumi-anon": anon },
  body: JSON.stringify({ action: "inbox", code: "" }),
});
const t1 = await fn1.text();
console.log(
  "2) Edge  /functions/v1/breeding :",
  fn1.status,
  fn1.status === 404
    ? "❌ BELUM di-deploy → supabase functions deploy breeding"
    : fn1.status === 401 && t1.includes("anon")
      ? "✅ deployed (tolak header anon kosong — wajar)"
      : t1.slice(0, 120),
);

// 3) Edge function save-sync
const fn2 = await fetch(`${url}/functions/v1/save-sync`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key, "x-hagumi-anon": anon },
  body: JSON.stringify({ action: "pull" }),
});
const t2 = await fn2.text();
console.log(
  "3) Edge  /functions/v1/save-sync:",
  fn2.status,
  fn2.status === 404
    ? "❌ BELUM di-deploy → supabase functions deploy save-sync"
    : fn2.status === 401 && t2.includes("anon")
      ? "✅ deployed (tolak header anon kosong — wajar)"
      : t2.slice(0, 120),
);
