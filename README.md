# 🦊 HAGUMI (育み)

> Virtual pet game ala Tamagotchi dengan kitsune yang hidup 90 hari secara real-time.
> Rawat ia dengan baik → menjadi **Zenko (善狐)**, rubah suci. Lalai → **Yako (野狐)**.
> _Hagumi (育み) = "menumbuhkan dengan penuh perhatian" dalam bahasa Jepang._

|              |                                                                                                          |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| **Genre**    | Virtual Pet / Life Simulation                                                                            |
| **Platform** | Mobile-first: PWA (web) → APK/IPA via Capacitor                                                          |
| **Stack**    | TypeScript monorepo (core pure) · Phaser 3 (canvas) · **React + TSX (UI)** · Vite · Capacitor · Supabase |
| **Status**   | 🔨 **Fase II — World-Class** · M1–M9 ✅ (core, evolusi, mini-game, breeding online, LLM companion) · M10–M20 berjalan |

---

## 📂 Struktur Repo

```
PET/
├─ GDD-Pet-Game.md      # Game Design Document (visi & desain besar) — v0.6
├─ ROADMAP.md           # Checklist M1–M20 + Definition of Done per milestone
├─ docs/                # Dokumentasi teknis per komponen (01–16)
│  ├─ README.md         #   ← indeks & aturan lintas komponen
│  ├─ 01–12 …           #   pet, scene, waktu, onboarding, mini-game,
│  │                    #   ekonomi, breeding, companion, arsitektur,
│  │                    #   seni, LLM, UI (kontrak layout)
│  ├─ 13-pet-autonomy   #   kehendak pet (behavior.json, klip baru)
│  ├─ 14-ui-ux-system   #   tokens, ikon pixel, motion, FTUE 2.0
│  ├─ 15-launch-liveops #   KPI, telemetry, monetisasi, i18n, rilis
│  └─ 16-landing-preview#   halaman awal storytelling 6 babak
├─ packages/            # core (logika murni) · data (JSON balance) · llm (adapter)
├─ apps/web/            # Vite + Phaser 3 + React (PWA)
├─ services/supabase/   # edge functions: breeding, chat, save-sync
└─ tools/               # simulator balance 90 hari, e2e online, check
```

## 🚀 Mulai Dari Mana?

| Jika kamu...                           | Baca ini                                                             |
| -------------------------------------- | -------------------------------------------------------------------- |
| Baru bergabung / ingin paham game-nya  | [`GDD-Pet-Game.md`](GDD-Pet-Game.md) (15 menit)                      |
| Akan mengerjakan fitur tertentu        | [`docs/README.md`](docs/README.md) → doc komponen terkait            |
| Ingin tahu progres / mengerjakan tugas | [`ROADMAP.md`](ROADMAP.md)                                           |
| Akan menyentuh UI                      | [`docs/12-ui-layout-wireframes.md`](docs/12-ui-layout-wireframes.md) |

## 🛠️ Menjalankan Proyek

```bash
pnpm install
pnpm dev               # apps/web (Vite dev server)
pnpm test              # unit test packages/core (200 test)
pnpm typecheck         # tsc --noEmit seluruh workspace
pnpm simulate          # simulasi balance headless 90 hari
pnpm simulate:genetics # simulasi distribusi genetika breeding
pnpm check:online      # cek kesehatan Supabase edge functions
pnpm e2e:online        # e2e breeding online (12 skenario)
```

## 🧭 Aturan Emas Proyek

1. Logika game murni ada di `packages/core` — **zero dependency platform** (Doc 09).
2. Semua angka balance dari JSON — tidak ada hard-code.
3. Semua waktu = timestamp UTC; decay dihitung dari selisih waktu, bukan loop.
4. Autosave setiap aksi; save pemain = nyawa proyek ini (pet hidup 90 hari!).

---

_Dokumen hidup — diperbarui seiring perkembangan proyek._
