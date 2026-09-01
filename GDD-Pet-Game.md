# 🦊 Game Design Document — "HAGUMI (育み)" — Virtual Pet ala Tamagotchi

| Informasi | Detail |
|---|---|
| **Nama Proyek** | HAGUMI (育み — "menumbuhkan/memerawat dengan penuh perhatian") |
| **Genre** | Virtual Pet / Life Simulation (Tamagotchi-like) |
| **Pet Utama** | Kitsune 🦊 (rubah putih folklore Jepang) |
| **Target Platform** | **Mobile-first** (Web/PWA portrait → dibungkus Capacitor jadi APK/iOS) |
| **Target Audience** | Semua umur (casual), penyayang hewan, nostalgia 90-an |
| **Versi Dokumen** | v0.5 — Draft (revisi: UI layer ganti ke React + TSX di atas Phaser; stack: TS monorepo + Phaser + React + Capacitor + Supabase) |
| **Tanggal** | 2026-09-01 |

---

## 1. High Concept

> **HAGUMI (育み)** — pemain merawat seekor anak rubah (kitsune) yang **hidup secara real-time** —
> bahkan saat game ditutup. Kitsune butuh diberi makan, dimandikan di onsen, diajak main,
> dan ditidurkan di futon. Seiring 90 hari hidupnya, ekornya bertambah dan ia berevolusi:
> dirawat dengan baik ia menjadi **Zenko (善狐)**, rubah suci pelayan dewa Inari;
> dibiarkan kelaparan ia menjadi **Yako (野狐)**, rubah liar yang kelam.
> Tema: ***mono no aware*** — keindahan karena segala sesuatu tidak kekal.

**Pilar Desain (Design Pillars):**
1. **"Hidup terus walau ditutup"** — waktu terus berjalan (real-time persistence).
2. **"Konsekuensi terasa"** — tindakan vs kelalaian punya dampak nyata dan permanen.
3. **"Perawatan itu ringan tapi bermakna"** — sesi main singkat (1–5 menit), puluhan kali sehari ala Tamagotchi asli.
4. **"Setiap pet unik"** — evolusi bercabang berdasarkan gaya merawat pemain.

---

## 2. Core Gameplay Loop

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│   Cek status pet → Pet butuh sesuatu? → Bertindak      │
│        ↑                                      │        │
│        │                              (Makan/Main/     │
│   Pet puas &                           Tidur/Bersih)   │
│   sehat ←──── Stat membaik ←──────────────┘            │
│        │                                               │
│        └──→ Stat menurun seiring waktu (decay) ────────┘
│
│   (Samping: Main mini-game → dapat koin → beli makanan/item)
└────────────────────────────────────────────────────────┘
```

**Loop mikro (30 detik – 2 menit):** cek notifikasi → penuhi kebutuhan → lihat reaksi pet.
**Loop menengah (harian):** kumpulkan koin dari mini-game, beli makanan/dekorasi, naik level.
**Loop makro (mingguan):** evolusi pet, buka spesies/evolusi baru, koleksi.

---

## 3. Sistem Stat Pet

Setiap pet memiliki 6 stat inti (skala 0–100):

| Stat | Arti | Decay (turun per jam) | Efek jika 0 |
|---|---|---|---|
| **🍽️ Hunger (Kenyang)** | Keperluan makan | −8/jam | HP mulai turun |
| **😊 Happiness (Senang)** | Mood/kebahagiaan | −6/jam | Pet murung, evolusi jelek |
| **⚡ Energy (Energi)** | Siaga untuk aktivitas | −5/jam (−12 saat main) | Pet tidur paksa, tolak aktivitas |
| **🧼 Hygiene (Kebersihan)** | Kebersihan badan | −4/jam | Muncul lalat, sakit perlahan |
| **❤️ Health (Kesehatan)** | Nyawa pet | Turun jika stat lain parah | **PET MATI** |
| **⭐ XP / Bonding** | Ikatan dengan pemain | Naik via interaksi | Naik level → buka fitur/evolusi |

**Aturan komposit:**
- Jika 2+ stat di bawah 25 → Health turun −10/jam.
- Pet **menolak makan** jika Hunger > 90, **menolak main** jika Energy < 15.
- Tidur memulihkan Energy +30/jam, memperlambat decay stat lain 50%.

### 3.1 Umur & Tahap Hidup (Skala 90 Hari)

Pet dirancang hidup hingga **±90 hari** (bukan belasan hari seperti Tamagotchi klasik). Umur akhir **bervariasi berdasarkan Care Score**: perawatan sangat baik dapat memperpanjang hingga **100+ hari**, perawatan buruk memperpendek.

| Tahap | Umur | Ciri |
|---|---|---|
| 🥚 Telur | Hari 0–1 | Butuh "diinkubasi" (diketuk berkala); telur bervariasi per **tipe/elemen** (lihat 3.2) |
| 🍼 Bayi | Hari 1–7 | Butuh perhatian sangat sering, grafis kecil, menggembirakan |
| 🧒 Remaja | Hari 7–20 | Bisa main mini-game; **evolusi pertama di hari ke-10** |
| 🧑 Dewasa | Hari 20–60 | **Evolusi final di hari ke-20**; mulai bisa kawin (breeding) |
| 🧓 Senior | Hari 60–90 | Gerak lambat, lebih butuh tidur, dialog nostalgia |
| ⚰️ Meninggal | ±Hari 90 (variasi ±10 via Care Score) | Layar perpisahan + Memorial; keturunan meneruskan garis (lihat §15) |

**Formula umur akhir:** `umur = 80 + (Care Score × 0.2)` hari → Care 100 = 100 hari, Care 0 = 80 hari. Kematian akibat kelalaian (Health = 0) tetap bisa terjadi kapan pun lebih cepat dari itu.

**🐕 Pertumbuhan Ekor (Khas Kitsune):** jumlah ekor = ikon kemajuan hidup & level pet, terlihat langsung di sprite:

| Tahap | Ekor | Detail Visual |
|---|---|---|
| Telur | 0 | Telur berpola sesuai elemen |
| Bayi | 1 | Ekor kecil bergoyang, bulu fluff |
| Remaja | 2 | Ekor lebih panjang, mengikuti gerak |
| Dewasa | 3–5 | Sesuai jalur Care Score saat evolusi |
| Senior | 6–7 | Ekor penuh, aura lembut |
| Zenko Ilahi (evolusi tertinggi) | 9 | 🌟 Sembilan ekor emas — simbol status paling didambakan pemain |

### 3.2 Tipe Telur / Elemen (Pilihan Awal)

Saat memulai game, pemain **memilih telur dari beberapa tipe elemen**. Elemen menentukan stat growth, bonus mini-game, dan varian evolusi:

| Tipe Telur | Elemen | Stat Dominan | Kekuatan Mini-game | Ciri Visual |
|---|---|---|---|---|
| 🥚 Ember Egg | 🔥 Api | Happiness & Energy | Mini-game aksi (refleks) | Nuansa merah/oranye, pola percikan |
| 🥚 Tide Egg | 💧 Air | Hygiene & Health | Mini-game puzzle | Nuansa biru, pola gelombang |
| 🥚 Gale Egg | 🌬️ Angin | Energy & Happiness | Mini-game timing | Nuansa putih/pastel, pola pusaran |
| 🥚 Terra Egg | ⛰️ Tanah | Hunger & Health | Mini-game ritme | Nuansa cokelat/hijau, pola kristal |
| 🥚 Prism Egg | ✨ Mistik (langka, 5%) | Sedikit semua stat | +10% koin semua mini-game | Nuansa ungu berkilau |

- Elemen juga memengaruhi **kepribadian** (mis. Api = energik/temperamental, Air = tenang/pemalu) yang tampil di dialog Companion (§16).
- Telur Mistik tidak bisa dipilih langsung di awal — didapat dari breeding (§15) atau hadiah langka.

---

## 4. Sistem Evolusi (Fitur Khas) — Jalur Zenko vs Yako

Evolusi ditentukan oleh **"Care Score"** — skor rahasia yang mengukur gaya merawat, dan langsung mengikuti folklor kitsune:

```
Care Score = rata-rata statistik (rolling 24 jam terakhir)
           + bonus interaksi manual (membelai, main bersama)
           − penalti kelalaian (stat mencapai 0, sakit tidak diobati)
```

| Care Score | Jalur Folklor | Bentuk Dewasa Kitsune | Ciri |
|---|---|---|---|
| 90–100 | 🌟 **Zenko Ilahi** | **Tenko (天狐)** — rubah surgawi | 9 ekor emas, aura suci, halo cincin api, langka |
| 70–89 | ✨ **Zenko (善狐)** | Rubah putih suci | 5–7 ekor, bulu bercahaya lembut, pelayan Inari |
| 40–69 | 🙂 **Kitsune Biasa** | Rubah oranye | 3–4 ekor, standar, lincah |
| 15–39 | 😷 **Yako (野狐)** | Rubah liar lesu | Bulu pudar kusam, 1–2 ekor, sering sakit |
| 0–14 | 👻 **Nogitsune** | Rubah bayangan | Murung, aura gelap, 1 ekor — tapi tak bisa mati (pet "menyerah") |

**Aturan tambahan:**
- Evolusi pertama (Bayi→Remaja) di **hari ke-10** — ekor bertambah 1, animasi kuil lonceng berbunyi.
- Evolusi final (Remaja→Dewasa) di **hari ke-20** — jalur Zenko/Yako dikunci berdasar Care Score; ada cutscene di altar Inari.
- Jalur TIDAK permanen 100%: Care Score bisa pulih pelan-pelan; Nogitsune yang dirawat baik bertahap kembali menjadi Yako→Kitsune (pesan harapan: *tidak pernah terlambat untuk memperbaiki*).

---

## 5. Interaksi Pemain (Aksi)

| Aksi | Cara | Efek | Cooldown |
|---|---|---|---|
| **Beri Makan** | Pilih makanan dari kulkas | Hunger ↑ (bervariasi per makanan), Health ↑ sedikit | Per makanan; overfeed jika >3× |
| **Mandikan** | Gosok layar (gesture swipe) | Hygiene → 100, Happiness ↑ kecil | 1 jam |
| **Main** | Pilih mini-game | Happiness ↑ besar, Energy ↓, dapat koin | 30 menit |
| **Tidurkan** | Matikan lampu | Energy pulih, decay lambat | Hanya saat malam / Energy < 30 |
| **Obati** | Beri obat dari tas | Health ↑ 30 | 4 jam |
| **Peluk/Patok** | Ketuk pet 1× | Happiness ↑ kecil, hati muncul | Bebas (max 20/hari utk anti-spam) |
| **Bersihkan Kandang** | Sapu poop (gesture) | Hygiene lingkungan, cegah sakit | Saat ada poop |
| **Mainan Otomatis** | Beli mainan & taruh di kandang | Happiness decay melambat | Pasif |

### 5.1 Sistem "Poop" (Klasik Tamagotchi)
Pet membuang kotoran secara berkala (probabilitas naik setelah makan). Poop yang dibiarkan >2 jam: Hygiene −10, risiko penyakit +15%. Ini memberi rasa "hidup" dan alasan kembali ke game.

### 5.2 Penyakit
- Pemicu: Hygiene rendah lama, overfeed, poop menumpuk, stat nol.
- Gejala visual: pet berkedip murung, awan mendung di atas kepala, termometer ikon.
- Jika tidak diobati dalam 12 jam → Health terus turun → kematian.

---

## 6. Mini-Game (Sumber Koin & Kesenangan)

3 mini-game di v1.0 (masing-masing 30–60 detik per sesi):

1. **🎁 Catch the Falling** — gerakkan pet menangkap makanan yang jatuh, hindari bom. Skor = koin.
2. **🧠 Guess the Cup** — 3 gelap disodok, tebak di mana koin berada. Naikkan taruhan.
3. **🏃 Jump & Run** — endless runner ringan; jarak = koin.

Semua mini-game menggunakan **koin sebagai satu-satunya mata uang** (kesederhanaan ala Tamagotchi asli).

---

## 7. Ekonomi & Toko

| Kategori | Contoh Item | Harga (koin) | Efek |
|---|---|---|---|
| Makanan murah | Roti, Biskuit | 5–10 | Hunger +20–30 |
| Makanan enak | Steak, Kue | 25–50 | Hunger +50, Happiness +10, risiko overfeed |
| Obat | Sirup, Vitamin | 30 | Health +30 |
| Mainan | Bola, Boneka | 50–150 | Happiness decay −50% saat dipasang |
| Dekorasi kandang | Karpet, Lampu, Tanaman | 100–300 | Kosmetik + Happiness pasif kecil |
| Inkubator / Inkubasi cepat | Telur baru | 500 | Mulai pet baru setelah kematian |

**Sink koin:** item dekorasi mahal + obat + makanan premium.
**Sumber koin:** mini-game + hadiah harian login (streak: hari ke-1 = 20, ... hari ke-7 = 200).

---

## 8. UI / UX (Mobile-First, Multi-Scene)

### 8.1 Peta Scene — 12 Layar, Tidak Monoton

| # | Scene | Konsep Jepang | Fungsi Gameplay |
|---|---|---|---|
| 1 | Splash/Title | Pintu torii + sakura berjatuhan, logo hanko "育み" | Identitas brand |
| 2 | **Altar Telur** | Altar kuil Shinto (haiden); 4 telur elemen berbaris, bergetar saat disentuh | Pilih telur (onboarding) |
| 3 | **Layar Nama** | Kertas washi + stempel hanko merah (tekan lama untuk "mencap") | Beri nama pet → menetas |
| 4 | **Rumah (Tatami)** ⭐ | Ruang tatami, shōji (pintu kertas), engawa, kotatsu | **Hub utama** — pet beraktivitas, stat, poop |
| 5 | **Taman (Niwa)** | Taman zen, kolam koi, lentera batu | Main bebas, event, memberi makan di luar |
| 6 | **Onsen/Ofuro** | Pemandian air panas, uap, bambu | Aksi mandikan (gesture menyapu) |
| 7 | **Kamar Futon** | Futon + lampu andon, malam berbintang lewat jendela | Aksi tidurkan |
| 8 | **Dapur** | Rak kayu, kotak bento, ketel besi | Beri makan / pantry |
| 9 | **Toko (Dagashiya)** | Warung permen tradisional, spanduk noren | Ekonomi & item |
| 10 | **Mini-game (Matsuri)** | Festival: menangkap ikan (kingyo-sukui), yagura | 3 mini-game bertema festival |
| 11 | **Breeding House** | Altar jodoh Enmusubi, tali merah | Breeding |
| 12 | **Album Keluarga** | Ruang kenangan berbingkai + foto generasi | Lineage, memorial pet yang telah pergi |

**Navigasi:** Rumah Tatami = hub; berpindah scene lewat pintu shōji / panah tepi layar / swipe kiri-kanan; shortcut bawah untuk Dapur–Onsen–Toko–Album (zona ibu jari).

**Flow onboarding:**
```
[Splash Torii] → [Altar Telur: pilih elemen] → [Nama + cap hanko] → [Menetas!] → [Rumah Tatami]
```

### 8.2 Layar Rumah (Tatami) — layar utama:
```
┌─────────────────────────────────────┐
│  🍽️ ▓▓▓▓▓░░ 72   😊 ▓▓▓▓▓▓░ 85      │  ← bar stat ringkas, ikon berkedip
│                                     │     saat butuh perhatian
│         [  PET SPRITE  ]            │  ← animasi idle/reaksi,
│           💩                        │     poop di lantai
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐   │
│  │ 🍖  │ │ 🛁  │ │ 🎮  │ │ 🛏️  │   │  ← 4 tombol aksi utama
│  └─────┘ └─────┘ └─────┘ └─────┘   │
│  Hari 3 · Lv 4 · 🪙 120   ⚙️        │
└─────────────────────────────────────┘
```

### 8.3 Arah Seni: Tema Jepang & Empat Musim

**Gaya visual:** pixel-art dengan **palet soft pastel** — efisien untuk mobile, tapi tetap hangat seperti anime (bukan dingin ala retro gelap).

**Palet inti:** krem washi `#F5EFE0` · sakura `#F7C8D0` · indigo `#3D4A6B` · matcha `#9DB88A` · kayu hangat `#C9A87C` · aksen hanko merah `#C1443C`.

**Elemen visual Jepang di semua scene:** shōji & tatami, torii, lentera, sakura/momiji, koi, futon, kotatsu, pola seigaiha (gelombang) & asanoha sebagai tekstur latar.

**Empat Musim (kisetsu) — terikat mekanik, bukan tempelan:** 90 hari ≈ 3 musim penuh dalam kehidupan satu pet:

| Musim | Visual | Makanan Musiman | Event |
|---|---|---|---|
| 🌸 Spring | Sakura berjatuhan, tunas hijau | Sakura mochi, onigiri | Hanami (picknick bersama pet) |
| ☀️ Summer | Kunang-kunang, kipas, kemeja yukata | Kakigori, ramune | Matsuri + mini-game festival |
| 🍁 Autumn | Daun momiji merah, kabut pagi | Ubi panggang, kuri (kacang) | Tsukimi (menonton bulan) |
| ❄️ Winter | Salju turun, nafas uap, kotatsu | Oden, nabe panas | Tahun baru: torii pertama, omikuji |

- Musim pet **ditentukan saat telur dipilih** (lifecycle mengikuti musim, bukan kalender real) → setiap pet "merasakan" musimnya sendiri; musim berubah tiap ~22 hari hidup pet.
- Komposisi warna langit & dekor scene berubah per musim + per fase waktu (pagi/siang/sore/malam §9.1) = variasi visual 4×4 = 16 suasana tanpa scene baru.

**Audio:** ambient koto/shamisen lembut, lonceng kuil saat evolusi, jangkrik (musim panas), hujan (gugur), salju senyap (dingin); SFX lembut untuk aksi (gosok onsen = suara air).

**Prinsip UX:**
- **Ikon berkedip** ketika ada kebutuhan mendesak (bahasa visual Tamagotchi klasik).
- **Notifikasi push** (jika platform mendukung) saat stat < 20 atau pet sakit.
- Pet **selalu merespons sentuhan** — tidak ada interaksi yang terasa "mati".
- Dialog evolusi & kematian dibuat emosional (layar khusus, bukan sekadar teks).

---

## 9. Sistem Real-Time & Offline Progress (Jantung Game)

Ini **fitur paling krusial** — pet tetap "hidup" saat game ditutup:

1. Setiap kali state berubah, simpan **timestamp UTC** ke penyimpanan lokal.
2. Saat game dibuka lagi, hitung `deltaTime = now - lastSaved`.
3. Terapkan seluruh decay stat secara batch (`decay × jam`), proses poop, penyakit, evolusi, hingga **kematian** yang terjadi saat offline.
4. Tampilkan layar ringkasan: *"Selama kamu pergi (7 jam 20 mnt), Blobby mengantuk dan kandang kotor."*

**Pembatasan anti-frustrasi (penting!):**
- Decay offline dibatasi maksimum: stat tidak akan turun di bawah 5 hanya karena pemain tidur 8 jam (dilunakkan vs decay realtime).
- Pet tidak bisa mati dalam 24 jam pertama (grace period pemain baru).
- Mode "Tidur" saat pemain offline malam = decay sangat lambat.

### 9.1 Siklus Pagi–Siang–Sore–Malam (Real-Time)

Game mengikuti **jam lokal pemain** sehingga dunia terasa hidup dan sinkron dengan keseharian:

| Fase | Jam (lokal) | Suasana Kandang | Perilaku Pet & Efek |
|---|---|---|---|
| 🌅 Pagi | 05:00–10:00 | Langit jingga, kabut tipis, burung berkicau | Bonus "sarapan": makan pagi memberi +5 Happiness ekstra |
| ☀️ Siang | 10:00–15:00 | Terang penuh, tanaman hijau cerah | Waktu terbaik untuk main & mini-game (koin +10%) |
| 🌆 Sore | 15:00–19:00 | Cahaya hangat, bayangan panjang | Pet cenderung nostalgia (dialog spesial sore) |
| 🌙 Malam | 19:00–05:00 | Gelap, lampu kandang, kunang-kunang | Pet mengantuk (Energy decay ×1.5 jika dipaksa bangun); tidur malam memulihkan +50% lebih efisien |

**Aturan desain:**
- Transisi fase **halus** (gradient langit berubah bertahap selama 15 menit), bukan lompatan.
- Item dekorasi bereaksi: lampu menyala otomatis malam, bunga mekar siang.
- Event eksklusif per fase (mis. kunang-kunang malam bisa dikumpulkan jadi dekorasi).
- Untuk pengujian/dev: tersedia opsi "time-lapse" di pengaturan (mempercepat waktu ×10, hanya mode debug).

---

## 10. Arsitektur Teknis (Pet State Machine)

```
                    ┌──────────┐
        ketuk/idle  │   EGG    │
       ┌───────────>│ (inkubasi)│
       │            └────┬─────┘
       │                 │ inkubasi selesai
       │                 ▼
       │            ┌─────────┐   stat parah    ┌────────┐
  ┌────┴─────┐      │  IDLE   │────────────────►│ SICK   │
  │ SLEEPING │◄─────┤ (normal)│                 └───┬────┘
  └────┬─────┘      └──┬───┬──┘◄──── obat ───────────┘
       │               │   │
       │  Energy rendah│   │ pemain main
       │  + malam      │   └──────────► ┌──────────┐
       │               ▼                │  PLAYING │ (mini-game)
       │          ┌─────────┐           └──────────┘
       └─────────►│ EVOLVING│ (cutscene animasi)
                  └────┬────┘
                       │ Care Score menentukan bentuk
                       ▼
                  [ bentuk baru ] ── Health = 0 ──► [ DEAD / MEMORIAL ]
```

**Modul kode (perkiraan):**
| Modul | Tanggung Jawab |
|---|---|
| `PetStats` | 6 stat + decay + clamp + event "stat berubah" |
| `PetStateMachine` | EGG → IDLE → SLEEP/SICK/PLAY/EVOLVE/DEAD |
| `TimeService` | tick realtime, offline catch-up, siang/malam |
| `CareScore` | rolling history 24 jam, kalkulasi evolusi |
| `EvolutionSystem` | tabel evolusi per spesies |
| `Economy/Inventory` | koin, item, kulkas |
| `MiniGameBase` | antarmuka 3 mini-game |
| `SaveSystem` | localStorage (web) / file (native), autosave tiap aksi |
| `UIManager` | layar & dialog |
| `SpriteAnim` | frame animation idle/eat/sleep/sick/dead |

---

## 11. Teknologi (TERKUNCI v0.4) — TS Monorepo + Phaser + Capacitor

- ✅ **TypeScript monorepo (ports & adapters)** — logika game murni (`packages/core`) terpisah total dari platform; renderer/storage/LLM = adapter yang bisa ditukar. Detail: `docs/09`.
- ✅ **UI = React + TSX; Game = Phaser 3** (v0.5): Phaser menggambar canvas (pet/scene/fx); React menggambar semua UI overlay (HUD, menu, chat) di atasnya. Aturan: React tak pernah menyentuh objek Phaser; data mengalir core → store → React satu arah.
- ✅ **Mobile-first:** orientasi **portrait 9:16**, UI di zona ibu jari (bawah), target sentuh ≥48px, gesture alami (usap = belai, sapu = mandi, ketuk = patok).
- ✅ **Native:** shell **Capacitor** membungkus build web → APK/IPA; PWA tetap rilis pertama.
- ✅ **Backend: Supabase** (MVP) — edge function proxy LLM (Doc 11), auth ringan, nanti breeding antar-pemain.
- ✅ **Companion LLM:** `ILlmProvider` multi-provider (OpenAI/Gemini/Ollama/**offline fallback**) + memori 2 tingkat — pet hidup tanpa internet.
- ✅ Performa/baterai: decay dihitung dari timestamp (bukan loop konstan), animasi hemat, canvas resolusi tetap dengan scaling.
- ✅ Penyimpanan: localStorage + backup export/import base64 (pet hidup 90 hari — kehilangan save = tragedi).
- ✅ Aset: pixel-art dengan Aseprite (palet §8.3); awal pakai placeholder blok warna.

---

## 12. Roadmap Pengembangan

> ⚠️ **Rincian pengerjaan & checklist hidup ada di [`ROADMAP.md`](ROADMAP.md)** — tabel di bawah hanya ringkasan.

| Milestone | Isi | Estimasi |
|---|---|---|
| **M1 — Playable Core** | 1 kitsune, 6 stat + decay, makan/bersih/tidur, save/load, scene Rumah Tatami (placeholder art) | 1–2 minggu |
| **M1.5 — Onboarding** | Splash Torii, Altar Telur (pilih elemen), layar Nama + cap hanko, animasi menetas | 3–4 hari |
| **M2 — Loop Lengkap** | Poop, penyakit, mini-game #1, koin & toko sederhana | 1 minggu |
| **M3 — Evolusi** | Care Score, evolusi bercabang, layar evolusi, telur → dewasa | 1 minggu |
| **M4 — Retensi** | Offline progress + layar ringkasan, hadiah login, mini-game #2–3, level | 1 minggu |
| **M5 — Polish** | Animasi sprite final, audio, tutorial, kematian/memorial, balance | 1 minggu |
| **M6 — Companion & Siklus Hari** | Balon bicara kontekstual, chat template, siklus pagi–malam + suasana kandang | 1 minggu |
| **M7 — Breeding Offline** | Breeding House/NPC, genetika turunan, pohon keluarga, telur tipe elemen di awal game | 1–2 minggu |
| **M8 — Breeding Online (Fase 2)** | Friend code / breeding code asinkron via Supabase | 1–2 minggu |
| **M9 — Companion LLM** | Memory 2 tingkat, `ILlmProvider` + 4 adapter, Supabase chat proxy, guardrail (Doc 11) | 1–2 minggu |

> 💰 **Monetisasi (kuota chat & subscribe): DITUNDA** — arahan tersimpan di `docs/11-companion-llm-memory.md §6`; tidak didesain/diimplementasi sebelum M1–M7 selesai.

---

## 13. Balance & KPI

- **Sesi ideal:** 8–15 kali buka game/hari × 1–3 menit.
- **Tingkat kematian di minggu pertama:** target 20–40% (rasa takut kehilangan = retensi, tapi jangan kejam di awal → grace period 24 jam).
- **Retensi D7 target:** > 25% (benchmark casual sim).
- **Metrik internal:** rata-rata Care Score, jumlah mini-game per hari, koin dipegang.

## 14. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Pemain bosan setelah evolusi | Koleksi multi-pet (rumah kedua), event musiman |
| Pet mati = pemain pergi | Memorial + bonus "warisan" untuk telur berikutnya (+10% koin) |
| Real-time decay terlalu kejam | Pembatasan offline decay + mode tidur |
| Aset seni mahal | Mulai pixel-art 32×32, palet 16 warna, 8 frame per animasi |

## 15. Sistem Breeding & Keturunan (Warisan Keluarga)

Karena pet bisa mati (kelalaian **atau** tua wajar di ±90 hari), breeding adalah cara pemain **meneruskan garis keturunan** — mengubah kehilangan menjadi kelanjutan.

### 15.1 Syarat Breeding
- Pet berumur minimal **20 hari (Dewasa)** dan masih hidup.
- Happiness ≥ 70 dan Health ≥ 80.
- Cooldown 7 hari per pet; maksimal **4 keturunan** per pet seumur hidupnya.

### 15.2 Dua Jalur Breeding

**A. Store / NPC Breeding (Fase 1 — offline-first, tanpa server):**
- Pemain membawa pet-nya ke "Breeding House" dan memasangkan dengan pet NPC.
- Hasil telur mengikuti elemen salah satu induk + peluang kecil mutasi (termasuk telur Mistik ✨ ±5%).
- Berbayar koin (500) — sink koin jangka panjang.

**B. Breeding Antar-Pemain (Fase 2 — online, asinkron):**
- Pemain menukar **Friend Code / Breeding Code** (bukan real-time — cukup kirim-request, server mencocokkan gen, hasil telur muncul saat kedua pemain membuka game).
- Tidak butuh server real-time → murah dioperasikan; cukup API sederhana + database.

### 15.3 Genetika Keturunan

| Sifat Turunan | Cara Mewarisi |
|---|---|
| Elemen | 70% dari salah satu induk, 25% campuran (elemen baru), 5% mutasi (Mistik) |
| Warna/pola | Kombinasi acak kedua induk (palet mix) |
| Kepribadian | Salah satu dari induk atau variasi baru |
| Bonus stat awal | +1–5% rata-rata stat induk saat lahir |

- **Pohon Keluarga (Lineage Tree):** layar album keluarga — generasi ke-1, ke-2, dst. Generasi tinggi membuka title/dekorasi eksklusif ("Keluarga Generasi 5").
- **Warisan (Legacy) saat pet mati:** koin bonus, 1 item kesayangan diwariskan, dan telur keturunan yang sudah ada tetap hidup → pemain tidak mulai benar-benar dari nol.

---

## 16. Sistem Companion — Pet Bicara & Merespons

Agar pemain "benar-benar merasa memiliki", pet tidak pasif:

1. **Balon Bicara Kontekstual** — pet mengucapkan kalimat pendek sesuai konteks:
   - Stat: *"Perutku koroong..."* (Hunger < 30), *"Aku gatal-gatal!"* (Hygiene < 30)
   - Waktu: pagi → sapaan, malam → mengantuk
   - Kepribadian (per elemen): Api berkata kasar-energik, Air pemalu-lembut
   - Memori: mengingat kejadian (*"Kamu lupa memberiku makan kemarin..."*)
2. **Tombol Obrolan (Chat)** — pemain mengetik pesan singkat; pet merespons dengan **jawaban template pintar berbasis kata kunci** (MVP, offline, tanpa server).
3. **Chat LLM (Tier 2, opsional):** percakapan bebas via `ILlmProvider` multi-provider (offline fallback wajib) dengan memori dua tingkat + guardrail — detail teknis di `docs/11-companion-llm-memory.md`.

**Aturan:** dialog pet hanya menggigit perasaan secara lembut (tidak menghukum pemain dengan kata-kata menyakitkan) — rasa bersalah datang dari visual pet yang murung, bukan dari omelan.

---

## 17. Langkah Selanjutnya

1. ✅ GDD v0.4 — stack terkunci (TS monorepo + Phaser + Capacitor + Supabase), companion LLM 2 tingkat
2. ⬜ Desain detail layout UI per scene (wireframe) — pembahasan berikutnya
3. ⬜ Buat **M1 Playable Core**: monorepo + `packages/core` (PetStats, TimeService, SaveSystem) + scene Rumah Tatami
4. ⬜ Playtest internal, iterasi balance decay (kalibrasi siklus 90 hari)
5. ⬜ Lanjut M2–M9 sesuai roadmap; monetisasi ditunda (Doc 11 §6)

---

*Dokumen ini adalah panduan hidup — akan diperbarui seiring playtest & keputusan desain.*
