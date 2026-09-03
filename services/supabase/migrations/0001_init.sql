-- M8 — Breeding Online via Supabase (Doc 07 §2B, Doc 09 §7)
-- Skema backend tipis: auth ringan (anon id), hash gen pet, request breeding,
-- dan backup save opsional. RLS AKTIF tanpa policy publik → anon key ditolak
-- langsung ke tabel; akses data hanya lewat edge function (service role).

-- ===== profiles: identitas ringan (anon → akun opsional nanti) =====
create table if not exists public.profiles (
  anon_id      text primary key,
  display_name text,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- ===== pets_gen: hash gen pet terbaru per pemain (Doc 07 §2B) =====
create table if not exists public.pets_gen (
  anon_id    text primary key,
  gen        jsonb not null,                -- payload Breeding Code tanpa checksum
  updated_at timestamptz not null default now()
);
create index if not exists pets_gen_updated_idx on public.pets_gen (updated_at desc);

-- ===== breeding_requests: pertukaran gen asinkron =====
-- Siklus: pending (menunggu penerima) → ready (seed dikunci server) →
-- done (kedua pihak klaim telur); declined bila ditolak.
create table if not exists public.breeding_requests (
  id              uuid primary key default gen_random_uuid(),
  from_id         text not null,
  to_id           text not null,
  from_gen        jsonb not null,          -- gen pet pengirim
  to_gen          jsonb,                   -- gen pet penerima (diisi saat accept)
  seed            bigint,                  -- seed genetika (dikunci server saat accept)
  result          jsonb,                   -- hasil genetika versi server (fallback klien)
  status          text not null default 'pending'
                  check (status in ('pending', 'ready', 'done', 'declined')),
  claimed_by_from boolean not null default false,
  claimed_by_to   boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists breeding_requests_from_idx on public.breeding_requests (from_id, created_at desc);
create index if not exists breeding_requests_to_idx on public.breeding_requests (to_id, status);
create index if not exists breeding_requests_status_idx on public.breeding_requests (status, created_at desc);

-- ===== save_backups: cloud backup opsional (last-write-wins) =====
create table if not exists public.save_backups (
  anon_id    text primary key,
  save       jsonb not null,
  last_tick  bigint not null,
  updated_at timestamptz not null default now()
);

-- ===== RLS: kunci semua tabel dari akses langsung klien =====
alter table public.profiles          enable row level security;
alter table public.pets_gen          enable row level security;
alter table public.breeding_requests enable row level security;
alter table public.save_backups      enable row level security;
-- Sengaja TANPA policy: kebijakan default = DENY untuk anon key.
-- Edge function memakai SUPABASE_SERVICE_ROLE_KEY (server-only) yang
-- melewati RLS — API key di aplikasi hanyalah anon key (DoD M8).
