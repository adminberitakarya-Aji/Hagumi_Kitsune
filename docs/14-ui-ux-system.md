# DOC 14 — UI/UX System 🖐️

> Sumber: diskusi desain 04/09/2026 — "UI/UX faktor penting naik kelas". Doc 12 tetap = **kontrak
> layout** (grid, posisi, wireframe). Doc ini menambah lapisan yang membuat UI terasa hidup:
> token, ikon, motion, adaptasi, aksesibilitas, dan pengujian. Implementasi milestone M12 & M14.

## 1. UX Pillars (mengikat semua keputusan UI)

1. **"Balas dalam 100ms"** — setiap sentuhan memberi umpan balik (visual + audio + haptic) sebelum logika selesai.
2. **"Diegetik dulu, teks kemudian"** — kabar disampaikan lewat perilaku pet & dunia; toast hanya pelengkap (selaras GDD §16).
3. **"Tidak ada jalan buntu"** — setiap layar punya jalan keluar jelas + satu CTA hanko.
4. **"Lembut itu identitas"** — semua gerakan ease-out ala kertas washi; transisi = *mono no aware* yang dirasakan.

## 2. Design Tokens (`:root` CSS variables — perluasan pola styles.css yang ada)

| Kelompok | Token                                              |
| -------- | -------------------------------------------------- |
| Warna    | semantic: `--surface`, `--surface-dim`, `--cta`, `--cta-pressed`, `--danger`, `--success`, `--text`, `--text-dim` (nilai dari palet Doc 10) |
| Spacing  | `--sp-1: 4px` … `--sp-6: 64px` (kelipatan grid 8)  |
| Type     | `--font-display`, `--font-body`, `--font-caption` + type scale 4 level (display 20 / body 14 / small 12 / caption 10) |
| Motion   | `--dur-fast: 150ms`, `--dur-sheet: 250ms`, `--dur-scene: 400ms`, `--ease-washi: cubic-bezier(0.22, 1, 0.36, 1)` |
| Radius   | `--r-sm: 4px`, `--r-md: 8px` (Doc 12 §2.1)         |

Aturan: komponen **dilarang** memakai nilai warna/durasi literal — wajib lewat token.

## 3. Sistem Ikon Pixel (menggantikan SEMUA emoji di UI React)

- Ukuran dasar **24×24 px**, skala bulat ×2 (anti-blur, Doc 10 §1); recolor dari palet inti.
- Inventory minimum: aksi bar 6 (dapur/onsen/futon/toko/album/chat) · stat 6 · HUD (koin, gear, waktu×4, musim×4) · status (sakit, offline, poop) · navigasi (kembali, tutup).
- Produksi 1 set dasar + recolor — sinkron pipeline seni M10.
- Emoji yang tersisa hanya di **dialog pet** (sifat teks, bukan UI) — gaya kepribadian.

## 4. Motion Spec

| Elemen                | Spesifikasi                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| Sheet (WashiPanel)    | masuk slide-up 250ms **dan keluar slide-down 250ms** — unmount SETELAH animasi (bug `if (!open) return null` diperbaiki) |
| Screen penuh (Chat/Album/Breeding) | fade+slide 200ms masuk/keluar; hanya satu aktif                |
| Transisi scene Phaser | iris-wipe / sapuan sakura 400ms `--ease-washi` (bukan cut hitam)            |
| Tombol CTA            | pressed scale 0.94 + SFX cap hanko + haptic ringan                          |
| Koin                  | float "+n/−n" dekat H4 + tween ke posisi (Doc 12 §12) — wajib konsisten     |
| Angka stat            | tween nilai lama→baru 300ms; ikon blink <30 (sudah ada)                     |
| Urgensi               | tombol terkait stat urgent "bernapas" (scale 1.00↔1.03)                     |
| `prefers-reduced-motion` | semua transisi non-esensial → instan; blink → statis warna                |

## 5. Adaptasi Perangkat

- Canvas extend penuh pada layar tinggi (20:9) — bg digambar bleed; `.stage` 360×640 menjadi **anchor layout**, bukan letterbox hitam.
- Safe area: `env(safe-area-inset-*)` untuk HUD atas & action bar bawah (notch/gesture bar).
- Mode teks besar (opsional di Pengaturan): type scale +20%.

## 6. FTUE 2.0 — Onboarding Bertahap (implementasi M14)

- Konfigurasi **data-driven** `packages/data/data/onboarding.json` (pemicu kontekstual, bukan flag tunggal).
- Kurva wahyu hari-1: makan → reaksi pet → koin pertama; goal eksplisit "jaga tetap hidup 1 hari penuh" + reward seremonial.
- Hint kontekstual (masing-masing sekali): malam → futon · koin cukup → toko · hari-2 → album · poop pertama → sapu · event musiman → CTA.
- State kosong & error wajib punya konten (album kosong, inbox kosong) — tidak ada layar kering.
- Funnel FTUE (splash → nama → makan pertama → D2) didefinisikan event-nya di sini, diverifikasi penuh di M16.

### 6.1 Definisi Event Funnel FTUE (didefinisikan M14 — diverifikasi M16)

Implementasi: tracker lokal `apps/web/src/system/ftueFunnel.ts` (idempotent per-install,
buffer localStorage `hagumi_ftue_funnel`). M16: titik `trackFtueStep` digantungkan ke
adapter `IAnalytics` (event `ftue_step` — Doc 15 §2).

| # | Event          | Pemicu                                      | Catatan                            |
| - | -------------- | ------------------------------------------- | ---------------------------------- |
| 1 | `splash_seen`  | pemain baru (tanpa save) membuka Splash     | mulai pengukuran                   |
| 2 | `name_created` | save pertama dibuat (hanko tercap)          |                                    |
| 3 | `first_feed`   | makan berhasil pertama                      | DoD: ≤ 30 dtk sejak `name_created` |
| 4 | `day2_reached` | hari-2 tercapai dan pet masih hidup         | = selesai goal hari-1              |

- Hint kontekstual ditandai "seen" **saat tampil** (localStorage `hagumi_hint_seen`)
  → dijamin tidak pernah muncul 2×; pemicu habis (malam lewat, poop disapu) menyembunyikan hint.
- Reward goal hari-1 (koin seremonial dari `onboarding.json`) diberikan sekali per install
  (localStorage `hagumi_goal_day1_done`), hanya bila D2 tercapai dengan pet hidup.

## 7. Aksesibilitas

- Kontras teks ≥ 4.5:1 — **audit otomatis di CI** (bukan manual).
- Hitbox ≥ 48px — asersi Playwright (Doc 12 §13).
- Informasi tidak pernah hanya-via-warna (ikon selalu mendampingi — Doc 10 §4).
- Target audiens all-age: mode teks besar, tanpa dependensi waktu reaksi cepat di alur perawatan.

## 8. Pengujian UI

- **Playwright** jalur kritis: splash → onboarding → makan → tidur → minigame → breeding (mobile viewport 360×640 + layar tinggi).
- **Visual regression**: snapshot per komponen (gallery scene, Doc 14 §2) — mencegah regresi saat aset final M10 masuk.
- Asersi otomatis acceptance criteria Doc 12 §13.

## 9. Acceptance Criteria

- [ ] Nol nilai warna/durasi literal di komponen (audit lint/grep token)
- [ ] Nol emoji sebagai ikon UI (audit grep komponen React)
- [ ] Semua sheet & screen punya animasi masuk **dan** keluar
- [ ] Jalur kritis Playwright hijau; snapshot visual stabil
- [ ] 4 UX Pillars lolos checklist pada 10 layar utama
