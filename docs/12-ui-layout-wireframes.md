# DOC 12 — UI Layout & Wireframes 📐

> Sumber: GDD §8, Doc 02 (scene), Doc 10 (gaya visual). Dokumen ini = **kontrak layout** yang mengikat implementasi UI.
> Semua ukuran dalam **px logis** (desain 360×640, dikalikan scale per device — lihat §1).
>
> **Catatan implementasi (v0.5):** semua wireframe di dokumen ini diimplementasikan sebagai
> komponen **React + TSX** (`apps/web/src/components/` & `screens/` — lihat Doc 09 §2).
> Spesifikasi visual, ukuran, dan perilaku di dokumen ini TIDAK berubah.

---

## 1. Grid, Safe Area & Layering

### 1.1 Kanvas Desain
| Properti | Nilai |
|---|---|
| Resolusi logis | **360 × 640 px** (portrait 9:16) |
| Scale ke device | `scale = min(deviceW/360, deviceH/640)`, gambar center, letterbox `#2B2B33` |
| Unit grid | **8 px** — semua posisi/ukuran kelipatan 8 |
| Margin luar | 16 px kiri/kanan |
| Safe area atas | 24 px minimum (notch) — HUD mulai `y=32` |
| Safe area bawah | 20 px (gesture bar) — tombol terbawah `y≤620` |
| Zona ibu jari | y 480–620 → SEMUA tombol interaktif utama di sini |

### 1.2 Kerangka Global (berlaku semua scene)
```
┌─────────────────────────────┐ y=0
│ ░░ safe area notch ░░░░░░░░ │ 24
├─────────────────────────────┤ y=32
│ HUD ATAS (48px)             │ 32–80
├─────────────────────────────┤ y=80
│                             │
│   AREA SCENE (496px)        │ 80–576
│   (Canvas Phaser)           │
│                             │
├─────────────────────────────┤ y=576
│ ACTION BAR (44px)           │ 576–620
├─────────────────────────────┤ y=620
│ ░░ gesture bar ░░░░░░░░░░░░ │ 20
└─────────────────────────────┘ 640
```
- HUD atas & action bar = **React overlay** (komponen TSX di `apps/web/src/components` — `Hud.tsx`, `ActionBar.tsx`, dst.); area scene = Canvas Phaser.
- Layer z-index: canvas(0) → fx(1) → balon bicara(2) → HUD(3) → sheet/modal(4) → tutorial(5) → toast(6).

### 1.3 HUD Atas — spesifikasi per elemen (tinggi 48px)
| # | Elemen | Ukuran/Posisi | Isi & Perilaku |
|---|---|---|---|
| H1 | Panel Nama+Umur | x16,y36 · 128×40 | "Kogitsune · Hari 23" + ikon tahap; tap → panel detail stat |
| H2 | StatBar mini 2×2 | x152,y36 · 128×40 | 4 ikon+bar 28px: hunger, happiness, energy, hygiene; **blink** <30 |
| H3 | Health pill | menggantikan H2 | hanya saat health<60: ❤️ + angka, berkedip |
| H4 | Koin 🪙 | x288,y36 · 48×40 | angka; +float saat bertambah; tap → Toko |
| H5 | ⚙️ | x328,y36 · 32×32 | tap → Pengaturan |
| — | Ikon waktu+musim | x312,y88 · 32×32 | 🌅☀️🌆🌙 + bingkai warna musim; non-interaktif |

---

## 2. Komponen UI Inti (spesifikasi mengikat)

### 2.1 StatBar
| Properti | Nilai |
|---|---|
| Dimensi | mini 56×12 (bar 40×8+ikon 16) · penuh 200×16 |
| Track | `#E8E0CE`, radius 4 |
| Fill | hunger `#E0955A` · happiness `#F0A8BC` · energy `#E8C96A` · hygiene `#8FB8D8` · health `#D87A88` |
| Threshold | <30 → fill+ikon blink 1×/dtk; <15 → ikon ⚠️ |
| Animasi | tween 400 ms; turun = flash merah sekali |

### 2.2 HankoButton (CTA)
| Properti | Nilai |
|---|---|
| Ukuran | besar 152×44 · sedang 96×36 |
| Warna | bg `#C1443C`, teks `#F5EFE0`, border 2px `#8E2F2A`, radius 8, cap bulat 20×20 kiri |
| State | normal · pressed (scale .94, `#A93A33`) · disabled (op .45) |
| Suara | lepas tekan = "cap" pendek |
| Aturan | **1 hanko merah per layar**; sekunder = washi outline |

### 2.3 WashiPanel (bottom sheet / modal)
| Properti | Nilai |
|---|---|
| Dimensi | lebar 328, max tinggi 440, radius atas 16, bg `#F5EFE0`, border indigo 2px, shadow 0/4/12 |
| Animasi | slide-up 250 ms / down 200 ms; backdrop `#2B2B33` 40%, tap-tutup |
| Handle | bar 40×4 `#C9A87C` center-top |

### 2.4 DialogBubble
| Properti | Nilai |
|---|---|
| Ukuran | max 216×64, font 14px (shrink 12px jika 2 baris) |
| Posisi | di atas kepala pet +8px; clamp dalam area scene |
| Warna | bg `#FFF`, border 2px `#3D4A6B`, ekor 12px |
| Timing | 4 dtk (durasi∝panjang), fade 200 ms; maks 1 balon |
| Tier 2 | ikon 💬 pojok (penanda AI, Doc 11) |

### 2.5 Toast
- Top-center y=88, auto width (max 280) ×36, bg indigo 90%, teks krem 13px, 2.5 dtk, antrean max 3. Contoh: "🪙 +66", "Kogitsune sembuh!".

### 2.6 Prinsip Interaksi Global
1. Hitbox sentuh ≥48×48 (visual boleh lebih kecil).
2. Aksi pengubah stat → feedback <100 ms: angka float + partikel + SFX.
3. Semua sheet tutup via backdrop-tap & swipe-down.
4. Selalu ada jalan keluar; ⚙️ & 🪙 selalu tersedia (kecuali cutscene/mini-game).
5. Loading >300 ms → spinner "uap onsen" (3 titik uap naik).

---

## 3. S4 — Home / Rumah Tatami ⭐ (Layar Utama)

### 3.1 Wireframe
```
┌─────────────────────────────┐ 0
│ [HUD atas — lihat 1.3]      │ 32–80   ☀️ (musim semi = bingkai pink)
├─────────────────────────────┤ 80
│  ┌───────── shōji ─────┐ ⛅ │  jendela kertas 88×96, x16,y96
│  │ langit per musim/jam│    │  menampilkan langit (animasi)
│  └─────────────────────┘    │
│                    🗓️🌸     │  dekor musiman (menggantung)
│                             │
│      🦊 ← kitsune IDLE      │  pet bergerak bebas area
│       💬 balon bicara       │  tatami: x0..360, y200..470
│                             │
│         💩 (poop)           │  muncul acak di lantai
│  ┌────────┐        ┌──────┐ │  kotatsu 96×64 (x32,y392)
│  │kotatsu │ 🧸slot │ 🌱slot│ │  slot dekor ×4: (x144,x232,
│  └────────┘        └──────┘ │  x232,y392, x56,y448, x232,y448)
│ ⬅️ pintu           pintu ➡️ │  x0,y300 & x344,y300 (24×80)
├─────────────────────────────┤ 576
│ [🍖Dapur][♨️Onsen][🛏️Futon] │  3 tombol utama 108×44
│ [🏪Toko][📖Album][💬Chat]  │  6 tombol grid 2×3 (gaya 2)
└─────────────────────────────┘ 640
```

### 3.2 Action Bar — DUA GAYA, keputusan: **Gaya 2 (grid 6)**

| Gaya | Isi | Pro | Kontra |
|---|---|---|---|
| 1 (3+3 kontekstual) | baris 1: Dapur/Onsen/Futon; baris 2 berubah sesuai kondisi (Obat saat sakit, Sapu saat poop, Chat…) | kontekstual | posisi tombol berpindah = membingungkan |
| **2 (grid 6 tetap)** ✅ | Dapur · Onsen · Futon · Toko · Album · **Chat** | motor memory konsisten | 6 tombol agak padat |

- Tombol: 108×44, ikon 24 + label 11px, bg washi, border indigo 2px, radius 8; **tombol tidak relevan diberi badge/blink**, tidak pernah hilang.
- Badge kondisi: 💩 di Dapur? TIDAK — badge kondisi muncul sebagai **dot merah 8px** di pojok tombol terkait (poop → tombol ♨️? bukan; poop = aksi langsung di scene, lihat 3.3).

### 3.3 Interaksi di Area Scene
| Interaksi | Trigger | Efek | Feedback |
|---|---|---|---|
| Belai | usap ≥120px pada pet | happiness +2 (maks 20/hari) | hati partikel ×3 + SFX "nyuu" |
| Patok | tap pet | balon bicara (Doc 08) | bounce scale 1.05 |
| Sapu poop | tap-and-hold poop 400ms | poop hilang, hygiene lingkungan | partikel ✨ + koin +1 (kadang) |
| Buka pintu | tap pintu kiri/kanan | transisi shōji-wipe → Taman/Dapur | 400 ms |
| Ketuk slot dekor kosong | tap slot | sheet "Bel dekorasi?" → Toko | preview sebelum beli |
| Ketuk kotatsu (winter) | tap | pet duduk di kotatsu 30 dtk | happiness +2/8dtk |

### 3.4 State Pet Memengaruhi Layout
| Kondisi | Perubahan UI |
|---|---|
| Tidur (malam) | area redup overlay 45%, zzz partikel, tombol Futon jadi "Bangunkan" |
| Sakit | H3 health pill aktif + awan mendung di atas pet + badge merah di Chat? (tak ada) → tampil banner tipis "Kogitsune sakit! Beri obat" di bawah HUD (y=84, h=24, bg merah 80%) |
| Evolusi | cutscene fullscreen, semua UI disembunyikan |
| Pet mati | Home terkunci → layar Memorial (§7.4) |

---

## 4. S8 Dapur & S6 Onsen & S7 Kamar Futon

### 4.1 Dapur (makan)
```
┌─────────────────────────────┐
│ [HUD atas]                  │
│  Dapur — Pilih Makanan      │  judul 16px, y=96
│ ┌─────────────────────────┐ │
│ │ GRID MAKANAN 3×3        │ │  sel 104×88: ikon 48 + nama 11px
│ │ [🥘][🍞][🐟]            │ │  + jumlah stok "×3" pojok
│ │ [🍱][🍡][??]            │ │  slot kosong = "+ Beli" (abu)
│ │ [🥩][❄️][••]            │ │
│ └─────────────────────────┘ │  sheet penuh area scene
│  Kapasitas: 7/20   [🏪 Beli]│  y=528
│ [← Kembali ke Rumah]        │  action bar jadi 1 tombol kembali
└─────────────────────────────┘
```
- Tap makanan → **sheet konfirmasi** (WashiPanel 328×160): ikon besar, efek ("Hunger +35, Senang +8"), [Beri Makan] hanko → panel turun, pet makan (animasi 2 dtk), stat bar animasi.
- Makan ditolak (kenyang>90) → sheet jadi peringatan + balon pet menolak.
- Overfeed: hitungan sisa 6 jam ditampilkan "Kogitsune sudah makan 3× — hati-hati" (teks kuning).

### 4.2 Onsen (mandi)
```
┌─────────────────────────────┐
│ [HUD atas]                  │
│        ♨️ uap (fx)          │  partikel uap full area
│      ╱─────────╲            │  kolam onsen ellipse 280×140
│     │   🦊 😌   │           │  pet di dalam air (setengah)
│      ╲─────────╱            │
│   "Sapu punggungnya 5×!"    │  instruksi 13px, y=440
│   ● ● ● ○ ○   ← progress    │  5 lingkaran 16px, terisi
│                             │  saat sapuan valid
│ [← Kembali]   [🧼 Sabun ×1] │  action bar: kembali + item
└─────────────────────────────┘
```
- Gesture: swipe di atas pet (jarak ≥80px) = 1 sapuan valid (cooldown 300 ms antar hitung).
- Selesai 5× → hygiene=100, animasi wajah nikmat + bunga mandi → auto-kembali ke Home 1.5 dtk.
- Batal di tengah → hygiene +16 per sapuan (proporsional), tanpa penalti.

### 4.3 Kamar Futon (tidur)
```
┌─────────────────────────────┐
│ [HUD atas]                  │  lampu andon menyala 🏮
│      🌙 (jendela malam)     │
│      ╱▔▔▔▔▔▔▔▔╲            │  futon 200×88, center y=300
│     (   🦊 💤    )          │  saat tidur: overlay redup 45%
│      ╲_________╱            │
│  Zzz... Energy +30/jam      │  status teks 12px
│                             │
│ [⏰ Bangunkan]  [← Rumah]   │  bangun = konfirmasi jika
└─────────────────────────────┘  malam: "Ia masih mengantuk..."
```
- Tidur hanya bisa dipilih: malam ATAU energy<30 (kalau tidak → tombol disabled + alasan).
- Ringkasan saat bangun (sheet): "Tidur 7 jam · Energy +86".

---

## 5. S5 Taman (Niwa)

```
┌─────────────────────────────┐
│ [HUD atas]                  │
│   🌸 (pohon sakura/musim)   │  pohon 120×120, x220,y88
│  ⛩️ lentera batu (menyala   │  lentera 40×64, x24,y200
│     🌙 malam)               │
│        ╱~~~~~~~~╲           │  kolam koi 240×110, x60,y260
│       (  🐟  🐠  )          │  koi berenang (ambient)
│        ╲________╱           │
│   🦊 duduk di batu zen      │  batu 72×40, x40,y380
│                             │
│ [🥘 Beri Makan Koi −5🪙]    │  y=480, tombol washi 200×44
│ [🌸 Event Musiman] (musim)  │  y=532, hanya saat event aktif
│ [← Rumah]                   │  action bar
└─────────────────────────────┘
```
- Beri makan koi: koin −5 → happiness +3, koi melompat (fx); cooldown 1 jam.
- Event musiman (Doc 03 §5): tombol berubah jadi CTA event (mis. "Hanami! 🌸").
- Pet mengikuti pemain di taman? TIDAK — pet ikut (1 kitune) duduk di batu; belai tetap bisa.

## 6. S9 Toko (Dagashiya)

```
┌─────────────────────────────┐
│ [HUD atas]                  │
│ DAGASHIYA 🏪                │  judul + spanduk noren
│ ┌────┬────┬────┬────┬─────┐ │  TAB: Makanan|Obat|Mainan|
│ └────┴────┴────┴────┴─────┘ │  Dekor|Telur (y=96, h=36)
│ ┌─────────────────────────┐ │
│ │ [ikon 48] Roti          │ │  list item 328×64 per baris:
│ │ Hunger+25 · 🪙8         │ │  ikon | nama+efek | harga+
│ │                [Beli]   │ │  tombol Beli 64×32
│ ├─────────────────────────┤ │
│ │ …scroll…                │ │
│ └─────────────────────────┘ │
│ Item musiman: tag 🌸☀️🍁❄️  │  badge di nama item
│ [← Rumah]      Stok kamu 12/20 │
└─────────────────────────────┘
```
- Beli → konfirmasi mini (tap 2×? TIDAK: langsung beli + toast "🪙−8") — kecuali item ≥300 koin → konfirmasi WashiPanel.
- Koin kurang → tombol "Beli" jadi "🪙 Kurang 12" (disabled) + shake koin HUD.
- Telur tab → teks penjelas breeding (disabled sampai pet dewasa, Doc 07).
- Dekor → preview: tap item = preview muncul di slot rumah (sheet kecil "Pasang di sini").

## 7. S10 Matsuri (Lobi Mini-Game) & HUD Mini-Game

### 7.1 Lobi
```
┌─────────────────────────────┐
│ [HUD atas]                  │  lampion 🏮 menggantung
│   🎆 MATSURI (judul)        │  y=100, fx kembang api ambient
│ ┌─────────────────────────┐ │
│ │ 🎏 KINGYO-SUKUI         │ │  kartu game 328×88 ×3:
│ │ Rekor: 210 · ⚡−12      │ │  nama, rekor, biaya energi
│ │           [MAIN]        │ │  + [MAIN] hanko kecil
│ ├─────────────────────────┤ │
│ │ ⭕ WANAGE   …           │ │
│ ├─────────────────────────┤ │
│ │ 🏃 KITSUNE-DASH …       │ │
│ └─────────────────────────┘ │
│ Cooldown: 12:44 ⏳ (jika)   │  menggantikan tombol MAIN
│ [← Rumah]                   │
└─────────────────────────────┘
```

### 7.2 HUD Saat Mini-Game (menggantikan HUD atas)
```
┌─────────────────────────────┐
│ ⏱️ 0:38   Poin 120   [✕]    │  waktu | poin | keluar (konfirmasi)
├─────────────────────────────┤
│                             │
│    AREA GAME FULLSCREeN     │  area scene penuh (tanpa bar bawah)
│                             │
└─────────────────────────────┘
```
- Layar hasil (sheet): Skor, Koin 🪙+66 (float ke HUD koin), Senang +14, "Rekor Baru! 🌟" bila berlaku, [Main Lagi] [Kembali].

## 8. S-Chat — Obrolan Companion (fullscreen washi)

```
┌─────────────────────────────┐
│ ← Kogitsune · 🟢 online 📡  │  status provider aktif/kuota
├─────────────────────────────┤
│        ┌─────────────┐      │  bubble pet kiri (washi,
│        │ Otta! Kamu  │      │  border indigo), max 240px
│        │ ke mana tadi?│     │
│        └─────────────┘      │
│   ┌──────────────┐          │  bubble pemain kanan (hanko,
│   │ Maaf, kerja… │          │  bg merah muda muda)
│   └──────────────┘          │
│  (scroll, terbaru di bawah) │
├─────────────────────────────┤
│ [✏️ Ketik pesan…    ] [➤]  │  input 272×44 + kirim 48×44
│ Kuota: 7/10 hari ini  📵off │  info kuota, tap → info mode LLM
└─────────────────────────────┘
```
- Riwayat chat TIDAK persisten penuh (privasi + hemat): maks 20 bubble sesi terakhir di memori; memori pet = memoryLog (Doc 08 §4).
- Kuota habis → input disabled, banner: "Kogitsune beristirahat merenung 💭 — kembali besok" (upsell lembut maks 1×/hari — Doc 11 §6).
- Kirim → delay typing indicator (3 titik) 1–2 dtk → balasan.

---

## 9. S12 Album Keluarga & S11 Breeding House

### 9.1 Album Keluarga
```
┌─────────────────────────────┐
│ [HUD atas]                  │
│  ALBUM KELUARGA 📖 Gen-2    │
│ ┌──────┐ ┌──────┐           │  kartu pet hidup 152×184:
│ │ 🦊   │ │ 🥚   │           │  sprite + nama + umur +
│ │Kogi  │ │Telur │           │  jalur (Zenko/Yako) + ekor
│ │H23 ✨│ │ 2hr  │           │
│ └──────┘ └──────┘           │
│  GENERASI TERDULUR          │  header seksi 12px
│ ┌──────┐ ┌──────┐           │  kartu memorial 152×120:
│ │ ⬛🌸 │ │ (kos) │          │  foto bingkai hitam + bunga
│ │Hana  │ │       │          │  nama + "Hidup 91 hari"
│ │91hr ✨│ │       │          │  jalur evolusi
│ └──────┘ └──────┘           │
│ [← Rumah]                   │
└─────────────────────────────┘
```
- Tap kartu memorial → detail: foto besar, tanggal hidup, jalur evolusi, Care Score akhir, 3 memori teratas (dari memoryLog) — momen emosional, bg gelap lembut.
- Telur dalam album = pet kedua aktif? TIDAK (v1: 1 pet aktif); telur = status "menetas".

### 9.2 Breeding House
```
┌─────────────────────────────┐
│ [HUD atas]                  │
│   ⛩️ altar enmusubi         │  altar 200×160, center y=200
│   🦊━━━━ 🦝 (tali merah)    │  pet + preview mitra NPC ×3
│ ┌─────┐┌─────┐┌─────┐       │  kartu mitra 104×128:
│ │NPC A││NPC B││NPC C│       │  sprite preview anak +
│ │🔥x💧││🔥x⛰️││🔥x🌬️│    │  kombinasi elemen
│ │[Pilih]│ … ││ … │        │
│ └─────┘└─────┘└─────┘       │
│ Biaya: 🪙500 · Syarat ✓     │  status syarat (Doc 07 §1),
│ [KAWINKAN]                  │  disabled + alasan jika ✗
│ [← Rumah]                   │
└─────────────────────────────┘
```
- Pilih mitra → WashiPanel konfirmasi: preview telur (warna mix), biaya, cooldown info.
- Sukses → animasi tali merah mengikat (2 dtk) → "Telur muncul di Altarmu!" → kembali Home.

## 10. Onboarding: S2 Altar Telur & S3 Nama

### 10.1 Altar Telur
```
┌─────────────────────────────┐
│ (tanpa HUD — onboarding)    │
│        ⛩️ haiden            │  altar 280×200, y=120
│   ┌──┐ ┌──┐ ┌──┐ ┌──┐       │  4 telur 48×56, y=240,
│   │🔥│ │💧│ │🌬️│ │⛰️│       │  bergetar saat tap
│   └──┘ └──┘ └──┘ └──┘       │
│  [nama elemen aktif]        │  teks 14px, y=320
│  ┌─────────────────────┐    │  kartu deskripsi 328×96:
│  │ EMBER EGG 🔥        │    │  nama, deskripsi 2 baris,
│  │ Energik & penuh api │    │  stat dominan
│  └─────────────────────┘    │
│   [Pilih Telur Ini]         │  hanko besar, y=520
│                             │
└─────────────────────────────┘
```
### 10.2 Layar Nama + Hanko
```
┌─────────────────────────────┐
│        ┌───────────┐        │  kertas washi 280×200,
│        │  Nama     │        │  center y=200, miring 2°
│        │  [____ ]  │        │  input underline indigo,
│        │  0/12     │        │  counter kanan bawah
│        └───────────┘        │
│      (🔴 HANKO)             │  stempel 88×88, y=440,
│   Tekan & tahan 0.8 dtk     │  progress ring mengisi
│                             │
└─────────────────────────────┘
```
- Valid → hanko bisa ditekan; invalid → stempel abu + hint.
- Cap sukses → getar layar + SFX → langsung cutscene menetas (Doc 04 §5).

## 11. Modals & Layar Khusus

### 11.1 Ringkasan Offline (saat buka game)
WashiPanel 328×300: "Selama kamu pergi (7 jam 20 mnt)…" + list kronologi (ikon + teks): 😴 mengantuk · 💩 kandang kotor · ❤️ health −12 · [Tetap Semangat!]. Jika evolusi/kematian terjadi offline → layar khususnya yang tampil.

### 11.2 Hadiah Login
WashiPanel 328×240: koin mengambang + "Hari ke-4 · 🪙60" + streak dots 7 (●●●●○○○) + [Ambil].

### 11.3 Evolusi (fullscreen, UI disembunyikan)
Fase: pet bersinar → lonceng kuil 🔔 → kilatan → bentuk baru reveal 2 dtk → judul "Kogitsune menjadi ZENKO ✨" → tombol [Lanjut]. Durasi total ±8 dtk, skip setelah 1× lihat.

### 11.4 Memorial / Kematian
Fullscreen: bg senja, pet tergeletak transparan → fade → batu nisan 96×112 + bunga; "Hana beristirahat. 91 hari penuh cinta." + Care Score akhir + warisan list (Doc 07 §5) + [Keturunan Menetas] / [Mulai Baru]. Tidak ada tombol cepat — minimal 4 dtk sebelum interaktif.

### 11.5 Banner Sakit (bukan modal)
Bar tipis 328×24 di y=84: " 😷 Kogitsune sakit! Beri obat → " tap → Dapur tab Obat.

## 12. State & Edge Cases (wajib diimplement)

| Kasus | Perilaku UI |
|---|---|
| Stat < 15 | HUD ikon → ⚠️, toast sekali per peristiwa |
| Koin berubah | float "+n/−n" di dekat H4, tween ke posisi |
| Offline > 24 jam (pertama) | modal lembut: "Kamu lama tidak datang…" (tanpa rasa bersalah keras) |
| PWA offline (tanpa internet) | ikon 📵 di HUD; chat otomatis Tier 1; toast sekali |
| Save korup | modal merah: [Impor Backup] / [Mulai Baru] — JANGAN otomatis timpa |
| Loading scene > 300 ms | spinner uap onsen |
| Notch landscape | game dipaksa portrait — overlay "Putar perangkat 🔄" |

## 13. Acceptance Criteria — Doc 12

- [ ] Semua layar §3–§10 tampil sesuai wireframe (toleransi ±8px, grid 8 terjaga).
- [ ] Semua hitbox ≥48px; zona ibu jari berisi semua tombol utama.
- [ ] 1 hanko merah per layar; state pressed/disabled sesuai §2.2.
- [ ] StatBar blink & banner sakit muncul pada threshold yang benar.
- [ ] Semua modals bisa ditutup backdrop-tap & swipe-down; tidak ada dead-end.
- [ ] Memorial & evolusi fullscreen menyembunyikan HUD sepenuhnya.
- [ ] Landscape → overlay putar perangkat; safe area notch tidak menutupi HUD.



