# DOC 02 — Multi-Scene: 12 Layar 🏯

> Sumber desain: GDD §8. Dokumen ini = spesifikasi layout & interaksi per scene.

## 1. Konvensi Umum Scene

- **Orientasi portrait 9:16.** Resolusi desain logis: **360×640 px** (dikalikan scale per device).
- Setiap scene = satu `Scene` class dengan siklus hidup: `preload → create → show → update → hide`.
- HUD global (nama, hari, koin, panah navigasi) digambar oleh `UIManager`, bukan scene.
- Transisi antar scene: **wipe tirai shōji** (0.4 s) atau fade; swipe horizontal = scene tetangga.

## 2. Daftar Scene

### S1 — Splash/Title (`splash`)
- Torii merah, sakura berjatuhan (partikel), logo "HAGUMI 育み" stempel hanko.
- Tombol: `[Mulai]` `[Lanjutkan]` (muncul jika ada save). Ketuk layar = sakura berguguran lebih deras (sentuhan hidup).
- Aset: bg torii, logo, partikel sakura.

### S2 — Altar Telur (`egg_altar`) — onboarding saja
- 4 telur elemen di atas altar kayu; ketuk telur → goyang + kilau; pemilih elemen mengunci pilihan.
- Detail: Doc 04.

### S3 — Layar Nama (`naming`) — onboarding saja
- Kertas washi + kolom nama (maks 12 char) + tombol hanko (tekan lama 0.8 s → "cap!" + getar).
- Detail: Doc 04.

### S4 — Rumah Tatami (`home`) ⭐ hub utama
- Layout (atas→bawah): jendela shōji (langit per musim/jam) · tatami + kitsune bergerak bebas · meja kotatsu · pintu sisi kiri/kanan (→ Taman, → Dapur) · shortcut bawah: 🍖 Dapur | ♨️ Onsen | 🛏️ Futon | 🏪 Toko | 📖 Album.
- Interaksi: usap kitsune = belai (Happiness +2, hati), ketuk = patok (balon bicara), poop di lantai (sapu = bersih-bersih).
- Objek dekorasi yang dibeli di Toko muncul di ruangan (slot dekorasi: 4 titik tetap).
- Aset: bg tatami+shōji, kotatsu, slot dekorasi, poop, bayangan.

### S5 — Taman Zen (`garden`)
- Kolam koi (koi berenang = animasi ambient), lentera batu (menyala malam), batu zen.
- Interaksi: beri makan koi (Happiness pet +3, koin −5), duduk di bangku → mode "tsukimi/hanami" (streak Happiness), event musiman (Doc 03 §5).
- Aset: bg taman, koi ×3 warna, lentera, bangku.

### S6 — Onsen/Ofuro (`onsen`)
- Kolam uap; aksi mandi = **gesture menyapu** punggung kitsune 5× → hygiene 100, uap naik, wajah nikmat.
- Kalau dipaksa saat health rendah: pet masuk tapi ekor terkulai (feedback visual).
- Aset: bg onsen, uap (partikel), ember, handuk.

### S7 — Kamar Futon (`bedroom`)
- Futon + lampu andon; aksi tidurkan → lampu redup, kitsune masuk futon, layar gelap lembut; bangunkan = ketuk futon (dengan konsekuensi GDD §5).
- Aset: bg kamar, futon (kosong/terisi), lampu andon 2 state.

### S8 — Dapur (`kitchen`)
- Rak item makanan milik pemain (dari inventory); pilih item → animasi kitsune makan.
- Pantry kosong → tombol ke Toko.
- Aset: bg dapur, ikon 12 makanan, animasi ketel.

### S9 — Toko Dagashiya (`shop`)
- Tab: Makanan | Obat | Mainan | Dekorasi | Telur (breeding). Harga & stok: Doc 06.
- Preview dekorasi sebelum beli (ikon muncul di slot rumah).
- Aset: bg warung noren, ikon item, tombol beli.

### S10 — Matsuri Mini-Game (`festival`)
- Lobi 3 mini-game + skor tertinggi; detail mekanik: Doc 05.
- Aset: bg festival malam, lampion, tenda permainan.

### S11 — Breeding House (`breeding`)
- Altar Enmusubi + tali merah; alur & genetika: Doc 07.
- Aset: bg altar, tali merah, telur hasil.

### S12 — Album Keluarga (`album`)
- Grid foto generasi (thumbnail sprite + nama + rentang hidup + jalur evolusi); pet mati = foto berbingkai hitam dengan bunga.
- Aset: bg ruangan, frame foto, ikon bunga.

## 3. Matriks Ketersediaan Aksi per Scene

| Aksi | Home | Taman | Onsen | Kamar | Dapur | Toko | Matsuri |
|---|---|---|---|---|---|---|---|
| Belai/patok | ✔ | ✔ | — | — | — | — | — |
| Beri makan | — | (koi) | — | — | ✔ | beli | — |
| Mandikan | — | — | ✔ | — | — | — | — |
| Tidurkan | — | — | — | ✔ | — | — | — |
| Poop sapu | ✔ | — | — | — | — | — | — |
| Mini-game | — | — | — | — | — | — | ✔ |
| Breeding | — | — | — | — | — | — | (S11) |

## 4. Acceptance Criteria

- [ ] 12 scene dapat dimuat & keluar masuk tanpa memory leak (dispose aset per scene).
- [ ] Navigasi konsisten (hub = Home; shortcut selalu di tempat sama).
- [ ] Semua aksi hanya tersedia di scene sesuai matriks §3.
- [ ] Transisi tidak pernah >0.5 s; tidak ada frame freeze saat pindah scene.
