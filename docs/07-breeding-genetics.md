# DOC 07 — Breeding, Genetika & Warisan 💞

> Sumber desain: GDD §15. Breeding = jawaban atas kematian pet; kualitas genetika = alasan pemain merawat dengan baik.

## 1. Syarat Breeding

| Syarat             | Nilai                                 |
| ------------------ | ------------------------------------- |
| Tahap              | `adult` (hari 20–60)                  |
| Health & Happiness | masing-masing ≥ 80                    |
| Cooldown           | 7 hari per pet                        |
| Kuota              | maks 4 keturunan per pet seumur hidup |
| Biaya              | 500 koin (jalur NPC)                  |

## 2. Dua Jalur

**A. Breeding House — NPC (Fase 1, offline):**

1. Masuk S11 dengan pet memenuhi syarat → altar menyala.
2. Pilih mitra NPC dari 3 pilihan harian (elemen berbeda, ditampilkan preview warna anak).
3. Bayar 500 koin → animasi tali merah mengikat → telur muncul di altar rumah (inkubasi normal, Doc 01 §3).
4. Pet induk mendapat cooldown 7 hari + Happiness +10.

**B. Breeding Antar-Pemain (Fase 2, online asinkron):**

- Pemain menyalin **Breeding Code** (base64 berisi hash gen pet: element, warna, personality, careTier).
- Menu "Tukar Kode" → tempel kode teman → request terkirim ke API sederhana (endpoint: `POST /breeding-requests`, polling saat buka game).
- Hasil telur muncul saat kedua pihak buka game. **Tidak butuh real-time server.**

## 3. Algoritma Genetika (pseudocode wajib identik implementasi)

```
child.element:
  r = random()
  r < 0.70 → element salah satu induk (50/50)
  r < 0.95 → elemen "mix" (tabel kombinasi: fire+water→steam(gray) dst.)
  else     → "mystic" ✨ (5%)

child.palette:
  mix HSV induk A (60%) + induk B (40%) + jitter ±6° hue

child.personality:
  60% waris dari induk yang memberi elemen · 40% variasi baru

child.startBonus:
  +1%..5% dari rata-rata stat induk saat lahir (tier: rata-rata careScore induk ≥80 → 5%)

child.careScore awal = 50 (netral)
```

- `careTier` induk (jalur Zenko/Yako saat ini) hanya memengaruhi % warna langka — tidak menjamin anak sama (mencegah "farm tenko").

## 4. Lineage Tree (Album Keluarga — Doc 02 S12)

```json
"lineage": {
  "gen": 2,
  "parents": [
    { "name": "Kogitsune", "element": "fire", "livedDays": 91, "path": "zenko", "photo": "gen1_kogitsune.png" }
  ],
  "ancestors": [ /* rekursif, maks tampil 3 generasi */ ]
}
```

- Bonus generasi: tiap gen ≥2 → title di profil + koin warisan +10% kumulatif (maks +50%).

## 5. Warisan (Saat Pet Mati)

| Warisan         | Nilai                                                               |
| --------------- | ------------------------------------------------------------------- |
| Koin kenangan   | 100 + 10×livedDays melewati 30 (maks 600)                           |
| Item kesayangan | 1 item decor/toy terpilih diwariskan                                |
| Keturunan hidup | Telur/anak yang sudah ada tetap jalan (pemain tidak mulai dari nol) |
| Memorial        | foto + nama + jalur evolusi tersimpan di Album                      |

## 6. Acceptance Criteria

- [ ] Semua syarat §1 ditegakkan (tombol nonaktif + alasan ditampilkan).
- [ ] 1000 simulasi genetika: distribusi elemen ±(70/25/5)%, mystic muncul dari breeding.
- [ ] Warisan otomatis masuk save pemain setelah layar memorial.
- [ ] Album menampilkan silsilah benar hingga 3 generasi.
