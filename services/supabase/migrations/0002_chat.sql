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

-- ===== RPC: increment kuota ATOMIK (fix race condition read-then-write) =====
-- Dipanggil edge function chat: INSERT baru / UPDATE count+1 (reset saat ganti
-- hari) dalam satu operasi, lalu true bila masih di bawah batas p_max.
create or replace function public.consume_chat_quota(p_owner text, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_allowed boolean;
begin
  insert into public.chat_quota (anon_id, day, count)
  values (p_owner, current_date, 1)
  on conflict (anon_id) do update
    set count = case when chat_quota.day = current_date then chat_quota.count + 1 else 1 end,
        day = current_date,
        updated_at = now()
  returning count <= p_max into v_allowed;
  return coalesce(v_allowed, false);
end;
$$;