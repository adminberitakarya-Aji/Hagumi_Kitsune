-- M9 — Companion LLM Tier 2: kuota harian server-side (Doc 11 §4–5).
-- Tanpa monetisasi — hanya batas biaya. KONTEN CHAT TIDAK PERNAH disimpan
-- server (privasi Doc 11 §4; retensi >24 jam otomatis tidak berlaku karena
-- tidak ada konten yang tersimpan, hanya penghitung harian).

create table if not exists public.chat_quota (
  anon_id    text primary key,
  day        date not null default current_date,
  count      int  not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.chat_quota enable row level security;
-- Sengaja TANPA policy publik (sama seperti migrasi 0001): klien hanya
-- berkomunikasi lewat edge function dengan service role.