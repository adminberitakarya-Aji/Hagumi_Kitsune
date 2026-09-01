# DOC 05 — Mini-Game Festival (3 Game) 🎪

> Sumber desain: GDD §6. Semua bertema matsuri; 30–60 detik per sesi; sumber koin utama.

## 1. Aturan Umum Semua Mini-Game

| Aturan      | Nilai                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------- |
| Energi      | −12 per sesi (ditolak bila energy < 15 — Doc 01 §2)                                                 |
| Happiness   | +8 sampai +20 sesuai performa                                                                       |
| Koin        | formula di §5                                                                                       |
| Cooldown    | 30 menit (semua mini-game berbagi cooldown)                                                         |
| Skala sulit | mengikuti tahap hidup: baby terkunci · teen mudah · adult sedang · elder pelan tapi bonus +10% koin |
| Elemen      | bonus elemen per game (§2–§4)                                                                       |

## 2. Kingyo-Sukui (Tangkap Ikan Koi) 🎏

- **Mekanik:** poi (kertas bulat di ring) digerakkan dengan sentuh; ikan berenang melintas; sentuh & tahan di atas ikan untuk menangkap — poi **basi bertahap** (kertas menipis, 3 tahap retak) dan robek bila digerakkan terlalu cepat.
- 45 detik. Ikan biasa = 10 poin, koi emas (jarang, cepat) = 50 poin. Poi tambahan bisa dipungut di air (maks +1).
- **Bonus elemen `water`:** poi awal lebih kuat (tahan 4 tahap).

## 3. Wanage (Lempar Ring) ⭕

- **Mekanik:** timing meter — ring meluncur, sentuh di zona kuning/merah untuk lempar ke tiang target (jarak & angin acak per lemparan). 8 lemparan.
- Tiang: biasa 10 poin, tiang emas (kecil, jauh) 40 poin, tiang bergerak 30 poin.
- **Bonus elemen `wind`:** indikator angin lebih jelas (biasa disembunyikan sebagian).

## 4. Kitsune-Dash (Lari Lompat) 🏃

- **Mekanik:** endless runner 60 detik atau sampai menabrak — ketuk = lompat, tahan = lompat tinggi; rintangan lentera/pagar; koin di jalur udara.
- Jarak 10 m = 1 poin; koin jalur = 2 koin langsung.
- **Bonus elemen `fire`:** dash sekali per sesi (tembus rintangan).

_(Elemen `earth`: +1 poi/lembaran cadangan di dua game pertama; `mystic`: koin akhir +10% — semua elemen punya keunggulan.)_

## 5. Formula Koin

```
koin = floor(base_poin × 0.5)
     × seasonMultiplier (matsuri musiman ×1.5 — Doc 03 §5)
     × dayPhaseMultiplier (siang ×1.1 — Doc 03 §3)
     + streakDailyBonus (bila hari login ke-7)
```

Contoh: poin 120, siang, biasa → `floor(120×0.5)=60 ×1.1 = 66 koin`.

## 6. UI Mini-Game

- Layar pra-main: judul, aturan 1 kalimat, best score, tombol `[Main]` (menampilkan biaya energi).
- HUD in-game: poin, waktu, sisa poi/lemparan. Hasil: skor, koin, Happiness gained, best score baru → bintang.
- Kegagalan bukan hukuman: selalu ada koin minimal 5.

## 7. Acceptance Criteria

- [ ] Ketiga game dimainkan penuh dengan sentuh saja, 60fps di mid-range.
- [ ] Koin dihitung sesuai formula §5 dan langsung masuk inventory + autosave.
- [ ] Cooldown 30 menit ditegakkan; energy −12 dipotong sebelum main.
- [ ] Sulit sesuai tahap hidup; baby tidak bisa akses; elder dapat bonus.
