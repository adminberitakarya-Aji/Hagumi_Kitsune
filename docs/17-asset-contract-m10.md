# DOC 17 — Kontrak Aset M10 📦

> Sumber: ROADMAP M10 (Seni Final & Identitas Visual). Kontrak ini MENGUNTING implementasi:
> daftar aset lengkap, palet terkunci, pipeline produksi, dan acceptance criteria.
> Status: 🔨 — dikunci 04/09/2026.

## 1. Keputusan Produksi (penting) — **DIREVISI 04/09 v2**

- **⚠️ REVISI (04/09):** gaya seni resmi = **FLAT VECTOR KAWAII** (Doc 10 §0) — renderer utama
  `apps/web/src/game/art/foxVector.ts` (canvas path, supersample ×4, rotasi/squash legal).
  Pixel-map (`foxPixels.ts`) turun menjadi **fallback/legacy**.
- **Sprite = renderer di kode (bukan PNG terpisah).** KITSUNE digambar via canvas path ke
  canvas texture saat boot (pola yang sudah dipakai sejak M5). Manfaat: recolor 5 elemen otomatis
  tetap, nol aset file di repo, anti-blur terjaga, mudah di-review di git.
- **Part-swap animation** (ala studio pixel-art): badan/kepala/ekor/kaki = layer terpisah yang
  ditukar per frame — klip baru (M13: run/sit/sniff) cukup menambah layer, bukan menggambar ulang.
- PNG asli hanya untuk **key art landing** (Doc 16) & **store listing** (M15/M19) — bukan sprite runtime.

## 2. Palet Terkunci — 28 slot (revisi dari 24 di Doc 10 §2)

| Kelompok | Slot | Warna |
| -------- | ---- | ----- |
| Inti UI (8) | washi, sakura, indigo, matcha, wood, hanko, ink, shadow | `#F5EFE0` `#F7C8D0` `#3D4A6B` `#9DB88A` `#C9A87C` `#C1443C` `#2B2B33` `#8A8296` |
| Elemen × 5 (20) | tiap elemen: body, belly, line, shade, inner, accent, eye (eye berbagi ink) | lihat `palette.ts` (ELEMENT_PALETTE + ELEMENT_SHADE) |

> Revisi: "maks 24" Doc 10 tidak cukup untuk 5 elemen × (body/belly/line/shade) — dikunci jadi
> **28 slot terkunci**; sprite hanya boleh memakai subset slot ini (audit via palet di kode).

## 3. Inventory Aset

### 3.1 Kitsune 32×32 (48 dewasa = scale ×2) — 12 klip × 5 elemen

| Klip | Frame | Layer yang berubah |
| ---- | ----- | ------------------ |
| idle / idle_happy / idle_sad | 4/4/4 | ekor (2 varian), mata, telinga |
| walk | 6 | kaki (3 fase × 2), bob, ekor |
| eat | 6 | kepala turun, mulut buka-tutup |
| sleep / dead | 4/1 | pose rebah (body+head+tail direposisi), mata |
| sick | 4 | kepala turun, telinga rebah, keringat |
| petted | 5 | mata ^, ekor wag, hati |
| bathe | 6 | garis air, kepala, gelembung |
| evolve | 10 | aura kilau progresif |
| tail_wag | 2 | ekor saja |

### 3.2 Background & properti (prosedural dipertahankan, gaya dikunci)

- `bg_<scene>_<musim>` 360×420 — 12 scene × 4 musim (generator `bgArt.ts`, palet slot §2).
- Properti scene 32–64px: kotatsu, lentera tōrō, futon, altar, rak, kolam koi.
- Objek 16×16: poop ×3 tahap, koin, makanan katalog `items.json`.

### 3.3 Ikon pixel UI 24×24 (Doc 14 §3 — menggantikan SEMUA emoji)

| Grup | Daftar |
| ---- | ------ |
| Aksi bar (6) | dapur, onsen, futon, toko, album, chat |
| Stat (6) | hunger, happiness, energy, hygiene, health, koin |
| HUD (10) | gear, waktu ×4, musim ×4 |
| Status (6) | sakit, offline, poop, love, zzz, warning |
| Nav (4) | kembali, tutup, panah, ceklis |

## 4. Pipeline

1. Pixel-map (`foxPixels.ts`, `iconsPixels.ts`) → digambar pixel-perfect ke canvas → texture Phaser (key tetap: `kitsune_<element>`, `icon_<nama>`).
2. Recolor: 1 set peta karakter × `ELEMENT_PALETTE` + `ELEMENT_SHADE` = 5 elemen.
3. Dewasa = scale bulat ×2 (`setScale(2)`, anti-blur — Doc 10 §1).
4. Atlas: 1 canvas berisi semua frame klip (sudah begini sejak M5 — cold start terjaga).

## 5. Naming

- Peta pixel: konstanta UPPER_SNAKE (`TAIL`, `BODY`, `HEAD`, `ICON_DAPUR`).
- Texture/anim key: TIDAK BERUBAH dari M5 (`kitsune_<element>`, `kitsune_<element>_<clip>`).

## 6. Acceptance Criteria (kontrak)

- [ ] Nol karakter warna di luar 28 slot (audit: renderer hanya menerima palet terkunci)
- [ ] 12 klip ter-render semua elemen; anim keys tak berubah (scene tanpa edit)
- [ ] `pnpm typecheck` / `test` / `build` bersih
- [ ] Gerbang visual (side-by-side lama vs baru) — butuh mata manusia, tersisa di ROADMAP
