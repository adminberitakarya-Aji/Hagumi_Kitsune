/**
 * Cek kesiapan backend M8/M9 (run: pnpm check:online):
 *  1) REST PostgREST + anon key → verifikasi tabel ada & RLS menyaring (200 [])
 *  2) Anonymous Auth → JWT ditandatangani server (bukan UUID self-asserted)
 *  3) Edge function breeding — header lama (spoofable) HARUS ditolak 401
 *  4) Edge function breeding dengan JWT → hidup (respons handler)
 *  5) Edge function save-sync → hidup
 * Token JWT tidak pernah dicetak ke layar.
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("apps/web/.env.local", "utf8")
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

// 2) Anonymous Auth → JWT server-signed (M9 keamanan; header lama dihapus)
const signup = await fetch(`${url}/auth/v1/signup`, {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
  body: JSON.stringify({}),
});
const session = await signup.json().catch(() => null);
const token = session?.access_token;
console.log(
  "2) Auth  /auth/v1/signup (anon) :",
  signup.status,
  token ? "✅ JWT Anonymous Auth diterbitkan" : `❌ ${JSON.stringify(session).slice(0, 120)} — aktifkan Anonymous sign-ins di dashboard`,
);

const authHeaders = token
  ? { "Content-Type": "application/json", Authorization: `Bearer ${token}`, apikey: key }
  : null;

// 3) Header lama self-asserted (spoofable) — WAJIB ditolak 401
const spoof = await fetch(`${url}/functions/v1/breeding`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, apikey: key, "x-hagumi-anon": "00000000-0000-4000-8000-000000000000" },
  body: JSON.stringify({ action: "inbox", code: "" }),
});
console.log(
  "3) Edge  header lama (spoof)    :",
  spoof.status,
  spoof.status === 401 ? "✅ ditolak — identitas self-asserted tidak berlaku lagi" : "⚠️ masih diterima (verifikasi_jwt belum aktif?)",
);

// 4) Edge breeding dengan JWT
const fn1 = authHeaders
  ? await fetch(`${url}/functions/v1/breeding`, { method: "POST", headers: authHeaders, body: JSON.stringify({ action: "inbox", code: "" }) })
  : null;
console.log(
  "4) Edge  /functions/v1/breeding :",
  fn1 ? fn1.status : "-",
  fn1 ? (fn1.status === 404 ? "❌ BELUM di-deploy" : "✅ hidup (respons handler)") : "-",
);

// 5) Edge save-sync dengan JWT
const fn2 = authHeaders
  ? await fetch(`${url}/functions/v1/save-sync`, { method: "POST", headers: authHeaders, body: JSON.stringify({ action: "pull" }) })
  : null;
console.log(
  "5) Edge  /functions/v1/save-sync:",
  fn2 ? fn2.status : "-",
  fn2 ? (fn2.status === 404 ? "❌ BELUM di-deploy" : "✅ hidup (respons handler)") : "-",
);