# 🦊 HAGUMI (育み)

> Virtual pet game ala Tamagotchi dengan kitsune yang hidup 90 hari secara real-time.
> Rawat ia dengan baik → menjadi **Zenko (善狐)**, rubah suci. Lalai → **Yako (野狐)**.
> *Hagumi (育み) = "menumbuhkan dengan penuh perhatian" dalam bahasa Jepang.*

| | |
|---|---|
| **Genre** | Virtual Pet / Life Simulation |
| **Platform** | Mobile-first: PWA (web) → APK/IPA via Capacitor |
| **Stack** | TypeScript monorepo (core pure) · Phaser 3 (canvas) · **React + TSX (UI)** · Vite · Capacitor · Supabase |
| **Status** | 📐 **Pra-produksi** — desain & dokumentasi selesai, pengembangan M1 belum dimulai |

---

## 📂 Struktur Repo

```
PET/
├─ GDD-Pet-Game.md      # Game Design Document (visi & desain besar) — v0.5
├─ ROADMAP.md           # Checklist pengerjaan M1–M9 + Definition of Done
├─ docs/                # Dokumentasi teknis per komponen (01–12)
│  ├─ README.md         #   ← indeks & aturan lintas komponen
│  ├─ 01-pet-kitsune.md #   pet: stat, tahap, ekor, animasi
│  ├─ 02-scenes.md      #   12 scene: layout & interaksi
│  ├─ ...               #   waktu, onboarding, mini-game, ekonomi,
│  └─ 12-ui-...md       #   breeding, dialog, arsitektur, seni, UI
└─ (kode akan muncul saat M1 dimulai — lihat docs/09 untuk struktur monorepo)
```

## 🚀 Mulai Dari Mana?

| Jika kamu... | Baca ini |
|---|---|
| Baru bergabung / ingin paham game-nya | [`GDD-Pet-Game.md`](GDD-Pet-Game.md) (15 menit) |
| Akan mengerjakan fitur tertentu | [`docs/README.md`](docs/README.md) → doc komponen terkait |
| Ingin tahu progres / mengerjakan tugas | [`ROADMAP.md`](ROADMAP.md) |
| Akan menyentuh UI | [`docs/12-ui-layout-wireframes.md`](docs/12-ui-layout-wireframes.md) |

## 🛠️ Menjalankan Proyek (setelah M1)

```bash
pnpm install
pnpm dev        # apps/web (Vite dev server)
pnpm test       # unit test packages/core
```
*(Belum tersedia — tugas M1 Fase A di [ROADMAP.md](ROADMAP.md).)*

## 🧭 Aturan Emas Proyek

1. Logika game murni ada di `packages/core` — **zero dependency platform** (Doc 09).
2. Semua angka balance dari JSON — tidak ada hard-code.
3. Semua waktu = timestamp UTC; decay dihitung dari selisih waktu, bukan loop.
4. Autosave setiap aksi; save pemain = nyawa proyek ini (pet hidup 90 hari!).

---

*Dokumen hidup — diperbarui seiring perkembangan proyek.*
