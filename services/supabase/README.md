# M8 — Supabase: Breeding Online & Cloud Backup 🌐

Backend tipis HAGUMI (Doc 07 §2B, Doc 09 §7). Tidak ada real-time server:
pemain tukar **Breeding Code**, request disimpan di tabel, hasil telur dihitung
dari **seed** yang dikunci server saat kedua pihak sepakat — keduanya menghitung
genetika yang sama secara lokal (polling saat buka game).

## Struktur

```
services/supabase/
├─ config.toml                  # konfigurasi CLI
├─ migrations/0001_init.sql     # profiles · pets_gen · breeding_requests · save_backups + RLS
└─ functions/
   ├─ _shared/http.ts           # CORS · auth anon-id · rate limit
   ├─ breeding/index.ts         # send · inbox · accept · decline · claim
   │                            #   (genetika & decode DI-INLINE — lihat catatan di berkas)
   └─ save-sync/index.ts        # push · pull (LWW server-side)
```

> ⚠️ **Catatan bundler:** function yang menggabungkan import esm.sh supabase-js dengan
> modul lokal yang menarik `_shared/genetics.ts` mengalami `BOOT_ERROR` di platform
> (diagnosa 03/09). Karena itu `breeding/index.ts` satu-berkas-mandiri: salinan
> algoritma genetika & decode breeding code **inline** di dalamnya dan WAJIB
> identik dengan `packages/core/src/online` + `packages/data/data/breeding.json`.

## Verifikasi cepat

```bash
pnpm check:online   # REST + kedua edge function hidup?
pnpm e2e:online     # simulasi 2 pemain: tukar kode → telur → klaim + cloud backup
```

## Setup (sekali)

```bash
npm i -g supabase          # atau: brew install supabase/tap/supabase
cd services/supabase
supabase init              # bila belum ada
supabase link --project-ref <REF>
supabase db push           # jalankan migrations/
supabase functions deploy breeding
supabase functions deploy save-sync
```

Salin URL + anon key proyek ke env aplikasi web:

```bash
cp apps/web/.env.example apps/web/.env.local   # lalu isi nilainya
```

```dotenv
VITE_SUPABASE_URL=https://<REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

**Tanpa kedua variabel ini (atau masih kosong) game tetap utuh** — fitur online otomatis
nonaktif mulus (DoD M8: "Tanpa koneksi: fitur online nonaktif mulus").

## Keamanan

- Klien hanya memegang **anon key**; semua akses tabel lewat edge function
  dengan `SUPABASE_SERVICE_ROLE_KEY` (server-only, diset Supabase otomatis).
- **RLS aktif tanpa policy publik** → akses langsung klien ke tabel = DENY.
- Identitas: header `x-hagumi-anon` (UUID perangkat, dibuat sekali di localStorage).
- Rate limit: maks **5 request breeding/hari** per pemain (server-side, `_shared/http.ts`).

## Uji e2e dua pemain (DoD M8)

1. Deploy seperti di atas; buka game di dua browser/profil berbeda.
2. Pemain A: Breeding House → 🌐 Tukar Kode → salin kode `HG1.…`.
3. Pemain B: tempel kode A → kirim. Pemain B melihat request di inbox → **Terima**.
4. Server mengunci seed → keduanya buka menu → kartu **🥚 Hasil siap** muncul.
5. Keduanya **Klaim Telur** → telur turunan muncul di altar masing-masing,
   genetika anak identik di kedua sisi (elemen/warna/kepribadian).
6. Uji rate limit: kirim >5 request/hari → ditolak 429.
7. Cloud backup: Pengaturan → ☁️ Unggah ke Awan di A; di B → Tarik → muncul
   diff warning → pilih data awan → save A dipulihkan.
