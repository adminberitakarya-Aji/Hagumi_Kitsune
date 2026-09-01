# 🦊 HAGUMI (育み) — Dokumentasi Teknis

> Referensi developer per komponen. GDD (`../GDD-Pet-Game.md`) berisi visi & desain;
> dokumen di folder ini berisi **detail implementasi** yang mengikat.

> **Stack terkunci (v0.5):** TypeScript monorepo (ports & adapters) · Phaser 3 (canvas) · **React + TSX (UI overlay)** · Vite/PWA · Capacitor (native) · Supabase (backend tipis). Core tetap TS murni tanpa JSX. Lihat [09-architecture-save.md](09-architecture-save.md).

## 📚 Indeks Dokumen

| Doc                                                      | Komponen         | Isi Utama                                                           | Status |
| -------------------------------------------------------- | ---------------- | ------------------------------------------------------------------- | ------ |
| [01-pet-kitsune.md](01-pet-kitsune.md)                   | Pet (Kitsune)    | Stat, tahap hidup, ekor, elemen, kepribadian, daftar animasi        | ✅     |
| [02-scenes.md](02-scenes.md)                             | Multi-Scene      | 12 scene: layout, objek interaktif, transisi, daftar aset           | ✅     |
| [03-time-system.md](03-time-system.md)                   | Waktu            | Real-time tick, offline catch-up, pagi–malam, 4 musim               | ✅     |
| [04-onboarding.md](04-onboarding.md)                     | Onboarding       | Splash, Altar Telur, layar Nama + hanko, animasi menetas            | ✅     |
| [05-minigames.md](05-minigames.md)                       | Mini-Game        | 3 mini-game festival: aturan, skor, koin, cooldown                  | ✅     |
| [06-economy-items.md](06-economy-items.md)               | Ekonomi          | Koin, katalog item, inventory, login streak                         | ✅     |
| [07-breeding-genetics.md](07-breeding-genetics.md)       | Breeding         | Syarat, algoritma genetika, lineage tree, warisan                   | ✅     |
| [08-companion-dialogue.md](08-companion-dialogue.md)     | Companion        | Mesin dialog, prioritas trigger, template chat, memori              | ✅     |
| [09-architecture-save.md](09-architecture-save.md)       | Arsitektur       | Struktur folder, modul, state machine, skema save JSON              | ✅     |
| [10-art-audio-styleguide.md](10-art-audio-styleguide.md) | Seni & Audio     | Palet, ukuran sprite, komponen UI, daftar musik/SFX                 | ✅     |
| [11-companion-llm-memory.md](11-companion-llm-memory.md) | LLM & Memory     | Memory 2 tingkat, ILlmProvider + adapter, guardrail, Supabase proxy | ✅     |
| [12-ui-layout-wireframes.md](12-ui-layout-wireframes.md) | UI Layout        | Grid 360×640, HUD, komponen, wireframe semua layar & modal          | ✅     |
| [../ROADMAP.md](../ROADMAP.md)                           | 🗺️ Roadmap Kerja | Checklist M1–M9 + Definition of Done per milestone                  | ✅     |

## 🧭 Cara Pakai

1. **Mulai dari GDD** untuk memahami desain besar → buka doc komponen yang akan dikerjakan.
2. Setiap doc berisi: **spesifikasi, tabel data, skema/algoritma, daftar aset, dan acceptance criteria** (definisi "selesai").
3. Data game (item, harga, decay, dialog) sengaja **data-driven** (file JSON) — ubah balance tanpa menyentuh kode (lihat 09).
4. Konvensi penamaan aset: `sprite_<subjek>_<aksi>_<frame>` contoh `sprite_kitsune_idle_01.png`.

## 🔗 Aturan Lintas Komponen (Wajib Dibaca)

- Semua angka balance (decay, harga, bonus) hanya ada di **satu tempat**: file konfigurasi JSON, tidak hard-coded.
- Semua perubahan state pet **harus lewat** `PetStats` (tunggal sumber kebenaran) — UI tidak boleh mengubah stat langsung.
- Semua waktu memakai **timestamp UTC epoch (ms)**; tampilan lokal hanya di layer UI.
- Setiap aksi pemain → autosave segera (lihat 09).
