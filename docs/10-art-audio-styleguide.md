# DOC 10 — Gaya Seni & Audio 🎨🔊

> Sumber desain: GDD §8.3. Kontrak visual — semua aset harus konsisten dengan dokumen ini.

## 0. REVISI v2 — FLAT VECTOR KAWAII (04/09/2026) ⭐

**Keputusan (persetujuan owner):** gaya resmi HAGUMI = **flat vector kawaii** — bukan pixel-art.
Alasan: audiens all-age casual & standar visual virtual pet top Play Store (Adorable Home, Animal
Restaurant); pixel terbukti niche nostalgia dan membatasi animasi (rotasi/squash dilarang grid).

- **§1–3 pixel-art di bawah = v1 (LEGACY)** — dipertahankan sebagai fallback renderer (`foxPixels.ts`); BUKAN acuan aset baru.
- **Aturan gaya v2:**
  - Bentuk bulat membulat; kepala besar ±40% tinggi karakter; kaki gemuk pendek; ekor tear-drop
  - Outline 1 warna per elemen (`line`), lebar optis ±0.7px pada slot 32, lineJoin/lineCap round
  - Shading 2-tone: base + `shade` (alpha ±0.3) di sisi bawah bentuk
  - Mata besar glossy (2 kilau putih), blush sakura alpha, mulut kecil
  - **Rotasi & squash-stretch LEGAL** — wag ekor = rotasi; zoomies (M13) bebas ekspresi
  - Render: canvas path di-supersample ×4 → slot texture tetap 32×32; dewasa ×2 di layar
- **Ikon UI = vector icons** (revisi Doc 14 §3: bukan pixel 24×24 — tetap ukuran 24, gaya bulat sejajar karakter)
- **BG**: tetap prosedural (`bgArt.ts`), bentuk membulat + gradient langit — palet §2 tetap berlaku
- **Palet**: 28 slot terkunci (Doc 17 §2) TIDAK berubah
- **Audio §5 di bawah tetap berlaku penuh.**

## 1. Gaya

- **Pixel-art, palet soft pastel**, garis bersih, outline tipis warna gelap terang (bukan hitam pekat).
- Semua sprite dibuat pada **ukuran dasar**, lalu diskalakan bulat (×1/×2/×4) — anti blur: `image-rendering: pixelated`.

## 2. Palet Inti (maks 24 warna total; sprite pakai subset)

| Peran             | Hex       | Pemakaian                    |
| ----------------- | --------- | ---------------------------- |
| Washi (bg terang) | `#F5EFE0` | panel, kertas, langit pagi   |
| Sakura            | `#F7C8D0` | kelopak, aksen musim semi    |
| Indigo (bg gelap) | `#3D4A6B` | langit malam, teks           |
| Matcha            | `#9DB88A` | taman, musim semi            |
| Kayu hangat       | `#C9A87C` | tatami, altar, rak           |
| Hanko (aksen CTA) | `#C1443C` | tombol utama, stempel, torii |
| Tinta (teks)      | `#2B2B33` | semua teks                   |
| Bayangan          | `#8A8296` | bayangan objek, dim          |

Recolor elemen kitsune: swap palet (fire: oranye-merah; water: biru pucat; wind: krem; earth: hijau-cokelat; mystic: ungu).

## 3. Ukuran Standar Aset

| Aset             | Ukuran dasar (px)                       | Catatan                     |
| ---------------- | --------------------------------------- | --------------------------- |
| Kitsune          | 32×32 (bayi) / 48×48 (dewasa)           | 12 klip animasi (Doc 01 §6) |
| Poop/objek kecil | 16×16                                   |                             |
| Properti scene   | 32×32 – 64×64                           | kotatsu, lentera, futon     |
| Background scene | 360×420 (portrait, atas 360×280 langit) | tileable bila bisa          |
| Ikon UI          | 24×24 (HUD) / 48×48 (tombol)            |                             |
| Telur            | 24×24                                   | 4 elemen                    |

Format: PNG (sprite) · tilemap bila perlu. Naming: `sprite_<subjek>_<aksi>_<frame>.png`, `bg_<scene>_<musim>.png`.

## 4. Komponen UI (gaya washi)

| Komponen     | Spesifikasi                                                                                                                         |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Panel/dialog | krem washi + border indigo 2px + sudut 8px; pola seigaiha samar di bg                                                               |
| Tombol utama | hanko merah `#C1443C`, teks krem, tekan = scale 0.94 + bunyi cap                                                                    |
| Stat bar     | latar krem, isi warna stat (hunger=oranye, happiness=pink, energy=kuning, hygiene=biru, health=merah muda); ikon berkedip saat < 30 |
| Balon bicara | putih, ekor menunjuk pet, teks max 2 baris                                                                                          |
| Modal        | kertas washi penuh 70% lebar + tombol hanko                                                                                         |
| Font         | pixel font: "Hachi Maru Pop"/"DotGothic16" (Google Fonts, fallback sistem); angka = font pixel                                      |

**Aksesibilitas:** kontras teks ≥ 4.5:1, target sentuh ≥ 48px, tidak ada informasi hanya-via-warna (ikon selalu mendampingi).

## 5. Audio

| Jenis         | Isi                                                                                                            | Format            |
| ------------- | -------------------------------------------------------------------------------------------------------------- | ----------------- |
| Musik ambient | 4 trek musim (koto/shamisen lembut, loop 60–90 dtk) + varian malam (lebih pelan)                               | ogg + m4a         |
| SFX aksi      | cap hanko, lonceng kuil (evolusi), siraman onsen, gigitan, koin, menetas, tidur (nafas lembut), sakit (bersin) | ogg pendek <1 dtk |
| Ambience      | jangkrik (summer), hujan (autumn), angin (winter), burung (spring) — layer per musim                           | ogg               |

- Volume musik −12 dB di bawah SFX; pengaturan on/off terpisah (musik & SFX), tersimpan di save.
- Audio mulai HANYA setelah interaksi pertama (kebijakan autoplay browser/mobile).

## 6. Acceptance Criteria

- [ ] Semua sprite memakai palet §1 (audit warna otomatis dari tool Aseprite).
- [ ] Recolor 5 elemen dari 1 set file dasar berjalan otomatis di pipeline.
- [ ] Musik loop mulus tanpa jeda terdengar; SFX tidak menumpuk (voice limit).
- [ ] Kontras & ukuran sentuh lolos checklist aksesibilitas.
