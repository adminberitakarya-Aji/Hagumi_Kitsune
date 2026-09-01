# DOC 03 — Sistem Waktu: Real-Time, Offline, Pagi–Malam, Musim ⏰

> Sumber desain: GDD §3.1, §9. Dokumen ini = algoritma & aturan waktu.

## 1. Prinsip Dasar

- **Sumber kebenaran waktu = timestamp UTC epoch ms** (`Date.now()`), disimpan di setiap save.
- Tidak ada game loop yang mengurangi stat per detik. Semua decay **dihitung dari selisih waktu** saat: (a) game dibuka, (b) scene berpindah, (c) aksi pemain terjadi.
- Satu "hari pet" = 24 jam waktu nyata. Jam ditampilkan sesuai lokal pemain (UTC offset perangkat).

## 2. Algoritma Offline Catch-Up (Wajib)

```
onGameOpen():
  dt_ms   = now - save.lastTick
  dt_h    = dt_ms / 3_600_000

  // 1. Fase waktu: bagi dt ke segmen siang/malam
  segments = splitByDayPhase(save.lastTick, now)

  // 2. Terapkan decay per segmen (tabel Doc 01 §2)
  for seg in segments:
    decayStats(seg.hours, seg.phase, pet.isSleeping)

  // 3. Batas anti-frustrasi (GDD §9):
  clampFloor = pet.isNewborn(<24h) ? 50 : 5   // stat tidak di bawah nilai ini karena offline
  clampAllStats(clampFloor)

  // 4. Proses berkala: poop (max 3 saat offline), penyakit, evolusi, umur
  processPoopAndIllness(dt_h)
  processAge(dt_h)          // umur bertambah; evolusi & kematian dievaluasi di sini
  processSeason()

  // 5. Ringkasan offline
  showSummary(segments, events)   // "7 jam lalu, Kogitsune mengantuk & kandang kotor"

  save.lastTick = now
```

**Aturan penting:** kematian TETAP bisa terjadi saat offline (setelah grace period 24 jam) — tapi hanya jika decay mentok floor 5 lalu health jebol oleh komposit. Ini sengaja: konsekuensi nyata, tapi pemain yang tidur 8 jam tidak dihukum mati.

## 3. Fase Pagi–Malam (jam lokal pemain)

| Fase  | Key       | Jam         | Efek Mekanik                                            | Efek Visual (semua scene outdoor + jendela) |
| ----- | --------- | ----------- | ------------------------------------------------------- | ------------------------------------------- |
| Pagi  | `morning` | 05:00–10:00 | makan +5 Happiness ekstra                               | langit jingga, kabut tipis                  |
| Siang | `day`     | 10:00–15:00 | koin mini-game +10%                                     | terang penuh                                |
| Sore  | `evening` | 15:00–19:00 | dialog nostalgia                                        | hangat, bayangan panjang                    |
| Malam | `night`   | 19:00–05:00 | tidur pulih +50%; energy decay ×1.5 bila dipaksa bangun | gelap + lentera/andon menyala               |

- Transisi fase = gradient langit berubah mulus selama 15 menit (interpolasi warna, bukan switch).
- Util: `getDayPhase(date)` murni & mudah diuji (unit test wajib).

## 4. Musim (kisetsu) — Siklus Hidup Pet

- Umur pet dibagi 4 musim × **22 hari** = siklus 88 hari ≈ umur maks 90. Musim start ditentukan saat telur dipilih (acak atau mengikuti kalender nyata — keputusan: **mengikuti kalender nyata** agar sinkron dengan perasaan pemain: buka game saat desember = salju).
  - Spring: 20 Mar–19 Jun · Summer: 20 Jun–19 Sep · Autumn: 20 Sep–19 Dec · Winter: 20 Dec–19 Mar (belahan dunia utara, sederhana).
- Musim memengaruhi: warna langit per fase, dekor scene, katalog makanan musiman (Doc 06), event (§5), ambience audio (Doc 10).

## 5. Event Musiman (trigger otomatis, layar pengumuman sederhana)

| Musim     | Event                    | Efek                                                                               |
| --------- | ------------------------ | ---------------------------------------------------------------------------------- |
| Spring 🌸 | Hanami (hari ke-3 musim) | piknik di Taman: Happiness +20 sekali, foto tersimpan di Album                     |
| Summer ☀️ | Matsuri                  | mini-game festival dibuka (sebenarnya selalu ada; versi musiman dapat koin ×1.5)   |
| Autumn 🍁 | Tsukimi                  | menonton bulan malam ini: item dekorasi "Dango" gratis                             |
| Winter ❄️ | Tahun Baru               | omikuji (ramalan harian acak: bonus stat/koin), kotatsu mode: happiness decay −20% |

## 6. Mode Dev / Testing

- Panel debug (hanya build dev): time-lapse ×10/×60/×3600, set fase manual, skip ke hari-N, trigger evolusi/sakit langsung. Wajib ada sebelum M1 selesai — tanpa ini balance 90 hari mustahil diuji.

## 7. Acceptance Criteria

- [ ] Ubah jam sistem → fase & musim berubah benar (unit test `getDayPhase`, `getSeason`).
- [ ] Simulasi offline 1/8/24/72 jam menghasilkan nilai stat sesuai rumus (test otomatis).
- [ ] Layar ringkasan offline muncul dengan kronologi benar.
- [ ] Time-lapse dev berfungsi tanpa merusak save.
